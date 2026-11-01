import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
        // Protocol core is raw TS, shared with the BasePOS web + mobile apps.
        '@pos/shared': path.resolve(import.meta.dirname, '../packages/shared/src/index.ts'),
      },
      // packages/shared installs its own viem; force one runtime copy.
      dedupe: ['viem'],
    },
    server: {
      // The dashboard is also served through `cloudflared tunnel` (phones need
      // HTTPS for camera/NFC) and can be fronted by `tailscale serve`. Vite's
      // dev-server host check rejects both unless they are listed here.
      allowedHosts: ['.trycloudflare.com', '.ts.net'],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
