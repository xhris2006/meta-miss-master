"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useCandidacy } from "@/hooks/useCandidacy";

const schema = z.object({
  name: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  type: z.enum(["MISS", "MASTER"]),
  age: z.coerce.number().min(16, "Minimum 16 ans").max(35, "Maximum 35 ans"),
  city: z.string().min(2, "Ville requise"),
  bio: z.string().max(500).optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  snap: z.string().optional(),
  whatsappFan: z.string().optional(),
  phone: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { markSubmitted } = useCandidacy();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "MISS", email: user?.email || "" },
  });

  useEffect(() => {
    if (!isAuthenticated) router.push("/login?redirect=/candidates/register");
  }, [isAuthenticated, router]);

  // Pré-remplir l'email depuis le compte connecté
  useEffect(() => {
    if (user?.email) setValue("email", user.email);
  }, [user, setValue]);

  const handleFile = (f: File) => {
    if (f.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setPhoto(f);
    setPhotoUploaded(true);
  };

  const removePhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPhoto(null);
    setPhotoUploaded(false);
  };

  const onSubmit = async (data: FormData) => {
    if (!photo) { toast.error("Ajoutez une photo"); return; }
    setSubmitting(true);
    try {
      const form = new FormData();
      Object.entries(data).forEach(([k, v]) => v !== undefined && form.append(k, String(v)));
      form.append("photo", photo);
      const res = await api.post("/candidates/register", form, { headers: { "Content-Type": "multipart/form-data" } });
      markSubmitted(res.data?.data?.id);
      setDone(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Styles adaptatifs au thème ─── */
  const inp: React.CSSProperties = {
    width: "100%",
    padding: "13px 14px",
    border: "1.5px solid var(--border)",
    borderRadius: 10,
    fontFamily: "var(--font)",
    fontSize: "0.88rem",
    color: "var(--text)",
    background: "var(--bg)",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };
  const lbl: React.CSSProperties = {
    display: "block",
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 6,
  };
  const field: React.CSSProperties = { marginBottom: 16 };
  const errStyle: React.CSSProperties = { color: "#EF4444", fontSize: "0.72rem", marginTop: 4 };

  const section: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: "18px 16px",
    marginBottom: 14,
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: "0.78rem",
    fontWeight: 800,
    color: "var(--blue)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  return (
    <div className="page-content fade-up">
      {/* Top bar */}
      <div className="top-bar">
        <button
          onClick={() => router.back()}
          style={{ width: 34, height: 34, border: "1.5px solid var(--border)", borderRadius: 9, background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="top-bar-title">Ma candidature</span>
        <div style={{ width: 34 }} />
      </div>

      {/* ─── ÉCRAN SUCCÈS ─── */}
      {done ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 28px", textAlign: "center" }}>
          {/* Cercle check animé */}
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--blue-light)", border: "2px solid #BFDBFE", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }} className="scale-in">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>
            Candidature envoyée ! 🎉
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.75, marginBottom: 10, maxWidth: 320 }}>
            Vos informations ont bien été reçues et sont en cours de vérification par notre équipe.
          </p>
          {/* Message email bien visible */}
          <div style={{ background: "var(--blue-light)", border: "1.5px solid #BFDBFE", borderRadius: 12, padding: "14px 18px", marginBottom: 28, maxWidth: 340, width: "100%" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>📧</span>
              <p style={{ fontSize: "0.82rem", color: "var(--blue)", lineHeight: 1.65, margin: 0, textAlign: "left" }}>
                Vous recevrez un <strong>e-mail de confirmation</strong> une fois vos informations vérifiées. Vérifiez aussi vos spams.
              </p>
            </div>
          </div>
          <button onClick={() => router.push("/candidates")} className="btn-blue" style={{ maxWidth: 300, width: "100%" }}>
            Voir les candidats
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} style={{ padding: "0 16px 32px" }}>

          {/* ── Section 1 : Photo ── */}
          <div style={section}>
            <div style={sectionTitle}>
              <span>📸</span> Photo de profil
            </div>
            <label style={{ cursor: "pointer", display: "block" }}>
              {photoUploaded ? (
                /* État : photo uploadée — affiche confirmation + bouton changer */
                <div style={{
                  height: 80,
                  borderRadius: 12,
                  border: "1.5px solid #10B981",
                  background: "var(--bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 18px",
                  gap: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#10B981" }}>Photo uploadée ✓</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                        {(photo?.name?.length ?? 0) > 24 ? photo?.name?.slice(0, 24) + "…" : photo?.name}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={removePhoto}
                    style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: 8, padding: "5px 10px", fontSize: "0.72rem", color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font)", flexShrink: 0 }}
                  >
                    Changer
                  </button>
                </div>
              ) : (
                /* État : aucune photo — zone de drop */
                <div style={{
                  height: 100,
                  borderRadius: 12,
                  border: "1.5px dashed var(--border)",
                  background: "var(--bg)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "border-color 0.15s",
                }}>
                  <div style={{ fontSize: "1.6rem" }}>📸</div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>Cliquez pour choisir une photo</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-faint)" }}>JPG / PNG — max 5 MB</div>
                </div>
              )}
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </label>
          </div>

          {/* ── Section 2 : Informations personnelles ── */}
          <div style={section}>
            <div style={sectionTitle}><span>👤</span> Informations personnelles</div>

            <div style={field}>
              <label style={lbl}>Nom complet *</label>
              <input {...register("name")} style={inp} placeholder="Votre nom et prénom" />
              {errors.name && <p style={errStyle}>{errors.name.message}</p>}
            </div>

            <div style={field}>
              <label style={lbl}>Adresse e-mail *</label>
              <div style={{ position: "relative" }}>
                <input {...register("email")} type="email" style={{ ...inp, paddingRight: 40 }} placeholder="votre@email.com" />
                {user?.email && (
                  <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }} title="Pré-rempli depuis votre compte">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                )}
              </div>
              {errors.email && <p style={errStyle}>{errors.email.message}</p>}
              <p style={{ fontSize: "0.69rem", color: "var(--text-muted)", marginTop: 4 }}>
                Votre email de confirmation sera envoyé à cette adresse. Vous pouvez le modifier.
              </p>
            </div>

            <div style={field}>
              <label style={lbl}>Téléphone (optionnel)</label>
              <input {...register("phone")} style={inp} placeholder="+237 6XX XXX XXX" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={field}>
                <label style={lbl}>Âge *</label>
                <input {...register("age")} type="number" style={inp} placeholder="22" />
                {errors.age && <p style={errStyle}>{errors.age.message}</p>}
              </div>
              <div style={field}>
                <label style={lbl}>Ville *</label>
                <input {...register("city")} style={inp} placeholder="Yaoundé" />
                {errors.city && <p style={errStyle}>{errors.city.message}</p>}
              </div>
            </div>
          </div>

          {/* Catégorie fixée à Miss (un seul type) */}
          <input {...register("type")} type="hidden" value="MISS" />

          {/* ── Section 4 : Bio ── */}
          <div style={section}>
            <div style={sectionTitle}><span>✍️</span> Présentation</div>
            <div style={field}>
              <label style={lbl}>Bio (optionnel)</label>
              <textarea {...register("bio")} rows={3} style={{ ...inp, resize: "none", lineHeight: 1.6 }} placeholder="Parlez de vous, vos passions, vos ambitions..." />
            </div>
          </div>

          {/* ── Section 5 : Réseaux sociaux ── */}
          <div style={section}>
            <div style={sectionTitle}><span>📱</span> Réseaux sociaux</div>
            {[
              { key: "instagram", label: "Instagram", placeholder: "@votre_pseudo", icon: "📸" },
              { key: "tiktok", label: "TikTok", placeholder: "@votre_pseudo", icon: "🎵" },
              { key: "snap", label: "Snapchat", placeholder: "votre_pseudo", icon: "👻" },
              { key: "whatsappFan", label: "Lien groupe WhatsApp fan", placeholder: "https://chat.whatsapp.com/...", icon: "💬" },
            ].map(s => (
              <div key={s.key} style={field}>
                <label style={lbl}>{s.icon} {s.label} <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optionnel)</span></label>
                <input {...register(s.key as any)} style={inp} placeholder={s.placeholder} />
              </div>
            ))}
          </div>

          {/* ── Bouton submit ── */}
          <button type="submit" disabled={submitting} className="btn-blue" style={{ opacity: submitting ? 0.65 : 1, fontSize: "0.92rem", padding: "15px" }}>
            {submitting ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Envoi en cours...
              </span>
            ) : "Soumettre ma candidature"}
          </button>

          <div className="security-badge" style={{ marginTop: 12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Vos données sont sécurisées · Validation sous 24h
          </div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>
      )}
    </div>
  );
}
