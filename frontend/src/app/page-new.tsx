"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

export default function SplashPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/home");
    }
  }, [isAuthenticated, router]);

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-between",
      background: "#fff",
      padding: "60px 28px 40px",
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0 }}>
        <div style={{ marginBottom: 20 }}>
          <svg width="72" height="56" viewBox="0 0 72 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 48L14 20L28 36L36 8L44 36L58 20L66 48H6Z" fill="#2563EB" opacity="0.15"/>
            <path d="M6 48L14 20L28 36L36 8L44 36L58 20L66 48" stroke="#2563EB" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" fill="none"/>
            <circle cx="36" cy="8" r="4" fill="#2563EB"/>
            <circle cx="14" cy="20" r="3.5" fill="#2563EB"/>
            <circle cx="58" cy="20" r="3.5" fill="#2563EB"/>
            <rect x="4" y="46" width="64" height="7" rx="3.5" fill="#2563EB"/>
            <circle cx="24" cy="49.5" r="2" fill="#fff"/>
            <circle cx="36" cy="49.5" r="2" fill="#fff"/>
            <circle cx="48" cy="49.5" r="2" fill="#fff"/>
          </svg>
        </div>

        <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.22em", color: "#2563EB", textTransform: "uppercase", marginBottom: 4 }}>
          META
        </div>
        <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "#111827", letterSpacing: "0.04em", lineHeight: 1.1, textAlign: "center", marginBottom: 2 }}>
          MISS MASTER
        </div>
        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#2563EB", marginBottom: 32 }}>
          2026
        </div>

        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#111827", lineHeight: 1.3, marginBottom: 10 }}>
            Votre voix célèbre<br />
            <span style={{ color: "#2563EB" }}>l'excellence</span>
          </div>
          <div style={{ fontSize: "0.88rem", color: "#6B7280", lineHeight: 1.6, maxWidth: 300 }}>
            Bienvenue sur la plateforme officielle de vote Meta Miss Master. Soutenez vos candidats préférés et suivez les résultats en direct.
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, margin: "24px 0 8px", background: "#F0F6FF", borderRadius: 16, padding: "14px 24px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#2563EB" }}>32</div>
            <div style={{ fontSize: "0.65rem", color: "#6B7280", fontWeight: 500 }}>Candidats</div>
          </div>
          <div style={{ width: 1, background: "#DBEAFE" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#2563EB" }}>1.2K+</div>
            <div style={{ fontSize: "0.65rem", color: "#6B7280", fontWeight: 500 }}>Votes</div>
          </div>
          <div style={{ width: 1, background: "#DBEAFE" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#2563EB" }}>5</div>
            <div style={{ fontSize: "0.65rem", color: "#6B7280", fontWeight: 500 }}>Jours restants</div>
          </div>
        </div>
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
        <Link href="/login?tab=login" style={{ textDecoration: "none" }}>
          <button style={{
            width: "100%",
            padding: "15px 0",
            borderRadius: 14,
            border: "none",
            background: "#2563EB",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: "pointer",
            fontFamily: "var(--font)",
          }}>
            Se connecter
          </button>
        </Link>

        <Link href="/login?tab=register" style={{ textDecoration: "none" }}>
          <button style={{
            width: "100%",
            padding: "15px 0",
            borderRadius: 14,
            border: "1.5px solid #2563EB",
            background: "transparent",
            color: "#2563EB",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: "pointer",
            fontFamily: "var(--font)",
          }}>
            Créer un compte
          </button>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
          <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>ou</span>
          <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
        </div>

        <button
          onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 14,
            border: "1.5px solid #E5E7EB",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.95rem",
            color: "#374151",
            fontFamily: "var(--font)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22 12.24c0-.71-.06-1.4-.17-2.06H12v3.9h5.61c-.24 1.3-.96 2.4-2.05 3.13v2.6h3.32c1.94-1.79 3.06-4.42 3.06-7.57z" fill="#4285F4"/>
            <path d="M12 23c2.7 0 4.97-.9 6.63-2.44l-3.32-2.6c-.92.62-2.09.98-3.31.98-2.54 0-4.7-1.72-5.48-4.03H2.97v2.53C4.62 20.88 8.02 23 12 23z" fill="#34A853"/>
            <path d="M6.52 14.94c-.2-.6-.31-1.24-.31-1.94s.11-1.34.31-1.94V8.53H2.97c-.62 1.24-.97 2.62-.97 4.06s.35 2.82.97 4.06l3.55-2.53z" fill="#FBBC05"/>
            <path d="M12 4.47c1.47 0 2.8.51 3.84 1.51l2.88-2.88C16.96 1.45 14.7.5 12 .5 8.02.5 4.62 2.62 2.97 5.76l3.55 2.53C7.3 6.19 9.46 4.47 12 4.47z" fill="#EA4335"/>
          </svg>
          Continuer avec Google
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Vote sécurisé et confidentiel</span>
        </div>
      </div>
    </div>
  );
}
