"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

function Spinner() {
  return <div style={{ width: 32, height: 32, border: "3px solid #DBEAFE", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />;
}

function Content() {
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading"|"pending"|"success"|"failed">("loading");
  const [votes, setVotes] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const txRef = params.get("tx_ref");
    const providerStatus = params.get("status");
    if (!txRef) { setStatus("failed"); setMessage("Référence introuvable"); return; }
    if (providerStatus === "cancelled") { setStatus("failed"); setMessage("Paiement annulé"); return; }

    let cancelled = false;
    let attempts = 0;
    const check = async () => {
      try {
        const { data } = await api.get(`/payments/verify/${txRef}`);
        if (cancelled) return;
        const d = data.data;
        if (d.status === "COMPLETED") { setStatus("success"); setVotes(d.votesCount); setMessage(d.message); return; }
        attempts++;
        if (attempts < 12) { setStatus("pending"); setMessage(d.message || "En attente..."); setTimeout(check, 5000); return; }
        setStatus("failed"); setMessage(d.message || "Non confirmé");
      } catch { if (!cancelled) { setStatus("failed"); setMessage("Erreur de vérification"); } }
    };
    check();
    return () => { cancelled = true; };
  }, [params]);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
      {(status === "loading" || status === "pending") && (
        <>
          <Spinner />
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>
            {status === "loading" ? "Vérification..." : "En cours..."}
          </h2>
          <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 24 }}>
            {status === "loading" ? "Confirmation du paiement..." : message}
          </p>
          {status === "pending" && (
            <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 320 }}>
              <Link href="/ranking" className="btn-outline" style={{ flex: 1, fontSize: "0.82rem" }}>Classement</Link>
              <Link href="/support" className="btn-blue" style={{ flex: 1, fontSize: "0.82rem" }}>Support</Link>
            </div>
          )}
        </>
      )}
      {status === "success" && (
        <>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 8px 32px rgba(37,99,235,0.3)" }} className="scale-in">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Merci !</h2>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#2563EB", marginBottom: 8 }}>{votes} vote{votes>1?"s":""}</div>
          <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginBottom: 28, lineHeight: 1.6, maxWidth: 260 }}>
            Votre vote a été pris<br />en compte avec succès.
          </p>
          <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 320 }}>
            <Link href="/ranking" className="btn-blue" style={{ flex: 1 }}>Voir les résultats</Link>
            <Link href="/candidates" className="btn-outline" style={{ flex: 1 }}>Voter encore</Link>
          </div>
        </>
      )}
      {status === "failed" && (
        <>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#FEF2F2", border: "2px solid #FECACA", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Non confirmé</h2>
          <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginBottom: 28, lineHeight: 1.6 }}>{message}</p>
          <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 320 }}>
            <Link href="/support" className="btn-blue" style={{ flex: 1 }}>Support</Link>
            <Link href="/candidates" className="btn-outline" style={{ flex: 1 }}>Candidats</Link>
          </div>
        </>
      )}
      <div className="security-badge" style={{ marginTop: 24 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Votre vote est confidentiel et sécurisé.
      </div>
    </div>
  );
}

export default function VoteCallbackPage() {
  return (
    <Suspense fallback={<div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#fff"}}><Spinner /></div>}>
      <Content />
    </Suspense>
  );
}
