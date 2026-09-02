"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useT } from "@/store/langStore";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";

const PRESETS = [100, 500, 1000, 5000];

const LAST_VOTE_KEY = (candidateId: string) => `mmm-last-vote-${candidateId}`;
const COOLDOWN_MS = 30 * 1000;

// Methodes affichees a l'utilisateur.
// Cameroun (Orange + MTN) passe par l'agregateur precis.
// Afrique / Europe / Cartes passent par GeniusPay — SAUF Cameroun & Gabon
// selectionnes dans "Afrique", qui sont rediriges vers l'agregateur precis.
// NB : le provider FINAL (Fapshi ou KPay selon le pays) est re-derive COTE SERVEUR
// (anti-fraude) ; ici on ne calcule que l'affichage des frais et le montant minimum.
const METHODS = [
  { id: "cameroon", provider: "fapshi", region: null, label: "Cameroun", subKey: "payCameroon", sub: "Orange Money · MTN Mobile Money", img: null, imgs: ["/pay/orange-money.svg", "/pay/mtn-momo.svg"], badgeKey: "recommended", badge: "Recommandé", badgeColor: "#16a34a", feePercent: 0, feeFixed: 0 },
  { id: "africa", provider: "geniuspay", region: "africa", label: "Afrique", subKey: "payAfrica", sub: "Mobile Money · Wave, MTN, Orange, Moov…", img: null, imgs: null, badgeKey: "badgeAfrica", badge: "🌍 20+ pays africains", badgeColor: "#16a34a", feePercent: 4.5, feeFixed: 100 },
  { id: "europe", provider: "geniuspay", region: "europe", label: "Europe", subKey: "payEurope", sub: "Carte & wallets internationaux · Visa, Apple Pay, Google Pay", img: null, imgs: null, badgeKey: "badgeEurope", badge: "🇪🇺 International", badgeColor: "#2563EB", feePercent: 6, feeFixed: 100 },
  { id: "cards", provider: "geniuspay", region: "cards", label: "Cartes", subKey: "payCards", sub: "Carte bancaire · Visa, Mastercard", img: null, imgs: null, badgeKey: "badgeCards", badge: "💳 Carte bancaire", badgeColor: "#7C3AED", feePercent: 6, feeFixed: 100 },
];

// Pays d'Afrique routes vers l'agregateur precis au lieu de GeniusPay.
// Cameroun (CM) & Gabon (GA) : paiement mobile via l'agregateur dedie, sans frais.
const PRECISE_AGGREGATOR_COUNTRIES = ["CM", "GA"];

// Determine le provider effectif selon la methode ET le pays choisi.
// "fapshi" signifie ici "agregateur precis, sans frais" — le backend re-derive
// lui-meme le provider reel (Fapshi pour CM, KPay pour GA) et ignore ce champ.
function resolveProvider(methodId: string, countryCode: string) {
  const m = METHODS.find((x) => x.id === methodId);
  if (!m) return "fapshi";
  if (m.id === "cameroon") return "fapshi";
  if (m.region === "africa" && PRECISE_AGGREGATOR_COUNTRIES.includes(countryCode)) return "fapshi";
  return m.provider;
}

// Pays proposes selon la region du mode de paiement choisi.
const COUNTRY_GROUPS: Record<string, { code: string; label: string }[]> = {
  africa: [
    { code: "CM", label: "Cameroun" },
    { code: "GA", label: "Gabon" },
    { code: "CI", label: "Côte d'Ivoire" },
    { code: "SN", label: "Sénégal" },
    { code: "ML", label: "Mali" },
    { code: "BF", label: "Burkina Faso" },
    { code: "BJ", label: "Bénin" },
    { code: "TG", label: "Togo" },
    { code: "GH", label: "Ghana" },
    { code: "NG", label: "Nigeria" },
  ],
  europe: [
    { code: "FR", label: "France" },
    { code: "BE", label: "Belgique" },
    { code: "CH", label: "Suisse" },
    { code: "DE", label: "Allemagne" },
    { code: "ES", label: "Espagne" },
    { code: "IT", label: "Italie" },
    { code: "GB", label: "Royaume-Uni" },
  ],
  cards: [],
};

