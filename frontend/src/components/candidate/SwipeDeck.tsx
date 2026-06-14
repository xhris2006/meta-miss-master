"use client";
/* ════════════════════════════════════════════════════════════════
   SwipeDeck — Tinder-style swipeable profile cards
   • Drag with finger (mobile) or mouse (desktop)
   • Live rotation + translation while dragging
   • Release > 150px → card flies away + next/prev candidate
   • Overlay ◀ ▶ buttons to swipe without a gesture
   • Double-tap = like (animated heart)
   • Green heart (right) / red cross (left) indicator while swiping
   • Center card highlighted, side cards peeking (scale + z-index)
   • Dots pagination + "swipe" hint with a hand icon
   Built with React + TypeScript + Framer Motion + Tailwind.
═══════════════════════════════════════════════════════════════ */
import { useRef, useState, useEffect } from "react";
import { motion, animate, useMotionValue, useTransform, AnimatePresence } from "framer-motion";

export interface SwipeCandidate {
  id: string;
  name: string;
  type?: string;
  category?: string;
  photoUrl?: string;
  totalVotes?: number;
  totalLikes?: number;
  bio?: string;
  city?: string;
  age?: number;
  instagram?: string;
  tiktok?: string;
  snap?: string;
  whatsappFan?: string;
  facebook?: string;
}

interface SwipeDeckProps {
  candidates: SwipeCandidate[];
  index: number;
  onIndexChange: (next: number) => void;
  apiBase: string;
  likedIds?: Set<string>;
  /** Add a like (double-tap gesture) — idempotent. */
  onLike?: (id: string) => void;
  /** Toggle like/unlike (heart button). */
  onToggleLike?: (id: string) => void;
  /** Returns the 1-based ranking position of a candidate. */
  getRank?: (c: SwipeCandidate) => number;
}

const SWIPE_THRESHOLD = 150;
const VELOCITY_THRESHOLD = 700;

