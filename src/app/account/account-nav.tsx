"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/account", label: "Overview" },
  { href: "/account/settings", label: "Settings" },
  { href: "/account/activity", label: "Activity" },
] as const;

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="border-b border-main/10">
      <ul className="mx-auto flex w-full max-w-3xl gap-6 overflow-x-auto px-6">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-block whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
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
  );
}
