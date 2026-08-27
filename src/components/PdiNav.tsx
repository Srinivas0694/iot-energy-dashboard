// src/components/PdiNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/scan", label: "Scan" },
  { href: "/live", label: "Live" },
  { href: "/history", label: "History" },
];

export default function PdiNav() {
  const path = usePathname();
  return (
    <nav className="mb-6 flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-1">
      <span className="px-3 text-xs font-bold tracking-[0.2em] text-emerald-400">PDI</span>
      {LINKS.map((l) => {
        const active = path === l.href || (l.href !== "/scan" && path.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-emerald-400 text-slate-950"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}