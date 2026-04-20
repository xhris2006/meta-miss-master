"use client";
import { useEffect, useState } from "react";
import CountUp from "react-countup";
import api from "@/lib/api";
import { Users, Star, TrendingUp, Activity } from "lucide-react";

export default function LiveStatsBar() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get("/ranking/stats").then((r) => setStats(r.data.data)).catch(() => {});
  }, []);

  if (!stats) return null;

  const items = [
    { icon: Users, label: "Candidats", value: stats.totalCandidates },
    { icon: Star, label: "Votes totaux", value: stats.totalVotesCount },
    { icon: TrendingUp, label: "Transactions", value: stats.totalTransactions },
    { icon: Activity, label: "Revenus (FCFA)", value: Math.round(stats.totalRevenue) },
  ];

  return (
    <div className="border-y border-gold-500/10 bg-black/30 py-4 px-4">
      <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-8">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <item.icon className="w-4 h-4 text-gold-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 font-body">{item.label}</p>
              <p className="text-lg font-bold text-white font-display">
                <CountUp end={item.value} duration={2} separator="," />
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
