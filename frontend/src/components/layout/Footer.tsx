import { Crown } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gold-500/10 py-12 px-4 mt-20">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-gold-400" />
          <span className="font-display text-white font-bold">META MISS & MASTER</span>
        </div>
        <div className="flex gap-6 text-sm text-gray-500">
          <Link href="/candidates" className="hover:text-gold-400 transition-colors">Candidats</Link>
          <Link href="/ranking" className="hover:text-gold-400 transition-colors">Classement</Link>
          <Link href="/candidates/register" className="hover:text-gold-400 transition-colors">Participer</Link>
        </div>
        <p className="text-gray-600 text-xs">© {new Date().getFullYear()} META MISS & MASTER. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
