"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

type Tab = "overview" | "candidates" | "payments";

export default function AdminPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [tab,        setTab]        = useState<Tab>("overview");
  const [stats,      setStats]      = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [payments,   setPayments]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace("/api", "");

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "ADMIN") { router.push("/xhrisadmin"); return; }
    load();
  }, [isAuthenticated]);

  const load = async () => {
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

  const approve = async (id: string) => { try { await api.patch(`/admin/candidates/${id}/approve`); toast.success("Approuvé"); load(); } catch { toast.error("Erreur"); } };
  const reject  = async (id: string) => { try { await api.patch(`/admin/candidates/${id}/reject`);  toast.success("Rejeté");   load(); } catch { toast.error("Erreur"); } };
  const del     = async (id: string) => { if (!confirm("Supprimer ?")) return; try { await api.delete(`/admin/candidates/${id}`); toast.success("Supprimé"); load(); } catch { toast.error("Erreur"); } };

  const S: Record<string, React.CSSProperties> = {
    layout:  { display:"flex", minHeight:"100vh", background:"#080003" },
    sidebar: { width:220, background:"rgba(0,0,0,.4)", borderRight:"1px solid var(--border)", padding:"24px 16px", display:"flex", flexDirection:"column", position:"fixed" as const, top:0, left:0, height:"100vh", zIndex:50 },
    logo:    { display:"flex", alignItems:"center", gap:8, marginBottom:40, fontFamily:"var(--font-display)", fontSize:"1rem", color:"var(--gold-light)", fontWeight:600 },
    navItem: { display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, marginBottom:4, fontSize:"0.82rem", cursor:"pointer", transition:"all .2s", border:"1px solid transparent", color:"var(--text-muted)", fontFamily:"var(--font-body)", background:"transparent", width:"100%", textAlign:"left" as const },
    content: { marginLeft:220, padding:40, flex:1 },
    pageTitle:{ fontFamily:"var(--font-display)", fontSize:"2rem", fontWeight:300, color:"var(--text)", marginBottom:32 },
    statGrid:{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:24 },
    statCard:{ background:"var(--glass)", border:"1px solid var(--border)", borderRadius:16, padding:"20px 24px", backdropFilter:"blur(10px)" },
    statVal: { fontFamily:"var(--font-display)", fontSize:"2rem", fontWeight:600, lineHeight:1 },
    statLbl: { fontSize:"0.72rem", color:"var(--text-muted)", marginTop:6, letterSpacing:"0.05em" },
    table:   { background:"var(--glass)", border:"1px solid var(--border)", borderRadius:16, overflow:"hidden", backdropFilter:"blur(10px)" },
    tHead:   { padding:"14px 20px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"0.82rem", fontWeight:500, color:"var(--text)" },
    tRow:    { display:"grid", alignItems:"center", gap:12, padding:"12px 20px", borderBottom:"1px solid rgba(201,147,42,.06)", fontSize:"0.82rem", transition:"background .15s", cursor:"default" },
    badge:   { padding:"3px 10px", borderRadius:100, fontSize:"0.68rem", fontWeight:500, letterSpacing:"0.05em" },
    actionBtn:{ width:28, height:28, borderRadius:8, border:"1px solid var(--border)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.8rem", transition:"all .2s" },
  };

  const navItems = [
    { key:"overview"   as Tab, icon:"📊", label:"Vue d'ensemble" },
    { key:"candidates" as Tab, icon:"👤", label:"Candidats" },
    { key:"payments"   as Tab, icon:"💳", label:"Paiements" },
  ];

  const statCards = stats ? [
    { icon:"👥", val:stats.totalUsers,          label:"Utilisateurs",           color:"var(--gold-light)" },
    { icon:"✅", val:stats.totalVotes?.toLocaleString("fr-FR"), label:"Votes validés", color:"#66BB6A" },
    { icon:"⏳", val:stats.pendingCandidates,   label:"Candidats en attente",   color:"#FFA726" },
    { icon:"💳", val:stats.completedPayments,   label:"Paiements complétés",    color:"#42A5F5" },
    { icon:"🏆", val:stats.totalCandidates,     label:"Candidats approuvés",    color:"var(--gold-light)" },
    { icon:"💰", val:(stats.revenue||0).toLocaleString("fr-FR")+" FCFA", label:"Revenus",  color:"#66BB6A" },
  ] : [];

  return (
    <div style={S.layout}>
      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.logo}>♛ Admin Panel</div>
        {navItems.map(n => (
          <button key={n.key} style={{
            ...S.navItem,
            ...(tab===n.key ? { background:"rgba(201,147,42,.08)", color:"var(--gold-light)", borderColor:"rgba(201,147,42,.2)" } : {}),
          }} onClick={() => setTab(n.key)}>
            <span>{n.icon}</span> {n.label}
          </button>
        ))}
        <div style={{ marginTop:"auto", paddingTop:24, borderTop:"1px solid var(--border)" }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:8, color:"var(--text-muted)", textDecoration:"none", fontSize:"0.78rem", marginBottom:12 }}>← Site public</Link>
          <button onClick={() => { logout(); router.push("/"); }}
            style={{ ...S.navItem, color:"#EF5350", borderColor:"rgba(239,83,80,.2)" }}>
            🚪 Déconnexion
          </button>
        </div>
      </aside>

      {/* Content */}
      <main style={S.content}>
        {loading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200 }}>
            <div style={{ width:40, height:40, border:"2px solid var(--gold)", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* Overview */}
            {tab === "overview" && (
              <div>
                <h1 style={S.pageTitle}>Tableau de bord</h1>
                <div style={S.statGrid}>
                  {statCards.map(s => (
                    <div key={s.label} style={S.statCard}>
                      <div style={{ fontSize:"1.3rem", marginBottom:12 }}>{s.icon}</div>
                      <div style={{ ...S.statVal, color:s.color }}>{s.val}</div>
                      <div style={S.statLbl}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Candidates */}
            {tab === "candidates" && (
              <div>
                <h2 style={{ ...S.pageTitle, fontSize:"1.6rem" }}>Gestion des candidats</h2>
                <div style={S.table}>
                  <div style={S.tHead}>
                    <span>Candidats</span>
                    <span style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>{candidates.length} au total</span>
                  </div>
                  {candidates.map(c => {
                    const photo = c.photoUrl?.startsWith("http") ? c.photoUrl : `${apiBase}${c.photoUrl}`;
                    return (
                      <div key={c.id} style={{ ...S.tRow, gridTemplateColumns:"40px 1fr 80px 80px 100px" }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,.02)"}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ""}
                      >
                        <div style={{ width:36, height:36, borderRadius:8, overflow:"hidden", position:"relative", border:"1px solid var(--border)" }}>
                          <Image src={photo} alt={c.name} fill style={{ objectFit:"cover" }} onError={(e:any) => { e.target.src="/placeholder.jpg"; }} />
                        </div>
                        <div>
                          <div style={{ fontWeight:500, color:"var(--text)", fontFamily:"var(--font-body)" }}>{c.name}</div>
                          <div style={{ fontSize:"0.7rem", color:"var(--text-muted)" }}>{c.city} · {c.totalVotes} votes</div>
                        </div>
                        <span style={{ ...S.badge, ...(c.type==="MISS" ? {background:"rgba(194,24,91,.15)",color:"#F48FB1",border:"1px solid rgba(194,24,91,.2)"} : {background:"rgba(21,101,192,.15)",color:"#90CAF9",border:"1px solid rgba(21,101,192,.2)"}) }}>
                          {c.type}
                        </span>
                        <span style={{ ...S.badge, ...(c.status==="APPROVED" ? {background:"rgba(102,187,106,.15)",color:"#66BB6A",border:"1px solid rgba(102,187,106,.25)"} : c.status==="PENDING" ? {background:"rgba(255,167,38,.15)",color:"#FFA726",border:"1px solid rgba(255,167,38,.25)"} : {background:"rgba(239,83,80,.15)",color:"#EF5350",border:"1px solid rgba(239,83,80,.25)"}) }}>
                          {c.status}
                        </span>
                        <div style={{ display:"flex", gap:6 }}>
                          {c.status === "PENDING" && (
                            <>
                              <button onClick={() => approve(c.id)} style={S.actionBtn}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background="rgba(102,187,106,.15)"; (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(102,187,106,.3)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background="transparent"; (e.currentTarget as HTMLButtonElement).style.borderColor="var(--border)"; }}
                              >✅</button>
                              <button onClick={() => reject(c.id)} style={S.actionBtn}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background="rgba(239,83,80,.15)"; (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(239,83,80,.3)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background="transparent"; (e.currentTarget as HTMLButtonElement).style.borderColor="var(--border)"; }}
                              >❌</button>
                            </>
                          )}
                          <button onClick={() => del(c.id)} style={S.actionBtn}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background="rgba(239,83,80,.12)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background="transparent"; }}
                          >🗑</button>
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
                <h2 style={{ ...S.pageTitle, fontSize:"1.6rem" }}>Paiements</h2>
                <div style={S.table}>
                  <div style={S.tHead}>
                    <span>Transactions</span>
                    <span style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>{payments.length} au total</span>
                  </div>
                  {payments.map(p => (
                    <div key={p.id} style={{ ...S.tRow, gridTemplateColumns:"1fr 100px 60px 90px 80px" }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,.02)"}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ""}
                    >
                      <div>
                        <div style={{ fontWeight:500, color:"var(--text)", fontFamily:"var(--font-body)" }}>{p.user?.name}</div>
                        <div style={{ fontSize:"0.7rem", color:"var(--text-muted)" }}>{p.user?.email}</div>
                      </div>
                      <div style={{ fontFamily:"var(--font-display)", color:"var(--gold-light)", fontWeight:600 }}>
                        {p.amount?.toLocaleString("fr-FR")} FCFA
                      </div>
                      <div style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>{p.votesCount} votes</div>
                      <span style={{ ...S.badge, ...(p.status==="COMPLETED" ? {background:"rgba(102,187,106,.15)",color:"#66BB6A",border:"1px solid rgba(102,187,106,.25)"} : p.status==="PENDING" ? {background:"rgba(255,167,38,.15)",color:"#FFA726",border:"1px solid rgba(255,167,38,.25)"} : {background:"rgba(239,83,80,.15)",color:"#EF5350",border:"1px solid rgba(239,83,80,.25)"}) }}>
                        {p.status}
                      </span>
                      <span style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>
                        {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
