import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',  // hem IPv4 hem IPv6 dinle
    port: 5175,
    strictPort: true,
  },
});
