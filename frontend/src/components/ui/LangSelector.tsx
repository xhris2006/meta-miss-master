"use client";
import { useLangStore } from "@/store/langStore";

export default function LangSelector() {
  const { lang, setLang } = useLangStore();

  return (
    <button
      onClick={() => setLang(lang === "fr" ? "en" : "fr")}
      aria-label="Changer de langue"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 100,
        border: "1.5px solid var(--border)",
        background: "var(--bg-card)",
        cursor: "pointer",
        fontSize: "0.78rem",
        fontWeight: 700,
        color: "var(--text)",
        transition: "all 0.2s",
        fontFamily: "var(--font)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--blue)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--blue)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
      }}
    >
      <span style={{ fontSize: "1rem" }}>{lang === "fr" ? "🇫🇷" : "🇬🇧"}</span>
      {lang === "fr" ? "FR" : "EN"}
    </button>
  );
}
