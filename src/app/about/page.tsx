import type { Metadata } from "next";
import { ShaderHero } from "@/components/shader-hero/shader-hero";

export const metadata: Metadata = {
  title: "About — Flyrank Console",
  description: "A custom fragment-shader hero for the console (FE-13).",
};

export default function AboutPage() {
  return (
    <main className="relative flex min-h-[85dvh] w-full flex-col overflow-hidden">
      <ShaderHero />

      {/* The actual contrast guarantee for the headline below — a CSS scrim composited on top
          of the shader, strongest where the text sits (bottom) and fading out toward the top.
          Verified numerically against the shader's worst-case brightness (every palette color,
          plus a near-white grain spike) rather than eyeballed: white text over this black/65
          stop clears WCAG AA's 4.5:1 with large margin (7.8:1–19:1 depending on what's
          underneath) — see the FE-13 README section for the actual numbers. The shader's own
          vignette (shader-hero-shader.ts) darkens this same region too, but this scrim is what
          *guarantees* the ratio regardless of what the shader is doing on a given frame. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent"
      />

      <div className="relative z-10 mt-auto flex w-full flex-col gap-3 px-6 pb-16 pt-24 sm:px-10 sm:pb-20">
        <h1 className="max-w-2xl text-4xl font-semibold text-white sm:text-5xl">
          Flyrank Console
        </h1>
        <p className="max-w-xl text-base text-white/90 sm:text-lg">
          An internal console for AI-assisted engineering work — streaming agents, run history,
          and account settings. The flow field behind this text is a custom WebGL fragment
          shader (FE-13), not a video or a CSS gradient.
        </p>
      </div>
    </main>
  );
}
