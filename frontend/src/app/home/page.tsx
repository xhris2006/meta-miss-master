"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import CandidacyButton from "@/components/CandidacyButton";
import { useT } from "@/store/langStore";

export default function HomeDashboardPage() {
  const t = useT();
  const [stats, setStats] = useState<any>(null);
  const [topMiss, setTopMiss] = useState<any[]>([]);
  const [contest, setContest] = useState<any>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [doubleVotes, setDoubleVotes] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

  useEffect(() => {
    api.get("/ranking/stats").then((r) => setStats(r.data.data)).catch(() => {});
    api.get("/contest/active").then((r) => setContest(r.data.data)).catch(() => {});
    api.get("/settings/double-votes").then((r) => setDoubleVotes(r.data?.data?.enabled === true)).catch(() => {});
    api.get("/candidates/top?type=MISS&limit=10")
      .then((r) => setTopMiss(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingCandidates(false));
  }, []);

  const contestInfo = (() => {
    if (!contest) return { label: "—", sub: "Aucun concours", color: "#2563EB" };
    const now = new Date();
    const start = new Date(contest.startDate);
    const end = contest.endDate ? new Date(contest.endDate) : null;
    if (now < start) {
      const diff = Math.ceil((start.getTime() - now.getTime()) / 86400000);
      return { label: diff, sub: `Début dans ${diff}j`, color: "#F59E0B" };
    }
    if (end) {
      const diff = Math.ceil((end.getTime() - now.getTime()) / 86400000);
      if (diff <= 0) return { label: "Terminé", sub: "Concours clôturé", color: "#94A3B8" };
      return { label: diff, sub: "Avant la finale", color: "#2563EB" };
    }
    return { label: "∞", sub: "Sans date de fin", color: "#10B981" };
  })();

  const topAll = topMiss.slice(0, 10);
  const totalVotes = stats?.totalVotesCount;
  const votesDisplay = totalVotes >= 1000 ? `${(totalVotes / 1000).toFixed(1)}K` : totalVotes ?? "—";

  return (
    <div className="page-content fade-up">
      <style>{`
        /* ═══════════════════════════════════
           HOME PAGE — REDESIGN
        ═══════════════════════════════════ */

        /* Banniere votes doubles */
        .home-double {
          margin: 0 16px 20px;
          background: linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%);
          border-radius: 16px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #fff;
          box-shadow: 0 6px 24px rgba(16,185,129,0.35);
        }
        @media (min-width: 1024px) { .home-double { margin: 0 0 20px; } }
        .home-double .ic { font-size: 1.7rem; line-height: 1; }
        .home-double .t { font-weight: 800; font-size: 0.95rem; }
        .home-double .s { font-size: 0.76rem; opacity: 0.92; }

        /* Hero banner */
        .home-hero {
          margin: 0 16px 20px;
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          min-height: 200px;
          background: linear-gradient(135deg, #1340c4 0%, #2563EB 45%, #3B82F6 100%);
          display: flex;
          align-items: flex-end;
        }
        .home-hero-bg-circle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.07);
        }
        .home-hero-content {
          position: relative;
          z-index: 2;
          padding: 24px 22px 22px;
          flex: 1;
        }
        .home-hero-edition {
          display: inline-block;
          background: rgba(255,255,255,0.18);
          color: #fff;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          padding: 4px 10px;
          border-radius: 6px;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        .home-hero-title {
          font-size: clamp(1.5rem, 5vw, 2.4rem);
          font-weight: 900;
          color: #fff;
          line-height: 1.05;
          letter-spacing: -0.01em;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .home-hero-sub {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.75);
          margin-bottom: 18px;
        }
        .home-hero-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.18);
          border: 1.5px solid rgba(255,255,255,0.35);
          color: #fff;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 10px 18px;
          border-radius: 12px;
          text-decoration: none;
          backdrop-filter: blur(4px);
          transition: background 0.15s;
        }
        .home-hero-cta:hover { background: rgba(255,255,255,0.28); }

        /* Hero image */
        .home-hero-img {
          display: none;
          position: absolute;
          right: 0; bottom: 0; top: 0;
          width: 45%;
          object-fit: cover;
          object-position: top center;
          mask-image: linear-gradient(to left, rgba(0,0,0,0.8) 60%, transparent);
          -webkit-mask-image: linear-gradient(to left, rgba(0,0,0,0.8) 60%, transparent);
        }
        @media (min-width: 500px) {
          .home-hero { min-height: 240px; }
          .home-hero-img { display: block; }
        }
        @media (min-width: 1024px) {
          .home-hero { min-height: 280px; margin: 0 0 24px; border-radius: 20px; }
        }

        /* Stats grid */
        .home-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 0 16px;
          margin-bottom: 24px;
        }
        @media (min-width: 640px) {
          .home-stats-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .home-stat-card {
          background: var(--bg-white);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          padding: 16px 14px;
          box-shadow: var(--shadow);
        }
        .home-stat-icon-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }
        .home-stat-icon-wrap {
          width: 28px; height: 28px;
          border-radius: 8px;
          background: var(--blue-light);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .home-stat-label {
          font-size: 0.68rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .home-stat-value {
          font-size: 1.6rem;
          font-weight: 900;
          color: var(--text);
          line-height: 1;
          margin-bottom: 2px;
        }
        .home-stat-sub {
          font-size: 0.65rem;
          color: var(--text-muted);
        }

        /* Section header */
        .home-section-hd {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          margin-bottom: 12px;
        }
        .home-section-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text);
        }
        .home-see-all {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.78rem;
          color: var(--blue);
          font-weight: 600;
          text-decoration: none;
        }

        /* Candidate horizontal scroll */
        .home-cand-scroll {
          display: flex;
          gap: 10px;
          padding: 0 16px 4px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .home-cand-scroll::-webkit-scrollbar { display: none; }
        .home-cand-card {
          flex-shrink: 0;
          scroll-snap-align: start;
          width: 130px;
          border-radius: 18px;
          overflow: hidden;
          background: var(--bg-white);
          border: 1.5px solid var(--border);
          box-shadow: var(--shadow);
          text-decoration: none;
          display: block;
          transition: transform 0.2s;
        }
        .home-cand-card:hover { transform: translateY(-2px); }
        .home-cand-img-wrap {
          position: relative;
          height: 160px;
          background: var(--bg);
          overflow: hidden;
        }
        .home-cand-img-wrap img {
          width: 100%; height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }
        .home-cand-card:hover .home-cand-img-wrap img { transform: scale(1.05); }
        .home-cand-rank {
          position: absolute;
          top: 8px; left: 8px;
          width: 24px; height: 24px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem;
          font-weight: 800;
          color: #fff;
        }
        .home-cand-overlay {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.72));
          padding: 28px 8px 8px;
          color: #fff;
        }
        .home-cand-name {
          font-size: 0.75rem;
          font-weight: 800;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .home-cand-type {
          font-size: 0.62rem;
          opacity: 0.8;
        }
        .home-cand-body {
          padding: 8px 10px 10px;
        }
        .home-cand-votes {
          font-size: 0.68rem;
          color: var(--text-muted);
          margin-bottom: 3px;
        }
        .home-cand-votes strong { color: var(--text); font-weight: 700; }
        .home-cand-pct {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--blue);
        }
        .home-cand-bar {
          height: 3px;
          background: var(--blue-mid);
          border-radius: 100px;
          margin-top: 4px;
          overflow: hidden;
        }
        .home-cand-bar-fill {
          height: 100%;
          background: var(--blue);
          border-radius: 100px;
        }

        /* Scroll arrows */
        .home-cand-scroll-wrap {
          position: relative;
        }
        .home-scroll-arrow {
          display: none;
        }
        @media (min-width: 640px) {
          .home-scroll-arrow {
            display: flex;
            position: absolute;
            top: 50%; transform: translateY(-60%);
            width: 32px; height: 32px;
            border-radius: 50%;
            background: var(--bg-white);
            border: 1.5px solid var(--border);
            box-shadow: var(--shadow-md);
            align-items: center; justify-content: center;
            cursor: pointer;
            z-index: 5;
            transition: all 0.15s;
          }
          .home-scroll-arrow:hover { background: var(--blue); border-color: var(--blue); }
          .home-scroll-arrow:hover svg { stroke: #fff; }
          .home-scroll-arrow.left { left: 4px; }
          .home-scroll-arrow.right { right: 4px; }
        }

        /* CTA bottom banner */
        .home-cta-banner {
          margin: 20px 16px 0;
          background: var(--blue-light);
          border: 1.5px solid var(--blue-mid);
          border-radius: 18px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .home-cta-icon {
          width: 48px; height: 48px;
          border-radius: 50%;
          background: var(--blue);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .home-cta-text h3 {
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--blue);
          margin-bottom: 2px;
        }
        .home-cta-text p {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .home-cta-btn {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--blue);
          color: #fff;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 10px 16px;
          border-radius: 12px;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .home-cta-btn:hover { background: var(--blue-hover); }

        @media (max-width: 420px) {
          .home-cta-banner { flex-wrap: wrap; }
          .home-cta-btn { margin-left: 0; width: 100%; justify-content: center; }
        }
      `}</style>

      {/* Banniere votes doubles */}
      {doubleVotes && (
        <div className="home-double">
          <span className="ic">⚡</span>
          <div>
            <div className="t">Votes doubles activés !</div>
            <div className="s">Pendant la promo, chaque vote compte ×2 pour votre candidat·e.</div>
          </div>
        </div>
      )}

      {/* HERO BANNER */}
      <div className="home-hero">
        <div className="home-hero-bg-circle" style={{ width: 220, height: 220, top: -60, right: -40 }} />
        <div className="home-hero-bg-circle" style={{ width: 120, height: 120, bottom: -40, left: 80 }} />
        <div className="home-hero-bg-circle" style={{ width: 60, height: 60, top: 20, left: 200 }} />

        <div className="home-hero-content">
          <span className="home-hero-edition">Édition 2026</span>
          <div className="home-hero-title">
            META<br />
            MISS MASTER<br />
            2026
          </div>
          <div className="home-hero-sub">Votez maintenant · Résultats en direct</div>
          <Link href="/ranking" className="home-hero-cta">
            Voir les résultats
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="home-stats-grid">
        {/* Candidats */}
        <div className="home-stat-card">
          <div className="home-stat-icon-row">
            <div className="home-stat-icon-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <span className="home-stat-label">{t.candidates_label || "Candidats"}</span>
          </div>
          <div className="home-stat-value">{stats?.totalCandidates ?? "—"}</div>
          <div className="home-stat-sub">{t.inCompetition || "En compétition"}</div>
        </div>

        {/* Votes actifs */}
        <div className="home-stat-card">
          <div className="home-stat-icon-row">
            <div className="home-stat-icon-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <span className="home-stat-label">{t.activeVotes || "Votes actifs"}</span>
          </div>
          <div className="home-stat-value">{votesDisplay}</div>
          <div className="home-stat-sub">{t.today || "Aujourd'hui"}</div>
        </div>

        {/* Jours restants */}
        <div className="home-stat-card">
          <div className="home-stat-icon-row">
            <div className="home-stat-icon-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
              </svg>
            </div>
            <span className="home-stat-label">{t.daysLeft || "Jours restants"}</span>
          </div>
          <div className="home-stat-value" style={{ color: contestInfo.color }}>{contestInfo.label}</div>
          <div className="home-stat-sub">{contestInfo.sub}</div>
        </div>

        {/* Participation */}
        <div className="home-stat-card">
          <div className="home-stat-icon-row">
            <div className="home-stat-icon-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4l3 3"/>
                <path d="M2 12h3M19 12h3M12 2v3M12 19v3" strokeWidth="1.5"/>
              </svg>
            </div>
            <span className="home-stat-label">{t.participation || "Participation"}</span>
          </div>
          <div className="home-stat-value">78%</div>
          <div className="home-stat-sub">{t.globalRate || "Taux global"}</div>
        </div>
      </div>

      {/* TOP CANDIDATES */}
      <div className="home-section-hd">
        <span className="home-section-title">{t.topCandidates || "Top candidates"}</span>
        <Link href="/candidates" className="home-see-all">
          Voir tout
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </Link>
      </div>

      {/* Loading skeletons */}
      {loadingCandidates && (
        <div style={{ display: "flex", gap: 10, padding: "0 16px", overflow: "hidden" }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ flexShrink: 0, width: 130 }}>
              <div className="shimmer" style={{ height: 160, borderRadius: 18, marginBottom: 8 }} />
              <div className="shimmer" style={{ height: 12, borderRadius: 6, marginBottom: 5 }} />
              <div className="shimmer" style={{ height: 10, borderRadius: 6, width: "60%" }} />
            </div>
          ))}
        </div>
      )}

      {/* No candidates */}
      {!loadingCandidates && topAll.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", padding: "32px 24px", textAlign: "center", margin: "0 16px", background: "var(--bg)", borderRadius: 16, border: "1.5px dashed var(--border)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🎭</div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", marginBottom: 6 }}>{t.noCandidatesYet}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>{t.noCandidatesDesc}</div>
          <CandidacyButton variant="compact" style={{ margin: "0 auto" }} />
        </div>
      )}

      {/* Horizontal scroll of candidates */}
      {!loadingCandidates && topAll.length > 0 && (() => {
        const total = topAll.reduce((sum, c) => sum + (c.totalVotes || 0), 0) || 1;
        return (
          <div className="home-cand-scroll-wrap">
            <div className="home-cand-scroll" id="home-cand-scroll">
              {topAll.map((c, i) => {
                const photo = c.photoUrl?.startsWith("http") ? c.photoUrl : `${apiBase}${c.photoUrl}`;
                const pct = Math.round(((c.totalVotes || 0) / total) * 100);
                const rankColor = i === 0 ? "#F59E0B" : i === 1 ? "#9CA3AF" : i === 2 ? "#D97706" : "var(--blue)";
                const vDisplay = (c.totalVotes || 0) >= 1000 ? `${((c.totalVotes || 0) / 1000).toFixed(1)}K` : String(c.totalVotes || 0);
                return (
                  <Link key={c.id} href={`/candidates/${c.id}`} className="home-cand-card fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                    <div className="home-cand-img-wrap">
                      <img src={photo} alt={c.name}
                        onError={(e: any) => { e.target.src = "/placeholder-avatar.svg"; e.target.onerror = null; }} />
                      <div className="home-cand-rank" style={{ background: rankColor }}>{i + 1}</div>
                      <div className="home-cand-overlay">
                        <div className="home-cand-name">{c.name.split(" ")[0]}</div>
                        <div className="home-cand-type">{c.city || "Miss"}</div>
                      </div>
                    </div>
                    <div className="home-cand-body">
                      <div className="home-cand-votes">
                        <strong>{vDisplay}</strong> votes
                      </div>
                      <div className="home-cand-pct">{pct}%</div>
                      <div className="home-cand-bar">
                        <div className="home-cand-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <button className="home-scroll-arrow left"
              onClick={() => { const el = document.getElementById("home-cand-scroll"); if (el) el.scrollBy({ left: -280, behavior: "smooth" }); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button className="home-scroll-arrow right"
              onClick={() => { const el = document.getElementById("home-cand-scroll"); if (el) el.scrollBy({ left: 280, behavior: "smooth" }); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        );
      })()}

      {/* BOTTOM CTA */}
      <div className="home-cta-banner">
        <div className="home-cta-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18"/>
            <path d="M8 22h8M12 2v20M6 9h12v7a5 5 0 01-10 0V9z"/>
          </svg>
        </div>
        <div className="home-cta-text">
          <h3>Soutenez votre candidate préférée</h3>
          <p>Chaque vote compte ! Faites la différence.</p>
        </div>
        <Link href="/vote" className="home-cta-btn">
          Voter maintenant
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </Link>
      </div>
    </div>
  );
}
