"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CandidateCard from "@/components/candidate/CandidateCard";
import api from "@/lib/api";

export default function HomePage() {
  const [miss, setMiss] = useState<any[]>([]);
  const [master, setMaster] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [candTab, setCandTab] = useState<"ALL" | "MISS" | "MASTER">("ALL");

  useEffect(() => {
    api.get("/candidates/top?type=MISS&limit=3").then((r) => setMiss(r.data.data || [])).catch(() => {});
    api.get("/candidates/top?type=MASTER&limit=3").then((r) => setMaster(r.data.data || [])).catch(() => {});
    api.get("/ranking/stats").then((r) => setStats(r.data.data)).catch(() => {});
  }, []);

  const displayCands = candTab === "ALL" ? [...miss, ...master] : candTab === "MISS" ? miss : master;

  const S: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh" },
    hero: {
      position: "relative",
      zIndex: 1,
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "70px 14px 40px",
      textAlign: "center",
    },
    eyebrow: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontSize: "0.65rem",
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: "var(--gold)",
      border: "1px solid rgba(201,147,42,.3)",
      padding: "5px 14px",
      borderRadius: 100,
      marginBottom: 18,
      animation: "fade-up .8s ease both",
    },
    eyebrowDot: { width: 4, height: 4, borderRadius: "50%", background: "var(--gold)", display: "inline-block" },
    title: {
      fontFamily: "var(--font-display)",
      fontSize: "clamp(2.2rem,10vw,6rem)",
      fontWeight: 300,
      lineHeight: 0.95,
      letterSpacing: "-0.02em",
      marginBottom: 14,
      animation: "fade-up .8s .1s ease both",
    },
    sub: {
      fontSize: "0.88rem",
      color: "var(--text-muted)",
      maxWidth: 620,
      margin: "0 auto 24px",
      lineHeight: 1.6,
      animation: "fade-up .8s .2s ease both",
    },
    actions: {
      display: "flex",
      gap: 10,
      justifyContent: "center",
      flexWrap: "wrap",
      animation: "fade-up .8s .3s ease both",
    },
    statsBar: {
      position: "relative",
      zIndex: 1,
      borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
      padding: "14px 12px",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
      gap: 12,
      background: "rgba(17,0,9,.6)",
      maxWidth: 900,
      margin: "0 auto",
    },
    statVal: { fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 600, color: "var(--gold-light)", lineHeight: 1 },
    statLabel: { fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginTop: 3 },
    candSection: { padding: "56px 12px", maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 },
    sectionTitle: { fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem,4vw,2.8rem)", fontWeight: 300, color: "var(--text)", letterSpacing: "-0.01em" },
    sectionTitleEm: { fontStyle: "italic", color: "var(--gold-light)" },
    tabRow: { display: "flex", gap: 6, justifyContent: "center", marginBottom: 24, flexWrap: "wrap" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 },
    howSection: { padding: "48px 12px", maxWidth: 1040, margin: "0 auto", position: "relative", zIndex: 1 },
    howGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 },
    howCard: {
      background: "var(--glass)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      padding: "16px 14px",
      textAlign: "left",
      backdropFilter: "blur(10px)",
      transition: "border-color .2s",
    },
    howIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: "rgba(201,147,42,.08)",
      border: "1px solid rgba(201,147,42,.15)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "1rem",
      marginBottom: 10,
    },
    howTitle: { fontFamily: "var(--font-display)", fontSize: "0.95rem", fontWeight: 600, color: "var(--text)", marginBottom: 6 },
    howDesc: { fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6 },
    orbs: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 },
  };

  return (
    <div style={S.page}>
      <div style={S.orbs}>
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,147,42,.07),transparent)", top: -200, left: -200, filter: "blur(80px)" }} />
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(194,24,91,.06),transparent)", bottom: 0, right: -150, filter: "blur(80px)" }} />
      </div>

      <Navbar />

      <section style={S.hero}>
        <div style={{ maxWidth: 900 }}>
          <div style={S.eyebrow}>
            <span style={S.eyebrowDot} />
            Concours officiel · Edition 2025
            <span style={S.eyebrowDot} />
          </div>
          <h1 style={S.title}>
            <span style={{ display: "block", fontStyle: "italic", color: "var(--text)" }}>Le Grand Concours</span>
            <span className="text-gold-gradient" style={{ display: "block" }}>
              Miss & Master
            </span>
            <span
              style={{
                display: "block",
                fontStyle: "italic",
                color: "var(--text)",
                fontSize: "0.45em",
                letterSpacing: "0.12em",
                marginTop: 10,
              }}
            >
              Votez · Soutenez · Couronnez
            </span>
          </h1>
          <p style={S.sub}>
            Tout le monde peut voter autant de fois qu il veut. <strong style={{ color: "var(--gold-light)", fontWeight: 500 }}>1 vote = 100 FCFA</strong>. Paiement securise via Fapshi, CinetPay ou Stripe.
          </p>
          <div style={S.actions}>
            <Link href="/candidates" className="btn-primary">
              Voir les candidats
            </Link>
            <Link href="/ranking" className="btn-ghost">
              Classement live →
            </Link>
            <Link href="/candidates/register" className="btn-ghost">
              Je participe
            </Link>
          </div>
        </div>
      </section>

      {stats && (
        <div style={S.statsBar}>
          {[
            { label: "Candidats", val: stats.totalCandidates },
            { label: "Votes totaux", val: (stats.totalVotesCount || 0).toLocaleString("fr-FR") },
          ].map((item) => (
            <div key={item.label} style={{ textAlign: "center" }}>
              <div style={S.statVal}>{item.val}</div>
              <div style={S.statLabel}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="divider" />

      <section style={S.candSection}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div className="section-tag">Les concurrentes & concurrents</div>
          <h2 style={S.sectionTitle}>
            Decouvrez les <em style={S.sectionTitleEm}>candidats</em>
          </h2>
        </div>
        <div style={S.tabRow}>
          {(["ALL", "MISS", "MASTER"] as const).map((tab) => (
            <button key={tab} onClick={() => setCandTab(tab)} className={`tab-pill${candTab === tab ? " active" : ""}`}>
              {tab === "ALL" ? "Tous" : tab === "MISS" ? "Miss" : "Master"}
            </button>
          ))}
        </div>
        <div style={S.grid}>
          {displayCands.map((candidate, index) => (
            <CandidateCard key={candidate.id} candidate={{ ...candidate, rank: index + 1 }} index={index} />
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link
            href="/candidates"
            style={{
              padding: "10px 24px",
              border: "1px solid rgba(201,147,42,.4)",
              color: "var(--gold)",
              borderRadius: 100,
              textDecoration: "none",
              fontSize: "0.8rem",
              display: "inline-block",
            }}
          >
            Voir tous les candidats →
          </Link>
        </div>
      </section>

      <div className="divider" />

      <section style={S.howSection}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="section-tag">Simple & securise</div>
          <h2 style={S.sectionTitle}>
            Comment <em style={S.sectionTitleEm}>ca marche</em>
          </h2>
        </div>
        <div style={S.howGrid}>
          {[
            { icon: "1", title: "Choisissez un candidat", desc: "Ouvrez son profil puis entrez librement le montant du soutien." },
            { icon: "2", title: "Payez vos votes", desc: "Le calcul est direct : 100 FCFA par vote, sans limite de repetition." },
            { icon: "3", title: "Classement en direct", desc: "Les votes valides sont credites et visibles aussitot dans le classement." },
          ].map((item, index) => (
            <div
              key={index}
              style={{ ...S.howCard, animationDelay: `${index * 0.08}s` }}
              className="animate-fade-up"
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(201,147,42,.3)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)")}
            >
              <div style={S.howIcon}>{item.icon}</div>
              <div style={S.howTitle}>{item.title}</div>
              <div style={S.howDesc}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
