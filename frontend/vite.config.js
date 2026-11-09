import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) return 'vendor-react';
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'vendor-charts';
            return 'vendor-core';
          }
          if (id.includes('AdminPeerReviewAnomalyDesk')) return 'chunk-anomaly-desk';
          if (id.includes('QuizArena')) return 'chunk-quiz-arena';
          if (id.includes('FinanceReconciliationDesk')) return 'chunk-finance-desk';
          if (id.includes('TraineeDashboard')) return 'chunk-trainee-dashboard';
          if (id.includes('src/trainer/') || id.includes('TrainerDashboard')) return 'chunk-trainer-portal';
          if (id.includes('src/staff/') || id.includes('StaffDashboard')) return 'chunk-staff-portal';
          if (id.includes('src/admin/') || id.includes('AdminDashboard')) return 'chunk-admin-portal';
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    host: true,
  },
})
