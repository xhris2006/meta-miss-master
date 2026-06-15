"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

/**
 * Auto-scrolling, infinitely looping strip of candidate mini-cards (photo + rank).
 * Pulls the live list, so any candidate added later shows up automatically.
 */
export default function LandingCandidates() {
  const [cands, setCands] = useState<any[]>([]);
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

  useEffect(() => {
    api
      .get("/candidates?limit=100")
      .then((r) => setCands(r.data.data?.candidates || []))
      .catch(() => {});
  }, []);

  if (!cands.length) return null;

  // Duplicate the list so the -50% translate loops seamlessly.
  const loop = [...cands, ...cands];
  const duration = Math.max(16, cands.length * 3.5);

  return (
    <div className="lc-wrap">
      <style>{`
        .lc-wrap {
          overflow: hidden; margin: 2px 0 22px; padding: 4px 0;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
        }
        .lc-track { display: flex; gap: 10px; width: max-content; animation-name: lc-scroll; animation-timing-function: linear; animation-iteration-count: infinite; }
        .lc-wrap:hover .lc-track { animation-play-state: paused; }
        @keyframes lc-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .lc-card { flex: 0 0 auto; width: 96px; text-decoration: none; }
        .lc-imgwrap {
          position: relative; width: 96px; height: 116px; border-radius: 14px; overflow: hidden;
          border: 1.5px solid var(--border); background: var(--bg); box-shadow: var(--shadow);
        }
        .lc-imgwrap img { width: 100%; height: 100%; object-fit: cover; }
        .lc-rank {
          position: absolute; top: 6px; left: 6px; background: var(--blue); color: #fff;
          font-size: 0.62rem; font-weight: 800; padding: 2px 7px; border-radius: 7px; letter-spacing: 0.02em;
        }
        .lc-rank.gold { background: #F59E0B; } .lc-rank.silver { background: #94A3B8; } .lc-rank.bronze { background: #D97706; }
        .lc-name { font-size: 0.68rem; font-weight: 700; color: var(--text); text-align: center; margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (prefers-reduced-motion: reduce) { .lc-track { animation: none; } .lc-wrap { overflow-x: auto; } }
      `}</style>
      <div className="lc-track" style={{ animationDuration: `${duration}s` }}>
        {loop.map((c, i) => {
          const photo = c.photoUrl?.startsWith("http") ? c.photoUrl : `${apiBase}${c.photoUrl}`;
          const rank = (i % cands.length) + 1;
          const rankClass = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "";
          return (
            <Link key={i} href={`/candidates/${c.id}`} className="lc-card" aria-label={c.name}>
              <div className="lc-imgwrap">
                <img src={photo} alt={c.name} onError={(e: any) => { if (!e.target.src.endsWith("/placeholder-avatar.svg")) e.target.src = "/placeholder-avatar.svg"; }} />
                <span className={`lc-rank ${rankClass}`}>#{rank}</span>
              </div>
              <div className="lc-name">{c.name.split(" ")[0]}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
