"use client";
import Link from "next/link";
import LandingCandidates from "@/components/LandingCandidates";
import LangSelector from "@/components/ui/LangSelector";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useT } from "@/store/langStore";

export default function LandingPage() {
  const t = useT();
  return (
    <div className="page-content fade-up">
      <style>{`
        .lp { max-width: 520px; margin: 0 auto; padding: 16px 16px 8px; }
        @media (min-width: 1024px) { .lp { max-width: 720px; padding-top: 24px; } }

        .lp-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
        .lp-brand { display: flex; align-items: center; gap: 10px; }
        .lp-logo {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, var(--blue-dark), var(--blue));
          color: #fff; display: grid; place-items: center; font-weight: 900; font-size: 1rem;
          font-family: Georgia, serif; box-shadow: 0 5px 14px rgba(37,99,235,0.3);
        }
        .lp-brand-name { font-size: 0.85rem; font-weight: 800; color: var(--text); letter-spacing: 0.02em; }
        .lp-brand-name b { color: var(--blue); }
        .lp-brand-sub { font-size: 0.6rem; font-weight: 700; color: var(--blue); letter-spacing: 0.12em; text-transform: uppercase; margin-top: 1px; }
        .lp-official {
          font-size: 0.6rem; font-weight: 800; color: var(--blue);
          background: var(--blue-light); border: 1.5px solid var(--blue-mid);
          padding: 5px 11px; border-radius: 100px; letter-spacing: 0.04em;
        }

        .lp-eyebrow { font-size: 0.64rem; font-weight: 800; color: var(--blue); letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 12px; }
        .lp-title { font-size: clamp(1.6rem, 6.5vw, 2.2rem); font-weight: 900; line-height: 1.1; color: var(--text); letter-spacing: -0.02em; margin-bottom: 13px; }
        .lp-title span { color: var(--blue); }
        .lp-sub { font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 20px; max-width: 440px; }
        .lp-cta {
          display: inline-flex; align-items: center; justify-content: center; gap: 9px; width: 100%;
          background: linear-gradient(135deg, var(--blue), #3B82F6); color: #fff;
          font-size: 0.92rem; font-weight: 800; padding: 14px 22px; border-radius: 14px;
          text-decoration: none; box-shadow: 0 8px 22px rgba(37,99,235,0.32);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .lp-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(37,99,235,0.4); }
        .lp-cta svg { transition: transform 0.2s; }
        .lp-cta:hover svg { transform: translateX(4px); }

        .lp-card {
          position: relative; overflow: hidden; margin: 22px 0 18px;
          min-height: 168px; border-radius: 22px;
          background: linear-gradient(150deg, #0B1F4D 0%, #15347E 55%, #1D4ED8 100%);
          display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 15px;
          box-shadow: 0 14px 34px rgba(11,31,77,0.4);
        }
        .lp-ring { position: absolute; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.1); }
        .lp-card-logo {
          width: 58px; height: 58px; border-radius: 50%;
          background: rgba(255,255,255,0.08); border: 1.5px solid rgba(255,255,255,0.25);
          display: grid; place-items: center; color: #fff; font-weight: 900; font-size: 1.35rem;
          font-family: Georgia, serif; z-index: 2;
        }
        .lp-card-badge {
          z-index: 2; display: inline-flex; align-items: center; gap: 7px;
          background: var(--blue); color: #fff; font-size: 0.78rem; font-weight: 800;
          padding: 9px 17px; border-radius: 100px; box-shadow: 0 6px 16px rgba(0,0,0,0.3);
        }
        .lp-card-spark { position: absolute; color: rgba(255,255,255,0.6); }

        .lp-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
        .lp-feat { background: var(--bg-white); border: 1.5px solid var(--border); border-radius: 16px; padding: 13px 8px; text-align: center; box-shadow: var(--shadow); }
        .lp-feat-ic {
          width: 36px; height: 36px; border-radius: 50%; margin: 0 auto 8px;
          background: linear-gradient(135deg, var(--blue), #3B82F6);
          display: grid; place-items: center; box-shadow: 0 5px 12px rgba(37,99,235,0.3);
        }
        .lp-feat-t { font-size: 0.76rem; font-weight: 800; color: var(--text); margin-bottom: 3px; }
        .lp-feat-d { font-size: 0.62rem; color: var(--text-muted); line-height: 1.35; }

        .lp-candidacy {
          display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
          margin-top: 14px; padding: 13px; border-radius: 14px;
          background: var(--bg-white); border: 1.5px solid var(--blue-mid); color: var(--blue);
          font-size: 0.84rem; font-weight: 800; text-decoration: none; transition: all 0.15s;
        }
        .lp-candidacy:hover { background: var(--blue-light); border-color: var(--blue); }
      `}</style>

      <div className="lp">
        {/* Utility row : thème + langue */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginBottom: 12 }}>
          <ThemeToggle />
          <LangSelector />
        </div>

        {/* Brand header */}
        <div className="lp-top">
          <div className="lp-brand">
            <div className="lp-logo">M</div>
            <div>
              <div className="lp-brand-name">META MISS <b>MASTER</b></div>
              <div className="lp-brand-sub">{t.edition || "Édition 2026"}</div>
            </div>
          </div>
          <span className="lp-official">{t.official || "Officiel"}</span>
        </div>

        {/* Hero */}
        <div className="lp-eyebrow">{t.lpEyebrow}</div>
        <h1 className="lp-title">{t.lpTitleA} <span>{t.lpTitleB}</span> {t.lpTitleC}</h1>
        <p className="lp-sub">{t.lpSub}</p>

        {/* Bandeau défilant des candidates (boucle infinie, mis à jour automatiquement) */}
        <LandingCandidates />

        <Link href="/candidates" className="lp-cta">
          {t.lpStart}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>

        {/* Dark hero card */}
        <div className="lp-card">
          <div className="lp-ring" style={{ width: 120, height: 120 }} />
          <div className="lp-ring" style={{ width: 184, height: 184 }} />
          <div className="lp-ring" style={{ width: 250, height: 250 }} />
          <svg className="lp-card-spark" style={{ top: 22, right: 28 }} width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" /></svg>
          <svg className="lp-card-spark" style={{ bottom: 26, left: 30 }} width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" /></svg>
          <div className="lp-card-logo">M</div>
          <span className="lp-card-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
            {t.lpSecure}
          </span>
        </div>

        {/* Feature cards */}
        <div className="lp-features">
          <div className="lp-feat">
            <div className="lp-feat-ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div className="lp-feat-t">{t.featSecure}</div>
            <div className="lp-feat-d">{t.featSecureD}</div>
          </div>
          <div className="lp-feat">
            <div className="lp-feat-ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            </div>
            <div className="lp-feat-t">{t.featFast}</div>
            <div className="lp-feat-d">{t.featFastD}</div>
          </div>
          <div className="lp-feat">
            <div className="lp-feat-ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>
            </div>
            <div className="lp-feat-t">{t.featEverywhere}</div>
            <div className="lp-feat-d">{t.featEverywhereD}</div>
          </div>
        </div>

        {/* Devenir candidate */}
        <Link href="/candidates/register" className="lp-candidacy">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" />
          </svg>
          {t.becomeCandidate || "Devenir candidate"}
        </Link>
      </div>
    </div>
  );
}
