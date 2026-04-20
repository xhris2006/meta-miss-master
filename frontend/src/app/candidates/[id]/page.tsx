"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import api from "@/lib/api";
import { MapPin, Star, Calendar, ArrowLeft } from "lucide-react";

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get(`/candidates/${id}`).then((r) => setCandidate(r.data.data)).finally(() => setLoading(false));
  }, [id]);

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!candidate) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">Candidat introuvable</div>
  );

  const photo = candidate.photoUrl?.startsWith("http") ? candidate.photoUrl : `${apiBase}${candidate.photoUrl}`;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4 max-w-5xl mx-auto">
        <Link href="/candidates" className="flex items-center gap-2 text-gray-400 hover:text-gold-400 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Photo */}
          <div className="relative h-96 md:h-full min-h-[400px] rounded-2xl overflow-hidden glass">
            <Image src={photo} alt={candidate.name} fill className="object-cover" onError={(e: any) => { e.target.src = "/placeholder.jpg"; }} />
            <div className="absolute bottom-4 left-4">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${candidate.type === "MISS" ? "bg-pink-600/80 text-pink-100" : "bg-blue-600/80 text-blue-100"}`}>
                {candidate.type === "MISS" ? "♛ MISS" : "♚ MASTER"}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center gap-6">
            <div>
              <h1 className="font-display text-4xl text-white mb-2">{candidate.name}</h1>
              <div className="flex items-center gap-1 text-gray-400 text-sm mb-4">
                <MapPin className="w-4 h-4" /> {candidate.city}
              </div>
              {candidate.bio && <p className="text-gray-300 font-body leading-relaxed">{candidate.bio}</p>}
            </div>

            {/* Stats */}
            <div className="glass rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-body">Total des votes</p>
                <p className="font-display text-3xl text-gold-gradient font-bold">{candidate.totalVotes.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs font-body">Âge</p>
                <p className="font-display text-2xl text-white">{candidate.age} ans</p>
              </div>
            </div>

            <Link href={`/vote/${candidate.id}`} className="w-full text-center py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-bold rounded-full hover:from-gold-400 hover:to-gold-500 transition-all text-lg font-body shadow-lg shadow-gold-500/25">
              ⭐ Voter pour {candidate.name}
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
