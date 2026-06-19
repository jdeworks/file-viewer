// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: true,
  srcDir: 'src/',
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxtjs/i18n',
    '@nuxt/image',
    '@vueuse/nuxt',
  ],
  plugins: [
    '~/plugins/sentry.client.ts',
    '~/plugins/auth.ts',
  ],
  devServer: {
    port: 3000,
  },
  router: {
    options: {
      mode: 'history',
    },
  },
  runtimeConfig: {
    apiSecret: '',
    public: {
      apiBase: '/api',
    },
  },
});
