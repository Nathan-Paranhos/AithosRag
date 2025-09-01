import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true,
      // Optimize JSX runtime
      jsxRuntime: 'automatic'
    })
  ],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  
  build: {
    minify: 'esbuild',
    sourcemap: process.env.NODE_ENV === 'development',
    target: 'esnext',
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['lucide-react'],
          'utils-vendor': ['date-fns', 'clsx'],
          
          // Feature chunks
          'chat-features': [
            './src/pages/ChatPage',
            './src/components/ChatInterface'
          ],
          'analytics-features': [
            './src/pages/AnalyticsPage',
            './src/components/DashboardAnalytics'
          ]
        },
        // Optimize chunk naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          return `assets/js/[name]-[hash].js`;
        },
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name || '')) {
            return 'assets/css/[name]-[hash].[ext]';
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
            return 'assets/images/[name]-[hash].[ext]';
          }
          return 'assets/[name]-[hash].[ext]';
        }
      }
    },
    // Optimize build performance
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096
  },
  
  server: {
    port: 5173,
    host: true,
    hmr: {
      port: 5173
    },
    // Enable compression
    compress: true
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react'
    ],
    exclude: [
      // Exclude large dependencies that should be loaded on demand
    ]
  },
  
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Optimize JSX
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    // Enable tree shaking
    treeShaking: true
  },
  
  // Performance optimizations
  define: {
    __DEV__: process.env.NODE_ENV === 'development'
  }
});
