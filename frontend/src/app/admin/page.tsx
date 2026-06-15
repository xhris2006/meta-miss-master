"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import {
  LayoutDashboard, Users, CreditCard, Trophy, User, LogOut,
  CheckCircle2, XCircle, Trash2, Edit3, Plus, Camera, Globe, FileDown, type LucideIcon
} from "lucide-react";
import { downloadCandidatePdf, downloadTransactionsPdf } from "@/lib/pdf";

type Tab = "overview" | "candidates" | "payments" | "contests" | "users";
const EMPTY_EDIT = { name: "", city: "", age: "", bio: "", type: "MISS", status: "PENDING", instagram: "", tiktok: "", snap: "", whatsappFan: "", phone: "", email: "" };
const EMPTY_SOCIAL = { whatsappGroup: "", whatsappChannel: "", tiktok: "", youtube: "", snapchat: "", telegram: "" };

/* ─── Shared styles ─────────────────────────────────────────────────────── */
const S = {
  bg: "#F1F5F9",
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 20 } as React.CSSProperties,
  inp: { width: "100%", padding: "12px 14px", border: "1.5px solid #E2E8F0", borderRadius: 12, fontSize: 14, outline: "none", fontFamily: "inherit", background: "#F8FAFF", color: "#0F172A", boxSizing: "border-box" } as React.CSSProperties,
  lbl: { fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" as const, letterSpacing: "0.08em", display: "block", marginBottom: 6 },
  pill: (color: string) => ({ padding: "3px 10px", borderRadius: 100, background: color + "18", color, border: `1px solid ${color}30`, fontSize: 11, fontWeight: 700 } as React.CSSProperties),
};

