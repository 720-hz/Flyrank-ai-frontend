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
      <p className="text-sm text-text/50">
        Scaffolded in FE-04 — not wired to real data yet.
      </p>
    </main>
  );
}
