import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // PWA: aplikację można zainstalować (telefon, tablet, komputer) i działa offline.
    VitePWA({
      // Nowa wersja z GitHub Pages instaluje się sama przy następnym uruchomieniu.
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Gitara – stroik i metronom',
        short_name: 'Gitara',
        description: 'Stroik gitarowy z mikrofonu i metronom do nauki gry na gitarze klasycznej.',
        lang: 'pl',
        display: 'standalone',
        background_color: '#fff8ef',
        theme_color: '#ff8c1a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          // Android przycina ikony „maskable” do kształtu z motywu telefonu (koło, kwadrat…)
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
