"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import CandidateCard from "@/components/candidate/CandidateCard";
import { Crown } from "lucide-react";

export default function TopCandidatesPreview() {
  const [miss, setMiss] = useState<any[]>([]);
  const [master, setMaster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/candidates/top?type=MISS&limit=3"),
      api.get("/candidates/top?type=MASTER&limit=3"),
    ]).then(([r1, r2]) => {
      setMiss(r1.data.data || []);
      setMaster(r2.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-20 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-14">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Crown className="w-5 h-5 text-gold-400" />
          <span className="text-gold-400 text-sm tracking-widest uppercase font-body">Top Candidats</span>
          <Crown className="w-5 h-5 text-gold-400" />
        </div>
        <h2 className="font-display text-4xl text-white">En tête du classement</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass rounded-2xl h-80 shimmer" />
          ))}
        </div>
      ) : (
        <>
          <h3 className="font-display text-2xl text-pink-400 mb-6 text-center">♛ Miss</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {miss.map((c, i) => <CandidateCard key={c.id} candidate={{ ...c, rank: i + 1 }} index={i} />)}
          </div>
          <h3 className="font-display text-2xl text-blue-400 mb-6 text-center">♚ Master</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {master.map((c, i) => <CandidateCard key={c.id} candidate={{ ...c, rank: i + 1 }} index={i} />)}
          </div>
        </>
      )}

      <div className="text-center">
        <Link href="/candidates" className="px-8 py-3 border border-gold-500/40 text-gold-400 rounded-full hover:bg-gold-500/10 transition-all font-body font-medium">
          Voir tous les candidats →
        </Link>
      </div>
    </section>
  );
}
