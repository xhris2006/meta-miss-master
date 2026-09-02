/**
 * Identifiant d'appareil stable, stocké en localStorage.
 * Envoyé avec les likes pour que le serveur puisse les rendre idempotents
 * (un appareil = au plus un like par candidat).
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  const KEY = "mmm-device-id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
