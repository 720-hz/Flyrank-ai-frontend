import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShaderHero } from "./shader-hero";

// jsdom has no WebGL — same approach as agent-core.test.tsx: mock the one module that would
// reach outside what jsdom can do (the real @react-three/fiber Canvas), and test the real
// gating logic around it.
vi.mock("./shader-hero-scene", () => ({
  default: () => <div data-testid="mock-shader-scene" />,
}));

const useWebglSupportMock = vi.fn();
const usePrefersReducedMotionMock = vi.fn();

vi.mock("@/lib/use-webgl-support", () => ({
  useWebglSupport: () => useWebglSupportMock(),
}));
vi.mock("@/lib/use-prefers-reduced-motion", () => ({
  usePrefersReducedMotion: () => usePrefersReducedMotionMock(),
}));

beforeEach(() => {
  useWebglSupportMock.mockReset();
  usePrefersReducedMotionMock.mockReset();
});

describe("ShaderHero", () => {
  it("renders the real shader scene when WebGL is supported and motion isn't reduced", async () => {
    useWebglSupportMock.mockReturnValue(true);
    usePrefersReducedMotionMock.mockReturnValue(false);
    render(<ShaderHero />);

    expect(await screen.findByTestId("mock-shader-scene")).toBeInTheDocument();
  });

  it("renders the static fallback instead of loading the scene when WebGL is unsupported", () => {
    useWebglSupportMock.mockReturnValue(false);
    usePrefersReducedMotionMock.mockReturnValue(false);
    const { container } = render(<ShaderHero />);

    expect(screen.queryByTestId("mock-shader-scene")).not.toBeInTheDocument();
    // The fallback is a plain aria-hidden decorative div with no accessible role to query by —
    // assert on its absence of a canvas/scene instead of a positive selector, same reasoning as
    // the fallback component's own doc comment (it has nothing to announce).
    expect(container.querySelector("canvas")).not.toBeInTheDocument();
  });

  it("renders the static fallback instead of the scene when the visitor prefers reduced motion", () => {
    useWebglSupportMock.mockReturnValue(true);
    usePrefersReducedMotionMock.mockReturnValue(true);
    render(<ShaderHero />);

    expect(screen.queryByTestId("mock-shader-scene")).not.toBeInTheDocument();
  });

  it("marks the whole hero aria-hidden — it's decorative background, not content", () => {
    useWebglSupportMock.mockReturnValue(true);
    usePrefersReducedMotionMock.mockReturnValue(false);
    const { container } = render(<ShaderHero />);

    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});
