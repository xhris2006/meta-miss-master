"use client";

import { useEffect, useMemo, useState } from "react";

interface PushPermissionGateProps {
  title?: string;
  description?: string;
  onReady?: () => void;
}

export default function PushPermissionGate({
  title = "Recevez les alertes Reines du Meta",
  description = "Avant de continuer, activez les notifications pour être informé dès que les votes sont ouverts, doublés ou mis à jour.",
  onReady,
}: PushPermissionGateProps) {
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const canUsePush = useMemo(() => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window, []);

  useEffect(() => {
    if (!canUsePush) return;

    setPermission(Notification.permission);
    setReady(true);
    onReady?.();
  }, [canUsePush, onReady]);

  const handleEnable = async () => {
    if (!canUsePush) {
      setMessage("Votre navigateur ne prend pas en charge les notifications push.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const registration = await navigator.serviceWorker.ready;
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        setMessage("L’autorisation a été refusée. Les notifications ne s’afficheront pas.");
        setLoading(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""),
      });

      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey("p256dh") || new ArrayBuffer(0)),
            auth: arrayBufferToBase64(subscription.getKey("auth") || new ArrayBuffer(0)),
          },
        }),
      });

      setMessage("Notifications activées. Vous recevrez désormais les alertes importantes avant de continuer votre parcours.");
    } catch (error) {
      console.error(error);
      setMessage("Une erreur est survenue pendant l’activation des notifications.");
    } finally {
      setLoading(false);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer | ArrayBufferLike) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  if (!ready) return null;

  return (
    <div style={{
      border: "1px solid rgba(37, 99, 235, 0.18)",
      borderRadius: 22,
      padding: 18,
      background: "linear-gradient(135deg, rgba(37, 99, 235, 0.10), rgba(16, 185, 129, 0.12))",
      boxShadow: "0 12px 30px rgba(37, 99, 235, 0.14)",
      display: "grid",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, background: "linear-gradient(135deg, var(--blue), #3B82F6)", display: "grid", placeItems: "center", color: "#fff", fontSize: "1.05rem", boxShadow: "0 8px 20px rgba(37, 99, 235, 0.25)" }}>🔔</div>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--blue)" }}>Notifications push</div>
          <h3 style={{ margin: "2px 0 0", fontSize: "1rem", fontWeight: 800, color: "var(--text)" }}>{title}</h3>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.55 }}>{description}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: "0.76rem", color: "var(--blue)", fontWeight: 700 }}>
        <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.75)" }}>⚡ Alertes instantanées</span>
        <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.75)" }}>🗳️ Votes doubles</span>
        <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.75)" }}>📣 Mises à jour</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          type="button"
          onClick={handleEnable}
          disabled={loading || permission === "granted"}
          style={{
            border: "none",
            borderRadius: 999,
            padding: "11px 16px",
            background: "linear-gradient(135deg, var(--blue), #3B82F6)",
            color: "#fff",
            fontWeight: 800,
            cursor: loading || permission === "granted" ? "default" : "pointer",
            opacity: loading || permission === "granted" ? 0.8 : 1,
            boxShadow: "0 10px 22px rgba(37, 99, 235, 0.24)",
          }}
        >
          {loading ? "Activation…" : permission === "granted" ? "Notifications activées" : "Activer les notifications"}
        </button>
        {message ? <div style={{ fontSize: "0.78rem", color: "var(--blue)", fontWeight: 700 }}>{message}</div> : null}
      </div>
    </div>
  );
}
