// Navbar is replaced by BottomNav for the app UI
// Kept only as a stub to avoid import errors in admin pages
"use client";
import Link from "next/link";
export default function Navbar() {
  return (
    <nav style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Link href="/" style={{ fontWeight: 800, color: "#2563EB", textDecoration: "none", fontSize: "0.9rem" }}>Reines du Meta</Link>
      <Link href="/" style={{ fontSize: "0.78rem", color: "#6B7280" }}>← Retour</Link>
    </nav>
  );
}
