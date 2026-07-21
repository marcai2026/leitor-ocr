"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Início" },
  { href: "/classificar", label: "Classificar" },
  { href: "/cnh", label: "Extrair CNH" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="relative z-20 shrink-0 border-b border-[var(--line)] bg-[rgba(244,247,245,0.85)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="group flex items-baseline">
          <span className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]">
            Logo.
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--ink)] text-[var(--lime)]"
                    : "text-[var(--ink-soft)] hover:bg-white/70 hover:text-[var(--ink)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
