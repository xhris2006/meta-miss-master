"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Upload, Crown } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Nom requis"),
  type: z.enum(["MISS", "MASTER"]),
  age: z.coerce.number().min(16).max(35),
  city: z.string().min(2, "Ville requise"),
  bio: z.string().max(500).optional(),
});
type FormData = z.infer<typeof schema>;

export default function CandidateRegisterPage() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPhoto(file); setPreview(URL.createObjectURL(file)); }
  };

  const onSubmit = async (data: FormData) => {
    if (!photo) return toast.error("Veuillez ajouter une photo");
    setSubmitting(true);
    try {
      const form = new FormData();
      Object.entries(data).forEach(([k, v]) => v !== undefined && form.append(k, String(v)));
      form.append("photo", photo);
      await api.post("/candidates/register", form, { headers: { "Content-Type": "multipart/form-data" } });
      setDone(true);
      toast.success("Candidature soumise ! En attente de validation.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-16 pb-16 px-4 max-w-2xl mx-auto w-full flex-1">
        <div className="text-center mb-10">
          <Crown className="w-10 h-10 text-gold-400 mx-auto mb-3" />
          <h1 className="font-display text-4xl text-gold-gradient mb-2">Participer au concours</h1>
          <p className="text-gray-400 font-body">Soumettez votre candidature. L'équipe la validera sous 24h.</p>
        </div>

        {done ? (
          <div className="glass rounded-2xl p-10 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-display text-2xl text-white mb-2">Candidature envoyée !</h2>
            <p className="text-gray-400 font-body">Votre profil est en cours de validation. Vous serez visible dès approbation.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="glass rounded-2xl p-8 flex flex-col gap-5">
            {/* Photo */}
            <div>
              <label className="block text-sm text-gray-400 mb-2 font-body">Photo *</label>
              <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gold-500/30 rounded-xl cursor-pointer hover:border-gold-500/60 transition-all overflow-hidden relative">
                {preview ? <img src={preview} className="absolute inset-0 w-full h-full object-cover rounded-xl" alt="preview" /> :
                  <div className="flex flex-col items-center text-gray-500">
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-sm">Cliquez pour uploader (JPG/PNG, max 5MB)</span>
                  </div>}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            </div>

            {/* Fields */}
            {[
              { name: "name" as const, label: "Nom complet", type: "text", placeholder: "Votre nom" },
              { name: "age" as const, label: "Âge", type: "number", placeholder: "18" },
              { name: "city" as const, label: "Ville", type: "text", placeholder: "Yaoundé" },
            ].map((f) => (
              <div key={f.name}>
                <label className="block text-sm text-gray-400 mb-1.5 font-body">{f.label} *</label>
                <input {...register(f.name)} type={f.type} placeholder={f.placeholder}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-gold-500/50 outline-none transition-all font-body" />
                {errors[f.name] && <p className="text-red-400 text-xs mt-1">{errors[f.name]?.message as string}</p>}
              </div>
            ))}

            {/* Type */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5 font-body">Catégorie *</label>
              <select {...register("type")} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold-500/50 outline-none font-body">
                <option value="MISS">♛ MISS</option>
                <option value="MASTER">♚ MASTER</option>
              </select>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5 font-body">Bio (optionnel)</label>
              <textarea {...register("bio")} rows={3} placeholder="Parlez de vous en quelques mots..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-gold-500/50 outline-none resize-none font-body" />
            </div>

            <button type="submit" disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-bold rounded-xl hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-50 font-body">
              {submitting ? "Envoi en cours..." : "Soumettre ma candidature"}
            </button>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}
