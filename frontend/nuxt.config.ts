export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  devtools: { enabled: true },
  devServer: { port: 3000 },
  css: ['~/assets/css/main.css', '~/assets/css/vitrine.css'],
  runtimeConfig: {
    // Prive, donc jamais serialise vers le navigateur : depuis le passage au
    // relais /bff, seul Nitro appelle l'API. Une valeur publique inviterait a
    // refaire un appel direct, qui court-circuiterait les cookies httpOnly.
    apiBase: process.env.NUXT_API_BASE ?? 'http://localhost:3001/api',
  },
  // `@releve/shared` est compile en CommonJS et lie par le workspace : Vite le
  // traite alors comme du source et rate ses exports nommes, avec une erreur du
  // type « doesn't provide an export named ». Le pre-bundler explicitement
  // supprime le piege - plus besoin de vider node_modules/.vite a chaque ajout
  // dans le paquet partage.
  vite: {
    optimizeDeps: { include: ['@releve/shared'] },
  },
  typescript: {
    strict: true,
  },
  app: {
    head: {
      title: 'Relève',
      htmlAttrs: { lang: 'fr' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      // Le canvas est dessine en Plus Jakarta Sans : sans ce chargement, le
      // front retombait sur Segoe UI, aucune police n'ayant jamais ete servie.
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
        },
      ],
    },
  },
});
