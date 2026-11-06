import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentCore } from "./agent-core";
import type { AgentCoreSceneProps } from "./agent-core-scene";

// jsdom has no WebGL — this suite never renders the real @react-three/fiber Canvas, the same
// way agent-chat.test.tsx never calls the real AI route: mock the one module that would reach
// outside what jsdom can do, and test everything around it for real. The stub exposes the
// props it was given as data-* attributes so interaction tests can assert on them without
// reaching into @react-three/fiber internals at all.
vi.mock("./agent-core-scene", () => ({
  default: ({ shape, color, state, pulseToken }: AgentCoreSceneProps) => (
    <div data-testid="mock-scene" data-shape={shape} data-color={color} data-state={state} data-pulse-token={pulseToken} />
  ),
}));

const useWebglSupportMock = vi.fn();
const usePrefersReducedMotionMock = vi.fn();

vi.mock("@/lib/use-webgl-support", () => ({
  useWebglSupport: () => useWebglSupportMock(),
}));
vi.mock("@/lib/use-prefers-reduced-motion", () => ({
  usePrefersReducedMotion: () => usePrefersReducedMotionMock(),
}));

function mountSupported() {
  useWebglSupportMock.mockReturnValue(true);
  usePrefersReducedMotionMock.mockReturnValue(false);
  return render(<AgentCore />);
}

beforeEach(() => {
  useWebglSupportMock.mockReset();
  usePrefersReducedMotionMock.mockReset();
});

describe("AgentCore", () => {
  it("renders the real scene when WebGL is supported and motion isn't reduced", async () => {
    mountSupported();
    expect(await screen.findByTestId("mock-scene")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Agent Core/ })).not.toBeInTheDocument();
  });

  it("renders the static fallback instead of loading the scene when WebGL is unsupported", () => {
    useWebglSupportMock.mockReturnValue(false);
    usePrefersReducedMotionMock.mockReturnValue(false);
    render(<AgentCore />);

    expect(screen.getByRole("img", { name: /Agent Core/ })).toBeInTheDocument();
    expect(screen.queryByTestId("mock-scene")).not.toBeInTheDocument();
  });

  it("renders the static fallback instead of the scene when the visitor prefers reduced motion", () => {
    useWebglSupportMock.mockReturnValue(true);
    usePrefersReducedMotionMock.mockReturnValue(true);
    render(<AgentCore />);

    expect(screen.getByRole("img", { name: /Agent Core/ })).toBeInTheDocument();
    expect(screen.queryByTestId("mock-scene")).not.toBeInTheDocument();
  });

  it("hides the Pulse trigger when the fallback is shown — there's nothing for it to animate", () => {
    useWebglSupportMock.mockReturnValue(false);
    usePrefersReducedMotionMock.mockReturnValue(false);
    render(<AgentCore />);

    expect(screen.queryByRole("button", { name: "Pulse" })).not.toBeInTheDocument();
  });

  it("defaults to idle / icosahedron / the accent preset", async () => {
    mountSupported();
    const scene = await screen.findByTestId("mock-scene");
    expect(scene).toHaveAttribute("data-state", "idle");
    expect(scene).toHaveAttribute("data-shape", "icosahedron");
    expect(scene).toHaveAttribute("data-color", "#35d0a0");
  });

  it("switching the Agent state radio updates the scene's state prop", async () => {
    const user = userEvent.setup();
    mountSupported();
    await screen.findByTestId("mock-scene");

    await user.click(screen.getByRole("radio", { name: "Speaking" }));

    expect(screen.getByTestId("mock-scene")).toHaveAttribute("data-state", "speaking");
  });

  it("switching the Core shape radio updates the scene's shape prop", async () => {
    const user = userEvent.setup();
    mountSupported();
    await screen.findByTestId("mock-scene");

    await user.click(screen.getByRole("radio", { name: "Torus knot" }));

    expect(screen.getByTestId("mock-scene")).toHaveAttribute("data-shape", "torusKnot");
  });

  it("picking a color swatch updates the scene's color prop", async () => {
    const user = userEvent.setup();
    mountSupported();
    await screen.findByTestId("mock-scene");

    await user.click(screen.getByRole("radio", { name: "Ember" }));

    expect(screen.getByTestId("mock-scene")).toHaveAttribute("data-color", "#e0623d");
  });

  it("clicking Pulse bumps the scene's pulseToken so a one-shot animation fires, and a second click bumps it again", async () => {
    const user = userEvent.setup();
    mountSupported();
    await screen.findByTestId("mock-scene");

    const pulseButton = screen.getByRole("button", { name: "Pulse" });
    await user.click(pulseButton);
    expect(screen.getByTestId("mock-scene")).toHaveAttribute("data-pulse-token", "1");

    await user.click(pulseButton);
    expect(screen.getByTestId("mock-scene")).toHaveAttribute("data-pulse-token", "2");
  });
});
