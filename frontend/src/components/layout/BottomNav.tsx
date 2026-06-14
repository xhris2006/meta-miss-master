"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/store/langStore";

export default function BottomNav() {
  const pathname = usePathname();
  const t = useT();

  const items = [
    {
      href: "/",
      label: t.home,
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" fill={active ? "var(--blue)" : "none"} stroke={active ? "var(--blue)" : "var(--text-muted)"} strokeWidth="2">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
          <path d="M9 21V12h6v9" />
        </svg>
      ),
    },
    {
      href: "/candidates",
      label: t.candidates || "Candidates",
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={active ? "var(--blue)" : "var(--text-muted)"} strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      href: "/vote",
      label: t.vote,
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={active ? "var(--blue)" : "var(--text-muted)"} strokeWidth="2">
          <path d="M9 12l2 2 4-4" />
          <rect x="3" y="4" width="18" height="16" rx="2" />
        </svg>
      ),
    },
    {
      href: "/ranking",
      label: t.results,
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={active ? "var(--blue)" : "var(--text-muted)"} strokeWidth="2">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      ),
    },
    {
      href: "/profile",
      label: t.profile,
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={active ? "var(--blue)" : "var(--text-muted)"} strokeWidth="2">
          <circle cx="12" cy="7" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="bottom-nav">
      {items.map(({ href, label, icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={`nav-item${active ? " active" : ""}`}>
            {icon(active)}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
