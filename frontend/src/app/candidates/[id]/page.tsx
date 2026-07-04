"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/langStore";
import SwipeDeck, { SwipeCandidate } from "@/components/candidate/SwipeDeck";
import { getDeviceId } from "@/lib/device";

export default function CandidateDetailPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [list, setList] = useState<SwipeCandidate[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fallback, setFallback] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";
  const likesKey = user ? `mmm-likes-${user.id}` : "mmm-likes-guest";

  // Load liked ids from localStorage
  useEffect(() => {
    try {
      setLikedSet(new Set(JSON.parse(localStorage.getItem(likesKey) || "[]") as string[]));
    } catch {
      setLikedSet(new Set());
    }
  }, [likesKey]);

  // Load the candidate + all candidates of the same category (full data)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const detail = await api.get(`/candidates/${id}`);
        const cand = detail.data.data;
        if (cancelled) return;
        setFallback(cand);

        const res = await api.get(`/candidates?type=${cand.type}&limit=100`);
        if (cancelled) return;
        const cands: SwipeCandidate[] = res.data.data?.candidates || [];
        if (cands.length) {
          const idx = cands.findIndex((c) => c.id === id);
          setList(cands);
          setActiveIndex(idx >= 0 ? idx : 0);
        } else {
          setList([cand]);
          setActiveIndex(0);
        }
      } catch {
        if (!cancelled) {
          toast.error("Candidat introuvable");
          setFallback(null);
          setList([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const active: any = list[activeIndex] || fallback;

  // NE PAS toucher à l'URL ici : sous Next 14, history.replaceState est
  // intercepté par l'App Router et réinitialise l'état de la page (retour
  // au premier candidat). Les liens de partage utilisent active.id.
  const handleIndexChange = (next: number) => {
    setActiveIndex(next);
  };

  const rankOf = (c: SwipeCandidate) => {
    const i = list.findIndex((x) => x.id === c.id);
    return i >= 0 ? i + 1 : 1;
  };

  // Requêtes like/unlike en cours : bloque les clics rapides qui, avant,
  // pouvaient envoyer plusieurs +1 au serveur avant la mise à jour de l'état.
  const pendingLikeRef = useRef<Set<string>>(new Set());
  // Miroir synchrone de likedSet : évite les doubles envois dus aux
  // fermetures (closures) obsolètes pendant un re-render.
  const likedRef = useRef<Set<string>>(new Set());
  useEffect(() => { likedRef.current = likedSet; }, [likedSet]);

  // Double-tap gesture → add like (idempotent, 1 like max par appareil)
  const likeCandidate = useCallback(
    async (cid: string) => {
      if (likedRef.current.has(cid) || pendingLikeRef.current.has(cid)) return;
      pendingLikeRef.current.add(cid);
      likedRef.current.add(cid);
      setLikedSet((prev) => {
        const s = new Set(prev);
        s.add(cid);
        localStorage.setItem(likesKey, JSON.stringify(Array.from(s)));
        return s;
      });
      setList((prev) => prev.map((c) => (c.id === cid ? { ...c, totalLikes: (c.totalLikes || 0) + 1 } : c)));
      try {
        const res = await api.post(`/candidates/${cid}/like`, { deviceId: getDeviceId() });
        const total = res.data?.data?.totalLikes;
        if (typeof total === "number") {
          setList((prev) => prev.map((c) => (c.id === cid ? { ...c, totalLikes: total } : c)));
        }
        toast.success("Ajouté aux favoris ❤️");
      } catch {
        // revert on failure
        likedRef.current.delete(cid);
        setLikedSet((prev) => {
          const s = new Set(prev);
          s.delete(cid);
          localStorage.setItem(likesKey, JSON.stringify(Array.from(s)));
          return s;
        });
        setList((prev) => prev.map((c) => (c.id === cid ? { ...c, totalLikes: Math.max(0, (c.totalLikes || 0) - 1) } : c)));
      } finally {
        pendingLikeRef.current.delete(cid);
      }
    },
    [likesKey],
  );

  // Heart button → toggle: add if not liked, remove if already liked
  const toggleLikeCandidate = useCallback(
    async (cid: string) => {
      if (pendingLikeRef.current.has(cid)) return;
      if (!likedRef.current.has(cid)) {
        likeCandidate(cid);
        return;
      }
      pendingLikeRef.current.add(cid);
      // Optimistically remove the like
      likedRef.current.delete(cid);
      setLikedSet((prev) => {
        const s = new Set(prev);
        s.delete(cid);
        localStorage.setItem(likesKey, JSON.stringify(Array.from(s)));
        return s;
      });
      setList((prev) => prev.map((c) => (c.id === cid ? { ...c, totalLikes: Math.max(0, (c.totalLikes || 0) - 1) } : c)));
      try {
        const res = await api.delete(`/candidates/${cid}/like`, { data: { deviceId: getDeviceId() } });
        const total = res.data?.data?.totalLikes;
        if (typeof total === "number") {
          setList((prev) => prev.map((c) => (c.id === cid ? { ...c, totalLikes: total } : c)));
        }
        toast("Retiré des favoris");
      } catch {
        // revert on failure
        likedRef.current.add(cid);
        setLikedSet((prev) => {
          const s = new Set(prev);
          s.add(cid);
          localStorage.setItem(likesKey, JSON.stringify(Array.from(s)));
          return s;
        });
        setList((prev) => prev.map((c) => (c.id === cid ? { ...c, totalLikes: (c.totalLikes || 0) + 1 } : c)));
      } finally {
        pendingLikeRef.current.delete(cid);
      }
    },
    [likesKey, likeCandidate],
  );

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-white)" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!active) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)" }}>
        Candidat introuvable
        <div style={{ marginTop: 16 }}>
          <Link href="/candidates" className="btn-outline" style={{ display: "inline-block", width: "auto", padding: "10px 20px" }}>
            Retour aux candidats
          </Link>
        </div>
      </div>
    );
  }

  const rank = rankOf(active);
  const votes = active.totalVotes || 0;
  const votesDisplay = votes >= 1000 ? `${(votes / 1000).toFixed(1)}K` : String(votes);
  const isTop10 = rank > 0 && rank <= 10;

  return (
    <div className="page-content fade-up" style={{ paddingBottom: 80 }}>
      <style>{`
        /* ── Top bar ── */
        .cd-topbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 8px; }
        .cd-topbar-btn {
          width: 38px; height: 38px; border: 1.5px solid var(--border); border-radius: 11px;
          background: var(--bg-white); display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.15s;
        }
        .cd-topbar-btn:hover { background: var(--bg); }
        .cd-topbar-title { font-size: 0.95rem; font-weight: 800; color: var(--blue); letter-spacing: 0.04em; text-transform: uppercase; }

        .cd-detail-layout { padding: 4px 16px 8px; }
        .cd-info-section { padding: 8px 0 0; }

        .cd-about-card {
          background: var(--bg-white); border: 1.5px solid var(--border); border-radius: 18px;
          padding: 18px; margin-bottom: 14px; box-shadow: var(--shadow);
        }
        .cd-about-label {
          display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 800;
          color: var(--blue); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;
        }
        .cd-about-text { font-size: 0.85rem; color: var(--text-2); line-height: 1.75; position: relative; padding: 0 8px; }
        .cd-about-text::before {
          content: "\\201C"; font-size: 2.5rem; color: var(--blue-mid); line-height: 1;
          position: absolute; left: -6px; top: -8px; font-family: Georgia, serif;
        }

        .cd-stats-row {
          display: flex; align-items: stretch; background: var(--bg-white); border: 1.5px solid var(--border);
          border-radius: 18px; overflow: hidden; margin-bottom: 14px; box-shadow: var(--shadow);
        }
        .cd-stat { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px 8px; gap: 4px; position: relative; }
        .cd-stat + .cd-stat::before { content: ""; position: absolute; left: 0; top: 20%; bottom: 20%; width: 1px; background: var(--border); }
        .cd-stat-icon { color: var(--blue); margin-bottom: 2px; }
        .cd-stat-val { font-size: 1.1rem; font-weight: 800; color: var(--text); }
        .cd-stat-lbl { font-size: 0.65rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }

        .cd-vote-cta {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          background: var(--blue); border-radius: 18px; padding: 18px 20px; text-decoration: none; color: #fff;
          box-shadow: 0 6px 24px rgba(37,99,235,0.35); transition: background 0.15s, transform 0.15s; margin-bottom: 10px;
        }
        .cd-vote-cta:hover { background: var(--blue-hover); transform: translateY(-1px); }
        .cd-vote-cta-icon, .cd-vote-cta-arrow {
          width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .cd-vote-cta-arrow { width: 36px; height: 36px; }
        .cd-vote-cta-text h3 { font-size: 1rem; font-weight: 800; letter-spacing: 0.02em; }
        .cd-vote-cta-text p { font-size: 0.75rem; opacity: 0.85; margin-top: 1px; }

        .cd-security { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 0.75rem; color: var(--blue); padding: 8px 0; text-align: center; }

        @media (min-width: 1024px) {
          .cd-detail-layout {
            display: grid; grid-template-columns: 1fr 420px; gap: 36px;
            max-width: 1080px; margin: 0 auto; padding: 8px 24px 8px; align-items: start;
          }
          .cd-info-section { position: sticky; top: 20px; }
        }
      `}</style>

      {/* Top bar */}
      <div className="cd-topbar">
        <button onClick={() => router.push("/candidates")} className="cd-topbar-btn" aria-label="Retour">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="cd-topbar-title">{t.candidate || "Candidat"}</span>
        <button
          onClick={async () => {
            // URL du candidat actuellement affiché (l'URL du navigateur
            // reste celle d'entrée : on ne la modifie plus pendant le swipe)
            const url = `${window.location.origin}/candidates/${active.id}`;
            try {
              if (navigator.share) await navigator.share({ title: active.name, url });
              else {
                await navigator.clipboard.writeText(url);
                toast.success("Lien copié !");
              }
            } catch {
              /* user cancelled share */
            }
          }}
          className="cd-topbar-btn"
          aria-label="Partager"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </div>

      <div className="cd-detail-layout">
        {/* ── LEFT: Tinder-style swipe deck ── */}
        <div>
          <SwipeDeck
            candidates={list}
            index={activeIndex}
            onIndexChange={handleIndexChange}
            apiBase={apiBase}
            likedIds={likedSet}
            onLike={likeCandidate}
            onToggleLike={toggleLikeCandidate}
            getRank={rankOf}
          />
        </div>

        {/* ── RIGHT: Info panel ── */}
        <div className="cd-info-section">
          {active.bio && (
            <div className="cd-about-card">
              <div className="cd-about-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                À propos de moi
              </div>
              <p className="cd-about-text">{active.bio}</p>
            </div>
          )}

          <div className="cd-stats-row">
            <div className="cd-stat">
              <div className="cd-stat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <div className="cd-stat-val">{votesDisplay}</div>
              <div className="cd-stat-lbl">Votes</div>
            </div>
            <div className="cd-stat">
              <div className="cd-stat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18" />
                  <path d="M8 22h8M12 2v20M6 9h12v7a5 5 0 01-10 0V9z" />
                </svg>
              </div>
              <div className="cd-stat-val">#{rank || "—"}</div>
              <div className="cd-stat-lbl">Position</div>
            </div>
            <div className="cd-stat">
              <div className="cd-stat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
              </div>
              <div className="cd-stat-val">{active.totalLikes ?? 0}</div>
              <div className="cd-stat-lbl">Likes</div>
            </div>
            {isTop10 && (
              <div className="cd-stat">
                <div className="cd-stat-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <div className="cd-stat-val">TOP 10</div>
                <div className="cd-stat-lbl">Classement</div>
              </div>
            )}
          </div>

          <Link href={`/vote/${active.id}`} className="cd-vote-cta">
            <div className="cd-vote-cta-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </div>
            <div className="cd-vote-cta-text">
              <h3>VOTER POUR {active.name.split(" ")[0].toUpperCase()}</h3>
              <p>Soutenez votre candidate préférée</p>
            </div>
            <div className="cd-vote-cta-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </Link>

          <div className="cd-security">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>
              <strong>Votre vote compte</strong> ! Chaque vote peut faire la différence.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
