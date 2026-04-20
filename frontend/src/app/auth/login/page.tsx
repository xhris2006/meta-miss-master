"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Crown, Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/login", data);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Bienvenue, ${user.name} !`);
      router.push(user.role === "ADMIN" ? "/admin" : "/");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 crown-bg">
      <div className="glass rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Crown className="w-10 h-10 text-gold-400 mx-auto mb-3" />
          <h1 className="font-display text-3xl text-white mb-1">Connexion</h1>
          <p className="text-gray-400 text-sm font-body">Accédez à votre compte</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5 font-body">Email</label>
            <input {...register("email")} type="email" placeholder="vous@email.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-gold-500/50 outline-none font-body" />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5 font-body">Mot de passe</label>
            <div className="relative">
              <input {...register("password")} type={showPwd ? "text" : "password"} placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-gold-500/50 outline-none pr-11 font-body" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-bold rounded-xl hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-50 mt-2 font-body">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6 font-body">
          Pas de compte ?{" "}
          <Link href="/auth/register" className="text-gold-400 hover:text-gold-300 transition-colors">S'inscrire</Link>
        </p>
      </div>
    </div>
  );
}
