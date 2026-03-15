import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8091',
        changeOrigin: true,
      },
      '/timetable-api': {
        target: 'https://timetableplus.xjtlu.edu.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/timetable-api/, ''),
      },
    },
  },
})
