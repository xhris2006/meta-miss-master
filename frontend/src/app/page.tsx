import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="page-content fade-up">
      <style>{`
        .lp { max-width: 560px; margin: 0 auto; padding: 18px 18px 8px; }
        @media (min-width: 1024px) { .lp { max-width: 760px; padding-top: 28px; } }

        /* Brand header */
        .lp-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 26px; }
        .lp-brand { display: flex; align-items: center; gap: 12px; }
        .lp-logo {
          width: 46px; height: 46px; border-radius: 50%;
          background: linear-gradient(135deg, var(--blue-dark), var(--blue));
          color: #fff; display: grid; place-items: center; font-weight: 900; font-size: 1.15rem;
          font-family: Georgia, serif; box-shadow: 0 6px 16px rgba(37,99,235,0.3);
        }
        .lp-brand-name { font-size: 0.95rem; font-weight: 800; color: var(--text); letter-spacing: 0.02em; }
        .lp-brand-name b { color: var(--blue); }
        .lp-brand-sub { font-size: 0.66rem; font-weight: 700; color: var(--blue); letter-spacing: 0.12em; text-transform: uppercase; margin-top: 1px; }
        .lp-official {
          font-size: 0.66rem; font-weight: 800; color: var(--blue);
          background: var(--blue-light); border: 1.5px solid var(--blue-mid);
          padding: 6px 13px; border-radius: 100px; letter-spacing: 0.04em;
        }

        /* Hero */
        .lp-eyebrow { font-size: 0.7rem; font-weight: 800; color: var(--blue); letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 14px; }
        .lp-title { font-size: clamp(2rem, 8vw, 2.9rem); font-weight: 900; line-height: 1.08; color: var(--text); letter-spacing: -0.02em; margin-bottom: 16px; }
        .lp-title span { color: var(--blue); }
        .lp-sub { font-size: 0.95rem; color: var(--text-muted); line-height: 1.65; margin-bottom: 26px; max-width: 460px; }
        .lp-cta {
          display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%;
          background: linear-gradient(135deg, var(--blue), #3B82F6); color: #fff;
          font-size: 1rem; font-weight: 800; padding: 17px 24px; border-radius: 16px;
          text-decoration: none; box-shadow: 0 10px 28px rgba(37,99,235,0.35);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .lp-cta:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(37,99,235,0.42); }
        .lp-cta svg { transition: transform 0.2s; }
        .lp-cta:hover svg { transform: translateX(4px); }

        /* Dark hero card */
        .lp-card {
          position: relative; overflow: hidden; margin: 26px 0 22px;
          min-height: 210px; border-radius: 24px;
          background: linear-gradient(150deg, #0B1F4D 0%, #15347E 55%, #1D4ED8 100%);
          display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 18px;
          box-shadow: 0 16px 40px rgba(11,31,77,0.4);
        }
        .lp-ring { position: absolute; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.1); }
        .lp-card-logo {
          width: 70px; height: 70px; border-radius: 50%;
          background: rgba(255,255,255,0.08); border: 1.5px solid rgba(255,255,255,0.25);
          display: grid; place-items: center; color: #fff; font-weight: 900; font-size: 1.6rem;
          font-family: Georgia, serif; backdrop-filter: blur(4px); z-index: 2;
        }
        .lp-card-badge {
          z-index: 2; display: inline-flex; align-items: center; gap: 8px;
          background: var(--blue); color: #fff; font-size: 0.84rem; font-weight: 800;
          padding: 11px 20px; border-radius: 100px; box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        }
        .lp-card-spark { position: absolute; color: rgba(255,255,255,0.6); }

        /* Feature cards */
        .lp-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .lp-feat {
          background: var(--bg-white); border: 1.5px solid var(--border); border-radius: 18px;
          padding: 16px 10px; text-align: center; box-shadow: var(--shadow);
        }
        .lp-feat-ic {
          width: 42px; height: 42px; border-radius: 50%; margin: 0 auto 10px;
          background: linear-gradient(135deg, var(--blue), #3B82F6);
          display: grid; place-items: center; box-shadow: 0 6px 14px rgba(37,99,235,0.3);
        }
        .lp-feat-t { font-size: 0.82rem; font-weight: 800; color: var(--text); margin-bottom: 4px; }
        .lp-feat-d { font-size: 0.66rem; color: var(--text-muted); line-height: 1.4; }
      `}</style>

      <div className="lp">
        {/* Brand header */}
        <div className="lp-top">
          <div className="lp-brand">
            <div className="lp-logo">M</div>
            <div>
              <div className="lp-brand-name">META MISS <b>MASTER</b></div>
              <div className="lp-brand-sub">Édition 2026</div>
            </div>
          </div>
          <span className="lp-official">Officiel</span>
        </div>

        {/* Hero */}
        <div className="lp-eyebrow">Plateforme officielle de vote</div>
        <h1 className="lp-title">Votez pour vos <span>candidates</span> préférées</h1>
        <p className="lp-sub">Soutenez vos favorites et contribuez à faire gagner la meilleure candidate. Simple, rapide et 100% sécurisé.</p>
        <Link href="/candidates" className="lp-cta">
          Commencer à voter
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>

        {/* Dark hero card */}
        <div className="lp-card">
          <div className="lp-ring" style={{ width: 130, height: 130 }} />
          <div className="lp-ring" style={{ width: 200, height: 200 }} />
          <div className="lp-ring" style={{ width: 280, height: 280 }} />
          <svg className="lp-card-spark" style={{ top: 24, right: 30 }} width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" /></svg>
          <svg className="lp-card-spark" style={{ bottom: 30, left: 34 }} width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" /></svg>
          <div className="lp-card-logo">M</div>
          <span className="lp-card-badge">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
            Vote sécurisé &amp; transparent
          </span>
        </div>

        {/* Feature cards */}
        <div className="lp-features">
          <div className="lp-feat">
            <div className="lp-feat-ic">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div className="lp-feat-t">Sécurisé</div>
            <div className="lp-feat-d">Vote 100% sécurisé et transparent</div>
          </div>
          <div className="lp-feat">
            <div className="lp-feat-ic">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            </div>
            <div className="lp-feat-t">Rapide</div>
            <div className="lp-feat-d">Résultats en temps réel</div>
          </div>
          <div className="lp-feat">
            <div className="lp-feat-ic">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>
            </div>
            <div className="lp-feat-t">Partout</div>
            <div className="lp-feat-d">Depuis l'Afrique et l'Europe</div>
          </div>
        </div>
      </div>
    </div>
  );
}
