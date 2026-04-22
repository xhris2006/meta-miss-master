"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

const publicLinks = [
  ["Candidats", "/candidates"],
  ["Classement", "/ranking"],
  ["Participer", "/candidates/register"],
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

  const handleLogout = () => {
    logout();
    setOpen(false);
    router.push("/");
  };

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          width: "100%",
          zIndex: 100,
          padding: "0 18px",
          height: "68px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10,0,5,0.82)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.08rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "var(--gold-light)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: "1.15rem" }}>M</span>
          META MISS & MASTER
        </Link>

        <div style={{ display: "flex", gap: 28, alignItems: "center" }} className="hidden md:flex">
          {publicLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              style={{
                color: "var(--text-muted)",
                textDecoration: "none",
                fontSize: "0.82rem",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                transition: "color .2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold-light)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              {label}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }} className="hidden md:flex">
          {isAuthenticated && user?.role === "ADMIN" ? (
            <>
              <Link
                href="/admin"
                style={{
                  color: "var(--gold)",
                  fontSize: "0.82rem",
                  textDecoration: "none",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Admin
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(239,83,80,.3)",
                  borderRadius: 100,
                  padding: "6px 16px",
                  color: "#EF5350",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                }}
              >
                Deconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/vote" className="btn-primary" style={{ padding: "8px 20px", fontSize: "0.82rem" }}>
                Voter maintenant
              </Link>
              <Link
                href="/xhrisadmin"
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.82rem",
                  textDecoration: "none",
                  letterSpacing: "0.06em",
                }}
              >
                Admin
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(true)}
          className="md:hidden"
          aria-label="Ouvrir le menu"
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            border: "1px solid rgba(201,147,42,.22)",
            background: "rgba(201,147,42,.08)",
            color: "var(--text)",
            fontSize: "1.2rem",
            cursor: "pointer",
          }}
        >
          ☰
        </button>
      </nav>

      {open && (
        <>
          <button
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(5,0,3,.62)",
              border: "none",
              zIndex: 109,
              cursor: "pointer",
            }}
          />
          <aside
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "min(320px, 86vw)",
              height: "100vh",
              zIndex: 110,
              background: "linear-gradient(180deg, rgba(18,4,10,.98), rgba(8,0,3,.98))",
              borderLeft: "1px solid rgba(201,147,42,.18)",
              boxShadow: "-20px 0 60px rgba(0,0,0,.4)",
              padding: "22px 18px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ color: "var(--gold-light)", fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>
                Menu
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                padding: "16px 14px",
                borderRadius: 18,
                background: "rgba(201,147,42,.06)",
                border: "1px solid rgba(201,147,42,.12)",
                color: "var(--text-muted)",
                fontSize: "0.82rem",
                lineHeight: 1.6,
              }}
            >
              Votez librement. 1 vote = 100 FCFA.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {publicLinks.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 16,
                    color: "var(--text)",
                    textDecoration: "none",
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid var(--border)",
                    fontSize: "0.92rem",
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              <Link
                href="/vote"
                onClick={() => setOpen(false)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 16,
                  textDecoration: "none",
                  textAlign: "center",
                  background: "linear-gradient(135deg,var(--gold),var(--gold-light))",
                  color: "#08000A",
                  fontWeight: 600,
                }}
              >
                Voter maintenant
              </Link>

              {isAuthenticated && user?.role === "ADMIN" ? (
                <>
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 16,
                      textDecoration: "none",
                      color: "var(--gold-light)",
                      border: "1px solid rgba(201,147,42,.24)",
                      textAlign: "center",
                    }}
                  >
                    Ouvrir l admin
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 16,
                      border: "1px solid rgba(239,83,80,.25)",
                      background: "transparent",
                      color: "#EF5350",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    Deconnexion
                  </button>
                </>
              ) : (
                <Link
                  href="/xhrisadmin"
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 16,
                    textDecoration: "none",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border)",
                    textAlign: "center",
                  }}
                >
                  Acces admin
                </Link>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
