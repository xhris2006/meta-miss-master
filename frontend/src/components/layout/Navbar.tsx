"use client";
import Link from "next/link";
import { useState } from "react";
import { Crown, Menu, X, User, LogOut, LayoutDashboard } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const navLinks = [
    { href: "/candidates", label: "Candidats" },
    { href: "/ranking", label: "Classement" },
    { href: "/candidates/register", label: "Participer" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 glass border-b border-gold-500/10">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Crown className="w-6 h-6 text-gold-400" />
          <span className="font-display text-lg text-white font-bold">META <span className="text-gold-400">M&M</span></span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-gray-300 hover:text-gold-400 transition-colors text-sm font-body font-medium">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {user?.role === "ADMIN" && (
                <Link href="/admin" className="flex items-center gap-1.5 text-gold-400 text-sm hover:text-gold-300 transition-colors">
                  <LayoutDashboard className="w-4 h-4" />Admin
                </Link>
              )}
              <span className="text-gray-400 text-sm">{user?.name}</span>
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 text-sm transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Link href="/auth/login" className="text-gray-300 hover:text-white text-sm font-body transition-colors">Connexion</Link>
              <Link href="/auth/register" className="px-4 py-2 bg-gold-500 text-black rounded-full text-sm font-semibold hover:bg-gold-400 transition-colors">S'inscrire</Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-white" onClick={() => setOpen(!open)}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden glass border-t border-gold-500/10 px-4 py-4 flex flex-col gap-4">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-gray-300 hover:text-gold-400 text-sm font-body">
              {l.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <button onClick={handleLogout} className="text-left text-red-400 text-sm">Déconnexion</button>
          ) : (
            <>
              <Link href="/auth/login" onClick={() => setOpen(false)} className="text-gray-300 text-sm">Connexion</Link>
              <Link href="/auth/register" onClick={() => setOpen(false)} className="text-gold-400 text-sm font-semibold">S'inscrire</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
