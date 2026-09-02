"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useT } from "@/store/langStore";
import CandidacyButton from "@/components/CandidacyButton";

export default function VoteListPage() {
  const t = useT();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api","") || "http://localhost:5000";

  useEffect(() => {
    api.get("/candidates/top?limit=6")
      .then(r => setCandidates(r.data.data || []))
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-content fade-up">
      <div className="top-bar">
        <div style={{ width: 32 }} />
        <span className="top-bar-title">{t.vote}</span>
        <div style={{ width: 32 }} />
      </div>
      <div style={{ padding: "0 16px 20px" }}>
        <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
          Choisissez un candidat et votez. <strong style={{ color: "var(--text)" }}>1 vote = 100 FCFA</strong>
        </p>

        {/* Skeletons pendant le chargement */}
        {loading && [1,2,3].map(i => (
          <div key={i} className="shimmer" style={{ height: 72, borderRadius: 10, marginBottom: 8 }} />
        ))}

        {/* État vide — aucun candidat */}
        {!loading && candidates.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", padding: "48px 8px", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>🗳️</div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", marginBottom: 8 }}>{t.noVoteYet}</div>
            <div style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginBottom: 28, lineHeight: 1.6 }}>{t.noVoteDesc}</div>
            <CandidacyButton variant="full" style={{ margin: "0 auto" }} />
          </div>
        )}

        {/* Liste des candidats */}
        {!loading && candidates.map((c) => {
          const photo = c.photoUrl?.startsWith("http") ? c.photoUrl : `${apiBase}${c.photoUrl}`;
          return (
            <Link key={c.id} href={`/vote/${c.id}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--bg-white)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 8, transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#2563EB")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <img src={photo} alt={c.name} className="avatar" style={{ width: 48, height: 48 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text)" }}>{c.name}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{c.city || "Miss"}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </Link>
          );
        })}

        {/* Voir tous les candidats si il y en a */}
        {!loading && candidates.length > 0 && (
          <Link href="/candidates" className="btn-outline" style={{ marginTop: 12 }}>
            Voir tous les candidats
          </Link>
        )}
      </div>
    </div>
  );
}
