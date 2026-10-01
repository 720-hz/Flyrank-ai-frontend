import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold text-main">
        FlyRank Frontend Capstone
      </h1>
      <p className="max-w-md text-text/80">
        Scaffolding is in place. The product this app becomes is scoped in a
        later assignment.
      </p>
      <Link
        href="/settings"
        className="text-sm font-medium text-main underline underline-offset-2"
      >
        Settings
      </Link>
    </main>
  );
}
