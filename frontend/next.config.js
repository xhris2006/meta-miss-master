/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["localhost", "meta-miss-master-production.up.railway.app"],
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
    NEXT_PUBLIC_FLW_PUBLIC_KEY: process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY,
  },
  // ── En-têtes de sécurité (défense en profondeur) ──────────────────────────
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Anti-clickjacking : le site ne peut pas être chargé dans une iframe
          // tierce (protège notamment le panneau admin).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // Empêche le navigateur de "deviner" un type MIME (anti-XSS via upload).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Ne fuite jamais l'URL complète (query, donc jetons OAuth) vers un
          // domaine tiers ; seulement l'origine en cross-origin.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Coupe l'accès aux capteurs/permissions sensibles par défaut.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Force le HTTPS (le site est servi en HTTPS).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
