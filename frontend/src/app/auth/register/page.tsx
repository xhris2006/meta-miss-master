"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Crown } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

const schema = z.object({
  name: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
  phone: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/register", data);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success("Compte créé avec succès !");
      router.push("/");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: "name" as const, label: "Nom complet", type: "text", placeholder: "Jean Dupont" },
    { name: "email" as const, label: "Email", type: "email", placeholder: "vous@email.com" },
    { name: "password" as const, label: "Mot de passe", type: "password", placeholder: "8 caractères min." },
    { name: "phone" as const, label: "Téléphone (optionnel)", type: "tel", placeholder: "+237 6XX XXX XXX" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 crown-bg">
      <div className="glass rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Crown className="w-10 h-10 text-gold-400 mx-auto mb-3" />
          <h1 className="font-display text-3xl text-white mb-1">Créer un compte</h1>
          <p className="text-gray-400 text-sm font-body">Rejoignez la communauté META M&M</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="block text-sm text-gray-400 mb-1.5 font-body">{f.label}</label>
              <input {...register(f.name)} type={f.type} placeholder={f.placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-gold-500/50 outline-none font-body" />
              {errors[f.name] && <p className="text-red-400 text-xs mt-1">{errors[f.name]?.message as string}</p>}
            </div>
          ))}

          <button type="submit" disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-bold rounded-xl hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-50 mt-2 font-body">
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6 font-body">
          Déjà un compte ?{" "}
          <Link href="/auth/login" className="text-gold-400 hover:text-gold-300 transition-colors">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
