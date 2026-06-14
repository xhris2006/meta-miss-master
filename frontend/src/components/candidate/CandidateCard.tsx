"use client";
import Image from "next/image";
import Link from "next/link";

interface Candidate {
  id: string; name: string; type: string; city: string;
  photoUrl: string; totalVotes: number; rank?: number;
}

export default function CandidateCard({ candidate, index = 0 }: { candidate: Candidate; index?: number }) {
  const isMiss = candidate.type === "MISS";
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace("/api", "");
  const photo = candidate.photoUrl?.startsWith("http") ? candidate.photoUrl : `${apiBase}${candidate.photoUrl}`;
  const rankClass = candidate.rank && candidate.rank <= 3 ? `rank-${candidate.rank}` : "";

  return (
    <div style={{
      background: "var(--bg2)",
      border: "1px solid var(--border-sub)",
      borderRadius: 18, overflow: "hidden",
      transition: "transform .3s, border-color .3s, box-shadow .3s",
      animation: `fade-up .6s ${index * 0.07}s ease both`,
      cursor: "pointer",
    }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-6px)";
        el.style.borderColor = "rgba(255,107,0,.35)";
        el.style.boxShadow = "0 20px 50px rgba(0,0,0,.4), 0 0 0 1px rgba(255,107,0,.15)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "";
        el.style.borderColor = "var(--border-sub)";
        el.style.boxShadow = "";
      }}
    >
      {/* Photo */}
      <div style={{
        position: "relative", height: 270, overflow: "hidden",
        background: isMiss
          ? "linear-gradient(135deg,#1A0A00,#0D0A00)"
          : "linear-gradient(135deg,#0A0800,#0A0D00)",
      }}>
        <Image src={photo} alt={candidate.name} fill style={{ objectFit: "cover" }}
          onError={(e: any) => { e.target.src = "/placeholder.jpg"; }} />

        {/* Gradient overlay bottom */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "55%",
          background: "linear-gradient(to top, rgba(0,0,0,.85), transparent)",
          zIndex: 1,
        }} />

        {/* Type badge */}
        <div style={{
          position: "absolute", top: 10, left: 10, zIndex: 2,
          padding: "4px 11px", borderRadius: 100,
          fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.1em",
        }} className="badge-miss">
          ♛ MISS
        </div>

        {/* Rank badge */}
        {rankClass && (
          <div style={{
            position: "absolute", top: 10, right: 10, zIndex: 2,
            width: 28, height: 28, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.72rem", fontWeight: 800,
          }} className={rankClass}>
            {candidate.rank}
          </div>
        )}

        {/* Vote count bottom right */}
        <div style={{
          position: "absolute", bottom: 10, right: 10, zIndex: 2,
          display: "flex", alignItems: "center", gap: 5,
          background: "rgba(0,0,0,.6)", backdropFilter: "blur(10px)",
          padding: "4px 10px", borderRadius: 100,
          fontSize: "0.72rem", color: "var(--orange-pale)",
          border: "1px solid rgba(255,107,0,.2)",
        }}>
          <span style={{ color: "var(--orange)" }}>★</span>
          {candidate.totalVotes.toLocaleString("fr-FR")}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 14px 14px" }}>
        <div style={{
          fontFamily: "var(--font-body)", fontSize: "0.96rem",
          fontWeight: 700, color: "var(--text)", marginBottom: 4,
        }}>
          {candidate.name}
        </div>
        <div style={{
          fontSize: "0.74rem", color: "var(--text-muted)",
          marginBottom: 14, display: "flex", alignItems: "center", gap: 4,
        }}>
          <span>📍</span> {candidate.city}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/candidates/${candidate.id}`} style={{
            flex: 1, padding: "9px 0", textAlign: "center",
            background: "transparent", color: "var(--orange)",
            border: "1.5px solid rgba(255,107,0,.3)", borderRadius: 10,
            fontSize: "0.78rem", textDecoration: "none", fontWeight: 500,
            transition: "all .2s", display: "block",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,107,0,.08)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--orange)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,107,0,.3)";
            }}
          >
            Profil
          </Link>
          <Link href={`/vote/${candidate.id}`} style={{
            flex: 1, padding: "9px 0", textAlign: "center",
            background: "var(--orange)", color: "#fff",
            border: "none", borderRadius: 10,
            fontSize: "0.78rem", textDecoration: "none", fontWeight: 700,
            transition: "all .2s", display: "block",
            boxShadow: "0 3px 12px rgba(255,107,0,.25)",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--orange-light)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--orange)"; }}
          >
            ⭐ Voter
          </Link>
        </div>
      </div>
    </div>
  );
}
