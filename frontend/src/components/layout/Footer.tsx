import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        position: "relative",
        zIndex: 20,
        marginTop: "auto",
        borderTop: "1px solid rgba(201,147,42,.15)",
        padding: "16px 16px 18px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        background: "rgba(10,0,5,0.72)",
        backdropFilter: "blur(12px)",
        fontSize: "0.75rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "0.9rem",
          color: "var(--gold-light)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Meta Miss & Master
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
        {[
          ["Accueil", "/"],
          ["Candidats", "/candidates"],
          ["Classement", "/ranking"],
          ["Participer", "/candidates/register"],
          ["Support", "/support"],
        ].map(([label, href]) => (
          <Link
            key={href}
            href={href}
            style={{
              color: "var(--text-muted)",
              textDecoration: "none",
              fontSize: "0.72rem",
              letterSpacing: "0.04em",
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
        Copyright {new Date().getFullYear()} - Tous droits reserves
      </div>
    </footer>
  );
}
