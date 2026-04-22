"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";

export default function VotePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/candidates");
  }, [router]);

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar />
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "var(--text)", fontSize: "1.1rem", marginBottom: 12 }}>
            Redirection vers les candidats...
          </div>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "2px solid rgba(201,147,42,.2)",
              borderTopColor: "var(--gold)",
              margin: "0 auto",
              animation: "spin 1s linear infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
