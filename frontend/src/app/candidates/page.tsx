"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/langStore";
import CandidacyButton from "@/components/CandidacyButton";

export default function CandidatesPage() {
  const t = useT();
  const user = useAuthStore((state) => state.user);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

  useEffect(() => {
    api
      .get("/candidates?limit=100")
      .then((r) => setCandidates(r.data.data?.candidates || []))
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false));
  }, []);

  // Rank by votes (list is already vote-sorted by the API)
  const rankMap = new Map<string, number>();
  candidates.forEach((c, i) => rankMap.set(c.id, i + 1));

  const filtered = candidates.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="page-content fade-up">
      <style>{`
        /* ─── CANDIDATES GRID PAGE ─── */
        .cand-page-header { padding: 22px 16px 14px; text-align: center; }
        .cand-page-header .crown-icon { color: var(--blue); margin-bottom: 6px; }
        .cand-page-header h1 {
          font-size: 1.4rem; font-weight: 800; color: var(--blue); letter-spacing: 0.04em;
          text-transform: uppercase; margin-bottom: 4px;
        }
        .cand-page-header p { font-size: 0.82rem; color: var(--text-muted); }

        .cand-search-wrap { padding: 0 16px 12px; }
        .cand-search-inner {
          display: flex; align-items: center; gap: 10px; background: var(--bg-white);
          border: 1.5px solid var(--border); border-radius: 14px; padding: 11px 14px; box-shadow: var(--shadow);
        }
        .cand-search-inner input {
          flex: 1; border: none; background: none; font-size: 0.88rem; color: var(--text);
          font-family: var(--font); outline: none;
        }
        .cand-search-inner input::placeholder { color: var(--text-faint); }

        .cand-filter-row { display: flex; gap: 8px; padding: 0 16px 16px; }
        .cand-chip {
          padding: 8px 18px; border-radius: 100px; font-size: 0.78rem; font-weight: 700; cursor: pointer;
          border: 1.5px solid var(--border); background: var(--bg-white); color: var(--text-muted);
          transition: all 0.18s; font-family: var(--font);
        }
        .cand-chip.active { background: var(--blue); color: #fff; border-color: var(--blue); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }

        /* Small dense grid — 2 cols on mobile, more on larger screens */
        .cand-grid {
          padding: 0 16px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
        }
        @media (min-width: 640px) { .cand-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; } }
        @media (min-width: 980px) { .cand-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 0 24px; } }

        .cand-card {
          background: var(--bg-white); border-radius: 18px; overflow: hidden; border: 1.5px solid var(--border);
          box-shadow: var(--shadow); text-decoration: none; display: block; position: relative;
          transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
        }
        .cand-card:hover {
          transform: translateY(-6px);
          border-color: var(--blue);
          box-shadow: 0 14px 30px rgba(37,99,235,0.22);
        }
        .cand-card:active { transform: translateY(-2px) scale(0.99); }
        .cand-card-img-wrap { position: relative; aspect-ratio: 3/4; background: var(--bg); overflow: hidden; }
        .cand-card-img-wrap::after {
          content: ""; position: absolute; inset: 0; background: rgba(37,99,235,0);
          transition: background 0.22s ease;
        }
        .cand-card:hover .cand-card-img-wrap::after { background: rgba(37,99,235,0.08); }
        .cand-card-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
        .cand-card:hover .cand-card-img-wrap img { transform: scale(1.07); }

        .cand-card-rank {
          position: absolute; top: 9px; left: 9px; background: rgba(37,99,235,0.92); backdrop-filter: blur(6px);
          color: #fff; font-size: 0.7rem; font-weight: 800; padding: 4px 9px; border-radius: 9px;
          display: flex; align-items: center; gap: 4px; letter-spacing: 0.02em;
        }
        .cand-card-rank.gold { background: rgba(245,158,11,0.94); }
        .cand-card-rank.silver { background: rgba(148,163,184,0.94); }
        .cand-card-rank.bronze { background: rgba(217,119,6,0.94); }
        .cand-card-votes {
          position: absolute; top: 9px; right: 9px; background: rgba(255,255,255,0.94); backdrop-filter: blur(6px);
          color: var(--blue); font-size: 0.7rem; font-weight: 800; padding: 4px 9px; border-radius: 9px;
          display: flex; align-items: center; gap: 4px;
        }
        /* gradient name overlay on the photo */
        .cand-card-overlay {
          position: absolute; left: 0; right: 0; bottom: 0; padding: 26px 10px 9px;
          background: linear-gradient(transparent, rgba(0,0,0,0.78)); color: #fff;
        }
        .cand-card-name {
          font-size: 0.88rem; font-weight: 800; line-height: 1.15;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cand-card-cat { font-size: 0.62rem; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }

        .cand-card-foot { display: flex; align-items: center; justify-content: space-between; padding: 9px 11px 11px; }
        .cand-card-foot .pos { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); }
        .cand-card-foot .v { font-size: 0.72rem; font-weight: 800; color: var(--blue); display: flex; align-items: center; gap: 4px; }
        .cand-card-cta {
          display: flex; align-items: center; justify-content: center; gap: 5px; width: 100%;
          padding: 9px; background: var(--blue-light); color: var(--blue); font-size: 0.74rem; font-weight: 800;
          border-top: 1px solid var(--border-light);
        }
        .cand-card:hover .cand-card-cta { background: var(--blue); color: #fff; }

        .cand-skel { border-radius: 18px; overflow: hidden; border: 1px solid var(--border); }
        .cand-skel-img { aspect-ratio: 3/4; }
      `}</style>

      {/* Header */}
      <div className="cand-page-header">
        <div className="crown-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 19h20v2H2v-2zm18-9l-3 9H7L4 10l4 3 4-6 4 6 4-3z" />
          </svg>
        </div>
        <h1>{t.candTitle || "Nos Candidates"}</h1>
        <p>{t.candSubtitle || "Découvrez, soutenez et faites briller vos favorites"}</p>
      </div>

      {/* Search */}
      <div className="cand-search-wrap">
        <div className="cand-search-inner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder || "Rechercher un candidat..."} />
        </div>
      </div>


      {/* Loading */}
      {loading && (
        <div className="cand-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="cand-skel">
              <div className="cand-skel-img shimmer" />
              <div style={{ padding: 11 }}>
                <div className="shimmer" style={{ height: 14, borderRadius: 8, marginBottom: 8 }} />
                <div className="shimmer" style={{ height: 11, borderRadius: 8, width: "60%" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && candidates.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", padding: "60px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎭</div>
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", marginBottom: 8 }}>{t.noCandidatesYet}</div>
          <div style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginBottom: 28, lineHeight: 1.6 }}>{t.noCandidatesDesc}</div>
          <CandidacyButton variant="full" />
        </div>
      )}

      {/* No results */}
      {!loading && candidates.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)", fontSize: "0.88rem" }}>
          {t.noCandidateFound || "Aucun candidat trouvé"}
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="cand-grid">
          {filtered.map((c, i) => {
            const photo = c.photoUrl?.startsWith("http") ? c.photoUrl : `${apiBase}${c.photoUrl}`;
            const rank = rankMap.get(c.id) || i + 1;
            const rankClass = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "";
            const votes = c.totalVotes || 0;
            const vDisplay = votes >= 1000 ? `${(votes / 1000).toFixed(1)}K` : votes;
            return (
              <Link key={c.id} href={`/candidates/${c.id}`} className="cand-card fade-up" style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}>
                <div className="cand-card-img-wrap">
                  <img src={photo} alt={c.name} onError={(e: any) => { e.target.src = "/placeholder-avatar.svg"; e.target.onerror = null; }} />
                  <div className={`cand-card-rank ${rankClass}`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M2 19h20v2H2v-2zm18-9l-3 9H7L4 10l4 3 4-6 4 6 4-3z" /></svg>
                    #{rank}
                  </div>
                  <div className="cand-card-votes">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--blue)"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
                    {vDisplay}
                  </div>
                  <div className="cand-card-overlay">
                    <div className="cand-card-name">{c.name}</div>
                    <div className="cand-card-cat">{c.city || "Miss"}</div>
                  </div>
                </div>
                <div className="cand-card-foot">
                  <span className="pos">{t.position || "Position"} #{rank}</span>
                  <span className="v">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
                    {vDisplay}
                  </span>
                </div>
                <div className="cand-card-cta">
                  {t.seeProfile || "Voir le profil"}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
