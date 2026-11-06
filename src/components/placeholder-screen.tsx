export function PlaceholderScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-6 py-24">
      <h1 className="text-3xl font-semibold text-main">{title}</h1>
      <p className="text-text/80">{description}</p>
      {/* /65, not /50 — see page.tsx's comment on this same contrast fix (FE-12 audit). */}
      <p className="text-sm text-text/65">
        Scaffolded in FE-04 — not wired to real data yet.
      </p>
    </main>
  );
}
