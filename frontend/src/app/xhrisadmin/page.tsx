"use client";

import { useState } from "react";
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
  propertyNumber: z.string().min(1, "Numero de propriete requis"),
  motherFullName: z.string().min(2, "Nom complet de la mere requis"),
});

type FormData = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormData) => {
    setLoading(true);

    try {
      const res = await api.post("/auth/admin/login", values);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success("Connexion admin validee");
      router.push("/admin");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Acces admin refuse");
    } finally {
      setLoading(false);
    }
  };

  const S: Record<string, React.CSSProperties> = {
    wrap: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      background:
        "radial-gradient(circle at top left, rgba(201,147,42,.12), transparent 30%), linear-gradient(180deg, #12020A, #050003)",
    },
    card: {
      width: "100%",
      maxWidth: 460,
      background: "rgba(14,3,8,.9)",
      border: "1px solid rgba(201,147,42,.18)",
      borderRadius: 28,
      padding: "34px 24px",
      boxShadow: "0 30px 80px rgba(0,0,0,.45)",
      backdropFilter: "blur(18px)",
    },
    label: {
      display: "block",
      marginBottom: 8,
      fontSize: "0.74rem",
      color: "var(--text-muted)",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
    },
    input: {
      width: "100%",
      background: "rgba(255,255,255,.04)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      padding: "14px 16px",
      color: "var(--text)",
      outline: "none",
      fontSize: "0.92rem",
    },
    error: { marginTop: 6, fontSize: "0.75rem", color: "#EF5350" },
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid rgba(201,147,42,.24)",
              color: "var(--gold-light)",
              fontSize: "0.76rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Acces reserve
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", marginBottom: 8 }}>
            Espace admin
          </h1>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.6, fontSize: "0.9rem" }}>
            Verification par identifiants et questions de securite.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={S.label}>Email admin</label>
            <input {...register("email")} type="email" placeholder="admin@exemple.com" style={S.input} />
            {errors.email && <p style={S.error}>{errors.email.message}</p>}
          </div>

          <div>
            <label style={S.label}>Mot de passe</label>
            <div style={{ position: "relative" }}>
              <input
                {...register("password")}
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                style={{ ...S.input, paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((value) => !value)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {showPwd ? "Masquer" : "Voir"}
              </button>
            </div>
            {errors.password && <p style={S.error}>{errors.password.message}</p>}
          </div>

          <div>
            <label style={S.label}>Numero de propriete</label>
            <input {...register("propertyNumber")} type="text" placeholder="Votre numero" style={S.input} />
            {errors.propertyNumber && <p style={S.error}>{errors.propertyNumber.message}</p>}
          </div>

          <div>
            <label style={S.label}>Nom complet de la mere</label>
            <input {...register("motherFullName")} type="text" placeholder="Reponse de securite" style={S.input} />
            {errors.motherFullName && <p style={S.error}>{errors.motherFullName.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              width: "100%",
              padding: "15px 18px",
              borderRadius: 16,
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(135deg,var(--gold),var(--gold-light))",
              color: "#08000A",
              fontWeight: 700,
              fontSize: "0.95rem",
            }}
          >
            {loading ? "Verification..." : "Se connecter a l admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
