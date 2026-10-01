"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/agents", label: "Agents" },
  { href: "/runs", label: "Runs" },
  { href: "/health", label: "Health" },
  { href: "/account", label: "Account" },
] as const;

function isLinkActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function RootNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-main/10">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-8 px-6">
        <Link
          href="/"
          className="py-4 text-sm font-semibold tracking-wide text-main"
        >
          Flyrank Console
        </Link>
        <nav aria-label="Primary">
          <ul className="flex gap-6">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = isLinkActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-block border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-main text-main"
                        : "border-transparent text-text/70 hover:text-text"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
