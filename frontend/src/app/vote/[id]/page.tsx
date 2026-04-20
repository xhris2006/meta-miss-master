"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { Star, Zap, Lock } from "lucide-react";
import Link from "next/link";

const PRESETS = [100, 500, 1000, 5000];
const VOTE_PRICE = 100;

export default function VotePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [candidate, setCandidate] = useState<any>(null);
  const [amount, setAmount] = useState<number>(500);
  const [loading, setLoading] = useState(false);
  const [contestOpen, setContestOpen] = useState(true);

  const votes = Math.floor(amount / VOTE_PRICE);
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

  useEffect(() => {
    if (!id) return;
    api.get(`/candidates/${id}`).then((r) => setCandidate(r.data.data)).catch(() => router.push("/candidates"));
    api.get("/contest/active").then((r) => setContestOpen(!!r.data.data)).catch(() => setContestOpen(false));
  }, [id]);

  const handleVote = async () => {
    if (!isAuthenticated) return toast.error("Connectez-vous pour voter");
    if (!contestOpen) return toast.error("Les votes sont fermés");
    if (amount < 100) return toast.error("Minimum 100 FCFA");
    setLoading(true);
    try {
      const { data } = await api.post("/payments/initialize", { candidateId: id, amount });
      if (data.data.paymentLink) {
        window.location.href = data.data.paymentLink;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur paiement");
    } finally {
      setLoading(false);
    }
  };

  if (!candidate) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const photo = candidate.photoUrl?.startsWith("http") ? candidate.photoUrl : `${apiBase}${candidate.photoUrl}`;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4 max-w-xl mx-auto">
        <div className="glass rounded-2xl overflow-hidden">
          {/* Candidate header */}
          <div className="relative h-52">
            <Image src={photo} alt={candidate.name} fill className="object-cover" onError={(e: any) => { e.target.src = "/placeholder.jpg"; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-4 left-5">
              <p className="font-display text-2xl text-white">{candidate.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Star className="w-4 h-4 text-gold-400 fill-gold-400" />
                <span className="text-gold-300 text-sm">{candidate.totalVotes.toLocaleString()} votes</span>
              </div>
            </div>
          </div>

          <div className="p-6 flex flex-col gap-6">
            {!contestOpen && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm text-center">
                🔒 Les votes sont actuellement fermés
              </div>
            )}

            <div>
              <p className="text-gray-400 text-sm mb-3 font-body">Choisissez un montant :</p>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {PRESETS.map((p) => (
                  <button key={p} onClick={() => setAmount(p)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all font-body ${amount === p ? "bg-gold-500 text-black" : "glass text-gray-300 hover:text-white"}`}>
                    {p.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="relative">
                <input type="number" value={amount} min={100} step={100}
                  onChange={(e) => setAmount(Math.max(100, +e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold-500/50 outline-none font-body text-center text-lg" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">FCFA</span>
              </div>
            </div>

            {/* Vote preview */}
            <div className="glass rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-body">Vous obtenez</p>
                <p className="font-display text-3xl text-gold-gradient font-bold">{votes} vote{votes > 1 ? "s" : ""}</p>
              </div>
              <Zap className="w-8 h-8 text-gold-400" />
            </div>

            {!isAuthenticated ? (
              <Link href="/auth/login" className="w-full text-center py-4 bg-white/10 text-white rounded-xl font-semibold font-body flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" /> Connectez-vous pour voter
              </Link>
            ) : (
              <button onClick={handleVote} disabled={loading || !contestOpen}
                className="w-full py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-bold rounded-xl hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-50 font-body text-lg animate-pulse-gold">
                {loading ? "Redirection..." : `💳 Payer ${amount.toLocaleString()} FCFA → ${votes} vote${votes > 1 ? "s" : ""}`}
              </button>
            )}

            <p className="text-gray-600 text-xs text-center font-body">Paiement sécurisé via Flutterwave • MTN, Orange Money, Carte</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
