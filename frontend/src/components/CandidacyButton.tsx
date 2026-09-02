"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useCandidacy } from "@/hooks/useCandidacy";
import { useAuthStore } from "@/store/authStore";

const COOLDOWN_MS = 5 * 60 * 60 * 1000; // 5h

function formatCountdown(msLeft: number): string {
  const totalSec = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props {
  /** Style du bouton selon le contexte */
  variant?: "full" | "compact";
  className?: string;
  style?: React.CSSProperties;
}

export default function CandidacyButton({ variant = "full", style }: Props) {
  const { isAuthenticated } = useAuthStore();
  const { submitted, submittedAt, cooldownDone, candidateId, loading, reset } = useCandidacy();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [tick, setTick] = useState(0);

  // Compte à rebours en temps réel
  useEffect(() => {
    if (!submitted || !submittedAt) return;
    const update = () => {
      const elapsed = Date.now() - submittedAt;
      const left = Math.max(0, COOLDOWN_MS - elapsed);
      setTimeLeft(left);
      if (left === 0) reset(); // expire → on réinitialise
    };
    update();
    const id = setInterval(() => { update(); setTick(t => t + 1); }, 1000);
    return () => clearInterval(id);
  }, [submitted, submittedAt, reset]);

  if (loading) return null;

  // Pas encore soumis → bouton classique
  if (!submitted) {
    if (variant === "compact") {
      return (
        <Link
          href={isAuthenticated ? "/candidates/register" : "/login?redirect=/candidates/register"}
          className="btn-blue"
          style={{ fontSize: "0.83rem", padding: "11px 16px", maxWidth: 260, width: "100%", ...style }}
        >
          ✍️ Soumettre ma candidature
        </Link>
      );
    }
    return (
      <Link
        href={isAuthenticated ? "/candidates/register" : "/login?redirect=/candidates/register"}
        className="btn-blue"
        style={{ maxWidth: 280, width: "100%", ...style }}
      >
        ✍️ Soumettre ma candidature
      </Link>
    );
  }

  // Soumis + 5h non écoulées → compte à rebours + bouton modifier
  if (submitted && !cooldownDone && timeLeft > 0) {
    return (
      <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 10, ...style }}>
        {/* Bandeau compte à rebours */}
        <div style={{
          background: "var(--bg-card)",
          border: "1.5px solid var(--border)",
          borderRadius: 14,
          padding: "14px 16px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            ⏳ Modification possible dans
          </div>
          <div style={{
            fontSize: variant === "compact" ? "1.4rem" : "1.8rem",
            fontWeight: 900,
            color: "var(--blue)",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
          }}>
            {formatCountdown(timeLeft)}
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 4 }}>
            Votre candidature est en cours de vérification
          </div>
        </div>

        {/* Bouton modifier (disponible après 5h) */}
        {candidateId && (
          <Link
            href={`/candidates/register?edit=${candidateId}`}
            style={{
              display: "block",
              textAlign: "center",
              padding: "11px 16px",
              borderRadius: 12,
              border: "1.5px solid var(--border)",
              background: "var(--bg-card)",
              color: "var(--text-muted)",
              fontSize: "0.8rem",
              fontWeight: 600,
              textDecoration: "none",
              opacity: 0.5,
              pointerEvents: "none",
              cursor: "not-allowed",
            }}
          >
            ✏️ Modifier mes informations (bientôt disponible)
          </Link>
        )}
      </div>
    );
  }

  // 5h écoulées → peut modifier
  return (
    <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 10, ...style }}>
      <div style={{
        background: "#F0FDF4",
        border: "1.5px solid #BBF7D0",
        borderRadius: 12,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.2"><path d="M20 6L9 17l-5-5"/></svg>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#10B981" }}>Candidature soumise avec succès</span>
      </div>
      {candidateId && (
        <Link
          href={`/candidates/register?edit=${candidateId}`}
          style={{
            display: "block",
            textAlign: "center",
            padding: "12px 16px",
            borderRadius: 12,
            border: "1.5px solid var(--blue)",
            background: "var(--blue-light)",
            color: "var(--blue)",
            fontSize: "0.85rem",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ✏️ Modifier mes informations
        </Link>
      )}
    </div>
  );
}
