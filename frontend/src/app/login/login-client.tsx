"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import LangSelector from "@/components/ui/LangSelector";
import { useT } from "@/store/langStore";
import { safeRedirectPath, openExternal } from "@/lib/safeUrl";

type Props = {
  initialTab: "login" | "register";
  redirect: string;
  oauthToken?: string;
  oauthRefreshToken?: string;
};

export default function LoginClient({ initialTab, redirect, oauthToken, oauthRefreshToken }: Props) {
  const router = useRouter();
  const t = useT();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setTokens = useAuthStore((state) => state.setTokens);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // La cible de redirection est toujours normalisée en chemin interne :
  // impossible d'être renvoyé vers un domaine externe (anti open-redirect).
  const safeRedirect = safeRedirectPath(redirect);

  useEffect(() => {
    if (oauthToken && oauthRefreshToken && !isAuthenticated) {
      // Retire immédiatement les jetons de l'URL (barre d'adresse, historique,
      // referrer) : ils ne doivent jamais y persister après consommation.
      if (typeof window !== "undefined" && window.location.search) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      setTokens(oauthToken, oauthRefreshToken);
      api.get("/auth/me")
        .then((response) => {
          setAuth(response.data.data, oauthToken, oauthRefreshToken);
          setRedirectAfterPopup(safeRedirect);
          setShowWhatsAppPopup(true);
        })
        .catch(() => { toast.error("Connexion Google échouée"); });
    }
  }, [oauthToken, oauthRefreshToken, isAuthenticated]);

  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [loading, setLoading] = useState(false);
  const [showWhatsAppPopup, setShowWhatsAppPopup] = useState(false);
  const [redirectAfterPopup, setRedirectAfterPopup] = useState(safeRedirect);
  const [credentials, setCredentials] = useState({ email: "", password: "", name: "", phone: "" });

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  const handleChange = (key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/user/login", {
        email: credentials.email,
        password: credentials.password,
      });
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      setRedirectAfterPopup(safeRedirect);
      setShowWhatsAppPopup(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/user/register", {
        name: credentials.name,
        email: credentials.email,
        password: credentials.password,
        phone: credentials.phone,
      });
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      setRedirectAfterPopup(safeRedirect);
      setShowWhatsAppPopup(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur d'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: "20px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 440,
        background: "var(--bg-white)",
        borderRadius: 24,
        boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "28px 28px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}>
          <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--text)" }}>
            Meta<span style={{ color: "var(--blue)" }}>Miss</span>
          </div>
          <LangSelector />
        </div>

        <div style={{ padding: "0 28px 32px" }}>
          {/* Title */}
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>
            {tab === "login" ? (t.loginTitle || "Bon retour 👋") : (t.registerTitle || "Créer un compte")}
          </h1>
          <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginBottom: 24 }}>
            {tab === "login"
              ? "Connectez-vous pour voter et suivre vos favoris."
              : "Rejoignez la communaute Reines du Meta."}
          </p>

          {/* Tabs */}
          <div style={{
            display: "flex", gap: 6, marginBottom: 24,
            background: "var(--bg)", borderRadius: 14, padding: 4,
          }}>
            {(["login", "register"] as const).map((tabKey) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setTab(tabKey)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 11, border: "none",
                  cursor: "pointer", fontWeight: 700, fontSize: "0.88rem",
                  fontFamily: "var(--font)",
                  background: tab === tabKey ? "var(--bg-white)" : "transparent",
                  color: tab === tabKey ? "var(--blue)" : "var(--text-muted)",
                  boxShadow: tab === tabKey ? "0 1px 6px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {tabKey === "login" ? (t.login || "Connexion") : (t.register || "Inscription")}
              </button>
            ))}
          </div>

          {/* Google button — always visible */}
          <button
            type="button"
            onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
            style={{
              width: "100%", padding: "13px 16px", borderRadius: 12,
              border: "1.5px solid var(--border)", background: "var(--bg-white)",
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10, cursor: "pointer", fontWeight: 600, fontSize: "0.92rem",
              color: "var(--text)", fontFamily: "var(--font)", marginBottom: 20,
              transition: "border-color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#4285F4")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continuer avec Google
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>ou</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* Login form */}
          {tab === "login" && (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  {t.email || "Email"}
                </label>
                <input
                  type="email" required value={credentials.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="vous@email.com"
                  className="admin-input" style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  {t.password || "Mot de passe"}
                </label>
                <input
                  type="password" required value={credentials.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="••••••••"
                  className="admin-input" style={{ width: "100%" }}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-blue" style={{ marginTop: 4, opacity: loading ? 0.7 : 1 }}>
                {loading ? (t.loading || "Chargement...") : (t.login || "Se connecter")}
              </button>
              <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                {t.noAccount || "Pas de compte ?"}{" "}
                <button type="button" onClick={() => setTab("register")} style={{ color: "var(--blue)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font)", fontSize: "0.82rem" }}>
                  {t.register || "S'inscrire"}
                </button>
              </p>
            </form>
          )}

          {/* Register form */}
          {tab === "register" && (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  {t.fullName || "Nom complet"}
                </label>
                <input
                  type="text" required value={credentials.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Jean Dupont"
                  className="admin-input" style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  {t.email || "Email"}
                </label>
                <input
                  type="email" required value={credentials.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="vous@email.com"
                  className="admin-input" style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  {t.phone || "Téléphone"}
                </label>
                <input
                  type="tel" value={credentials.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+237 6XX XXX XXX"
                  className="admin-input" style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  {t.password || "Mot de passe"}
                </label>
                <input
                  type="password" required value={credentials.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="••••••••"
                  className="admin-input" style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "var(--bg)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-2)" }}>
                  {t.selectLanguage || "Langue"}
                </span>
                <LangSelector />
              </div>

              <button type="submit" disabled={loading} className="btn-blue" style={{ marginTop: 4, opacity: loading ? 0.7 : 1 }}>
                {loading ? (t.loading || "Chargement...") : (t.register || "Créer mon compte")}
              </button>
              <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                {t.alreadyAccount || "Déjà un compte ?"}{" "}
                <button type="button" onClick={() => setTab("login")} style={{ color: "var(--blue)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font)", fontSize: "0.82rem" }}>
                  {t.login || "Se connecter"}
                </button>
              </p>
            </form>
          )}
        </div>
      </div>

      {/* WhatsApp popup */}
      {showWhatsAppPopup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1000 }}>
          <div style={{ width: "100%", maxWidth: 420, background: "var(--bg-white)", borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.18)", padding: 24, textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>Rejoignez le groupe WhatsApp</h2>
            <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginBottom: 22, lineHeight: 1.6 }}>
              Pour ne rien manquer, rejoignez notre groupe WhatsApp officiel.
            </p>
            <button
              type="button"
              onClick={() => openExternal("https://chat.whatsapp.com/HuksAebrAfVBEt292xU4KF?mode=gi_t")}
              className="btn-blue"
              style={{ width: "100%", marginBottom: 10 }}
            >
              Rejoindre le groupe WhatsApp
            </button>
            <button
              type="button"
              onClick={() => { setShowWhatsAppPopup(false); router.push(safeRedirectPath(redirectAfterPopup)); }}
              className="btn-outline"
              style={{ width: "100%" }}
            >
              Continuer sans rejoindre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
