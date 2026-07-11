import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Console d'administration Atlas Studio — application autonome.
// Indépendante du site vitrine, mais reliée au même backend Supabase
// (voir VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY dans .env).
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
