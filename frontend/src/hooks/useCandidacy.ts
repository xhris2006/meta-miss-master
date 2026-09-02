"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

const STORAGE_KEY = (userId: string) => `mmm-candidacy-${userId}`;
const COOLDOWN_MS = 5 * 60 * 60 * 1000; // 5 heures

export interface CandidacyState {
  submitted: boolean;        // a soumis une candidature
  submittedAt: number | null; // timestamp de soumission
  cooldownDone: boolean;     // 5h écoulées depuis soumission
  candidateId: string | null; // id du candidat si connu
  loading: boolean;
}

export function useCandidacy() {
  const { user, isAuthenticated } = useAuthStore();
  const [state, setState] = useState<CandidacyState>({
    submitted: false,
    submittedAt: null,
    cooldownDone: false,
    candidateId: null,
    loading: true,
  });

  const checkFromStorage = useCallback(() => {
    if (!user?.id) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY(user.id));
      if (!raw) return null;
      return JSON.parse(raw) as { submittedAt: number; candidateId: string | null };
    } catch { return null; }
  }, [user?.id]);

  const check = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setState({ submitted: false, submittedAt: null, cooldownDone: false, candidateId: null, loading: false });
      return;
    }

    // 1. Vérifier le localStorage d'abord (instantané)
    const local = checkFromStorage();
    if (local) {
      const cooldownDone = Date.now() - local.submittedAt > COOLDOWN_MS;
      setState({ submitted: true, submittedAt: local.submittedAt, cooldownDone, candidateId: local.candidateId, loading: false });
      return;
    }

    // 2. Vérifier via API si pas en localStorage
    try {
      const r = await api.get("/candidates/my-candidacy");
      const data = r.data.data;
      if (data?.id) {
        const now = data.createdAt ? new Date(data.createdAt).getTime() : Date.now();
        const payload = { submittedAt: now, candidateId: data.id };
        localStorage.setItem(STORAGE_KEY(user.id), JSON.stringify(payload));
        const cooldownDone = Date.now() - now > COOLDOWN_MS;
        setState({ submitted: true, submittedAt: now, cooldownDone, candidateId: data.id, loading: false });
      } else {
        setState({ submitted: false, submittedAt: null, cooldownDone: false, candidateId: null, loading: false });
      }
    } catch {
      setState({ submitted: false, submittedAt: null, cooldownDone: false, candidateId: null, loading: false });
    }
  }, [isAuthenticated, user?.id, checkFromStorage]);

  useEffect(() => { check(); }, [check]);

  /** Appeler après soumission réussie */
  const markSubmitted = useCallback((candidateId?: string) => {
    if (!user?.id) return;
    const payload = { submittedAt: Date.now(), candidateId: candidateId || null };
    localStorage.setItem(STORAGE_KEY(user.id), JSON.stringify(payload));
    setState({ submitted: true, submittedAt: payload.submittedAt, cooldownDone: false, candidateId: payload.candidateId, loading: false });
  }, [user?.id]);

  /** Réinitialiser (pour permettre une nouvelle candidature après 5h) */
  const reset = useCallback(() => {
    if (!user?.id) return;
    localStorage.removeItem(STORAGE_KEY(user.id));
    setState({ submitted: false, submittedAt: null, cooldownDone: false, candidateId: null, loading: false });
  }, [user?.id]);

  return { ...state, markSubmitted, reset, refresh: check };
}
