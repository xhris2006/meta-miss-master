"use client";
import { useT } from "@/store/langStore";

const DEV_WHATSAPP = "237694600007";

/**
 * Boutons "Contacter le développeur" / "Sponsoriser l'événement".
 * Chaque choix ouvre WhatsApp avec un message pré-rempli adapté.
 */
export default function ContactSponsor() {
  const t = useT();

  const openWhatsApp = (message: string) => {
    window.open(`https://wa.me/${DEV_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="cs-wrap">
      <style>{`
        .cs-wrap { display: grid; gap: 9px; }
        @media (min-width: 560px) { .cs-wrap { grid-template-columns: 1fr 1fr; } }
        .cs-btn {
          display: flex; align-items: center; gap: 11px; width: 100%;
          padding: 12px 14px; border-radius: 14px; cursor: pointer;
          font-family: var(--font); text-align: left; border: 1.5px solid;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .cs-btn:hover { transform: translateY(-2px); }
        .cs-btn:active { transform: translateY(0) scale(0.99); }
        .cs-btn.dev { background: var(--bg-white); border-color: var(--border); }
        .cs-btn.dev:hover { border-color: var(--blue); box-shadow: 0 8px 20px rgba(37,99,235,0.15); }
        .cs-btn.sponsor {
          background: linear-gradient(135deg, #059669, #10B981);
          border-color: transparent; box-shadow: 0 6px 18px rgba(16,185,129,0.3);
        }
        .cs-btn.sponsor:hover { box-shadow: 0 10px 24px rgba(16,185,129,0.4); }
        .cs-ic {
          width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
          display: grid; place-items: center;
        }
        .cs-btn.dev .cs-ic { background: var(--blue-light); }
        .cs-btn.sponsor .cs-ic { background: rgba(255,255,255,0.2); }
        .cs-t { font-size: 0.8rem; font-weight: 800; line-height: 1.2; }
        .cs-d { font-size: 0.66rem; margin-top: 2px; line-height: 1.35; }
        .cs-btn.dev .cs-t { color: var(--text); }
        .cs-btn.dev .cs-d { color: var(--text-muted); }
        .cs-btn.sponsor .cs-t { color: #fff; }
        .cs-btn.sponsor .cs-d { color: rgba(255,255,255,0.85); }
        .cs-arrow { margin-left: auto; flex-shrink: 0; }
      `}</style>

      <button className="cs-btn dev" onClick={() => openWhatsApp(t.contactDevMsg)}>
        <span className="cs-ic">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </span>
        <span>
          <span className="cs-t">{t.contactDev}</span>
          <span className="cs-d" style={{ display: "block" }}>{t.contactDevD}</span>
        </span>
        <svg className="cs-arrow" width="15" height="15" viewBox="0 0 24 24" fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </button>

      <button className="cs-btn sponsor" onClick={() => openWhatsApp(t.sponsorMsg)}>
        <span className="cs-ic">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </span>
        <span>
          <span className="cs-t">{t.sponsorEvent}</span>
          <span className="cs-d" style={{ display: "block" }}>{t.sponsorEventD}</span>
        </span>
        <svg className="cs-arrow" width="15" height="15" viewBox="0 0 24 24" fill="#fff">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </button>
    </div>
  );
}
