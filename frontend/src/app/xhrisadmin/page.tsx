"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

const schema = z.object({
  email: z.string().email("Email admin invalide"),
  password: z.string().min(1, "Mot de passe requis"),
  propertyNumber: z.string().min(1, "Numéro de propriété requis"),
  motherFullName: z.string().min(2, "Nom complet requis"),
});
type FormData = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  // Session déjà active → aller directement au panneau admin (pas de re-login)
  useEffect(() => {
    if (hasHydrated && isAuthenticated && user?.role === "ADMIN") {
      router.replace("/admin");
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  const onSubmit = async (values: FormData) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/admin/login", values);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success("Connexion admin validée ✓");
      router.push("/admin");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Accès admin refusé");
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    border: "1.5px solid rgba(255,255,255,0.1)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    color: "#F8FAFC",
    fontSize: "0.92rem",
    outline: "none",
    fontFamily: "system-ui,sans-serif",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };
  const lbl: React.CSSProperties = { display: "block", marginBottom: 7, fontSize: "0.7rem", color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 };
  const err: React.CSSProperties = { marginTop: 5, fontSize: "0.72rem", color: "#F87171" };

  const fields = [
    { key: "email", label: "Email admin", type: "email", placeholder: "admin@exemple.com" },
    { key: "password", label: "Mot de passe", type: showPwd ? "text" : "password", placeholder: "••••••••", hasPwdToggle: true },
    { key: "propertyNumber", label: "Numéro de propriété", type: "text", placeholder: "Votre numéro" },
    { key: "motherFullName", label: "Nom complet de la mère", type: "text", placeholder: "Réponse de sécurité" },
  ] as const;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.15), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.12), transparent 50%), #0B0F1A" }}>

      <div style={{ width: "100%", maxWidth: 460 }}>

        {/* Logo / En-tête */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 68, height: 68, borderRadius: 22, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "grid", placeItems: "center", margin: "0 auto 18px", boxShadow: "0 12px 40px rgba(99,102,241,0.35)" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <div style={{ display: "inline-flex", padding: "5px 14px", borderRadius: 999, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#A5B4FC", fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>
            Accès réservé
          </div>
          <h1 style={{ color: "#F8FAFC", fontSize: "1.7rem", fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Espace Admin
          </h1>
          <p style={{ color: "#64748B", fontSize: "0.85rem", lineHeight: 1.6, margin: 0 }}>
            Vérification par identifiants et questions de sécurité.
          </p>
        </div>

        {/* Card formulaire */}
        <div style={{ background: "rgba(15,23,42,0.8)", border: "1.5px solid rgba(99,102,241,0.2)", borderRadius: 24, padding: "32px 28px", backdropFilter: "blur(24px)", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Email */}
            <div>
              <label style={lbl}>Email admin</label>
              <input {...register("email")} type="email" placeholder="admin@exemple.com" style={inp}
                onFocus={e => (e.target.style.borderColor = "#6366F1")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
              {errors.email && <p style={err}>{errors.email.message}</p>}
            </div>

            {/* Mot de passe */}
            <div>
              <label style={lbl}>Mot de passe</label>
              <div style={{ position: "relative" }}>
                <input {...register("password")} type={showPwd ? "text" : "password"} placeholder="••••••••" style={{ ...inp, paddingRight: 54 }}
                  onFocus={e => (e.target.style.borderColor = "#6366F1")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
                <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, fontFamily: "inherit" }}>
                  {showPwd ? "Masquer" : "Voir"}
                </button>
              </div>
              {errors.password && <p style={err}>{errors.password.message}</p>}
            </div>

            {/* Séparateur sécurité */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              <span style={{ fontSize: "0.68rem", color: "#475569", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>🔒 Questions de sécurité</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Numéro de propriété */}
            <div>
              <label style={lbl}>Numéro de propriété</label>
              <input {...register("propertyNumber")} type="text" placeholder="Votre numéro" style={inp}
                onFocus={e => (e.target.style.borderColor = "#6366F1")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
              {errors.propertyNumber && <p style={err}>{errors.propertyNumber.message}</p>}
            </div>

            {/* Nom de la mère */}
            <div>
              <label style={lbl}>Nom complet de la mère</label>
              <input {...register("motherFullName")} type="text" placeholder="Réponse de sécurité" style={inp}
                onFocus={e => (e.target.style.borderColor = "#6366F1")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
              {errors.motherFullName && <p style={err}>{errors.motherFullName.message}</p>}
            </div>

            {/* Bouton submit */}
            <button type="submit" disabled={loading} style={{ marginTop: 4, padding: "15px", borderRadius: 16, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", fontWeight: 800, fontSize: "0.95rem", fontFamily: "inherit", boxShadow: loading ? "none" : "0 8px 30px rgba(99,102,241,0.35)", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              {loading ? (
                <>
                  <svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  Vérification...
                </>
              ) : "Accéder au panneau admin"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "#334155", fontSize: "0.75rem", marginTop: 20 }}>
          Reines du Meta · Panneau d'administration securise
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
