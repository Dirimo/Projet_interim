export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  devtools: { enabled: true },
  devServer: { port: 3000 },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    // Prive, donc jamais serialise vers le navigateur : depuis le passage au
    // relais /bff, seul Nitro appelle l'API. Une valeur publique inviterait a
    // refaire un appel direct, qui court-circuiterait les cookies httpOnly.
    apiBase: process.env.NUXT_API_BASE ?? 'http://localhost:3001/api',
  },
  typescript: {
    strict: true,
  },
  app: {
    head: {
      title: 'Passerelle',
      htmlAttrs: { lang: 'fr' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
});
