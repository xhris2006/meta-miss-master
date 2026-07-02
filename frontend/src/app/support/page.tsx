"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/store/langStore";
import { useLangStore } from "@/store/langStore";
import api from "@/lib/api";
import ContactSponsor from "@/components/ContactSponsor";

const faqsFr = [
  { q: "Comment voter ?", a: "Choisissez une candidate, cliquez 'Voter', choisissez le montant (100 FCFA = 1 vote) et payez via Orange Money, MTN Mobile Money ou Genius Pay." },
  { q: "Combien coûte un vote ?", a: "1 vote = 100 FCFA. Vous pouvez voter autant de fois que vous le souhaitez pour soutenir votre candidate." },
  { q: "Quels paiements sont acceptés ?", a: "Orange Money et MTN Mobile Money pour le mobile, et Genius Pay pour les paiements internationaux (tous les pays)." },
  { q: "Mes votes sont-ils instantanés ?", a: "Oui. Dès validation du paiement, vos votes sont comptabilisés dans le classement en temps réel." },
  { q: "Comment participer au concours ?", a: "Accédez à la section Candidats et cliquez sur 'Soumettre ma candidature'. Votre candidature est validée par notre équipe." },
];
const faqsEn = [
  { q: "How to vote?", a: "Choose a candidate, click 'Vote', choose the amount (100 FCFA = 1 vote) and pay via Orange Money, MTN Mobile Money or Genius Pay." },
  { q: "How much does a vote cost?", a: "1 vote = 100 FCFA. You can vote as many times as you want." },
  { q: "What payment methods are accepted?", a: "Orange Money and MTN Mobile Money for mobile, and Genius Pay for international payments (all countries)." },
  { q: "Are my votes instant?", a: "Yes. Once payment is validated, your votes are counted in the real-time ranking." },
  { q: "How to join the competition?", a: "Go to the Candidates section and click 'Submit my candidacy'. Your application is validated by our team." },
];

interface SocialLinks {
  whatsappGroup?: string;
  whatsappChannel?: string;
  tiktok?: string;
  youtube?: string;
  snapchat?: string;
  telegram?: string;
}

