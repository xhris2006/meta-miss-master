"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

type VoteCallbackPageProps = {
  searchParams: {
    tx_ref?: string | string[];
    status?: string | string[];
  };
};

export default function VoteCallbackPage({ searchParams }: VoteCallbackPageProps) {
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [votes, setVotes] = useState<number>(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const txRef = Array.isArray(searchParams.tx_ref) ? searchParams.tx_ref[0] : searchParams.tx_ref;
    const flwStatus = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status;

    if (!txRef) { setStatus("failed"); setMessage("Référence introuvable"); return; }
    if (flwStatus === "cancelled") { setStatus("failed"); setMessage("Paiement annulé"); return; }

    api.get(`/payments/verify/${txRef}`).then((r) => {
      const d = r.data.data;
      if (d.status === "COMPLETED") {
        setStatus("success");
        setVotes(d.votesCount);
        setMessage(d.message);
      } else {
        setStatus("failed");
        setMessage(d.message || "Paiement non confirmé");
      }
    }).catch(() => {
      setStatus("failed");
      setMessage("Erreur lors de la vérification");
    });
  }, [searchParams.status, searchParams.tx_ref]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass rounded-2xl p-10 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-14 h-14 text-gold-400 mx-auto mb-4 animate-spin" />
            <h2 className="font-display text-2xl text-white mb-2">Vérification du paiement...</h2>
            <p className="text-gray-400 font-body">Veuillez patienter</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
            <h2 className="font-display text-3xl text-white mb-2">Merci pour votre vote !</h2>
            <p className="text-gold-300 text-xl mb-2 font-display">{votes} vote{votes > 1 ? "s" : ""} crédité{votes > 1 ? "s" : ""}</p>
            <p className="text-gray-400 font-body mb-8">{message}</p>
            <div className="flex gap-3">
              <Link href="/ranking" className="flex-1 py-3 bg-gold-500 text-black rounded-xl font-semibold font-body hover:bg-gold-400 transition-all">Classement</Link>
              <Link href="/candidates" className="flex-1 py-3 glass text-gray-300 rounded-xl font-semibold font-body hover:text-white transition-all">Candidats</Link>
            </div>
          </>
        )}
        {status === "failed" && (
          <>
            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <h2 className="font-display text-2xl text-white mb-2">Paiement non confirmé</h2>
            <p className="text-gray-400 font-body mb-8">{message}</p>
            <Link href="/candidates" className="block py-3 glass text-gray-300 rounded-xl font-semibold font-body hover:text-white transition-all">
              Retour aux candidats
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
