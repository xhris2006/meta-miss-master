"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CandidateCard from "@/components/candidate/CandidateCard";
import api from "@/lib/api";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/candidates?limit=100")
      .then((response) => setCandidates(response.data.data?.candidates || []))
      .catch(() => setError("Erreur lors du chargement des candidats"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main style={{ flex: 1, width: "100%", padding: "65px 10px 45px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="section-tag">Vote public</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem,5vw,3.2rem)", marginBottom: 10 }}>
            Tous les candidats
          </h1>
          <p style={{ color: "var(--text-muted)", maxWidth: 640, margin: "0 auto 16px", lineHeight: 1.6, fontSize: "0.9rem" }}>
            Choisissez votre favori puis votez librement. Chaque vote vaut 100 FCFA.
          </p>
          <Link href="/candidates/register" className="btn-primary" style={{ fontSize: "0.85rem", padding: "8px 20px" }}>
            Participer au concours
          </Link>
        </div>

        {loading && <div style={{ textAlign: "center", color: "var(--text-muted)" }}>Chargement...</div>}
        {!loading && error && <div style={{ textAlign: "center", color: "#EF5350" }}>{error}</div>}

        {!loading && !error && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
            {candidates.map((candidate, index) => (
              <CandidateCard key={candidate.id} candidate={candidate} index={index} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