// Frais GeniusPay repercutes sur le votant (arrondi au FCFA superieur).
function computeFee(amount: number, feePercent: number, feeFixed: number) {
  if (!feePercent && !feeFixed) return 0;
  return Math.ceil((amount * feePercent) / 100) + feeFixed;
}

type Step = "form" | "confirm" | "success" | "cooldown";

export default function VoteByIdPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const [candidate, setCandidate] = useState<any>(null);
  const [amount, setAmount] = useState(500);
  const [customAmount, setCustomAmount] = useState("500");
  const [method, setMethod] = useState("cameroon");
  const [country, setCountry] = useState("CM");
  const [voterName, setVoterName] = useState("");
  const [voterEmail, setVoterEmail] = useState("");
  const [voterPhone, setVoterPhone] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [doubleVotes, setDoubleVotes] = useState(false);
  const cooldownInterval = useRef<NodeJS.Timeout | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

  useEffect(() => {
    if (user) {
      setVoterName(user.name || "");
      setVoterEmail(user.email || "");
      setVoterPhone(user.phone || "");
    }
  }, [user]);

  useEffect(() => {
    if (!id) return;
    api.get(`/candidates/${id}`)
      .then((r) => setCandidate(r.data.data))
      .catch(() => router.push("/candidates"));
  }, [id, router]);

  // Etat de la promo "votes doubles" (pour la banniere).
  useEffect(() => {
    api.get("/settings/double-votes")
      .then((r) => setDoubleVotes(r.data?.data?.enabled === true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    const last = localStorage.getItem(LAST_VOTE_KEY(id));
    if (last) {
      const elapsed = Date.now() - Number(last);
      if (elapsed < COOLDOWN_MS) {
        const remaining = COOLDOWN_MS - elapsed;
        setCooldownLeft(remaining);
        setStep("cooldown");
        startCooldownTimer(remaining);
      }
    }
    return () => { if (cooldownInterval.current) clearInterval(cooldownInterval.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startCooldownTimer = (remaining: number) => {
    if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    let left = remaining;
    cooldownInterval.current = setInterval(() => {
      left -= 1000;
      setCooldownLeft(Math.max(0, left));
      if (left <= 0) {
        clearInterval(cooldownInterval.current!);
        setStep("form");
      }
    }, 1000);
  };

  const formatCooldown = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const votes = Math.floor(amount / 100);
  const effectiveVotes = doubleVotes ? votes * 2 : votes;
  const selectedMethod = METHODS.find((m) => m.id === method) || METHODS[0];
  // Provider reellement utilise (Cameroun & Gabon d'Afrique => agregateur precis, sans frais).
  const effectiveProvider = resolveProvider(method, country);
  const isPreciseAgg = effectiveProvider === "fapshi";
  const fee = isPreciseAgg ? 0 : computeFee(amount, selectedMethod.feePercent, selectedMethod.feeFixed);
  const totalToPay = amount + fee;
  const countryOptions = selectedMethod.region ? COUNTRY_GROUPS[selectedMethod.region] || [] : [];

  const handleMethod = (m: (typeof METHODS)[number]) => {
    setMethod(m.id);
    if (m.id === "cameroon") {
      setCountry("CM");
    } else if (m.region === "cards") {
      setCountry("FR");
    } else if (m.region && COUNTRY_GROUPS[m.region]?.length) {
      setCountry(COUNTRY_GROUPS[m.region][0].code);
    }
  };

  const handleAmountInput = (val: string) => {
    setCustomAmount(val);
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 100) return;
    setAmount(Math.round(n / 100) * 100);
  };

  const handlePreset = (p: number) => {
    setAmount(p);
    setCustomAmount(String(p));
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const selected = METHODS.find((m) => m.id === method) || METHODS[0];
      // La methode "Cameroun" n'a pas de selecteur de pays : on force CM.
      const effectiveCountry = selected.region ? country : "CM";
      // Le provider depend du pays : Cameroun/Gabon d'Afrique => agregateur precis.
      const provider = resolveProvider(method, effectiveCountry);
      // Frais uniquement pour GeniusPay ; l'agregateur precis est sans frais.
      const feeAmount = provider === "geniuspay" ? computeFee(amount, selected.feePercent, selected.feeFixed) : 0;
      const { data } = await api.post("/payments/initialize", {
        candidateId: id,
        amount,
        feeAmount,
        provider,
        region: selected.region || undefined,
        country: effectiveCountry,
        voterName,
        voterEmail,
        voterPhone,
      });
      localStorage.setItem(LAST_VOTE_KEY(id as string), String(Date.now()));
      if (data.data?.paymentLink) {
        window.location.href = data.data.paymentLink;
      } else {
        setStep("success");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t.error);
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  const C = {
    bg: isDark ? "#0F172A" : "var(--bg)",
    card: isDark ? "#1E293B" : "#FFFFFF",
    border: isDark ? "rgba(255,255,255,0.08)" : "var(--border)",
    text: isDark ? "#F1F5F9" : "var(--text)",
    muted: isDark ? "rgba(255,255,255,0.45)" : "var(--text-muted)",
    blue: isDark ? "#60A5FA" : "#2563EB",
    blueBg: isDark ? "rgba(96,165,250,0.12)" : "rgba(37,99,235,0.06)",
    blueBorder: isDark ? "rgba(96,165,250,0.25)" : "rgba(37,99,235,0.2)",
    inputBg: isDark ? "#1A2640" : "#FFFFFF",
    inputBorder: isDark ? "rgba(255,255,255,0.1)" : "var(--border)",
    inputText: isDark ? "#F1F5F9" : "var(--text)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px",
    border: `1.5px solid ${C.inputBorder}`, borderRadius: 8,
    fontFamily: "var(--font)", fontSize: "0.88rem",
    color: C.inputText, background: C.inputBg, outline: "none", marginBottom: 12,
  };

  const DoubleBanner = () => doubleVotes ? (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg,#059669,#10B981)", color: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 16, boxShadow: "0 4px 16px rgba(16,185,129,0.3)" }}>
      <span style={{ fontSize: "1.35rem", lineHeight: 1 }}>⚡</span>
      <div style={{ fontSize: "0.8rem", fontWeight: 700, lineHeight: 1.3 }}>
        Votes doubles actifs ! Vos votes comptent <strong>×2</strong> pour ce candidat.
      </div>
    </div>
  ) : null;

  if (!candidate) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${C.blueBg}`, borderTopColor: C.blue, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  );

  const photo = candidate.photoUrl?.startsWith("http") ? candidate.photoUrl : `${apiBase}${candidate.photoUrl}`;

  /* COOLDOWN */
  if (step === "cooldown") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center", minHeight: "100vh", background: C.bg, color: C.text }}>
      <div style={{ width: 88, height: 88, borderRadius: "50%", background: C.blueBg, border: `2px solid ${C.blue}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: C.text, marginBottom: 10 }}>{t.cooldownTitle || "Vote enregistré ✓"}</h2>
      <p style={{ fontSize: "0.88rem", color: C.muted, lineHeight: 1.7, marginBottom: 10, maxWidth: 280 }}>
        {t.cooldownDesc || "Merci pour votre soutien ! Vous pourrez voter à nouveau dans :"}
      </p>
      <div style={{ fontSize: "2.4rem", fontWeight: 900, color: C.blue, marginBottom: 8, fontVariantNumeric: "tabular-nums" }}>
        {formatCooldown(cooldownLeft)}
      </div>
      <p style={{ fontSize: "0.78rem", color: C.muted, marginBottom: 32 }}>
        {t.cooldownWait || "⏱ Veuillez patienter 30 secondes avant de voter à nouveau"}
      </p>
      <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 340 }}>
        <a href="/ranking" className="btn-blue" style={{ flex: 1 }}>{t.seeResults}</a>
        <a href="/candidates" className="btn-outline" style={{ flex: 1 }}>{t.otherCandidates || "Autres candidats"}</a>
      </div>
      <div className="security-badge" style={{ marginTop: 24 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        {t.voteConfidential}
      </div>
    </div>
  );

  /* CONFIRM */
  if (step === "confirm") return (
    <div className="page-content fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px 80px", textAlign: "center", background: C.bg, minHeight: "100dvh", color: C.text }}>
      <div className="top-bar" style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: C.bg }}>
        <button onClick={() => setStep("form")} style={{ width: 32, height: 32, border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <span className="top-bar-title" style={{ color: C.text }}>{t.voteTitle}</span>
        <div style={{ width: 32 }} />
      </div>
      <div style={{ marginTop: 60, width: "100%", maxWidth: 430 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.blueBg, border: `2px solid ${C.blueBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2">
            <path d="M9 12l2 2 4-4"/><rect x="3" y="4" width="18" height="16" rx="2"/>
          </svg>
        </div>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: C.text, marginBottom: 6 }}>{t.confirmVote}</h2>
        <p style={{ fontSize: "0.84rem", color: C.muted, marginBottom: 24 }}>{t.aboutToVoteFor}</p>
        <DoubleBanner />
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 28, textAlign: "left" }}>
          <img src={photo} alt={candidate.name} className="avatar" style={{ width: 52, height: 52 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.92rem", color: C.text }}>{candidate.name}</div>
            <div style={{ fontSize: "0.74rem", color: C.muted }}>{t.region} {candidate.city}</div>
            <div style={{ fontSize: "0.72rem", color: C.blue, fontWeight: 600, marginTop: 2 }}>{candidate.city || "Miss"}</div>
          </div>
        </div>
        <div style={{ background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.82rem", color: C.muted }}>
              {effectiveVotes} {t.voteWord || "vote"}{effectiveVotes > 1 ? "s" : ""}{doubleVotes ? " (×2)" : ""}
            </span>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: C.blue }}>{amount.toLocaleString("fr-FR")} FCFA</span>
          </div>
          {fee > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontSize: "0.78rem", color: C.muted }}>{t.fees || "Frais de service"}</span>
                <span style={{ fontSize: "0.82rem", color: C.text }}>{fee.toLocaleString("fr-FR")} FCFA</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${C.blueBorder}`, marginTop: 8, paddingTop: 8 }}>
                <span style={{ fontSize: "0.84rem", fontWeight: 700, color: C.text }}>{t.totalToPay || "Total à payer"}</span>
                <span style={{ fontSize: "0.95rem", fontWeight: 800, color: C.blue }}>{totalToPay.toLocaleString("fr-FR")} FCFA</span>
              </div>
            </>
          )}
        </div>
        <button onClick={handleConfirm} disabled={loading} className="btn-blue" style={{ marginBottom: 10 }}>
          {loading ? t.redirecting : t.confirmMyVote}
        </button>
        <button onClick={() => setStep("form")} className="btn-outline" style={{ marginBottom: 16 }}>{t.cancel}</button>
        <div className="security-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          {t.voteConfidential}
        </div>
      </div>
    </div>
  );

  /* SUCCESS */
  if (step === "success") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center", minHeight: "100vh", background: C.bg, color: C.text }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 8px 32px rgba(37,99,235,0.35)" }} className="scale-in">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
      <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: C.text, marginBottom: 10 }}>{t.thankYou}</h2>
      <p style={{ fontSize: "0.88rem", color: C.muted, lineHeight: 1.7, marginBottom: 16, maxWidth: 260 }}>{t.voteSuccess}</p>
      <p style={{ fontSize: "0.82rem", color: C.blue, fontWeight: 600, marginBottom: 32 }}>
        {t.cooldownWait || "⏱ Veuillez patienter 30 secondes avant de voter à nouveau"}
      </p>
      <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 340 }}>
        <a href="/ranking" className="btn-blue" style={{ flex: 1 }}>{t.seeResults}</a>
        <a href="/candidates" className="btn-outline" style={{ flex: 1 }}>{t.voteAgain}</a>
      </div>
      <div className="security-badge" style={{ marginTop: 24 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        {t.voteConfidential}
      </div>
    </div>
  );

  /* FORM */
  return (
    <div className="page-content fade-up" style={{ background: C.bg, minHeight: "100dvh", color: C.text }}>
      <div className="top-bar" style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => router.back()} style={{ width: 32, height: 32, border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <span className="top-bar-title" style={{ color: C.text }}>{t.voteTitle}</span>
        <div style={{ width: 32 }} />
      </div>

      <div style={{ padding: "0 16px 24px" }}>
        <div style={{ marginTop: 16 }}><DoubleBanner /></div>

        {/* Candidate */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 12, padding: "14px", marginBottom: 20 }}>
          <img src={photo} alt={candidate.name} className="avatar" style={{ width: 52, height: 52 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.92rem", color: C.text }}>{candidate.name}</div>
            <div style={{ fontSize: "0.72rem", color: C.blue, fontWeight: 600 }}>{candidate.city || "Miss"}</div>
          </div>
        </div>

        {/* Voter info */}
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{t.yourInfo}</div>
        <input style={inputStyle} placeholder={t.fullNamePlaceholder} value={voterName} onChange={e => setVoterName(e.target.value)} />
        <input style={inputStyle} type="email" placeholder={t.emailPlaceholder} value={voterEmail} onChange={e => setVoterEmail(e.target.value)} />
        <input style={inputStyle} placeholder={t.phonePlaceholder} value={voterPhone} onChange={e => setVoterPhone(e.target.value)} />

        {/* Amount */}
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{t.amount}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 10 }}>
          {PRESETS.map(p => (
            <button key={p} onClick={() => handlePreset(p)} style={{
              padding: "10px 0", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600,
              border: `1.5px solid ${amount === p ? C.blue : C.inputBorder}`,
              background: amount === p ? C.blueBg : C.inputBg,
              color: amount === p ? C.blue : C.muted,
              cursor: "pointer", fontFamily: "var(--font)", transition: "all 0.15s",
            }}>
              {p >= 1000 ? `${p / 1000}k` : p}F
            </button>
          ))}
        </div>
        <input
          type="number" min={100} step={100}
          value={customAmount}
          onChange={e => handleAmountInput(e.target.value)}
          onBlur={() => {
            const rounded = Math.max(100, Math.round(amount / 100) * 100);
            setAmount(rounded);
            setCustomAmount(String(rounded));
          }}
          placeholder={t.amountFree || "Montant libre (multiple de 100 FCFA)"}
          style={{ ...inputStyle, marginBottom: 4 }}
        />
        <p style={{ fontSize: "0.72rem", color: C.muted, marginBottom: 14 }}>
          {t.amountMin || "Montant minimum 100 FCFA · doit être un multiple de 100"}
        </p>

        {/* Summary */}
        <div style={{ background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 10, padding: "12px 14px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.82rem", color: C.muted }}>
            {effectiveVotes} {t.voteWord || "vote"}{effectiveVotes > 1 ? "s" : ""}{doubleVotes ? " (×2)" : ""}
          </span>
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: C.blue }}>{amount.toLocaleString("fr-FR")} FCFA</span>
        </div>

        {/* Methode de paiement */}
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{t.payment}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {METHODS.map(m => {
            const selected = method === m.id;
            const subLabel = (t as any)[m.subKey] || m.sub;
            const badgeLabel = (t as any)[m.badgeKey] || m.badge;
            return (
              <button key={m.id} onClick={() => handleMethod(m)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", borderRadius: 14,
                border: `1.5px solid ${selected ? C.blue : C.inputBorder}`,
                background: selected ? C.blueBg : C.inputBg,
                cursor: "pointer", fontFamily: "var(--font)", transition: "all 0.15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", minWidth: 0 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: (m.imgs || m.img) ? 0 : undefined, background: (m.imgs || m.img) ? "transparent" : "linear-gradient(135deg,#2563EB,#3B82F6)" }}>
                    {m.imgs
                      ? m.imgs.map((src) => (
                          <img key={src} src={src} alt={m.label} width={21} height={21} style={{ display: "block", borderRadius: 5, objectFit: "contain" }} />
                        ))
                      : m.img
                      ? <img src={m.img} alt={m.label} width={46} height={46} style={{ display: "block", borderRadius: 12 }} />
                      : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20"/></svg>}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: selected ? C.blue : C.text }}>{m.label}</div>
                    <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: 1 }}>{subLabel}</div>
                    <div style={{ marginTop: 5, display: "inline-block", fontSize: "0.66rem", fontWeight: 700, color: m.badgeColor, background: `${m.badgeColor}18`, border: `1px solid ${m.badgeColor}33`, borderRadius: 20, padding: "2px 8px" }}>
                      {badgeLabel}
                    </div>
                  </div>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginLeft: 8, border: `2px solid ${selected ? C.blue : C.inputBorder}`, background: selected ? C.blue : "transparent", display: "grid", placeItems: "center" }}>
                  {selected && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selection du pays */}
        {countryOptions.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              {selectedMethod.region === "africa" ? (t.africaCountry || "Pays (Afrique)") : (t.europeCountry || "Pays (Europe)")}
            </div>
            <select value={country} onChange={e => setCountry(e.target.value)} style={{ ...inputStyle, appearance: "none", MozAppearance: "none", WebkitAppearance: "none" }}>
              {countryOptions.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
            {selectedMethod.region === "africa" && isPreciseAgg && (
              <p style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: 600, marginTop: -6, lineHeight: 1.5 }}>
                ✓ {t.preciseAggNote || "Paiement mobile direct (Orange · MTN) — sans frais de service"}
              </p>
            )}
          </div>
        )}

        {/* Frais repercutes (modes GeniusPay) */}
        {fee > 0 && (
          <div style={{ background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 10, padding: "12px 14px", marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: "0.8rem", color: C.muted }}>
                {effectiveVotes} {t.voteWord || "vote"}{effectiveVotes > 1 ? "s" : ""}{doubleVotes ? " (×2)" : ""}
              </span>
              <span style={{ fontSize: "0.82rem", color: C.text }}>{amount.toLocaleString("fr-FR")} FCFA</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: "0.8rem", color: C.muted }}>{t.fees || "Frais de service"} ({selectedMethod.feePercent}% + {selectedMethod.feeFixed} XOF)</span>
              <span style={{ fontSize: "0.82rem", color: C.text }}>{fee.toLocaleString("fr-FR")} FCFA</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${C.blueBorder}`, paddingTop: 8 }}>
              <span style={{ fontSize: "0.84rem", fontWeight: 700, color: C.text }}>{t.totalToPay || "Total à payer"}</span>
              <span style={{ fontSize: "0.95rem", fontWeight: 800, color: C.blue }}>{totalToPay.toLocaleString("fr-FR")} FCFA</span>
            </div>
            <div style={{ fontSize: "0.7rem", color: C.muted, marginTop: 8, lineHeight: 1.5 }}>{t.feesNote || "Des frais de service s'appliquent à ce mode de paiement et sont à votre charge. Le candidat reçoit l'intégralité de vos votes."}</div>
          </div>
        )}

        <button
          className="btn-blue"
          disabled={!voterName.trim() || !voterEmail.trim() || amount < 100}
          onClick={() => {
            if (!voterName.trim() || !voterEmail.trim()) { toast.error(t.error); return; }
            if (amount < 100 || amount % 100 !== 0) { toast.error(t.amountMultipleError || "Le montant doit être un multiple de 100 FCFA"); return; }
            if (effectiveProvider === "geniuspay" && amount < 200) { toast.error("Montant minimum 200 FCFA (2 votes) pour ce mode de paiement"); return; }
            setStep("confirm");
          }}
          style={{ opacity: (!voterName.trim() || !voterEmail.trim() || amount < 100) ? 0.5 : 1 }}
        >
          {t.continueBtn}
        </button>
        <div className="security-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          {t.voteConfidential}
        </div>
      </div>
    </div>
  );
}
