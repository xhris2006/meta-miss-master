"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CandidateCard from "@/components/candidate/CandidateCard";
import api from "@/lib/api";
import { Search } from "lucide-react";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "MISS" | "MASTER">("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    const typeParam = filter !== "ALL" ? `&type=${filter}` : "";
    api.get(`/candidates?page=${page}&limit=12${typeParam}`)
      .then((r) => {
        setCandidates(r.data.data.candidates || []);
        setTotalPages(r.data.data.totalPages || 1);
      })
      .finally(() => setLoading(false));
  }, [filter, page]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4 max-w-7xl mx-auto">
        <h1 className="font-display text-5xl text-center text-gold-gradient mb-3">Les Candidats</h1>
        <p className="text-gray-400 text-center mb-10 font-body">Découvrez et votez pour votre favori(e)</p>

        {/* Filters */}
        <div className="flex justify-center gap-3 mb-10">
          {(["ALL", "MISS", "MASTER"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all font-body ${filter === f ? "bg-gold-500 text-black" : "glass text-gray-300 hover:text-white"}`}
            >
              {f === "ALL" ? "Tous" : f === "MISS" ? "♛ Miss" : "♚ Master"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => <div key={i} className="glass rounded-2xl h-80 shimmer" />)}
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Aucun candidat trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {candidates.map((c, i) => <CandidateCard key={c.id} candidate={c} index={i} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-9 h-9 rounded-full text-sm font-semibold transition-all ${page === i + 1 ? "bg-gold-500 text-black" : "glass text-gray-400 hover:text-white"}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
