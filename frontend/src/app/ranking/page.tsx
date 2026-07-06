"use client";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Link from "next/link";
import api from "@/lib/api";
import { useT } from "@/store/langStore";
import CandidacyButton from "@/components/CandidacyButton";
import toast from "react-hot-toast";

interface RC {
  id: string;
  name: string;
  city: string;
  photoUrl: string;
  totalVotes: number;
  points?: number;
  rank: number;
}

interface TopVoter {
  username: string;
  totalVotes: number;
  candidateName: string;
  candidateType: "MISS" | "MASTER";
}

export default function RankingPage() {
  const t = useT();
  const [miss, setMiss] = useState<RC[]>([]);
  const [topVoters, setTopVoters] = useState<TopVoter[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVoters, setLoadingVoters] = useState(true);
  const [live, setLive] = useState(false);
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
    "http://localhost:5000";

  useEffect(() => {
    Promise.all([
      api.get("/ranking?type=MISS").then((r) => setMiss(r.data.data || [])),
      api
        .get("/ranking/top-voters")
        .then((r) => setTopVoters(r.data.data || []))
        .catch(() => {})
        .finally(() => setLoadingVoters(false)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));

    const socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000",
      { transports: ["websocket"] }
    );
    socket.on("connect", () => {
      setLive(true);
      socket.emit("join:ranking");
    });
    socket.on("disconnect", () => setLive(false));
    socket.on("ranking:update", (d) => {
      setMiss(d.miss || []);
      if (d.topVoters) setTopVoters(d.topVoters);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const current = miss;
  const realTotal = current.reduce((sum, c) => sum + (c.totalVotes || 0), 0);
  const total = realTotal || 1;
  const pct = (v: number) => Math.round((v / total) * 100);
  const totalDisplay = realTotal >= 1000 ? `${(realTotal / 1000).toFixed(1)}K` : String(realTotal);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Meta Miss Master — Classement", url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié !");
    }
  };
  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Lien copié !");
  };
  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        "Classement Meta Miss Master 2026 : " + window.location.href
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  };
  const handleTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        "Classement Meta Miss Master 2026"
      )}&url=${encodeURIComponent(window.location.href)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="page-content fade-up">
      <style>{`
        /* ═══════════════════════════════════
           RANKING PAGE — REDESIGN
        ═══════════════════════════════════ */

        /* Page header */
        .rk-header {
          padding: 20px 16px 16px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .rk-header-left h1 {
          font-size: 1.3rem;
          font-weight: 900;
          color: var(--text);
          line-height: 1.2;
          margin-bottom: 4px;
        }
        .rk-header-sub {
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .rk-edition-badge {
          display: inline-block;
          background: var(--blue);
          color: #fff;
          font-size: 0.62rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
          white-space: nowrap;
          flex-shrink: 0;
          align-self: flex-start;
          margin-top: 3px;
        }

        /* Tabs */
        .rk-tabs {
          display: flex;
          gap: 0;
          background: var(--bg);
          border-radius: 14px;
          margin: 0 16px 20px;
          padding: 4px;
          border: 1.5px solid var(--border);
        }
        .rk-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 0;
          border-radius: 10px;
          font-size: 0.88rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          font-family: var(--font);
          transition: all 0.2s;
          color: var(--text-muted);
          background: transparent;
        }
        .rk-tab.active {
          background: var(--blue);
          color: #fff;
          box-shadow: 0 4px 12px rgba(37,99,235,0.3);
        }

        /* Table card */
        .rk-table-card {
          margin: 0 16px 16px;
          background: var(--bg-white);
          border: 1.5px solid var(--border);
          border-radius: 18px;
          overflow: hidden;
          box-shadow: var(--shadow);
        }

        /* Table header */
        .rk-table-head {
          display: grid;
          grid-template-columns: 44px 1fr auto;
          gap: 0;
          padding: 10px 16px;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
        }
        .rk-th {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .rk-th.right { text-align: right; }

        /* Table rows */
        .rk-row {
          display: grid;
          grid-template-columns: 44px 1fr auto;
          gap: 0;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-light);
          text-decoration: none;
          transition: background 0.12s;
        }
        .rk-row:last-child { border-bottom: none; }
        .rk-row:hover { background: var(--bg); }

        /* Rank badge */
        .rk-rank {
          width: 28px; height: 28px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem;
          font-weight: 800;
          color: #fff;
          flex-shrink: 0;
        }

        /* Candidate cell */
        .rk-cand-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .rk-cand-photo {
          width: 44px; height: 44px;
          border-radius: 10px;
          object-fit: cover;
          flex-shrink: 0;
          background: var(--bg);
        }
        .rk-cand-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 4px;
        }
        .rk-progress {
          height: 4px;
          background: var(--blue-mid);
          border-radius: 100px;
          overflow: hidden;
          max-width: 120px;
        }
        .rk-progress-fill {
          height: 100%;
          background: var(--blue);
          border-radius: 100px;
          transition: width 0.8s ease;
        }

        /* Score cell : percentage (big) + votes (small) */
        .rk-score {
          text-align: right;
          min-width: 64px;
        }
        .rk-score-pct {
          font-size: 1rem;
          font-weight: 800;
          color: var(--blue);
          line-height: 1.1;
        }
        .rk-score-votes {
          font-size: 0.66rem;
          color: var(--text-muted);
          font-weight: 600;
          margin-top: 1px;
        }

        /* Live badge */
        .rk-live-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          margin: 0 16px 16px;
          background: var(--bg-white);
          border: 1.5px solid var(--border);
          border-radius: 12px;
          font-size: 0.78rem;
          color: var(--text-muted);
          box-shadow: var(--shadow);
        }
        .rk-live-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--border);
          flex-shrink: 0;
        }
        .rk-live-dot.on {
          background: #10B981;
          animation: live-pulse 1.5s infinite;
        }
        @keyframes live-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }

        /* ═══════════════════════════════════
           TOP VOTANTS
        ═══════════════════════════════════ */
        .tv-card {
          margin: 0 16px 16px;
          background: var(--bg-white);
          border: 1.5px solid var(--border);
          border-radius: 18px;
          overflow: hidden;
          box-shadow: var(--shadow);
        }
        .tv-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 12px;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
        }
        .tv-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
          font-weight: 900;
          color: var(--text);
        }
        .tv-live-badge {
          font-size: 0.6rem;
          font-weight: 800;
          background: #10B981;
          color: #fff;
          padding: 3px 9px;
          border-radius: 6px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .tv-live-badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #fff;
          animation: live-pulse 1.5s infinite;
          flex-shrink: 0;
        }
        .tv-row {
          display: grid;
          grid-template-columns: 40px 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 11px 16px;
          border-bottom: 1px solid var(--border-light);
          transition: background 0.12s;
        }
        .tv-row:last-child { border-bottom: none; }
        .tv-row:hover { background: var(--bg); }
        .tv-rank-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tv-rank-medal {
          font-size: 1.3rem;
          line-height: 1;
        }
        .tv-rank-number {
          width: 26px; height: 26px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.72rem;
          font-weight: 800;
          background: var(--bg);
          color: var(--text-muted);
          border: 1.5px solid var(--border);
        }
        .tv-user-info { min-width: 0; }
        .tv-username {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .tv-voted-for {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.7rem;
          color: var(--text-muted);
          flex-wrap: wrap;
        }
        .tv-candidate-chip {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 1px 8px;
          font-weight: 700;
          color: var(--text);
          font-size: 0.68rem;
          max-width: 110px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tv-type-badge-miss {
          font-size: 0.58rem;
          font-weight: 800;
          background: #EFF6FF;
          color: #2563EB;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.04em;
          flex-shrink: 0;
        }
        .tv-type-badge-master {
          font-size: 0.58rem;
          font-weight: 800;
          background: #F0FDF4;
          color: #16A34A;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.04em;
          flex-shrink: 0;
        }
        .tv-votes-right {
          text-align: right;
          flex-shrink: 0;
        }
        .tv-vote-count {
          font-size: 1rem;
          font-weight: 900;
          color: var(--text);
          line-height: 1.1;
        }
        .tv-vote-label {
          font-size: 0.6rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .tv-empty {
          padding: 44px 24px;
          text-align: center;
        }
        .tv-skel-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 16px;
          border-bottom: 1px solid var(--border-light);
        }
        .tv-skel-row:last-child { border-bottom: none; }

        /* Mobile responsive top votants */
        @media (max-width: 480px) {
          .tv-row { grid-template-columns: 34px 1fr auto; gap: 8px; padding: 10px 12px; }
          .tv-rank-medal { font-size: 1.1rem; }
          .tv-username { font-size: 0.78rem; }
          .tv-vote-count { font-size: 0.9rem; }
          .tv-candidate-chip { max-width: 90px; }
        }

        /* Share card */
        .rk-share-card {
          margin: 0 16px 24px;
          background: var(--bg-white);
          border: 1.5px solid var(--border);
          border-radius: 18px;
          padding: 18px 18px 16px;
          box-shadow: var(--shadow);
        }
        .rk-share-title {
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--blue);
          margin-bottom: 4px;
        }
        .rk-share-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 14px;
        }
        .rk-share-btns {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .rk-share-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          font-size: 0.65rem;
          color: var(--text-muted);
          font-weight: 600;
          background: none;
          border: none;
          font-family: var(--font);
        }
        .rk-share-btn-icon {
          width: 44px; height: 44px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg);
          border: 1.5px solid var(--border);
          transition: all 0.15s;
        }
        .rk-share-btn:hover .rk-share-btn-icon {
          background: var(--blue-light);
          border-color: var(--blue-mid);
        }

        /* Skeleton rows */
        .rk-skel-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-light);
        }
        .rk-skel-row:last-child { border-bottom: none; }

        /* Mobile: compact layout */
        @media (max-width: 480px) {
          .rk-table-head { grid-template-columns: 36px 1fr auto; padding: 8px 12px; }
          .rk-row { grid-template-columns: 36px 1fr auto; padding: 10px 12px; }
          .rk-rank { width: 24px; height: 24px; font-size: 0.68rem; }
          .rk-cand-photo { width: 38px; height: 38px; border-radius: 8px; }
          .rk-cand-name { font-size: 0.78rem; }
          .rk-score-pct { font-size: 0.9rem; }
          .rk-score-votes { font-size: 0.6rem; }
          .rk-progress { max-width: 90px; }
        }
        @media (max-width: 360px) {
          .rk-table-head { grid-template-columns: 32px 1fr auto; padding: 8px 10px; }
          .rk-row { grid-template-columns: 32px 1fr auto; padding: 8px 10px; }
          .rk-cand-photo { width: 34px; height: 34px; }
          .rk-cand-name { font-size: 0.72rem; }
          .rk-progress { display: none; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div className="rk-header">
        <div className="rk-header-left">
          <h1>{t.resultsLive || "Résultats en direct"}</h1>
          <div className="rk-header-sub">
            {t.rankingSub || "Classement des candidates"}
          </div>
        </div>
        <span className="rk-edition-badge">{t.edition || "Édition 2026"}</span>
      </div>

      {/* ── LIVE banner ── */}
      <div className="rk-live2">
        <div className="rk-live2-ic">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rk-live2-t">{t.liveResults || "Résultats en temps réel"}</div>
          <div className="rk-live2-s">{t.autoUpdated || "Mis à jour automatiquement"}</div>
        </div>
        <span className={`rk-live2-badge${live ? " on" : ""}`}><i />{live ? "LIVE" : "..."}</span>
      </div>

      {/* Total des votes */}
      <div className="rk-total">
        <span className="rk-total-l">{t.totalVotesTitle || "Total des votes"}</span>
        <span className="rk-total-v">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
          {totalDisplay}
        </span>
      </div>

      {/* ── CANDIDATE CARDS ── */}
      <div className="rk-clist">
        <style>{`
          .rk-live2 { display: flex; align-items: center; gap: 12px; margin: 0 16px 14px; padding: 14px 16px; border-radius: 18px; background: linear-gradient(135deg, #0B1F4D, #1D4ED8); box-shadow: 0 10px 28px rgba(11,31,77,0.32); }
          .rk-live2-ic { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.16); display: grid; place-items: center; flex-shrink: 0; }
          .rk-live2-t { font-size: 0.92rem; font-weight: 800; color: #fff; }
          .rk-live2-s { font-size: 0.72rem; color: rgba(255,255,255,0.7); margin-top: 1px; }
          .rk-live2-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 0.72rem; font-weight: 800; color: #fff; background: rgba(255,255,255,0.15); padding: 6px 11px; border-radius: 100px; }
          .rk-live2-badge i { width: 7px; height: 7px; border-radius: 50%; background: #9CA3AF; }
          .rk-live2-badge.on i { background: #34D399; box-shadow: 0 0 0 3px rgba(52,211,153,0.3); animation: rk-pulse 1.5s infinite; }
          @keyframes rk-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
          .rk-total { display: flex; align-items: center; justify-content: space-between; margin: 0 16px 14px; padding: 0 2px; }
          .rk-total-l { font-size: 0.82rem; color: var(--text-muted); font-weight: 600; }
          .rk-total-v { display: inline-flex; align-items: center; gap: 6px; font-size: 1rem; font-weight: 800; color: var(--text); }
          .rk-clist { display: grid; gap: 12px; padding: 0 16px; }
          @media (min-width: 720px) { .rk-clist { grid-template-columns: 1fr 1fr; } .rk-ccard.top { grid-column: 1 / -1; } }
          .rk-ccard { background: var(--bg-white); border: 1.5px solid var(--border); border-radius: 18px; padding: 14px; box-shadow: var(--shadow); }
          .rk-ccard.top { background: linear-gradient(140deg, #0B1F4D 0%, #15347E 60%, #1D4ED8 100%); border-color: transparent; box-shadow: 0 14px 36px rgba(11,31,77,0.4); }
          .rk-ccard-row { display: flex; align-items: center; gap: 12px; }
          .rk-cmedal { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-size: 0.82rem; font-weight: 800; color: #fff; flex-shrink: 0; }
          .rk-cavatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid rgba(255,255,255,0.5); }
          .rk-ccard.top .rk-cavatar { border-color: rgba(255,255,255,0.5); width: 56px; height: 56px; }
          .rk-cmeta { flex: 1; min-width: 0; text-decoration: none; }
          .rk-cname { font-size: 0.95rem; font-weight: 800; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .rk-ccard.top .rk-cname { color: #fff; font-size: 1.05rem; }
          .rk-ccity { font-size: 0.72rem; color: var(--text-muted); margin: 1px 0 7px; }
          .rk-ccard.top .rk-ccity { color: rgba(255,255,255,0.7); }
          .rk-cbar { height: 6px; border-radius: 100px; background: var(--blue-mid); overflow: hidden; }
          .rk-ccard.top .rk-cbar { background: rgba(255,255,255,0.2); }
          .rk-cbar-fill { height: 100%; border-radius: 100px; background: var(--blue); }
          .rk-ccard.top .rk-cbar-fill { background: #fff; }
          .rk-cpct { font-size: 0.68rem; font-weight: 700; color: var(--text-muted); margin-top: 4px; }
          .rk-ccard.top .rk-cpct { color: rgba(255,255,255,0.8); }
          .rk-cvotes { text-align: right; flex-shrink: 0; }
          .rk-cvotes-n { font-size: 1.05rem; font-weight: 900; color: var(--blue); line-height: 1; }
          .rk-ccard.top .rk-cvotes-n { color: #fff; }
          .rk-cvotes-l { font-size: 0.62rem; color: var(--text-muted); }
          .rk-ccard.top .rk-cvotes-l { color: rgba(255,255,255,0.7); }
          /* Badge points (éliminations par points) */
          .rk-cpoints { display: inline-flex; align-items: center; gap: 4px; margin: 2px 0 6px; padding: 2px 9px; border-radius: 100px; background: linear-gradient(135deg,#B45309,#F59E0B); color: #fff; font-size: 0.66rem; font-weight: 800; letter-spacing: 0.01em; box-shadow: 0 2px 6px rgba(245,158,11,0.35); }
          .rk-cpoints svg { display: block; }
          .rk-ccard.top .rk-cpoints { background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.35); }
          .rk-cactions { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
          .rk-vote-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 11px; border-radius: 12px; background: var(--blue); color: #fff; font-size: 0.82rem; font-weight: 800; text-decoration: none; transition: background 0.15s; }
          .rk-vote-btn:hover { background: var(--blue-hover); }
          .rk-ccard.top .rk-vote-btn { background: #fff; color: var(--blue-dark); }
          .rk-iconbtn { width: 40px; height: 40px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--bg-white); display: grid; place-items: center; cursor: pointer; flex-shrink: 0; transition: all 0.15s; }
          .rk-iconbtn:hover { border-color: var(--blue); }
          .rk-ccard.top .rk-iconbtn { border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.12); }
          .rk-wa { background: #25D366 !important; border-color: #25D366 !important; }
        `}</style>

        {/* Loading skeletons */}
        {loading &&
          [1, 2, 3].map((i) => (
            <div key={i} className="rk-ccard">
              <div className="rk-ccard-row">
                <div className="shimmer" style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0 }} />
                <div className="shimmer" style={{ width: 50, height: 50, borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="shimmer" style={{ height: 13, borderRadius: 6, marginBottom: 6, maxWidth: 140 }} />
                  <div className="shimmer" style={{ height: 6, borderRadius: 100, maxWidth: 120 }} />
                </div>
                <div className="shimmer" style={{ width: 36, height: 20, borderRadius: 6 }} />
              </div>
            </div>
          ))}

        {/* Empty state */}
        {!loading && current.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              padding: "60px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>🏆</div>
            <div
              style={{
                fontWeight: 800,
                fontSize: "1rem",
                color: "var(--text)",
                marginBottom: 8,
              }}
            >
              {t.noResultsYet || "Aucun résultat"}
            </div>
            <div
              style={{
                fontSize: "0.83rem",
                color: "var(--text-muted)",
                marginBottom: 28,
                lineHeight: 1.6,
              }}
            >
              {t.noResultsDesc ||
                "Les résultats apparaîtront ici dès les premiers votes."}
            </div>
            <CandidacyButton variant="full" style={{ margin: "0 auto" }} />
          </div>
        )}

        {/* Candidate cards */}
        {!loading &&
          current.map((c, i) => {
            const photo = c.photoUrl?.startsWith("http") ? c.photoUrl : `${apiBase}${c.photoUrl}`;
            const percent = pct(c.totalVotes);
            const medalColor = i === 0 ? "#F59E0B" : i === 1 ? "#9CA3AF" : i === 2 ? "#D97706" : "var(--blue)";
            const vDisplay = c.totalVotes >= 1000 ? `${(c.totalVotes / 1000).toFixed(1)}K` : String(c.totalVotes);
            const firstName = c.name.split(" ")[0];
            return (
              <div key={c.id} className={`rk-ccard fade-up${i === 0 ? " top" : ""}`} style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
                <div className="rk-ccard-row">
                  <div className="rk-cmedal" style={{ background: medalColor }}>{i + 1}</div>
                  <img className="rk-cavatar" src={photo} alt={c.name} onError={(e: any) => { if (!e.target.src.endsWith("/placeholder-avatar.svg")) e.target.src = "/placeholder-avatar.svg"; }} />
                  <Link href={`/candidates/${c.id}`} className="rk-cmeta">
                    <div className="rk-cname">{c.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="rk-cpoints" title="Points cumulés (éliminations par points)">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                        {(c.points ?? 0)} pts
                      </span>
                      <span className="rk-ccity" style={{ margin: 0 }}>{c.city || "—"}</span>
                    </div>
                    <div className="rk-cbar" style={{ marginTop: 6 }}><div className="rk-cbar-fill" style={{ width: `${percent}%` }} /></div>
                    <div className="rk-cpct">{percent}%</div>
                  </Link>
                  <div className="rk-cvotes">
                    <div className="rk-cvotes-n">{vDisplay}</div>
                    <div className="rk-cvotes-l">votes</div>
                  </div>
                </div>
                <div className="rk-cactions">
                  <Link href={`/vote/${c.id}`} className="rk-vote-btn">
                    {t.voteFor || "Voter pour"} {firstName}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </Link>
                  <button className="rk-iconbtn" aria-label="Partager" onClick={async () => {
                    const url = `${window.location.origin}/candidates/${c.id}`;
                    try { if (navigator.share) await navigator.share({ title: c.name, url }); else { await navigator.clipboard.writeText(url); toast.success("Lien copié !"); } } catch { /* annulé */ }
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={i === 0 ? "#fff" : "var(--text-2)"} strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                  </button>
                  <button className="rk-iconbtn rk-wa" aria-label="WhatsApp" onClick={() => {
                    const url = `${window.location.origin}/candidates/${c.id}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(`Votez pour ${c.name} sur Meta Miss Master ! ${url}`)}`, "_blank", "noopener,noreferrer");
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* ══════════════════════════════════════
          ── TOP VOTANTS ──
      ══════════════════════════════════════ */}
      <div className="tv-card">
        {/* Header */}
        <div className="tv-header">
          <div className="tv-header-left">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="#F59E0B"
              aria-hidden="true"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Top votants
          </div>
          <div className="tv-live-badge">
            <div className="tv-live-badge-dot" />
            Live
          </div>
        </div>

        {/* Loading skeletons */}
        {loadingVoters &&
          [1, 2, 3].map((i) => (
            <div key={i} className="tv-skel-row">
              <div
                className="shimmer"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  className="shimmer"
                  style={{
                    height: 13,
                    borderRadius: 6,
                    marginBottom: 6,
                    maxWidth: 120,
                  }}
                />
                <div
                  className="shimmer"
                  style={{ height: 11, borderRadius: 6, maxWidth: 160 }}
                />
              </div>
              <div
                className="shimmer"
                style={{
                  width: 32,
                  height: 20,
                  borderRadius: 6,
                  flexShrink: 0,
                }}
              />
            </div>
          ))}

        {/* Empty state */}
        {!loadingVoters && topVoters.length === 0 && (
          <div className="tv-empty">
            <div style={{ fontSize: "2.2rem", marginBottom: 10 }}>🗳️</div>
            <div
              style={{
                fontWeight: 800,
                fontSize: "0.9rem",
                color: "var(--text)",
                marginBottom: 6,
              }}
            >
              Aucun votant pour l'instant
            </div>
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                lineHeight: 1.6,
              }}
            >
              Les top votants apparaîtront ici dès les premiers votes.
            </div>
          </div>
        )}

        {/* Voter rows */}
        {!loadingVoters &&
          topVoters.map((v, i) => {
            const medals = ["🥇", "🥈", "🥉"];
            const vDisplay =
              v.totalVotes >= 1000
                ? `${(v.totalVotes / 1000).toFixed(1)}K`
                : String(v.totalVotes);

            return (
              <div
                key={`${v.username}-${i}`}
                className="tv-row fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {/* Rang */}
                <div className="tv-rank-cell">
                  {i < 3 ? (
                    <span className="tv-rank-medal">{medals[i]}</span>
                  ) : (
                    <div className="tv-rank-number">{i + 1}</div>
                  )}
                </div>

                {/* Infos utilisateur */}
                <div className="tv-user-info">
                  <div className="tv-username">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-muted)"
                      strokeWidth="2"
                      aria-hidden="true"
                      style={{ flexShrink: 0 }}
                    >
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    {v.username}
                  </div>
                  <div className="tv-voted-for">
                    <span>Vote pour</span>
                    <span className="tv-candidate-chip">
                      <svg
                        width="9"
                        height="9"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      {v.candidateName}
                    </span>
                    <span className="tv-type-badge-miss">Miss</span>
                  </div>
                </div>

                {/* Nombre de votes */}
                <div className="tv-votes-right">
                  <div className="tv-vote-count">{vDisplay}</div>
                  <div className="tv-vote-label">votes</div>
                </div>
              </div>
            );
          })}
      </div>

      {/* ── SHARE CARD ── */}
      <div className="rk-share-card">
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="rk-share-title">Partager le classement</div>
            <div className="rk-share-sub">
              Partagez ces résultats avec vos amis et votre communauté
            </div>
          </div>
        </div>

        <div className="rk-share-btns" style={{ display: "flex" }}>
          <button className="rk-share-btn" onClick={handleShare}>
            <div className="rk-share-btn-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-2)"
                strokeWidth="2"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </div>
            Partager
          </button>
          <button className="rk-share-btn" onClick={handleCopyLink}>
            <div className="rk-share-btn-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-2)"
                strokeWidth="2"
              >
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
            </div>
            Copier le lien
          </button>
          <button className="rk-share-btn" onClick={handleWhatsApp}>
            <div
              className="rk-share-btn-icon"
              style={{ background: "#E8F8F0", borderColor: "#B2ECC8" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            WhatsApp
          </button>
          <button className="rk-share-btn" onClick={handleTwitter}>
            <div
              className="rk-share-btn-icon"
              style={{ background: "#E8F4FF", borderColor: "#BFDBFE" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1DA1F2">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
              </svg>
            </div>
            Twitter
          </button>
          <button className="rk-share-btn" onClick={handleShare}>
            <div className="rk-share-btn-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-2)"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </div>
            Plus
          </button>
        </div>
      </div>
    </div>
  );
}