export default function SupportPage() {
  const t = useT();
  const lang = useLangStore(s => s.lang);
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const [social, setSocial] = useState<SocialLinks>({});
  const [socialLoading, setSocialLoading] = useState(true);

  const faqs = lang === "en" ? faqsEn : faqsFr;

  useEffect(() => {
    api.get("/social-links")
      .then(r => setSocial(r.data.data || {}))
      .catch(() => setSocial({}))
      .finally(() => setSocialLoading(false));
  }, []);

  const socialLinks = [
    { key: "whatsappGroup", label: "Groupe WhatsApp", emoji: "💬", color: "#25D366", bg: "#25D36615", border: "#25D36630" },
    { key: "whatsappChannel", label: "Chaîne WhatsApp", emoji: "📢", color: "#25D366", bg: "#25D36615", border: "#25D36630" },
    { key: "tiktok", label: "TikTok", emoji: "🎵", color: "#000", bg: "#00000010", border: "#00000020" },
    { key: "youtube", label: "YouTube", emoji: "▶️", color: "#FF0000", bg: "#FF000015", border: "#FF000030" },
    { key: "snapchat", label: "Snapchat", emoji: "👻", color: "#FFFC00", bg: "#FFFC0015", border: "#FFFC0040" },
    { key: "telegram", label: "Telegram", emoji: "✈️", color: "#0088CC", bg: "#0088CC15", border: "#0088CC30" },
  ].filter(s => (social as any)[s.key]);

  return (
    <div className="page-content fade-up">
      <div className="top-bar">
        <button onClick={() => router.back()} style={{ width: 34, height: 34, border: "1px solid var(--border)", borderRadius: 9, background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <span className="top-bar-title">{t.support}</span>
        <div style={{ width: 34 }} />
      </div>

      <div style={{ padding: "0 16px 32px" }}>

        {/* Hero */}
        <div style={{ background: "linear-gradient(135deg, var(--blue) 0%, #7C3AED 100%)", borderRadius: 18, padding: "24px 20px", marginBottom: 24, color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: "2.2rem", marginBottom: 10 }}>🎭</div>
          <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: 6 }}>MetaMiss · Master 2026</div>
          <div style={{ fontSize: "0.82rem", opacity: 0.85, lineHeight: 1.6 }}>{t.supportHeroSub || "Rejoignez la communauté et suivez le concours en temps réel sur nos réseaux."}</div>
        </div>

        {/* Réseaux sociaux */}
        {!socialLoading && socialLinks.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🌐</span> {t.joinUs || "Rejoignez-nous"}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {/* WhatsApp group et channel côte à côte si les deux existent */}
              {social.whatsappGroup && social.whatsappChannel ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <a href={social.whatsappGroup} target="_blank" rel="noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px", background: "#25D36615", border: "1.5px solid #25D36630", borderRadius: 14, textDecoration: "none", transition: "transform 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.02)"}
                    onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"}
                  >
                    <span style={{ fontSize: "1.8rem" }}>💬</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#25D366", textAlign: "center" }}>{t.whatsappGroupLabel || "Groupe WhatsApp"}</span>
                  </a>
                  <a href={social.whatsappChannel} target="_blank" rel="noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px", background: "#25D36615", border: "1.5px solid #25D36630", borderRadius: 14, textDecoration: "none", transition: "transform 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.02)"}
                    onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"}
                  >
                    <span style={{ fontSize: "1.8rem" }}>📢</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#25D366", textAlign: "center" }}>{t.whatsappChannelLabel || "Chaîne WhatsApp"}</span>
                  </a>
                </div>
              ) : (
                <>
                  {social.whatsappGroup && (
                    <a href={social.whatsappGroup} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#25D36615", border: "1.5px solid #25D36630", borderRadius: 14, textDecoration: "none" }}>
                      <span style={{ fontSize: "1.6rem", flexShrink: 0 }}>💬</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#25D366" }}>{t.whatsappGroupLabel || "Groupe WhatsApp"}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{t.joinCommunity || "Rejoignez la communauté"}</div>
                      </div>
                      <svg style={{ marginLeft: "auto" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.2"><path d="M9 18l6-6-6-6"/></svg>
                    </a>
                  )}
                  {social.whatsappChannel && (
                    <a href={social.whatsappChannel} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#25D36615", border: "1.5px solid #25D36630", borderRadius: 14, textDecoration: "none" }}>
                      <span style={{ fontSize: "1.6rem", flexShrink: 0 }}>📢</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#25D366" }}>{t.whatsappChannelLabel || "Chaîne WhatsApp"}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{t.followAnnounce || "Suivez les annonces"}</div>
                      </div>
                      <svg style={{ marginLeft: "auto" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.2"><path d="M9 18l6-6-6-6"/></svg>
                    </a>
                  )}
                </>
              )}

              {/* Autres réseaux */}
              {socialLinks.filter(s => s.key !== "whatsappGroup" && s.key !== "whatsappChannel").map(s => (
                <a key={s.key} href={(social as any)[s.key]} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 14, textDecoration: "none" }}>
                  <span style={{ fontSize: "1.6rem", flexShrink: 0 }}>{s.emoji}</span>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text)" }}>{s.label}</div>
                  <svg style={{ marginLeft: "auto" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.2"><path d="M9 18l6-6-6-6"/></svg>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <span>❓</span> {t.faqTitle || "Questions fréquentes"}
          </div>
          {faqs.map((f, i) => (
            <div key={i} style={{ border: `1.5px solid ${open===i?"var(--blue)":"var(--border)"}`, borderRadius: 12, marginBottom: 8, overflow: "hidden", transition: "border-color 0.15s", background: "var(--bg-card)" }}>
              <button onClick={() => setOpen(open===i ? null : i)} style={{ width: "100%", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font)", gap: 12 }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: open===i?"var(--blue)":"var(--text)", textAlign: "left" }}>{f.q}</span>
                <span style={{ width: 24, height: 24, borderRadius: 6, background: open===i?"var(--blue)":"var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: open===i?"#fff":"var(--text-muted)", fontSize: "1rem", transition: "all 0.15s", transform: open===i?"rotate(45deg)":"none" }}>+</span>
              </button>
              {open===i && <div style={{ padding: "0 16px 14px", fontSize: "0.83rem", color: "var(--text-muted)", lineHeight: 1.7 }}>{f.a}</div>}
            </div>
          ))}
        </div>

        {/* Contact */}
        <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: 16, padding: "20px 16px", textAlign: "center" }}>
          <div style={{ fontSize: "1.6rem", marginBottom: 10 }}>📬</div>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text)", marginBottom: 6 }}>{t.contactUs}</div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>{t.contactDesc || "Notre équipe est disponible pour répondre à toutes vos questions."}</p>
          <a href="mailto:support@metamissemaster.cm" className="btn-outline" style={{ display: "block", fontSize: "0.85rem" }}>
            ✉️ {t.sendEmail || "Envoyer un email"}
          </a>
        </div>

        {/* Partenariat : contacter le développeur / sponsoriser l'événement */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <span>🤝</span> {t.partnershipTitle || "Partenariat & Contact"}
          </div>
          <ContactSponsor />
        </div>

      </div>
    </div>
  );
}
