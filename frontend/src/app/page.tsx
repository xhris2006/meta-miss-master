"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Crown, Star, Users, TrendingUp, Zap } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TopCandidatesPreview from "@/components/candidate/TopCandidatesPreview";
import LiveStatsBar from "@/components/ranking/LiveStatsBar";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden px-4">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gold-500/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-pink-800/10 blur-3xl" />
        </div>

        <div className="text-center z-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-2 mb-6"
          >
            <Crown className="w-6 h-6 text-gold-400 animate-float" />
            <span className="text-gold-400 text-sm font-body tracking-[0.25em] uppercase">Concours officiel 2025</span>
            <Crown className="w-6 h-6 text-gold-400 animate-float" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-6xl md:text-8xl font-black mb-4 leading-none"
          >
            <span className="text-gold-gradient">META</span>
            <br />
            <span className="text-white">MISS &</span>
            <br />
            <span className="text-gold-gradient">MASTER</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-300 text-lg md:text-xl mb-10 max-w-xl mx-auto font-body"
          >
            Votez pour votre candidat(e) favori(e) et propulsez-le/la en tête du classement. <br/>
            <span className="text-gold-400 font-semibold">100 FCFA = 1 vote</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/candidates" className="px-8 py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold rounded-full hover:from-gold-400 hover:to-gold-500 transition-all hover:scale-105 shadow-lg shadow-gold-500/25 font-body">
              Voir les candidats
            </Link>
            <Link href="/ranking" className="px-8 py-4 glass text-gold-300 font-semibold rounded-full hover:border-gold-400/40 transition-all hover:scale-105 font-body">
              Classement live
            </Link>
            <Link href="/candidates/register" className="px-8 py-4 border border-white/10 text-white font-semibold rounded-full hover:border-gold-400/40 hover:text-gold-300 transition-all font-body">
              Je participe
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <div className="w-6 h-10 border-2 border-gold-500/40 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-gold-400 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Live stats bar */}
      <LiveStatsBar />

      {/* Features */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <h2 className="font-display text-4xl text-center mb-16 text-gold-gradient">Comment ça marche</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Users, title: "Inscription", desc: "Les candidats s'inscrivent avec photo et profil. Validation par l'admin." },
            { icon: Zap, title: "Vote payant", desc: "100 FCFA = 1 vote. Paiement sécurisé MTN, Orange Money ou carte." },
            { icon: TrendingUp, title: "Classement live", desc: "Résultats en temps réel. Le meilleur score remporte la couronne." },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="glass rounded-2xl p-8 text-center hover:border-gold-400/30 transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-gold-500/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-gold-500/20 transition-all">
                <f.icon className="w-7 h-7 text-gold-400" />
              </div>
              <h3 className="font-display text-xl text-white mb-3">{f.title}</h3>
              <p className="text-gray-400 font-body text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Top candidates preview */}
      <TopCandidatesPreview />

      <Footer />
    </div>
  );
}