export default function AdminPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* modals */
  const [viewingCandidate, setViewingCandidate] = useState<any>(null);
  const [editingCandidate, setEditingCandidate] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editValues, setEditValues] = useState({ ...EMPTY_EDIT });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUserValues, setEditUserValues] = useState({ name: "", email: "", role: "" });
  const [editUserSaving, setEditUserSaving] = useState(false);

  const [showCreateContest, setShowCreateContest] = useState(false);
  const [newContest, setNewContest] = useState({ name: "", startDate: "", endDate: "" });
  const [contestSaving, setContestSaving] = useState(false);
  const [editingContest, setEditingContest] = useState<any>(null);
  const [editContestValues, setEditContestValues] = useState({ name: "", startDate: "", endDate: "" });
  const [editContestSaving, setEditContestSaving] = useState(false);

  /* réseaux sociaux */
  const [socialValues, setSocialValues] = useState({ ...EMPTY_SOCIAL });
  const [socialSaving, setSocialSaving] = useState(false);
  const [socialLoaded, setSocialLoaded] = useState(false);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace("/api", "");

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "ADMIN") { router.push("/xhrisadmin"); return; }
    load();
  }, [isAuthenticated]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, c, p, u, ct] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/candidates?limit=100"),
        api.get("/admin/payments?limit=50"),
        api.get("/admin/users?limit=50"),
        api.get("/admin/contests").catch(() => ({ data: { data: [] } })),
      ]);
      setStats(s.data.data);
      setCandidates(c.data.data.candidates || []);
      setPayments(p.data.data.payments || []);
      setUsers(u.data.data.users || []);
      setContests(ct.data.data || []);
    } catch { toast.error("Erreur chargement"); }
    setLoading(false);
  };

  /* Charger les réseaux quand on arrive sur l'onglet contests */
  useEffect(() => {
    if (tab === "contests" && !socialLoaded) {
      api.get("/admin/social-links").then(r => {
        const d = r.data.data || {};
        setSocialValues({ whatsappGroup: d.whatsappGroup || "", whatsappChannel: d.whatsappChannel || "", tiktok: d.tiktok || "", youtube: d.youtube || "", snapchat: d.snapchat || "", telegram: d.telegram || "" });
        setSocialLoaded(true);
      }).catch(() => setSocialLoaded(true));
    }
  }, [tab]);

  const approve = async (id: string) => { try { await api.patch(`/admin/candidates/${id}/approve`); toast.success("Approuvé ✓"); load(); } catch { toast.error("Erreur"); } };
  const reject = async (id: string) => { try { await api.patch(`/admin/candidates/${id}/reject`); toast.success("Rejeté"); load(); } catch { toast.error("Erreur"); } };
  const del = async (id: string) => { if (!confirm("Supprimer définitivement ?")) return; try { await api.delete(`/admin/candidates/${id}`); toast.success("Supprimé"); load(); } catch { toast.error("Erreur"); } };

  const openEdit = (c: any) => {
    setIsCreating(false); setEditingCandidate(c);
    setEditValues({ name: c.name||"", city: c.city||"", age: String(c.age||""), bio: c.bio||"", type: c.type||"MISS", status: c.status||"PENDING", instagram: c.instagram||"", tiktok: c.tiktok||"", snap: c.snap||"", whatsappFan: c.whatsappFan||"", phone: c.phone||"", email: c.email||"" });
    setPhotoFile(null);
    setPhotoPreview(c.photoUrl?.startsWith("http") ? c.photoUrl : `${apiBase}${c.photoUrl}`);
  };
  const openCreate = () => { setIsCreating(true); setEditingCandidate({}); setEditValues({ ...EMPTY_EDIT }); setPhotoFile(null); setPhotoPreview(null); };

  const saveCandidate = async () => {
    if (isCreating && !photoFile) { toast.error("Photo obligatoire"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      // Création : on n'envoie que les champs remplis.
      // Édition : on envoie TOUS les champs (même vides) pour que vider une
      // valeur (Instagram, TikTok, etc.) la supprime côté serveur.
      Object.entries(editValues).forEach(([k, v]) => {
        if (isCreating) {
          if (v) fd.append(k, v);
        } else {
          fd.append(k, v ?? "");
        }
      });
      if (photoFile) fd.append("photo", photoFile);
      if (isCreating) { await api.post("/admin/candidates", fd, { headers: { "Content-Type": "multipart/form-data" } }); toast.success("Candidat ajouté ✓"); }
      else { await api.patch(`/admin/candidates/${editingCandidate.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } }); toast.success("Mis à jour ✓"); }
      setEditingCandidate(null); load();
    } catch { toast.error("Erreur d'enregistrement"); }
    setSaving(false);
  };

  const saveSocial = async () => {
    setSocialSaving(true);
    try {
      await api.put("/admin/social-links", socialValues);
      toast.success("Réseaux sociaux mis à jour ✓");
    } catch { toast.error("Erreur de sauvegarde"); }
    setSocialSaving(false);
  };

  const statusColor: Record<string, string> = { APPROVED: "#10B981", PENDING: "#F59E0B", REJECTED: "#EF4444", COMPLETED: "#10B981", FAILED: "#EF4444", REFUNDED: "#EF4444", OPEN: "#10B981", CLOSED: "#64748B" };
  const sc = (s: string) => statusColor[s] || "#64748B";

  /* ── PDF exports ── */
  const [exportingTx, setExportingTx] = useState(false);
  const candidateNameById: Record<string, string> = Object.fromEntries(candidates.map((c: any) => [c.id, c.name]));

  const handleCandidatePdf = async (c: any) => {
    try { await downloadCandidatePdf(c, apiBase); toast.success("PDF généré ✓"); }
    catch { toast.error("Erreur lors de la génération du PDF"); }
  };

  const handleTransactionsPdf = async () => {
    setExportingTx(true);
    try {
      // Fetch every transaction (not only the 50 displayed) for a complete report.
      const res = await api.get("/admin/payments?limit=10000");
      const all = res.data?.data?.payments?.length ? res.data.data.payments : payments;
      await downloadTransactionsPdf(all, candidateNameById);
      toast.success("PDF des transactions généré ✓");
    } catch { toast.error("Erreur lors de l'export PDF"); }
    setExportingTx(false);
  };

  // Small label/value cell used by the payments detail grid.
  const cell = (label: string, value: any) => (
    <div>
      <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ color: "#0F172A", fontWeight: 600, marginTop: 2, wordBreak: "break-word", fontSize: 12.5 }}>{value === null || value === undefined || value === "" ? "—" : value}</div>
    </div>
  );

  const navItems: { key: Tab; Icon: LucideIcon; label: string }[] = [
    { key: "overview", Icon: LayoutDashboard, label: "Tableau de bord" },
    { key: "candidates", Icon: Users, label: "Candidats" },
    { key: "payments", Icon: CreditCard, label: "Paiements" },
    { key: "contests", Icon: Trophy, label: "Concours & Réseaux" },
    { key: "users", Icon: User, label: "Utilisateurs" },
  ];

  const SidebarContent = () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 4px", marginBottom: 8 }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <LayoutDashboard size={18} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>MetaMiss Admin</div>
          <div style={{ fontSize: 12, color: "#94A3B8" }}>{user?.name || "Admin"}</div>
        </div>
      </div>
      <nav style={{ display: "grid", gap: 3 }}>
        {navItems.map(({ key, Icon, label }) => (
          <button key={key} onClick={() => { setTab(key); setSidebarOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12, border: "none", cursor: "pointer", background: tab === key ? "linear-gradient(135deg,#6366F118,#8B5CF618)" : "transparent", color: tab === key ? "#6366F1" : "#64748B", fontWeight: tab === key ? 700 : 500, fontSize: 14, borderLeft: tab === key ? "3px solid #6366F1" : "3px solid transparent", textAlign: "left", fontFamily: "inherit" }}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>
      <div style={{ marginTop: "auto", display: "grid", gap: 8 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, background: "#F8FAFF", color: "#64748B", textDecoration: "none", fontSize: 13, fontWeight: 500 }}>← Retour au site</Link>
        <button onClick={() => { logout(); router.push("/"); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, background: "#FEF2F2", color: "#EF4444", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, width: "100%", fontFamily: "inherit" }}>
          <LogOut size={14} /> Déconnexion
        </button>
      </div>
    </>
  );

  const statCards = stats ? [
    { Icon: Users, val: stats.totalUsers, label: "Utilisateurs", color: "#6366F1" },
    { Icon: CheckCircle2, val: (stats.totalVotes||0).toLocaleString("fr-FR"), label: "Votes validés", color: "#10B981" },
    { Icon: XCircle, val: stats.pendingCandidates, label: "Candidatures en attente", color: "#F59E0B" },
    { Icon: CreditCard, val: stats.completedPayments, label: "Paiements complétés", color: "#2563EB" },
    { Icon: LayoutDashboard, val: stats.totalCandidates, label: "Candidats approuvés", color: "#8B5CF6" },
    { Icon: Trophy, val: ((stats.revenue||0)/1000).toFixed(0) + "k FCFA", label: "Revenus totaux", color: "#10B981" },
  ] : [];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: S.bg, fontFamily: "system-ui,sans-serif" }}>

      {/* Desktop sidebar */}
      <aside className="admin-desktop-sidebar" style={{ display: "none", flexDirection: "column", gap: 16, position: "fixed", top: 0, left: 0, bottom: 0, width: 260, background: "#fff", borderRight: "1px solid #E2E8F0", padding: "28px 18px", zIndex: 50 }}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 60, backdropFilter: "blur(4px)" }} />}
      <aside style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 270, background: "#fff", borderRight: "1px solid #E2E8F0", padding: "28px 18px", zIndex: 70, display: "flex", flexDirection: "column", gap: 16, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform .25s ease" }}>
        <SidebarContent />
      </aside>

      {/* Main */}
      <main className="admin-main-content" style={{ flex: 1, minHeight: "100vh", padding: "24px 20px 60px" }}>

        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <button className="admin-menu-btn" onClick={() => setSidebarOpen(true)} style={{ width: 44, height: 44, borderRadius: 14, border: "1.5px solid #E2E8F0", background: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>{navItems.find(n=>n.key===tab)?.label}</h1>
            <p style={{ margin: "3px 0 0", color: "#94A3B8", fontSize: 13 }}>{tab === "candidates" ? `${candidates.length} candidats` : "Panneau d'administration"}</p>
          </div>
          {tab === "candidates" && (
            <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 14, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, boxShadow: "0 4px 20px #6366F130", fontFamily: "inherit" }}>
              <Plus size={16} /> Ajouter
            </button>
          )}
          <button onClick={load} style={{ width: 44, height: 44, borderRadius: 12, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", cursor: "pointer", fontSize: 18, display: "grid", placeItems: "center" }}>↺</button>
        </div>

        {loading ? (
          <div style={{ minHeight: 300, display: "grid", placeItems: "center", color: "#94A3B8" }}>Chargement...</div>
        ) : (<>

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="admin-stats">
              {statCards.map(card => (
                <div key={card.label} className="admin-stat-c" style={{ ...S.card }}>
                  <div className="ic" style={{ background: card.color + "18" }}>
                    <card.Icon size={17} color={card.color} />
                  </div>
                  <div className="v">{card.val}</div>
                  <div className="l">{card.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── CANDIDATES ── */}
          {tab === "candidates" && (
            <div style={{ display: "grid", gap: 10 }}>
              {candidates.map(c => {
                const photo = c.photoUrl?.startsWith("http") ? c.photoUrl : `${apiBase}${c.photoUrl}`;
                return (
                  <div key={c.id} style={{ ...S.card, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div onClick={() => setViewingCandidate(c)} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, cursor: "pointer" }}>
                      <div style={{ width: 52, height: 52, borderRadius: 16, overflow: "hidden", background: "#EFF6FF", position: "relative", flexShrink: 0 }}>
                        <Image src={photo} alt={c.name} fill style={{ objectFit: "cover" }} onError={(e:any)=>{e.target.style.display="none";}} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{c.email || c.city} · {c.totalVotes} votes</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                          <span style={S.pill(c.type==="MISS"?"#EC4899":"#6366F1")}>{c.type}</span>
                          <span style={S.pill(sc(c.status))}>{c.status}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button title="Télécharger la fiche PDF" onClick={() => handleCandidatePdf(c)} style={{ width: 36, height: 36, borderRadius: 10, border: "1.5px solid #2563EB30", background: "#2563EB10", display: "grid", placeItems: "center", cursor: "pointer" }}><FileDown size={15} color="#2563EB" /></button>
                      <button onClick={() => openEdit(c)} style={{ width: 36, height: 36, borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}><Edit3 size={15} color="#6366F1" /></button>
                      {c.status === "PENDING" && <>
                        <button onClick={() => approve(c.id)} style={{ width: 36, height: 36, borderRadius: 10, border: "1.5px solid #10B98130", background: "#10B98110", display: "grid", placeItems: "center", cursor: "pointer" }}><CheckCircle2 size={15} color="#10B981" /></button>
                        <button onClick={() => reject(c.id)} style={{ width: 36, height: 36, borderRadius: 10, border: "1.5px solid #F59E0B30", background: "#F59E0B10", display: "grid", placeItems: "center", cursor: "pointer" }}><XCircle size={15} color="#F59E0B" /></button>
                      </>}
                      <button onClick={() => del(c.id)} style={{ width: 36, height: 36, borderRadius: 10, border: "1.5px solid #EF444430", background: "#EF444410", display: "grid", placeItems: "center", cursor: "pointer" }}><Trash2 size={15} color="#EF4444" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── PAYMENTS ── */}
          {tab === "payments" && (
            <div style={{ display: "grid", gap: 14 }}>
              {/* Toolbar : récap + export PDF */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div style={{ fontSize: 13, color: "#64748B" }}>
                  <strong style={{ color: "#0F172A" }}>{payments.length}</strong> transaction(s) ·{" "}
                  <strong style={{ color: "#10B981" }}>{payments.filter(p => p.status === "COMPLETED").length}</strong> complétée(s) ·{" "}
                  Revenus : <strong style={{ color: "#0F172A" }}>{payments.filter(p => p.status === "COMPLETED").reduce((s, p) => s + (p.amount || 0), 0).toLocaleString("fr-FR")} FCFA</strong>
                </div>
                <button onClick={handleTransactionsPdf} disabled={exportingTx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 14, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, boxShadow: "0 4px 20px #6366F130", opacity: exportingTx ? 0.6 : 1, fontFamily: "inherit" }}>
                  <FileDown size={16} /> {exportingTx ? "Génération..." : "Télécharger PDF (toutes)"}
                </button>
              </div>

              {payments.length === 0 ? (
                <div style={{ ...S.card, padding: "48px 24px", textAlign: "center", border: "2px dashed #E2E8F0" }}>
                  <CreditCard size={40} color="#CBD5E1" style={{ margin: "0 auto 16px" }} />
                  <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 15 }}>Aucune transaction</div>
                </div>
              ) : payments.map(p => {
                const candName = p.candidateName || candidateNameById[p.candidateId] || "—";
                const phone = p.user?.phone || p.metadata?.phone || p.metadata?.phone_number || "—";
                return (
                  <div key={p.id} style={{ ...S.card, padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 14 }}>{p.user?.name || "—"}</div>
                        <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 2 }}>{p.user?.email || "—"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, color: "#6366F1", fontSize: 16 }}>{(p.amount || 0).toLocaleString("fr-FR")} FCFA</div>
                        <span style={{ ...S.pill(sc(p.status)), display: "inline-block", marginTop: 4 }}>{p.status}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #F1F5F9", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12 }}>
                      {cell("N° payeur", phone)}
                      {cell("Candidat", candName)}
                      {cell("Votes", p.votesCount)}
                      {cell("Date", new Date(p.createdAt).toLocaleString("fr-FR"))}
                      {cell("Référence", p.flutterwaveTxRef)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── CONTESTS & RÉSEAUX ── */}
          {tab === "contests" && (
            <div style={{ display: "grid", gap: 24 }}>

              {/* Section concours */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, color: "#0F172A", fontSize: 17 }}>🏆 Concours</div>
                    <div style={{ color: "#94A3B8", fontSize: 13, marginTop: 2 }}>{contests.length} concours enregistré{contests.length > 1 ? "s" : ""}</div>
                  </div>
                  <button onClick={() => setShowCreateContest(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 14, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>
                    <Plus size={16} /> Nouveau concours
                  </button>
                </div>
                {contests.length === 0 ? (
                  <div style={{ ...S.card, padding: "48px 24px", textAlign: "center", border: "2px dashed #E2E8F0" }}>
                    <Trophy size={40} color="#CBD5E1" style={{ margin: "0 auto 16px" }} />
                    <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 15 }}>Aucun concours créé</div>
                    <p style={{ color: "#94A3B8", fontSize: 13, marginTop: 8 }}>Créez votre premier concours pour activer les votes.</p>
                  </div>
                ) : contests.map((ct: any) => {
                  const isOpen = ct.status === "OPEN";
                  return (
                    <div key={ct.id} style={{ ...S.card, padding: "20px 22px", position: "relative", overflow: "hidden", marginBottom: 10, borderColor: isOpen ? "#10B98130" : "#E2E8F0" }}>
                      {isOpen && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#10B981,#34D399)" }} />}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 800, color: "#0F172A", fontSize: 15 }}>{ct.name}</div>
                            <span style={S.pill(isOpen?"#10B981":"#64748B")}>{isOpen ? "● OUVERT" : "● FERMÉ"}</span>
                          </div>
                          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13 }}>
                            <span><span style={{ color: "#94A3B8" }}>Début : </span><strong>{ct.startDate ? new Date(ct.startDate).toLocaleDateString("fr-FR") : "—"}</strong></span>
                            <span><span style={{ color: "#94A3B8" }}>Fin : </span><strong>{ct.endDate ? new Date(ct.endDate).toLocaleDateString("fr-FR") : "Indéfinie"}</strong></span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button onClick={() => { setEditingContest(ct); setEditContestValues({ name: ct.name, startDate: ct.startDate ? new Date(ct.startDate).toISOString().split("T")[0] : "", endDate: ct.endDate ? new Date(ct.endDate).toISOString().split("T")[0] : "" }); }} style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px solid #6366F130", background: "#6366F110", color: "#6366F1", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>✏️ Modifier</button>
                          {isOpen
                            ? <button onClick={async () => { if (!confirm("Fermer ce concours ?")) return; try { await api.patch(`/admin/contest/${ct.id}/close`); toast.success("Concours fermé"); load(); } catch { toast.error("Erreur"); } }} style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px solid #EF444430", background: "#EF444410", color: "#EF4444", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>Fermer</button>
                            : <button onClick={async () => { try { await api.patch(`/admin/contest/${ct.id}/open`); toast.success("Concours ouvert ✓"); load(); } catch { toast.error("Erreur"); } }} style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px solid #10B98130", background: "#10B98110", color: "#10B981", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>Ouvrir</button>
                          }
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Section réseaux sociaux */}
              <div style={{ ...S.card, padding: "24px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <Globe size={20} color="#6366F1" />
                  <div style={{ fontWeight: 800, color: "#0F172A", fontSize: 17 }}>Réseaux sociaux</div>
                </div>
                <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 20 }}>Ces liens seront affichés sur la page Support pour les visiteurs.</p>
                <div style={{ display: "grid", gap: 14 }}>
                  {[
                    { key: "whatsappGroup", label: "WhatsApp — Groupe", placeholder: "https://chat.whatsapp.com/...", emoji: "💬" },
                    { key: "whatsappChannel", label: "WhatsApp — Chaîne", placeholder: "https://whatsapp.com/channel/...", emoji: "📢" },
                    { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@...", emoji: "🎵" },
                    { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/...", emoji: "▶️" },
                    { key: "snapchat", label: "Snapchat", placeholder: "https://snapchat.com/add/...", emoji: "👻" },
                    { key: "telegram", label: "Telegram", placeholder: "https://t.me/...", emoji: "✈️" },
                  ].map(field => (
                    <div key={field.key}>
                      <label style={S.lbl}>{field.emoji} {field.label}</label>
                      <input type="url" value={(socialValues as any)[field.key]} onChange={e => setSocialValues({ ...socialValues, [field.key]: e.target.value })} placeholder={field.placeholder} style={S.inp} />
                    </div>
                  ))}
                  <button onClick={saveSocial} disabled={socialSaving} style={{ marginTop: 4, padding: "13px", borderRadius: 14, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, opacity: socialSaving ? 0.7 : 1, fontFamily: "inherit" }}>
                    {socialSaving ? "Enregistrement..." : "✓ Enregistrer les réseaux"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === "users" && (
            <div style={{ display: "grid", gap: 10 }}>
              {users.map(u => (
                <div key={u.id} style={{ ...S.card, padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 14 }}>{u.name}</div>
                      <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 2 }}>{u.email}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
                        <span style={S.pill(u.role==="ADMIN"?"#EF4444":"#6366F1")}>{u.role}</span>
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>{new Date(u.createdAt).toLocaleDateString("fr-FR")}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#2563EB" }}>🗳 {u.totalVotes ?? u._count?.votes ?? 0} votes</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setEditingUser(u); setEditUserValues({ name: u.name||"", email: u.email||"", role: u.role||"USER" }); }} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #E2E8F0", background: "#F8FAFF", cursor: "pointer", display: "grid", placeItems: "center" }}><Edit3 size={15} color="#6366F1" /></button>
                      <button onClick={async () => { if (!confirm(`Supprimer ${u.name} ?`)) return; try { await api.delete(`/admin/users/${u.id}`); toast.success("Supprimé"); load(); } catch { toast.error("Erreur"); } }} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #FEE2E2", background: "#FFF5F5", cursor: "pointer", display: "grid", placeItems: "center" }}><Trash2 size={15} color="#EF4444" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>)}
      </main>

      {/* ── MODAL VOIR CANDIDAT ── */}
      {viewingCandidate && (
        <div className="amodal-backdrop" onClick={() => setViewingCandidate(null)}>
          <div className="amodal" onClick={e => e.stopPropagation()}>
            <div className="amodal-head">
              <h3>Fiche candidat</h3>
              <button className="amodal-close" onClick={() => setViewingCandidate(null)}>×</button>
            </div>
            <div className="amodal-body">
            <div style={{ width: "100%", height: 180, borderRadius: 14, overflow: "hidden", background: "#EFF6FF", marginBottom: 16, position: "relative" }}>
              <Image src={viewingCandidate.photoUrl?.startsWith("http") ? viewingCandidate.photoUrl : `${apiBase}${viewingCandidate.photoUrl}`} alt={viewingCandidate.name} fill style={{ objectFit: "cover" }} onError={(e:any)=>{e.target.style.display="none";}} />
            </div>
            {[
              ["Nom", viewingCandidate.name],
              ["Email", viewingCandidate.email || "—"],
              ["Téléphone", viewingCandidate.phone || "—"],
              ["Type", viewingCandidate.type],
              ["Statut", viewingCandidate.status],
              ["Âge", viewingCandidate.age ? viewingCandidate.age + " ans" : "—"],
              ["Ville", viewingCandidate.city],
              ["Votes", viewingCandidate.totalVotes],
              ["Bio", viewingCandidate.bio || "—"],
              ["Instagram", viewingCandidate.instagram || "—"],
              ["TikTok", viewingCandidate.tiktok || "—"],
              ["Snapchat", viewingCandidate.snap || "—"],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #F1F5F9", fontSize: "0.82rem" }}>
                <span style={{ color: "#94A3B8", fontWeight: 500 }}>{label}</span>
                <span style={{ color: "#0F172A", fontWeight: 600, textAlign: "right", maxWidth: "65%", wordBreak: "break-word" }}>{String(value)}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button style={{ flex: 1, fontSize: "0.82rem", background: "#2563EB", color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", cursor: "pointer", fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={() => handleCandidatePdf(viewingCandidate)}><FileDown size={15} /> PDF</button>
              <button className="btn-blue" style={{ flex: 1, fontSize: "0.82rem", background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }} onClick={() => { setViewingCandidate(null); openEdit(viewingCandidate); }}>✏️ Modifier</button>
              {viewingCandidate.status === "PENDING" && (
                <button style={{ flex: 1, fontSize: "0.82rem", background: "#10B981", color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }} onClick={() => { approve(viewingCandidate.id); setViewingCandidate(null); }}>✓ Approuver</button>
              )}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT/CREATE CANDIDAT ── */}
      {editingCandidate !== null && (
        <div className="amodal-backdrop" onClick={() => setEditingCandidate(null)}>
          <div className="amodal" onClick={e => e.stopPropagation()}>
            <div className="amodal-head">
              <div>
                <h3>{isCreating ? "Ajouter un candidat" : "Modifier la candidature"}</h3>
                {!isCreating && <p className="sub">ID {editingCandidate.id}</p>}
              </div>
              <button className="amodal-close" onClick={() => setEditingCandidate(null)}>×</button>
            </div>
            <div className="amodal-body">

            {/* Photo */}
            <input ref={photoInputRef} type="file" accept="image/*" onChange={e => { const f=e.target.files?.[0]; if(f){setPhotoFile(f);setPhotoPreview(URL.createObjectURL(f));} }} style={{ display: "none" }} />
            <div onClick={() => photoInputRef.current?.click()} style={{ width: "100%", height: 160, borderRadius: 14, overflow: "hidden", position: "relative", background: photoPreview ? "transparent" : "#F8FAFF", border: photoPreview ? "none" : "2px dashed #CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 18 }}>
              {photoPreview ? <Image src={photoPreview} alt="preview" fill style={{ objectFit: "cover" }} /> : <div style={{ textAlign: "center", color: "#94A3B8" }}><Camera size={28} style={{ marginBottom: 6 }} /><div style={{ fontSize: 13 }}>Ajouter une photo</div></div>}
              {photoPreview && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Camera size={16} /> Changer</div></div>}
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {/* Grille infos */}
              <div>
                <label style={S.lbl}>Nom complet *</label>
                <input value={editValues.name} onChange={e => setEditValues({...editValues,name:e.target.value})} placeholder="Nom complet" style={S.inp} />
              </div>
              <div>
                <label style={S.lbl}>Email</label>
                <input type="email" value={editValues.email} onChange={e => setEditValues({...editValues,email:e.target.value})} placeholder="email@exemple.com" style={S.inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={S.lbl}>Ville *</label>
                  <input value={editValues.city} onChange={e => setEditValues({...editValues,city:e.target.value})} placeholder="Yaoundé" style={S.inp} />
                </div>
                <div>
                  <label style={S.lbl}>Âge *</label>
                  <input type="number" value={editValues.age} onChange={e => setEditValues({...editValues,age:e.target.value})} placeholder="22" style={S.inp} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={S.lbl}>Type</label>
                  <select value={editValues.type} onChange={e => setEditValues({...editValues,type:e.target.value})} style={S.inp}><option value="MISS">MISS</option></select>
                </div>
                <div>
                  <label style={S.lbl}>Statut</label>
                  <select value={editValues.status} onChange={e => setEditValues({...editValues,status:e.target.value})} style={S.inp}><option value="PENDING">PENDING</option><option value="APPROVED">APPROVED</option><option value="REJECTED">REJECTED</option></select>
                </div>
              </div>
              <div>
                <label style={S.lbl}>Téléphone</label>
                <input value={editValues.phone} onChange={e => setEditValues({...editValues,phone:e.target.value})} placeholder="+237 6XX XXX XXX" style={S.inp} />
              </div>
              <div>
                <label style={S.lbl}>Bio</label>
                <textarea value={editValues.bio} onChange={e => setEditValues({...editValues,bio:e.target.value})} rows={3} style={{ ...S.inp, resize: "vertical" }} placeholder="Présentation..." />
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <label style={S.lbl}>📱 Réseaux sociaux</label>
                {[["instagram","Instagram (@...)"],["tiktok","TikTok (@...)"],["snap","Snapchat"],["whatsappFan","Lien WhatsApp fan"]].map(([k,p]) => (
                  <input key={k} value={(editValues as any)[k]} onChange={e => setEditValues({...editValues,[k]:e.target.value})} placeholder={p} style={S.inp} />
                ))}
              </div>
              <button onClick={saveCandidate} disabled={saving} style={{ marginTop: 4, padding: "14px", borderRadius: 14, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, opacity: saving ? 0.6 : 1, fontFamily: "inherit" }}>
                {saving ? "Enregistrement..." : isCreating ? "✓ Créer le candidat" : "✓ Enregistrer les modifications"}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT USER ── */}
      {editingUser && (
        <div className="amodal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="amodal" onClick={e => e.stopPropagation()}>
            <div className="amodal-head">
              <div>
                <h3>Modifier l'utilisateur</h3>
                <p className="sub">{editingUser.email}</p>
              </div>
              <button className="amodal-close" onClick={() => setEditingUser(null)}>×</button>
            </div>
            <div className="amodal-body">
            <div style={{ display: "grid", gap: 14 }}>
              <div><label style={S.lbl}>Nom</label><input value={editUserValues.name} onChange={e => setEditUserValues({...editUserValues,name:e.target.value})} style={S.inp} /></div>
              <div><label style={S.lbl}>Email</label><input type="email" value={editUserValues.email} onChange={e => setEditUserValues({...editUserValues,email:e.target.value})} style={S.inp} /></div>
              <div>
                <label style={S.lbl}>Rôle</label>
                <select value={editUserValues.role} onChange={e => setEditUserValues({...editUserValues,role:e.target.value})} style={S.inp}><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select>
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "#F8FAFF", border: "1px solid #E2E8F0", fontSize: 13, color: "#64748B" }}>
                🗳 Votes effectués : <strong>{editingUser.totalVotes ?? editingUser._count?.votes ?? 0}</strong>
              </div>
              <button disabled={editUserSaving} onClick={async () => { setEditUserSaving(true); try { await api.patch(`/admin/users/${editingUser.id}`, editUserValues); toast.success("Mis à jour ✓"); setEditingUser(null); load(); } catch { toast.error("Erreur"); } setEditUserSaving(false); }} style={{ padding: "14px", borderRadius: 14, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, opacity: editUserSaving ? 0.6 : 1, fontFamily: "inherit" }}>
                {editUserSaving ? "Enregistrement..." : "✓ Enregistrer"}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT CONCOURS ── */}
      {editingContest && (
        <div className="amodal-backdrop" onClick={() => setEditingContest(null)}>
          <div className="amodal" onClick={e => e.stopPropagation()}>
            <div className="amodal-head">
              <h3>Modifier le concours</h3>
              <button className="amodal-close" onClick={() => setEditingContest(null)}>×</button>
            </div>
            <div className="amodal-body">
            <div style={{ display: "grid", gap: 14 }}>
              <div><label style={S.lbl}>Nom du concours</label><input value={editContestValues.name} onChange={e => setEditContestValues({...editContestValues,name:e.target.value})} style={S.inp} /></div>
              <div><label style={S.lbl}>Date de début</label><input type="date" value={editContestValues.startDate} onChange={e => setEditContestValues({...editContestValues,startDate:e.target.value})} style={S.inp} /></div>
              <div>
                <label style={S.lbl}>Date de fin <span style={{ fontWeight: 400, textTransform: "none" }}>(optionnelle)</span></label>
                <input type="date" value={editContestValues.endDate} onChange={e => setEditContestValues({...editContestValues,endDate:e.target.value})} style={S.inp} />
                {editContestValues.endDate && <button onClick={() => setEditContestValues({...editContestValues,endDate:""})} style={{ marginTop: 4, fontSize: 11, color: "#EF4444", background: "none", border: "none", cursor: "pointer" }}>× Supprimer date fin</button>}
              </div>
              <button disabled={editContestSaving} onClick={async () => { setEditContestSaving(true); try { await api.patch(`/admin/contest/${editingContest.id}`, { name: editContestValues.name, startDate: editContestValues.startDate, endDate: editContestValues.endDate||null }); toast.success("Mis à jour ✓"); setEditingContest(null); load(); } catch { toast.error("Erreur"); } setEditContestSaving(false); }} style={{ padding: "14px", borderRadius: 14, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>
                {editContestSaving ? "Enregistrement..." : "✓ Enregistrer"}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CRÉER CONCOURS ── */}
      {showCreateContest && (
        <div className="amodal-backdrop" onClick={() => setShowCreateContest(false)}>
          <div className="amodal" onClick={e => e.stopPropagation()}>
            <div className="amodal-head">
              <h3>Nouveau concours</h3>
              <button className="amodal-close" onClick={() => setShowCreateContest(false)}>×</button>
            </div>
            <div className="amodal-body">
            <div style={{ display: "grid", gap: 14 }}>
              <div><label style={S.lbl}>Nom *</label><input value={newContest.name} onChange={e => setNewContest({...newContest,name:e.target.value})} placeholder="Ex: MetaMiss 2026" style={S.inp} /></div>
              <div><label style={S.lbl}>Date de début *</label><input type="date" value={newContest.startDate} onChange={e => setNewContest({...newContest,startDate:e.target.value})} style={S.inp} /></div>
              <div><label style={S.lbl}>Date de fin <span style={{ fontWeight: 400, textTransform: "none" }}>(optionnelle)</span></label><input type="date" value={newContest.endDate} onChange={e => setNewContest({...newContest,endDate:e.target.value})} style={S.inp} /></div>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "#F0FDF4", border: "1px solid #BBF7D0", fontSize: 13, color: "#16A34A" }}>ℹ️ Le concours sera immédiatement ouvert dès la création.</div>
              <button disabled={contestSaving||!newContest.name||!newContest.startDate} onClick={async () => { if (!newContest.name||!newContest.startDate) { toast.error("Nom et date requis"); return; } setContestSaving(true); try { await api.post("/admin/contest", { name: newContest.name, startDate: newContest.startDate, ...(newContest.endDate&&{endDate:newContest.endDate}) }); toast.success("Concours créé ✓"); setShowCreateContest(false); setNewContest({name:"",startDate:"",endDate:""}); load(); } catch(err:any) { toast.error(err?.response?.data?.message||"Erreur"); } setContestSaving(false); }} style={{ padding: "14px", borderRadius: 14, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, opacity: (!newContest.name||!newContest.startDate)?0.5:1, fontFamily: "inherit" }}>
                {contestSaving ? "Création..." : "✓ Créer le concours"}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 900px) {
          .admin-desktop-sidebar { display: flex !important; }
          .admin-mobile-sidebar { display: none !important; }
          .admin-menu-btn { display: none !important; }
          .admin-main-content { margin-left: 260px; }
        }
        .admin-input { width:100%;padding:12px 14px;border:1.5px solid #E2E8F0;border-radius:12px;font-size:14px;outline:none;font-family:inherit;background:#F8FAFF;color:#0F172A;box-sizing:border-box; }

        /* ── Cartes stats compactes ── */
        .admin-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        @media (min-width: 560px) { .admin-stats { grid-template-columns: repeat(3, 1fr); gap: 12px; } }
        @media (min-width: 1100px) { .admin-stats { grid-template-columns: repeat(6, 1fr); } }
        .admin-stat-c { padding: 14px; border-radius: 16px !important; }
        .admin-stat-c .ic { width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; margin-bottom: 10px; }
        .admin-stat-c .v { font-size: 1.35rem; font-weight: 800; color: #0F172A; line-height: 1.05; word-break: break-word; }
        .admin-stat-c .l { margin-top: 4px; font-size: 0.7rem; color: #94A3B8; line-height: 1.25; }

        /* ── Admin modals : feuille scrollable, en-tête fixe ── */
        .amodal-backdrop {
          position: fixed; inset: 0; z-index: 300;
          background: rgba(15,23,42,0.5); backdrop-filter: blur(4px);
          display: flex; align-items: flex-end; justify-content: center;
        }
        .amodal {
          width: 100%; max-width: 460px; background: #fff;
          border-radius: 22px 22px 0 0;
          display: flex; flex-direction: column;
          max-height: 90vh; max-height: 90dvh; overflow: hidden;
          animation: slide-up 0.28s ease;
          box-shadow: 0 -12px 40px rgba(0,0,0,0.18);
        }
        .amodal-head {
          flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 15px 18px; border-bottom: 1px solid #EEF1F6; background: #fff;
        }
        .amodal-head h3 { margin: 0; font-size: 1rem; font-weight: 800; color: #0F172A; }
        .amodal-head .sub { margin: 2px 0 0; color: #94A3B8; font-size: 0.74rem; word-break: break-all; }
        .amodal-close {
          flex-shrink: 0; border: none; background: #F1F5F9; border-radius: 9px;
          width: 32px; height: 32px; cursor: pointer; font-size: 1.25rem; line-height: 1;
          display: grid; place-items: center; color: #64748B;
        }
        .amodal-close:hover { background: #E2E8F0; }
        .amodal-body {
          overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
          padding: 16px 18px 20px; flex: 1; min-height: 0;
        }
        @media (min-width: 640px) {
          .amodal-backdrop { align-items: center; padding: 20px; }
          .amodal { border-radius: 18px; max-height: 88vh; box-shadow: 0 20px 60px rgba(0,0,0,0.22); }
        }
      `}</style>
    </div>
  );
}
