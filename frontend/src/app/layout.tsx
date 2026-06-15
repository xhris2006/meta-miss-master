import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import ThemeProvider from "@/components/layout/ThemeProvider";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "MetaMiss Master 2026",
  description: "Votez pour vos candidats préférés au concours MetaMiss Master 2026.",
  keywords: ["miss master", "concours", "vote", "cameroun"],
  openGraph: {
    title: "MetaMiss Master 2026",
    description: "🗳️ Votez pour vos candidats préférés · Résultats en direct",
    url: "https://metavote.online",
    siteName: "MetaMiss Master 2026",
    images: [{ url: "https://metavote.online/og-image.jpg", width: 1200, height: 630, alt: "MetaMiss Master 2026" }],
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "MetaMiss Master 2026",
    description: "🗳️ Votez pour vos candidats préférés · Résultats en direct",
    images: ["https://metavote.online/og-image.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon-32x32.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {/* App shell (nav) pour le public ; l'admin s'affiche plein écran */}
          <AppShell>{children}</AppShell>
          <Toaster position="top-center" toastOptions={{
            style: {
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "0.85rem",
              borderRadius: "10px",
              background: "var(--bg-card)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            },
            success: { iconTheme: { primary: "#2563EB", secondary: "#fff" } },
          }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
