"use client";

import type { CSSProperties } from "react";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

const styles: Record<string, CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    background: "var(--glass)",
    border: "1px solid var(--border)",
    borderRadius: 24,
    padding: "48px 40px",
    maxWidth: 440,
    width: "100%",
    textAlign: "center",
    backdropFilter: "blur(20px)",
  },
  icon: { fontSize: "3.5rem", marginBottom: 20 },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: "2rem",
    fontWeight: 600,
    color: "var(--text)",
    marginBottom: 8,
  },
  sub: {
    color: "var(--text-muted)",
    fontSize: "0.88rem",
    marginBottom: 32,
    lineHeight: 1.6,
  },
  votes: {
    fontFamily: "var(--font-display)",
    fontSize: "2.5rem",
    fontWeight: 700,
    color: "var(--gold-light)",
    marginBottom: 8,
  },
  btns: { display: "flex", gap: 12 },
  btn1: {
    flex: 1,
    padding: "13px 0",
    background: "linear-gradient(135deg,var(--gold),var(--gold-light))",
    color: "#08000A",
    borderRadius: 14,
    textDecoration: "none",
    fontWeight: 500,
    fontFamily: "var(--font-body)",
    display: "block",
    textAlign: "center",
  },
  btn2: {
    flex: 1,
    padding: "13px 0",
    background: "var(--glass)",
    color: "var(--text-muted)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    textDecoration: "none",
    fontFamily: "var(--font-body)",
    display: "block",
    textAlign: "center",
  },
  spinner: {
    width: 48,
    height: 48,
    border: "2px solid var(--border)",
    borderTopColor: "var(--gold)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 24px",
  },
};

function CallbackFallback() {
  return (
    <div style={styles.wrap}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={styles.card}>
        <div style={styles.spinner} />
        <div style={styles.title}>Verification...</div>
        <div style={styles.sub}>
          Confirmation du paiement en cours. Veuillez patienter.
        </div>
      </div>
    </div>
  );
}

function CallbackContent() {
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    "loading",
  );
  const [votes, setVotes] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const txRef = params.get("tx_ref");
    const providerStatus = params.get("status");

    if (!txRef) {
      setStatus("failed");
      setMessage("Reference introuvable");
      return;
    }

    if (providerStatus === "cancelled") {
      setStatus("failed");
      setMessage("Paiement annule");
      return;
    }

    api
      .get(`/payments/verify/${txRef}`)
      .then((response) => {
        const paymentData = response.data.data;

        if (paymentData.status === "COMPLETED") {
          setStatus("success");
          setVotes(paymentData.votesCount);
          setMessage(paymentData.message);
          return;
        }

        setStatus("failed");
        setMessage(paymentData.message || "Paiement non confirme");
      })
      .catch(() => {
        setStatus("failed");
        setMessage("Erreur lors de la verification");
      });
  }, [params]);

  return (
    <div style={styles.wrap}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={styles.card}>
        {status === "loading" && (
          <>
            <div style={styles.spinner} />
            <div style={styles.title}>Verification...</div>
            <div style={styles.sub}>
              Confirmation du paiement en cours. Veuillez patienter.
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div style={styles.icon}>OK</div>
            <div style={styles.title}>Merci pour votre vote !</div>
            <div style={styles.votes}>
              {votes} vote{votes > 1 ? "s" : ""}
            </div>
            <div style={styles.sub}>{message}</div>
            <div style={styles.btns}>
              <Link href="/ranking" style={styles.btn1}>
                Voir le classement
              </Link>
              <Link href="/candidates" style={styles.btn2}>
                Candidats
              </Link>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <div style={styles.icon}>X</div>
            <div style={styles.title}>Paiement non confirme</div>
            <div style={styles.sub}>{message}</div>
            <Link
              href="/candidates"
              style={{ ...styles.btn2, display: "block", maxWidth: 240, margin: "0 auto" }}
            >
              Retour aux candidats
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VoteCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <CallbackContent />
    </Suspense>
  );
}