export default function SwipeDeck({
  candidates,
  index,
  onIndexChange,
  apiBase,
  likedIds,
  onLike,
  onToggleLike,
  getRank,
}: SwipeDeckProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-13, 0, 13]);
  const likeOpacity = useTransform(x, [40, 150], [0, 1]); // swiping right
  const nopeOpacity = useTransform(x, [-150, -40], [1, 0]); // swiping left

  const animatingRef = useRef(false);
  const lastTapRef = useRef(0);
  const [heartBurst, setHeartBurst] = useState(0); // bump key to replay heart

  const current = candidates[index];
  const prev = candidates[index - 1];
  const next = candidates[index + 1];

  // Keep the card centered when the index is set externally (e.g. first load).
  useEffect(() => {
    if (!animatingRef.current) x.set(0);
  }, [index, x]);

  const photoOf = (c?: SwipeCandidate) => {
    if (!c?.photoUrl) return "/placeholder-avatar.svg";
    return c.photoUrl.startsWith("http") ? c.photoUrl : `${apiBase}${c.photoUrl}`;
  };

  const fmtVotes = (n?: number) => {
    const v = n || 0;
    return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v);
  };

  /** dir = +1 → next candidate (card flies right) · -1 → previous (flies left) */
  const paginate = (dir: 1 | -1) => {
    if (animatingRef.current) return;
    const target = index + dir;
    // Out of bounds → bounce back to center.
    if (target < 0 || target >= candidates.length) {
      animate(x, 0, { type: "spring", stiffness: 320, damping: 28 });
      return;
    }
    animatingRef.current = true;
    const w = typeof window !== "undefined" ? window.innerWidth : 600;
    // 1. Throw the current card off-screen in the swipe direction.
    animate(x, dir * w, {
      duration: 0.3,
      ease: "easeIn",
      onComplete: () => {
        // 2. Swap content, jump to the opposite edge, then slide back in.
        //    animatingRef stays true until the slide-in finishes so the
        //    index-change effect below doesn't snap x back to 0 mid-animation.
        onIndexChange(target);
        x.set(-dir * w * 0.55);
        animate(x, 0, {
          type: "spring",
          stiffness: 260,
          damping: 26,
          onComplete: () => {
            animatingRef.current = false;
          },
        });
      },
    });
  };

  const handleDragEnd = (_e: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) paginate(1);
    else if (offset < -SWIPE_THRESHOLD || velocity < -VELOCITY_THRESHOLD) paginate(-1);
    else animate(x, 0, { type: "spring", stiffness: 320, damping: 28 });
  };

  // Double-tap gesture → add a like (idempotent) + heart burst.
  const triggerLike = () => {
    if (current && onLike) onLike(current.id);
    setHeartBurst((k) => k + 1);
  };

  // Heart button → toggle like/unlike. Burst only when it becomes a like.
  const handleHeartButton = () => {
    if (!current) return;
    const willLike = !likedIds?.has(current.id);
    if (onToggleLike) onToggleLike(current.id);
    else if (onLike) onLike(current.id);
    if (willLike) setHeartBurst((k) => k + 1);
  };

  // Manual double-tap detection (Framer's onTap fires only on non-drag taps).
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      triggerLike();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  if (!current) return null;

  const isLiked = !!likedIds?.has(current.id);
  const rank = getRank ? getRank(current) : index + 1;

  return (
    <div className="swipe-deck">
      <style>{`
        .swipe-deck { position: relative; padding: 6px 0 2px; user-select: none; }
        .swipe-stage {
          position: relative;
          width: 100%;
          max-width: 340px;
          margin: 0 auto;
          aspect-ratio: 3/4.1;
        }
        /* Peeking side cards */
        .swipe-peek {
          position: absolute;
          top: 6%;
          height: 88%;
          width: 60px;
          border-radius: 18px;
          overflow: hidden;
          background: var(--bg);
          cursor: pointer;
          z-index: 1;
          box-shadow: 0 6px 18px rgba(0,0,0,0.12);
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .swipe-peek:hover { opacity: 0.85; }
        .swipe-peek.left { left: -8px; }
        .swipe-peek.right { right: -8px; }
        .swipe-peek img { width: 100%; height: 100%; object-fit: cover; filter: blur(1px) brightness(0.85); }
        .swipe-peek-tag {
          position: absolute; left: 0; right: 0; bottom: 0;
          padding: 14px 4px 6px;
          background: linear-gradient(transparent, rgba(0,0,0,0.7));
          color: #fff; font-size: 0.58rem; font-weight: 800; text-align: center;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        @media (min-width: 520px) { .swipe-peek { width: 78px; } .swipe-peek.left { left: -26px; } .swipe-peek.right { right: -26px; } }

        /* Main draggable card */
        .swipe-card {
          position: absolute;
          inset: 0;
          z-index: 10;
          border-radius: 24px;
          overflow: hidden;
          background: var(--bg-card);
          box-shadow: 0 18px 50px rgba(37,99,235,0.22), 0 4px 14px rgba(0,0,0,0.1);
          border: 1.5px solid var(--blue-mid);
          cursor: grab;
        }
        .swipe-card:active { cursor: grabbing; }
        .swipe-card-img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }

        /* Badges */
        .swipe-badge {
          position: absolute; top: 14px; z-index: 4;
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 0.72rem; font-weight: 800; padding: 6px 11px;
          border-radius: 11px; backdrop-filter: blur(8px); letter-spacing: 0.02em;
        }
        .swipe-badge.rank { left: 14px; background: rgba(37,99,235,0.92); color: #fff; }
        .swipe-badge.rank.gold { background: rgba(245,158,11,0.95); }
        .swipe-badge.rank.silver { background: rgba(148,163,184,0.95); }
        .swipe-badge.rank.bronze { background: rgba(217,119,6,0.95); }
        .swipe-badge.votes { right: 14px; background: rgba(255,255,255,0.92); color: var(--blue); }

        /* Bottom info overlay */
        .swipe-overlay {
          position: absolute; left: 0; right: 0; bottom: 0; z-index: 3;
          padding: 48px 16px 16px;
          background: linear-gradient(transparent, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.82));
          color: #fff; pointer-events: none;
        }
        .swipe-overlay .name { font-size: 1.4rem; font-weight: 800; line-height: 1.1; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
        .swipe-cat {
          display: inline-flex; align-items: center; gap: 5px; margin-top: 8px;
          background: rgba(37,99,235,0.9); backdrop-filter: blur(4px);
          font-size: 0.66rem; font-weight: 800; padding: 5px 11px; border-radius: 8px;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .swipe-bio { margin-top: 8px; font-size: 0.78rem; line-height: 1.5; opacity: 0.92;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .swipe-socials { display: flex; gap: 7px; margin-top: 12px; pointer-events: auto; }
        .swipe-social {
          width: 34px; height: 34px; border-radius: 50%; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: transform 0.15s;
        }
        .swipe-social:hover { transform: scale(1.12); }

        /* Swipe indicators */
        .swipe-stamp {
          position: absolute; top: 22px; z-index: 5;
          display: flex; align-items: center; gap: 6px;
          font-weight: 900; font-size: 1.05rem; letter-spacing: 0.08em;
          padding: 8px 14px; border-radius: 12px; border: 3px solid;
          text-transform: uppercase; pointer-events: none;
        }
        .swipe-stamp.like { right: 18px; color: #10B981; border-color: #10B981; background: rgba(16,185,129,0.12); transform: rotate(12deg); }
        .swipe-stamp.nope { left: 18px; color: #EF4444; border-color: #EF4444; background: rgba(239,68,68,0.12); transform: rotate(-12deg); }

        /* Double-tap heart burst */
        .swipe-heart-burst {
          position: absolute; inset: 0; z-index: 6;
          display: flex; align-items: center; justify-content: center; pointer-events: none;
        }

        /* Overlay arrow buttons */
        .swipe-arrow {
          position: absolute; top: 50%; transform: translateY(-50%); z-index: 20;
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--bg-white); border: 1.5px solid var(--border);
          box-shadow: 0 6px 18px rgba(0,0,0,0.15);
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: all 0.15s;
        }
        .swipe-arrow:hover:not(:disabled) { background: var(--blue); border-color: var(--blue); }
        .swipe-arrow:hover:not(:disabled) svg { stroke: #fff; }
        .swipe-arrow:disabled { opacity: 0.35; cursor: not-allowed; }
        .swipe-arrow.left { left: -6px; }
        .swipe-arrow.right { right: -6px; }
        @media (min-width: 520px) { .swipe-arrow.left { left: -54px; } .swipe-arrow.right { right: -54px; } }

        /* Dots + hint */
        .swipe-dots { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 16px 0 4px; }
        .swipe-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border); transition: all 0.25s; }
        .swipe-dot.active { background: var(--blue); width: 22px; border-radius: 4px; }
        .swipe-hint {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          color: var(--text-muted); font-size: 0.76rem; padding: 2px 16px 4px; text-align: center;
        }
        .swipe-hint-hand { animation: swipe-wave 1.8s ease-in-out infinite; }
        @keyframes swipe-wave { 0%,100% { transform: translateX(-5px) rotate(-8deg); } 50% { transform: translateX(5px) rotate(8deg); } }
      `}</style>

      <div className="swipe-stage">
        {/* Left arrow → previous */}
        <button className="swipe-arrow left" onClick={() => paginate(-1)} disabled={!prev} aria-label="Précédent">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Peeking previous card */}
        {prev && (
          <div className="swipe-peek left" onClick={() => paginate(-1)}>
            <img src={photoOf(prev)} alt={prev.name} onError={(e: any) => (e.target.style.opacity = 0)} />
            <span className="swipe-peek-tag">{prev.name.split(" ")[0]}</span>
          </div>
        )}

        {/* Peeking next card */}
        {next && (
          <div className="swipe-peek right" onClick={() => paginate(1)}>
            <img src={photoOf(next)} alt={next.name} onError={(e: any) => (e.target.style.opacity = 0)} />
            <span className="swipe-peek-tag">{next.name.split(" ")[0]}</span>
          </div>
        )}

        {/* ── Active draggable card (persistent element, content swaps on swipe) ── */}
        <motion.div
          className="swipe-card"
          style={{ x, rotate }}
          drag="x"
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          onTap={handleTap}
          whileTap={{ scale: 0.99 }}
        >
            <img
              className="swipe-card-img"
              src={photoOf(current)}
              alt={current.name}
              draggable={false}
              onError={(e: any) => { if (!e.target.src.endsWith("/placeholder-avatar.svg")) e.target.src = "/placeholder-avatar.svg"; }}
            />

            {/* Rank badge (top-left) */}
            <div className={`swipe-badge rank ${rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : ""}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 19h20v2H2v-2zm18-9l-3 9H7L4 10l4 3 4-6 4 6 4-3z" />
              </svg>
              #{rank} <span style={{ fontSize: "0.58rem", opacity: 0.85 }}>AU CLASSEMENT</span>
            </div>

            {/* Votes badge (top-right) */}
            <div className="swipe-badge votes">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="var(--blue)">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
              {fmtVotes(current.totalVotes)}
            </div>

            {/* Swipe indicators */}
            <motion.div className="swipe-stamp like" style={{ opacity: likeOpacity }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#10B981"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
              LIKE
            </motion.div>
            <motion.div className="swipe-stamp nope" style={{ opacity: nopeOpacity }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              NOPE
            </motion.div>

            {/* Double-tap heart */}
            <AnimatePresence>
              {heartBurst > 0 && (
                <motion.div
                  key={heartBurst}
                  className="swipe-heart-burst"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, times: [0, 0.4, 1] }}
                >
                  <svg width="120" height="120" viewBox="0 0 24 24" fill="#EF4444" style={{ filter: "drop-shadow(0 4px 16px rgba(239,68,68,0.6))" }}>
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom info overlay */}
            <div className="swipe-overlay">
              <div className="name">{current.name}</div>
              <span className="swipe-cat">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M2 19h20v2H2v-2zm18-9l-3 9H7L4 10l4 3 4-6 4 6 4-3z" /></svg>
                {current.category || (current.type === "MASTER" ? "Master" : current.type === "MISS" ? "Miss" : "Élégance")}
                {current.city ? ` · ${current.city}` : ""}
              </span>
              {current.bio && <div className="swipe-bio">{current.bio}</div>}
              <Socials c={current} isLiked={isLiked} onLike={handleHeartButton} />
            </div>
        </motion.div>

        {/* Right arrow → next */}
        <button className="swipe-arrow right" onClick={() => paginate(1)} disabled={!next} aria-label="Suivant">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Dots */}
      <div className="swipe-dots">
        {candidates.slice(Math.max(0, index - 2), index + 3).map((c, i) => {
          const realIdx = Math.max(0, index - 2) + i;
          return <div key={c.id} className={`swipe-dot${realIdx === index ? " active" : ""}`} />;
        })}
      </div>

      {/* Hint */}
      <div className="swipe-hint">
        <svg className="swipe-hint-hand" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.8">
          <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
          <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
        Swipez à gauche ou à droite pour découvrir d'autres candidats
      </div>
    </div>
  );
}

/* ── Social buttons rendered inside the card overlay ── */
function Socials({ c, isLiked, onLike }: { c: SwipeCandidate; isLiked: boolean; onLike: () => void }) {
  const open = (url: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, "_blank");
  };
  return (
    <div className="swipe-socials">
      <button className="swipe-social" style={{ background: isLiked ? "#EF4444" : "rgba(255,255,255,0.22)" }} onClick={(e) => { e.stopPropagation(); onLike(); }} aria-label="J'aime">
        <svg width="17" height="17" viewBox="0 0 24 24" fill={isLiked ? "#fff" : "none"} stroke="#fff" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
      </button>
      {c.whatsappFan && (
        <button className="swipe-social" style={{ background: "#25D366" }} onClick={open(c.whatsappFan.startsWith("http") ? c.whatsappFan : `https://wa.me/${c.whatsappFan}`)} aria-label="WhatsApp">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></svg>
        </button>
      )}
      {c.instagram && (
        <button className="swipe-social" style={{ background: "linear-gradient(135deg,#f09433,#dc2743,#bc1888)" }} onClick={open(`https://instagram.com/${c.instagram.replace("@", "")}`)} aria-label="Instagram">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none" /></svg>
        </button>
      )}
      {c.tiktok && (
        <button className="swipe-social" style={{ background: "#010101" }} onClick={open(`https://tiktok.com/@${c.tiktok.replace("@", "")}`)} aria-label="TikTok">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" /></svg>
        </button>
      )}
    </div>
  );
}
