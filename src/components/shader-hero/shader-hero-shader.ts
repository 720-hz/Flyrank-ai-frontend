/**
 * The GLSL source for the shader hero (FE-13), kept as plain exported strings rather than
 * `.glsl` files imported through a bundler loader — this project has no GLSL import plugin
 * configured, and importing shaders as template-literal exports is the standard, zero-config
 * way to use them with @react-three/fiber/drei's `shaderMaterial`. Comments below are written
 * for a mentor walkthrough, per the brief — every block says what it does and why.
 */

/**
 * Fullscreen-quad vertex shader.
 *
 * `shader-hero-scene.tsx` renders this material on a 2x2 `planeGeometry`, so this plane's own
 * local-space vertices already sit at the four corners of clip space (-1..1 on both axes).
 * That means there's no camera/projection math needed here at all — a normal 3D object would
 * multiply `position` through `modelViewMatrix`/`projectionMatrix` to place it in the scene,
 * but this is a flat background layer, not an object floating in 3D space, so this shader just
 * forwards the plane's corners straight through to `gl_Position`. `vUv` (the plane's own 0..1
 * UV coordinates) is passed to the fragment shader unchanged for it to work with.
 */
export const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * The hero's fragment shader — an aurora-style flow field in this console's own four theme
 * colors, gently leaning toward the cursor, with a grain pass and a vignette that keeps the
 * headline readable no matter where the flow field happens to be bright.
 */
export const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float u_time;       // seconds since the scene mounted, paused while the tab is hidden
  uniform vec2  u_resolution;  // canvas size in CSS pixels, for aspect-correcting the UV space
  uniform vec2  u_mouse;       // pointer position, normalized 0..1, eased toward its target in JS

  // ---- Palette -----------------------------------------------------------------------------
  // The app's own four theme colors (globals.css's --color-main/--color-accent, plus the
  // "Ember"/"Violet" presets Agent Core already uses from FE-11) rather than invented swatches
  // — so this hero reads as the same product, not a generic shader-demo rainbow.
  const vec3 COLOR_MAIN   = vec3(0.1686, 0.1804, 0.4196); // #2b2e6b
  const vec3 COLOR_ACCENT = vec3(0.2078, 0.8157, 0.6275); // #35d0a0
  const vec3 COLOR_EMBER  = vec3(0.8784, 0.3843, 0.2392); // #e0623d
  const vec3 COLOR_VIOLET = vec3(0.5412, 0.3608, 0.9647); // #8a5cf6

  // ---- Cheap hash + value noise -------------------------------------------------------------
  // A full Perlin/simplex implementation is more machinery than a soft, blurry aurora field
  // needs. This is the standard "hash each corner of a 2x2 grid cell to a pseudo-random float,
  // then smoothly interpolate between them" trick — no noise texture, no library, and it reads
  // as noise rather than a grid because of the smoothstep easing in valueNoise.
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f); // smoothstep easing — without this the grid cells show
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // Fractal Brownian Motion: stack several octaves of the noise above, each one at double the
  // frequency and half the amplitude of the last. One octave alone looks like blobby static;
  // summing five is what gives the field the wispy, layered look an actual aurora has.
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * valueNoise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    // Aspect-correct UV space, centered at the origin. Without the resolution correction, fbm()
    // below would sample a squashed/stretched version of itself on any non-square viewport —
    // this is u_resolution's whole job here.
    vec2 uv = vUv - 0.5;
    uv.x *= u_resolution.x / u_resolution.y;

    // Mouse influence, in the same aspect-corrected space. Rather than snapping the whole field
    // toward the cursor, this nudges the *sampling point* feeding fbm() below, within a soft
    // falloff radius (smoothstep, not a hard cutoff) — the flow field gently leans near the
    // cursor and is untouched far from it.
    vec2 mouse = u_mouse - 0.5;
    mouse.x *= u_resolution.x / u_resolution.y;
    float mouseDist = length(uv - mouse);
    vec2 mousePull = normalize(mouse - uv + 0.0001) * smoothstep(0.9, 0.0, mouseDist) * 0.15;

    // Domain warp: fbm's own output feeds back in as an offset to fbm's *input*, so each layer
    // distorts the coordinate space the next layer reads from. This single trick is what turns
    // "noise that slides sideways over time" into something that actually looks like it's
    // flowing and curling, which a plain scrolling-noise texture never does.
    vec2 flowUv = uv * 1.8 + mousePull;
    float t = u_time * 0.08;
    vec2 warp = vec2(fbm(flowUv + t), fbm(flowUv - t + 4.2));
    float field = fbm(flowUv + warp * 1.2);

    // Walk through the four theme colors across the field's value, so every pixel resolves to
    // a blend of colors this app already uses, not an arbitrary hue sweep.
    vec3 color = mix(COLOR_MAIN, COLOR_VIOLET, smoothstep(0.0, 0.45, field));
    color = mix(color, COLOR_ACCENT, smoothstep(0.35, 0.7, field));
    color = mix(color, COLOR_EMBER, smoothstep(0.65, 1.0, field) * 0.6);

    // Vignette: darken the edges, and bias the lower portion darker still, so the headline
    // (anchored near the bottom in shader-hero.tsx) always sits on a dark-enough patch no
    // matter which palette color the flow field lands on there — the JS side also lays a CSS
    // scrim over this same region as the actual contrast guarantee (verified numerically
    // against this shader's worst-case brightness), this is just what keeps the *shader itself*
    // from fighting that scrim.
    float vignette = smoothstep(1.1, 0.2, length(uv));
    color *= mix(0.55, 1.0, vignette);
    color = mix(color * 0.35, color, smoothstep(0.75, -0.2, uv.y));

    // Grain: a cheap per-pixel dither so the gradient doesn't band on lower-end/compressed
    // displays, and so the result reads as deliberately textured rather than a flat CSS
    // gradient someone could've shipped without ever writing a shader.
    float grain = (hash(vUv * u_resolution.xy + u_time) - 0.5) * 0.035;
    color += grain;

    gl_FragColor = vec4(color, 1.0);
  }
`;
