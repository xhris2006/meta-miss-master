"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import api from "@/lib/api";
import toast from "react-hot-toast";

const VOTE_PRICE = 100;
const PRESETS = [100, 500, 1000, 5000];

const PROVIDERS = [
  { id: "fapshi", label: "Fapshi", sub: "MTN · Orange Money" },
  { id: "cinetpay", label: "CinetPay", sub: "Mobile Money Afrique" },
  { id: "stripe", label: "Stripe", sub: "Carte bancaire" },
];

export default function VotePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [candidate, setCandidate] = useState<any>(null);
  const [amount, setAmount] = useState<number>(500);
  const [provider, setProvider] = useState<string>("fapshi");
  const [loading, setLoading] = useState(false);
  const [contestOpen, setContestOpen] = useState(true);
  const [voterName, setVoterName] = useState("");
  const [voterEmail, setVoterEmail] = useState("");
  const [voterPhone, setVoterPhone] = useState("");

  const votes = Math.floor(amount / VOTE_PRICE);
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace("/api", "");

  useEffect(() => {
    if (!id) return;

    api
      .get(`/candidates/${id}`)
      .then((r) => setCandidate(r.data.data))
      .catch(() => router.push("/candidates"));

    api
      .get("/contest/active")
      .then((r) => setContestOpen(!!r.data.data))
      .catch(() => setContestOpen(false));
  }, [id, router]);

  const handleVote = async () => {
    if (!contestOpen) return toast.error("Les votes sont fermes");
    if (!voterName.trim()) return toast.error("Entrez votre nom");
    if (!voterEmail.trim()) return toast.error("Entrez votre email");
    if (amount < 100) return toast.error("Minimum 100 FCFA");

    setLoading(true);
    try {
      const { data } = await api.post("/payments/initialize", {
        candidateId: id,
        amount,
        provider,
        voterName,
        voterEmail,
        voterPhone,
      });

      if (data.data.paymentLink) {
        window.location.href = data.data.paymentLink;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur paiement");
    } finally {
      setLoading(false);
    }
  };

  if (!candidate) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: "2px solid var(--gold)",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  const photo = candidate.photoUrl?.startsWith("http") ? candidate.photoUrl : `${apiBase}${candidate.photoUrl}`;

  const S: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh" },
    wrap: {
      padding: "65px 10px 45px",
      maxWidth: 1080,
      margin: "0 auto",
      position: "relative",
      zIndex: 1,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: 14,
    },
    card: {
      background: "var(--glass)",
      border: "1px solid var(--border)",
      borderRadius: 18,
      overflow: "hidden",
      backdropFilter: "blur(20px)",
    },
    header: {
      position: "relative",
      minHeight: 180,
      overflow: "hidden",
      background: "linear-gradient(135deg,#1A0010,#0A0820)",
      display: "flex",
      alignItems: "flex-end",
      padding: 16,
    },
    headerBg: {
      position: "absolute",
      inset: 0,
      background:
        "radial-gradient(ellipse at 30% 40%,rgba(194,24,91,.2),transparent 60%),radial-gradient(ellipse at 70% 60%,rgba(201,147,42,.15),transparent 60%)",
    },
    body: { padding: 14 },
    label: {
      fontSize: "0.7rem",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      marginBottom: 8,
    },
    input: {
      width: "100%",
      padding: "10px 12px",
      background: "rgba(255,255,255,.04)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      color: "var(--text)",
      fontSize: "0.85rem",
      outline: "none",
    },
    presets: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6, marginBottom: 12 },
    inputWrap: { position: "relative", marginBottom: 14 },
    amountInput: {
      width: "100%",
      padding: "12px 40px 12px 14px",
      background: "rgba(255,255,255,.04)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      color: "var(--text)",
      fontSize: "1rem",
      textAlign: "center",
      outline: "none",
      fontFamily: "var(--font-display)",
    },
    currency: {
      position: "absolute",
      right: 14,
      top: "50%",
      transform: "translateY(-50%)",
      fontSize: "0.7rem",
      color: "var(--text-muted)",
    },
    summary: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "rgba(201,147,42,.06)",
      border: "1px solid rgba(201,147,42,.15)",
      borderRadius: 10,
      padding: "11px 14px",
      marginBottom: 14,
      fontSize: "0.85rem",
    },
    submit: {
      width: "100%",
      padding: 12,
      background: "linear-gradient(135deg,var(--gold),var(--gold-light))",
      color: "#08000A",
      border: "none",
      borderRadius: 10,
      fontSize: "0.9rem",
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "var(--font-body)",
      boxShadow: "0 4px 24px rgba(201,147,42,.3)",
    },
  };

  return (
    <div style={{ ...S.page, display: "flex", flexDirection: "column" }}>
      <Navbar />
      <div style={{ ...S.wrap, flex: 1, width: "100%" }}>
        <Link
          href={`/candidates/${candidate.id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "var(--text-muted)",
            textDecoration: "none",
            fontSize: "0.82rem",
            marginBottom: 20,
          }}
        >
          ← Retour au profil
        </Link>

        <div style={S.grid}>
          <div style={S.card}>
            <div style={S.header}>
              <Image src={photo} alt={candidate.name} fill style={{ objectFit: "cover", opacity: 0.45 }} />
              <div style={S.headerBg} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 600, color: "#fff" }}>
                  {candidate.name}
                </div>
                <div style={{ fontSize: "0.86rem", color: "rgba(255,255,255,.72)", lineHeight: 1.7 }}>
                  {candidate.type === "MISS" ? "MISS" : "MASTER"} · {candidate.city}
                  <br />
                  {candidate.totalVotes?.toLocaleString("fr-FR")} votes deja enregistres
                </div>
              </div>
            </div>

            <div style={S.body}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={S.label}>Votre nom</div>
                  <input value={voterName} onChange={(e) => setVoterName(e.target.value)} style={S.input} placeholder="Nom complet" />
                </div>
                <div>
                  <div style={S.label}>Votre email</div>
                  <input value={voterEmail} onChange={(e) => setVoterEmail(e.target.value)} style={S.input} type="email" placeholder="vous@email.com" />
                </div>
                <div>
                  <div style={S.label}>Telephone</div>
                  <input value={voterPhone} onChange={(e) => setVoterPhone(e.target.value)} style={S.input} placeholder="Optionnel" />
                </div>
              </div>

              {!contestOpen && (
                <div
                  style={{
                    background: "rgba(239,83,80,.1)",
                    border: "1px solid rgba(239,83,80,.3)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    color: "#EF5350",
                    fontSize: "0.82rem",
                    textAlign: "center",
                    marginBottom: 20,
                  }}
                >
                  Les votes sont actuellement fermes
                </div>
              )}

              <div style={S.label}>Choisissez un montant</div>
              <div style={S.presets}>
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(preset)}
                    style={{
                      padding: "11px 0",
                      borderRadius: 12,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      border: amount === preset ? "1px solid var(--gold)" : "1px solid var(--border)",
                      background: amount === preset ? "rgba(201,147,42,.12)" : "transparent",
                      color: amount === preset ? "var(--gold-light)" : "var(--text-muted)",
                    }}
                  >
                    {preset.toLocaleString("fr-FR")} FCFA
                  </button>
                ))}
              </div>

              <div style={S.inputWrap}>
                <input
                  style={S.amountInput}
                  type="number"
                  value={amount}
                  min={100}
                  step={100}
                  onChange={(e) => setAmount(Math.max(100, +e.target.value || 100))}
                />
                <span style={S.currency}>FCFA</span>
              </div>

              <div style={S.summary}>
                <div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Vous obtenez</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700, color: "var(--gold-light)" }}>
                    {votes} vote{votes > 1 ? "s" : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
                  1 vote = 100 FCFA
                  <br />
                  Vote libre et repetable
                </div>
              </div>

              <div style={S.label}>Moyen de paiement</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                {PROVIDERS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setProvider(item.id)}
                    style={{
                      padding: "12px 10px",
                      borderRadius: 12,
                      border: `1px solid ${provider === item.id ? "rgba(201,147,42,.5)" : "var(--border)"}`,
                      background: provider === item.id ? "rgba(201,147,42,.08)" : "transparent",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: provider === item.id ? "var(--gold-light)" : "var(--text)" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 4 }}>{item.sub}</div>
                  </button>
                ))}
              </div>

              <button style={S.submit} onClick={handleVote} disabled={loading || !contestOpen}>
                {loading ? "Redirection..." : `Payer ${amount.toLocaleString("fr-FR")} FCFA`}
              </button>

              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", textAlign: "center", marginTop: 14, lineHeight: 1.7 }}>
                Paiement securise via Fapshi, CinetPay ou Stripe.
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
