"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { Users, CreditCard, Star, DollarSign, Clock, CheckCircle, XCircle, Crown, LogOut, BarChart3 } from "lucide-react";

export default function AdminDashboard() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [tab, setTab] = useState<"overview" | "candidates" | "payments">("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "ADMIN") {
      router.push("/auth/login"); return;
    }
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, c, p] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/candidates?limit=50"),
        api.get("/admin/payments?limit=50"),
      ]);
      setStats(s.data.data);
      setCandidates(c.data.data.candidates || []);
      setPayments(p.data.data.payments || []);
    } catch { toast.error("Erreur chargement"); }
    setLoading(false);
  };

  const approve = async (id: string) => {
    try {
      await api.patch(`/admin/candidates/${id}/approve`);
      toast.success("Candidat approuvé");
      loadData();
    } catch { toast.error("Erreur"); }
  };

  const reject = async (id: string) => {
    try {
      await api.patch(`/admin/candidates/${id}/reject`);
      toast.success("Candidat rejeté");
      loadData();
    } catch { toast.error("Erreur"); }
  };

  const deleteCandidate = async (id: string) => {
    if (!confirm("Supprimer ce candidat ?")) return;
    try {
      await api.delete(`/admin/candidates/${id}`);
      toast.success("Supprimé");
      loadData();
    } catch { toast.error("Erreur"); }
  };

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

  const statCards = stats ? [
    { icon: Users, label: "Utilisateurs", value: stats.totalUsers, color: "text-blue-400" },
    { icon: Star, label: "Candidats approuvés", value: stats.totalCandidates, color: "text-gold-400" },
    { icon: Clock, label: "En attente", value: stats.pendingCandidates, color: "text-yellow-400" },
    { icon: CreditCard, label: "Paiements complétés", value: stats.completedPayments, color: "text-green-400" },
    { icon: BarChart3, label: "Total votes", value: stats.totalVotes?.toLocaleString(), color: "text-purple-400" },
    { icon: DollarSign, label: "Revenus (FCFA)", value: stats.revenue?.toLocaleString(), color: "text-emerald-400" },
  ] : [];

  return (
    <div className="min-h-screen bg-[#080003]">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-60 bg-black/40 border-r border-gold-500/10 flex flex-col p-5 z-40">
        <div className="flex items-center gap-2 mb-10">
          <Crown className="w-6 h-6 text-gold-400" />
          <span className="font-display text-white font-bold">Admin Panel</span>
        </div>
        {[
          { key: "overview", label: "Vue d'ensemble", icon: BarChart3 },
          { key: "candidates", label: "Candidats", icon: Users },
          { key: "payments", label: "Paiements", icon: CreditCard },
        ].map((item) => (
          <button key={item.key} onClick={() => setTab(item.key as any)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-body transition-all ${tab === item.key ? "bg-gold-500/10 text-gold-400 border border-gold-500/20" : "text-gray-500 hover:text-gray-300"}`}>
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
        <div className="mt-auto">
          <Link href="/" className="flex items-center gap-2 text-gray-600 text-xs hover:text-gray-400 mb-3">← Site public</Link>
          <button onClick={() => { logout(); router.push("/"); }} className="flex items-center gap-2 text-red-500/60 text-xs hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="ml-60 p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview */}
            {tab === "overview" && (
              <div>
                <h1 className="font-display text-3xl text-white mb-8">Tableau de bord</h1>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  {statCards.map((s) => (
                    <div key={s.label} className="glass rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <s.icon className={`w-5 h-5 ${s.color}`} />
                      </div>
                      <p className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-gray-500 text-sm font-body mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Candidates */}
            {tab === "candidates" && (
              <div>
                <h2 className="font-display text-2xl text-white mb-6">Gestion des candidats</h2>
                <div className="flex flex-col gap-3">
                  {candidates.map((c) => {
                    const photo = c.photoUrl?.startsWith("http") ? c.photoUrl : `${apiBase}${c.photoUrl}`;
                    return (
                      <div key={c.id} className="glass rounded-xl p-4 flex items-center gap-4">
                        <img src={photo} className="w-12 h-12 rounded-full object-cover" onError={(e: any) => { e.target.src = "/placeholder.jpg"; }} alt={c.name} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold font-body">{c.name}</p>
                          <p className="text-gray-500 text-xs font-body">{c.type} · {c.city} · {c.totalVotes} votes</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.status === "APPROVED" ? "bg-green-500/20 text-green-400" : c.status === "PENDING" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                          {c.status}
                        </span>
                        <div className="flex gap-2">
                          {c.status === "PENDING" && (
                            <>
                              <button onClick={() => approve(c.id)} className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"><CheckCircle className="w-4 h-4" /></button>
                              <button onClick={() => reject(c.id)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"><XCircle className="w-4 h-4" /></button>
                            </>
                          )}
                          <button onClick={() => deleteCandidate(c.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all text-xs">🗑</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payments */}
            {tab === "payments" && (
              <div>
                <h2 className="font-display text-2xl text-white mb-6">Paiements</h2>
                <div className="flex flex-col gap-3">
                  {payments.map((p) => (
                    <div key={p.id} className="glass rounded-xl p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold font-body text-sm">{p.user?.name}</p>
                        <p className="text-gray-500 text-xs font-body">{p.user?.email} · Ref: {p.flutterwaveTxRef?.slice(-10)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gold-300 font-bold font-body">{p.amount?.toLocaleString()} FCFA</p>
                        <p className="text-gray-500 text-xs">{p.votesCount} votes</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.status === "COMPLETED" ? "bg-green-500/20 text-green-400" : p.status === "PENDING" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                        {p.status}
                      </span>
                      <span className="text-gray-600 text-xs font-body">{new Date(p.createdAt).toLocaleDateString("fr-FR")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
