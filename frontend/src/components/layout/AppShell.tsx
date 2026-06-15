"use client";
import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";

/**
 * Wraps the public app in the navigation shell (sidebar on desktop,
 * floating pill on mobile). Admin areas render full-screen with their
 * own layout, so they bypass the shell entirely.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/xhrisadmin");

  if (isAdmin) return <>{children}</>;

  return (
    <div className="app-wrapper">
      <BottomNav />
      <main className="app-main">{children}</main>
    </div>
  );
}
