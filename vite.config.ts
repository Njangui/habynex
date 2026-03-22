import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
        // AJOUT: URL Google Fonts pour les polices
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https://*.supabase.co https://lh3.googleusercontent.com blob:",
        "font-src 'self' https://fonts.gstatic.com",
        // AJOUT: URL complète de votre fonction Edge Supabase
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fkglrjuzqlittijixzpb.supabase.co",
        // AJOUT: Autoriser les iframes OpenStreetMap
        "frame-src 'self' https://www.openstreetmap.org",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));