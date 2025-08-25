import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  const shouldAnalyze = env.ANALYZE === 'true';

  return {
    plugins: [
      react({
        // Enable React Fast Refresh
        fastRefresh: !isProduction,
        // Babel configuration for production optimizations
        babel: isProduction ? {
          plugins: [
            ['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }]
          ]
        } : undefined
      }),
      
      // PWA Plugin
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\./,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 86400
                }
              }
            },
            {
              urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 2592000
                }
              }
            }
          ]
        },
        manifest: {
          name: 'Aithos RAG',
          short_name: 'Aithos',
          description: 'Enterprise RAG Application',
          theme_color: '#000000',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: '/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      }),
      
      // Bundle analyzer (only in analyze mode)
      shouldAnalyze && visualizer({
        filename: 'dist/bundle-analysis.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap'
      })
    ].filter(Boolean),
    
    // Path resolution
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@services': resolve(__dirname, 'src/services'),
        '@types': resolve(__dirname, 'src/types'),
        '@assets': resolve(__dirname, 'src/assets')
      }
    },
    
    // Development server configuration
    server: {
      port: 3000,
      host: true,
      cors: true,
      headers: {
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Cross-Origin-Opener-Policy': 'same-origin'
      }
    },
    
    // Preview server configuration
    preview: {
      port: 3000,
      host: true,
      cors: true
    },
    
    // Dependency optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'zustand',
        'recharts',
        'date-fns'
      ],
      exclude: [
        'lucide-react'
      ]
    },
    
    // Build configuration
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: isProduction ? false : true,
      minify: isProduction ? 'terser' : false,
      
      // Terser options for production
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info'],
          passes: 2
        },
        mangle: {
          safari10: true
        },
        format: {
          comments: false
        }
      } : undefined,
      
      // Rollup options for advanced bundling
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        
        output: {
          // Manual chunks for better code splitting
            manualChunks: {
              // Vendor chunks
              'vendor-react': ['react', 'react-dom'],
              'vendor-router': ['react-router-dom'],
              'vendor-ui': ['lucide-react', 'sonner'],
              'vendor-charts': ['recharts'],
              'vendor-3d': ['three'],
              'vendor-utils': ['clsx', 'tailwind-merge', 'framer-motion'],
              'vendor-auth': ['jwt-decode'],
              'vendor-animation': ['gsap']
            },
          
          // Asset naming for better caching
          chunkFileNames: () => {
            return `assets/js/[name]-[hash].js`;
          },
          
          assetFileNames: (assetInfo) => {
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(assetInfo.name || '')) {
              return 'assets/images/[name]-[hash][extname]';
            }
            
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
              return 'assets/fonts/[name]-[hash][extname]';
            }
            
            if (/\.(css)$/i.test(assetInfo.name || '')) {
              return 'assets/css/[name]-[hash][extname]';
            }
            
            return 'assets/[name]-[hash][extname]';
          },
          
          entryFileNames: 'assets/js/[name]-[hash].js'
        },
        
        // External dependencies (for CDN)
        external: isProduction && env.USE_CDN === 'true' ? [
          'react',
          'react-dom'
        ] : []
      },
      
      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
      
      // Asset size limit
      assetsInlineLimit: 4096,
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // CSS minification
      cssMinify: isProduction
    },
    
    // CSS configuration
    css: {
      devSourcemap: !isProduction,
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`
        }
      },
      postcss: {
        plugins: [
          tailwindcss,
          autoprefixer,
          ...(isProduction ? [
              cssnano({
                preset: ['default', {
                  discardComments: {
                    removeAll: true
                  },
                  normalizeWhitespace: false
                }]
              })
            ] : [])
        ]
      }
    },
    
    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __COMMIT_HASH__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || 'dev')
    },
    
    // ESBuild configuration
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
      legalComments: 'none'
    }
  };
});
