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
      label: t.home || "Accueil",
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
          <path d="M9 21V12h6v9" />
        </svg>
      ),
    },
    {
      href: "/candidates",
      label: t.candidates || "Candidates",
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
    },
    {
      href: "/vote",
      label: t.vote || "Voter",
      center: true,
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4" />
          <rect x="3" y="4" width="18" height="16" rx="2" />
        </svg>
      ),
    },
    {
      href: "/ranking",
      label: t.ranking || "Classement",
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      ),
    },
    {
      href: "/support",
      label: t.help || "Aide",
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="bottom-nav">
      {items.map(({ href, label, icon, center }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={`nav-item${active ? " active" : ""}${center ? " nav-cta" : ""}`}>
            {center ? <span className="nav-cta-icon">{icon(true)}</span> : icon(active)}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
