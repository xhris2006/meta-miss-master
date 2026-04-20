import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "META MISS & MASTER — Concours en ligne",
  description: "Votez pour votre candidat(e) préféré(e). Concours Miss & Master avec votes en ligne sécurisés.",
  metadataBase: new URL("https://meta-miss-master-qybctel7a-diors-projects-4fdbd43c.vercel.app"),
  openGraph: {
    title: "META MISS & MASTER",
    description: "Le grand concours de beauté et personnalité en ligne.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen crown-bg">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#1a0010", color: "#fef3c7", border: "1px solid #d97706" },
            success: { iconTheme: { primary: "#f59e0b", secondary: "#0d0006" } },
          }}
        />
      </body>
    </html>
  );
}
