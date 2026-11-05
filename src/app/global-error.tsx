"use client";

/**
 * Root-layout crash boundary (FE-08). This replaces the ENTIRE document when
 * it renders, including `<html>`/`<body>` — RootNav, globals.css, and
 * everything else from the root layout are gone, so this file can't lean on
 * Tailwind classes or the app's CSS variables and uses inline styles instead
 * (see the error.js docs: "global-error... do not include your global
 * styles"). Kept deliberately minimal — if the root layout itself is broken,
 * this is the one thing standing between the user and a blank tab.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          display: "flex",
          minHeight: "100dvh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "24px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#fafaf7",
          color: "#14161a",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Flyrank Console hit a problem</h1>
        <p style={{ fontSize: "0.875rem", color: "#14161ab3", maxWidth: "28rem", margin: 0 }}>
          Something went wrong loading the app itself. Try again — if it keeps happening, reload
          the page.
        </p>
        {error.digest && (
          <p style={{ fontSize: "0.75rem", color: "#14161a66", margin: 0 }}>Reference: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={() => retry()}
          style={{
            marginTop: "8px",
            borderRadius: "6px",
            border: "none",
            background: "#2b2e6b",
            color: "#fafaf7",
            padding: "8px 16px",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
