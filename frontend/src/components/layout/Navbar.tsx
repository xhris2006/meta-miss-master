"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

const links = [
  ["Accueil", "/"],
  ["Candidats", "/candidates"],
  ["Classement", "/ranking"],
  ["Participer", "/candidates/register"],
  ["Support", "/support"],
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!open) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
    router.push("/");
  };

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 120,
          height: "58px",
          padding: "0 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10,0,5,0.88)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(201,147,42,.16)",
        }}
      >
        <Link
          href="/"
          style={{
            textDecoration: "none",
            color: "var(--gold-light)",
            fontFamily: "var(--font-display)",
            fontSize: "0.95rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Meta Miss & Master
        </Link>

        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          style={{
            minWidth: 88,
            height: 38,
            padding: "0 12px",
            borderRadius: 12,
            border: "1px solid rgba(201,147,42,.24)",
            background: "rgba(201,147,42,.08)",
            color: "var(--text)",
            fontSize: "0.85rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "0.88rem", lineHeight: 1, letterSpacing: "-0.12em" }}>|||</span>
          <span>Menu</span>
        </button>
      </nav>

      {open && (
        <>
          <button
            onClick={closeMenu}
            aria-label="Fermer le menu"
            style={{
              position: "fixed",
              inset: 0,
              border: "none",
              background: "rgba(0,0,0,.56)",
              zIndex: 121,
              cursor: "pointer",
            }}
          />

          <aside
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "min(280px, 88vw)",
              height: "100vh",
              zIndex: 122,
              padding: "14px 12px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: "linear-gradient(180deg, rgba(18,4,10,.98), rgba(7,0,3,.98))",
              borderLeft: "1px solid rgba(201,147,42,.18)",
              boxShadow: "-18px 0 50px rgba(0,0,0,.38)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  color: "var(--gold-light)",
                  fontFamily: "var(--font-display)",
                  fontSize: "1rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Navigation
              </div>
              <button
                onClick={closeMenu}
                aria-label="Fermer"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: "1px solid rgba(201,147,42,.16)",
                  background: "transparent",
                  color: "var(--text)",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                X
              </button>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                background: "rgba(201,147,42,.06)",
                border: "1px solid rgba(201,147,42,.12)",
                color: "var(--text-muted)",
                fontSize: "0.76rem",
                lineHeight: 1.55,
              }}
            >
              Utilisez ce menu pour aller vers chaque page du concours.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {links.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    color: "var(--text)",
                    textDecoration: "none",
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid var(--border)",
                    fontSize: "0.84rem",
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              <Link
                href="/vote"
                onClick={closeMenu}
                style={{
                  padding: "11px 12px",
                  borderRadius: 12,
                  textDecoration: "none",
                  textAlign: "center",
                  background: "linear-gradient(135deg,var(--gold),var(--gold-light))",
                  color: "#08000A",
                  fontWeight: 700,
                  fontSize: "0.84rem",
                }}
              >
                Voter maintenant
              </Link>

              {isAuthenticated && user?.role === "ADMIN" ? (
                <>
                  <Link
                    href="/admin"
                    onClick={closeMenu}
                    style={{
                      padding: "11px 12px",
                      borderRadius: 12,
                      textDecoration: "none",
                      textAlign: "center",
                      color: "var(--gold-light)",
                      border: "1px solid rgba(201,147,42,.24)",
                      fontSize: "0.84rem",
                    }}
                  >
                    Administration
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{
                      padding: "11px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(239,83,80,.24)",
                      background: "transparent",
                      color: "#EF5350",
                      cursor: "pointer",
                      fontSize: "0.84rem",
                    }}
                  >
                    Deconnexion
                  </button>
                </>
              ) : null}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
