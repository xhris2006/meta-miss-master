"use client";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, Crown } from "lucide-react";
import { motion } from "framer-motion";

interface Candidate {
  id: string; name: string; type: string; city: string;
  photoUrl: string; totalVotes: number; rank?: number; bio?: string;
}

export default function CandidateCard({ candidate, index = 0 }: { candidate: Candidate; index?: number }) {
  const isMiss = candidate.type === "MISS";
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";
  const photo = candidate.photoUrl?.startsWith("http") ? candidate.photoUrl : `${apiBase}${candidate.photoUrl}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07 }}
      className="glass rounded-2xl overflow-hidden hover:border-gold-400/30 transition-all group hover:-translate-y-1"
    >
      <div className="relative h-64 bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
        <Image src={photo} alt={candidate.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" onError={(e: any) => { e.target.src = "/placeholder.jpg"; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {/* Type badge */}
        <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold ${isMiss ? "bg-pink-600/80 text-pink-100" : "bg-blue-600/80 text-blue-100"}`}>
          {isMiss ? "♛ MISS" : "♚ MASTER"}
        </div>
        {/* Rank badge */}
        {candidate.rank && candidate.rank <= 3 && (
          <div className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black rank-${candidate.rank}`}>
            {candidate.rank}
          </div>
        )}
        {/* Vote count */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
          <Star className="w-3.5 h-3.5 text-gold-400 fill-gold-400" />
          <span className="text-gold-300 text-xs font-semibold">{candidate.totalVotes.toLocaleString()}</span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-display text-lg text-white mb-1 truncate">{candidate.name}</h3>
        <div className="flex items-center gap-1 text-gray-400 text-xs mb-4">
          <MapPin className="w-3.5 h-3.5" />{candidate.city}
        </div>
        <div className="flex gap-2">
          <Link href={`/candidates/${candidate.id}`} className="flex-1 text-center py-2 text-xs font-semibold border border-gold-500/30 text-gold-400 rounded-xl hover:bg-gold-500/10 transition-all">
            Profil
          </Link>
          <Link href={`/vote/${candidate.id}`} className="flex-1 text-center py-2 text-xs font-semibold bg-gold-500 text-black rounded-xl hover:bg-gold-400 transition-all">
            Voter
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
