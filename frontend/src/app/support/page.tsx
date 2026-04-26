"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_URL || "https://wa.me/237680000000";

export default function SupportPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main style={{ flex: 1, width: "100%", maxWidth: 1050, margin: "0 auto", padding: "65px 12px 45px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div className="section-tag">Assistance</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.4rem,6vw,4rem)", marginBottom: 12 }}>
            Support concours
          </h1>
          <p style={{ color: "var(--text-muted)", maxWidth: 700, margin: "0 auto", lineHeight: 1.8 }}>
            Une question sur les votes, la validation des paiements ou les candidatures ? Le support officiel est ici.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 18,
            marginBottom: 26,
          }}
        >
          {[
            {
              title: "WhatsApp direct",
              desc: "Rejoignez le support le plus rapide pour les questions urgentes et confirmations de paiement.",
            },
            {
              title: "Votes et paiements",
              desc: "Les votes sont credites automatiquement apres confirmation du paiement par webhook ou verification.",
            },
            {
              title: "Delai entre votes",
              desc: "Une nouvelle tentative de vote pour un meme candidat est limitee pendant 5 minutes.",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: "var(--glass)",
                border: "1px solid var(--border)",
                borderRadius: 22,
                padding: "22px 18px",
              }}
            >
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginBottom: 10 }}>{item.title}</h2>
              <p style={{ color: "var(--text-muted)", lineHeight: 1.8 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        <div
          style={{
            background: "linear-gradient(180deg, rgba(19,8,13,.96), rgba(8,0,3,.96))",
            border: "1px solid rgba(37,211,102,.22)",
            borderRadius: 26,
            padding: "28px 20px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              color: "#7FF0A0",
              border: "1px solid rgba(37,211,102,.22)",
              marginBottom: 14,
            }}
          >
            WhatsApp officiel
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", marginBottom: 10 }}>
            Rejoindre le support maintenant
          </h2>
          <p style={{ color: "var(--text-muted)", maxWidth: 620, margin: "0 auto 18px", lineHeight: 1.8 }}>
            Si vous avez deja paye et que vous attendez encore la confirmation, patientez quelques instants puis revenez sur le classement ou contactez le support.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "14px 24px",
                borderRadius: 16,
                textDecoration: "none",
                background: "linear-gradient(135deg,#25D366,#7FF0A0)",
                color: "#04150A",
                fontWeight: 700,
              }}
            >
              Ouvrir WhatsApp
            </Link>
            <Link
              href="/candidates"
              style={{
                padding: "14px 24px",
                borderRadius: 16,
                textDecoration: "none",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              Retour aux candidats
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
