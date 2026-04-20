"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import api from "@/lib/api";
import { Crown, Wifi, Star, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RankedCandidate {
  id: string; name: string; city: string; photoUrl: string; totalVotes: number; rank: number;
}

export default function RankingPage() {
  const [miss, setMiss] = useState<RankedCandidate[]>([]);
  const [master, setMaster] = useState<RankedCandidate[]>([]);
  const [tab, setTab] = useState<"MISS" | "MASTER">("MISS");
  const [live, setLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

  useEffect(() => {
    // Initial fetch
    api.get("/ranking?type=MISS").then((r) => setMiss(r.data.data || []));
    api.get("/ranking?type=MASTER").then((r) => setMaster(r.data.data || []));

    // Socket
    const socket: Socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000", { transports: ["websocket"] });
    socket.on("connect", () => { setLive(true); socket.emit("join:ranking"); });
    socket.on("disconnect", () => setLive(false));
    socket.on("ranking:update", (data) => {
      setMiss(data.miss || []);
      setMaster(data.master || []);
      setLastUpdate(new Date(data.updatedAt).toLocaleTimeString("fr-FR"));
    });
    return () => { socket.disconnect(); };
  }, []);

  const current = tab === "MISS" ? miss : master;
  const rankColors = ["text-gold-400", "text-gray-400", "text-amber-600"];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-display text-5xl text-gold-gradient mb-3">Classement</h1>
          <div className="flex items-center justify-center gap-2">
            <Wifi className={`w-4 h-4 ${live ? "text-green-400" : "text-gray-600"}`} />
            <span className={`text-sm font-body ${live ? "text-green-400" : "text-gray-500"}`}>
              {live ? `Temps réel${lastUpdate ? ` · ${lastUpdate}` : ""}` : "Hors ligne"}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-3 mb-10">
          {(["MISS", "MASTER"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-8 py-3 rounded-full font-semibold font-body transition-all ${tab === t ? "bg-gold-500 text-black" : "glass text-gray-300 hover:text-white"}`}>
              {t === "MISS" ? "♛ Miss" : "♚ Master"}
            </button>
          ))}
        </div>

        {/* Podium TOP 3 */}
        {current.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-10 h-40">
            {[current[1], current[0], current[2]].map((c, i) => {
              const heights = ["h-28", "h-36", "h-24"];
              const podiumRanks = [2, 1, 3];
              const photo = c.photoUrl?.startsWith("http") ? c.photoUrl : `${apiBase}${c.photoUrl}`;
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className={`${heights[i]} flex-1 max-w-[130px] glass rounded-t-2xl flex flex-col items-center justify-end pb-3 relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-20">
                    <Image src={photo} alt={c.name} fill className="object-cover" onError={(e: any) => { e.target.src = "/placeholder.jpg"; }} />
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black rank-${podiumRanks[i]} mb-1`}>{podiumRanks[i]}</div>
                  <p className="text-white text-xs font-semibold text-center px-1 truncate w-full text-center font-body">{c.name.split(" ")[0]}</p>
                  <p className="text-gold-400 text-xs font-body">{c.totalVotes.toLocaleString()}</p>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Full list */}
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {current.map((c, i) => {
              const photo = c.photoUrl?.startsWith("http") ? c.photoUrl : `${apiBase}${c.photoUrl}`;
              return (
                <motion.div key={c.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="glass rounded-2xl p-4 flex items-center gap-4 hover:border-gold-400/30 transition-all">
                  <div className={`w-8 text-center font-display text-lg font-bold ${rankColors[i] || "text-gray-500"}`}>
                    {i < 3 ? ["🥇","🥈","🥉"][i] : c.rank}
                  </div>
                  <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    <Image src={photo} alt={c.name} fill className="object-cover" onError={(e: any) => { e.target.src = "/placeholder.jpg"; }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold font-body truncate">{c.name}</p>
                    <p className="text-gray-500 text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 justify-end">
                      <Star className="w-3.5 h-3.5 text-gold-400 fill-gold-400" />
                      <span className="text-gold-300 font-bold text-sm font-body">{c.totalVotes.toLocaleString()}</span>
                    </div>
                    <Link href={`/vote/${c.id}`} className="text-xs text-gold-400/70 hover:text-gold-400 transition-colors font-body">Voter →</Link>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </div>
  );
}
