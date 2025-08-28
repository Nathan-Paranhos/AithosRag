// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/Users/paran/OneDrive/%C3%81rea%20de%20Trabalho/Aithos-RAG/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/paran/OneDrive/%C3%81rea%20de%20Trabalho/Aithos-RAG/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { resolve } from "path";
import { visualizer } from "file:///C:/Users/paran/OneDrive/%C3%81rea%20de%20Trabalho/Aithos-RAG/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import { VitePWA } from "file:///C:/Users/paran/OneDrive/%C3%81rea%20de%20Trabalho/Aithos-RAG/node_modules/vite-plugin-pwa/dist/index.js";
import tailwindcss from "file:///C:/Users/paran/OneDrive/%C3%81rea%20de%20Trabalho/Aithos-RAG/node_modules/tailwindcss/lib/index.js";
import autoprefixer from "file:///C:/Users/paran/OneDrive/%C3%81rea%20de%20Trabalho/Aithos-RAG/node_modules/autoprefixer/lib/autoprefixer.js";
import cssnano from "file:///C:/Users/paran/OneDrive/%C3%81rea%20de%20Trabalho/Aithos-RAG/node_modules/cssnano/src/index.js";
var __vite_injected_original_dirname = "C:\\Users\\paran\\OneDrive\\\xC1rea de Trabalho\\Aithos-RAG";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProduction = mode === "production";
  const shouldAnalyze = env.ANALYZE === "true";
  return {
    plugins: [
      react({
        // Enable React Fast Refresh
        fastRefresh: !isProduction,
        // Babel configuration for production optimizations
        babel: isProduction ? {
          plugins: [
            ["babel-plugin-transform-remove-console", { exclude: ["error", "warn"] }]
          ]
        } : void 0
      }),
      // PWA Plugin
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\./,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 86400
                }
              }
            },
            {
              urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
              handler: "CacheFirst",
              options: {
                cacheName: "images-cache",
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 2592e3
                }
              }
            }
          ]
        },
        manifest: {
          name: "Aithos RAG",
          short_name: "Aithos",
          description: "Enterprise RAG Application",
          theme_color: "#000000",
          background_color: "#ffffff",
          display: "standalone",
          icons: [
            {
              src: "/icon-192x192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "/icon-512x512.png",
              sizes: "512x512",
              type: "image/png"
            }
          ]
        }
      }),
      // Bundle analyzer (only in analyze mode)
      shouldAnalyze && visualizer({
        filename: "dist/bundle-analysis.html",
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: "treemap"
      })
    ].filter(Boolean),
    // Path resolution
    resolve: {
      alias: {
        "@": resolve(__vite_injected_original_dirname, "src"),
        "@components": resolve(__vite_injected_original_dirname, "src/components"),
        "@hooks": resolve(__vite_injected_original_dirname, "src/hooks"),
        "@utils": resolve(__vite_injected_original_dirname, "src/utils"),
        "@services": resolve(__vite_injected_original_dirname, "src/services"),
        "@types": resolve(__vite_injected_original_dirname, "src/types"),
        "@assets": resolve(__vite_injected_original_dirname, "src/assets")
      }
    },
    // Development server configuration
    server: {
      port: 3e3,
      host: true,
      cors: true,
      headers: {
        "Cross-Origin-Embedder-Policy": "credentialless",
        "Cross-Origin-Opener-Policy": "same-origin"
      }
    },
    // Preview server configuration
    preview: {
      port: 3e3,
      host: true,
      cors: true
    },
    // Dependency optimization
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "zustand",
        "recharts",
        "date-fns"
      ],
      exclude: [
        "lucide-react"
      ]
    },
    // Build configuration
    build: {
      target: "es2020",
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: isProduction ? false : true,
      minify: isProduction ? "terser" : false,
      // Terser options for production
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ["console.log", "console.info"],
          passes: 2
        },
        mangle: {
          safari10: true
        },
        format: {
          comments: false
        }
      } : void 0,
      // Rollup options for advanced bundling
      rollupOptions: {
        input: {
          main: resolve(__vite_injected_original_dirname, "index.html")
        },
        output: {
          // Manual chunks for better code splitting
          manualChunks: {
            // Vendor chunks
            "vendor-react": ["react", "react-dom"],
            "vendor-router": ["react-router-dom"],
            "vendor-ui": ["lucide-react", "sonner"],
            "vendor-charts": ["recharts"],
            "vendor-3d": ["three"],
            "vendor-utils": ["clsx", "tailwind-merge", "framer-motion"],
            "vendor-auth": ["jwt-decode"],
            "vendor-animation": ["gsap"]
          },
          // Asset naming for better caching
          chunkFileNames: () => {
            return `assets/js/[name]-[hash].js`;
          },
          assetFileNames: (assetInfo) => {
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(assetInfo.name || "")) {
              return "assets/images/[name]-[hash][extname]";
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || "")) {
              return "assets/fonts/[name]-[hash][extname]";
            }
            if (/\.(css)$/i.test(assetInfo.name || "")) {
              return "assets/css/[name]-[hash][extname]";
            }
            return "assets/[name]-[hash][extname]";
          },
          entryFileNames: "assets/js/[name]-[hash].js"
        },
        // External dependencies (for CDN)
        external: isProduction && env.USE_CDN === "true" ? [
          "react",
          "react-dom"
        ] : []
      },
      // Chunk size warnings
      chunkSizeWarningLimit: 1e3,
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
          ...isProduction ? [
            cssnano({
              preset: ["default", {
                discardComments: {
                  removeAll: true
                },
                normalizeWhitespace: false
              }]
            })
          ] : []
        ]
      }
    },
    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify((/* @__PURE__ */ new Date()).toISOString()),
      __COMMIT_HASH__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || "dev")
    },
    // ESBuild configuration
    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
      legalComments: "none"
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxwYXJhblxcXFxPbmVEcml2ZVxcXFxcdTAwQzFyZWEgZGUgVHJhYmFsaG9cXFxcQWl0aG9zLVJBR1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxccGFyYW5cXFxcT25lRHJpdmVcXFxcXHUwMEMxcmVhIGRlIFRyYWJhbGhvXFxcXEFpdGhvcy1SQUdcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3BhcmFuL09uZURyaXZlLyVDMyU4MXJlYSUyMGRlJTIwVHJhYmFsaG8vQWl0aG9zLVJBRy92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZEVudiB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInO1xuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSc7XG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAndGFpbHdpbmRjc3MnO1xuaW1wb3J0IGF1dG9wcmVmaXhlciBmcm9tICdhdXRvcHJlZml4ZXInO1xuaW1wb3J0IGNzc25hbm8gZnJvbSAnY3NzbmFubyc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgJycpO1xuICBjb25zdCBpc1Byb2R1Y3Rpb24gPSBtb2RlID09PSAncHJvZHVjdGlvbic7XG4gIGNvbnN0IHNob3VsZEFuYWx5emUgPSBlbnYuQU5BTFlaRSA9PT0gJ3RydWUnO1xuXG4gIHJldHVybiB7XG4gICAgcGx1Z2luczogW1xuICAgICAgcmVhY3Qoe1xuICAgICAgICAvLyBFbmFibGUgUmVhY3QgRmFzdCBSZWZyZXNoXG4gICAgICAgIGZhc3RSZWZyZXNoOiAhaXNQcm9kdWN0aW9uLFxuICAgICAgICAvLyBCYWJlbCBjb25maWd1cmF0aW9uIGZvciBwcm9kdWN0aW9uIG9wdGltaXphdGlvbnNcbiAgICAgICAgYmFiZWw6IGlzUHJvZHVjdGlvbiA/IHtcbiAgICAgICAgICBwbHVnaW5zOiBbXG4gICAgICAgICAgICBbJ2JhYmVsLXBsdWdpbi10cmFuc2Zvcm0tcmVtb3ZlLWNvbnNvbGUnLCB7IGV4Y2x1ZGU6IFsnZXJyb3InLCAnd2FybiddIH1dXG4gICAgICAgICAgXVxuICAgICAgICB9IDogdW5kZWZpbmVkXG4gICAgICB9KSxcbiAgICAgIFxuICAgICAgLy8gUFdBIFBsdWdpblxuICAgICAgVml0ZVBXQSh7XG4gICAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxuICAgICAgICB3b3JrYm94OiB7XG4gICAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnfSddLFxuICAgICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvYXBpXFwuLyxcbiAgICAgICAgICAgICAgaGFuZGxlcjogJ05ldHdvcmtGaXJzdCcsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBjYWNoZU5hbWU6ICdhcGktY2FjaGUnLFxuICAgICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcbiAgICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDEwMCxcbiAgICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDg2NDAwXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXFwuKHBuZ3xqcGd8anBlZ3xzdmd8Z2lmfHdlYnApJC8sXG4gICAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2ltYWdlcy1jYWNoZScsXG4gICAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgICAgbWF4RW50cmllczogMjAwLFxuICAgICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogMjU5MjAwMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgbWFuaWZlc3Q6IHtcbiAgICAgICAgICBuYW1lOiAnQWl0aG9zIFJBRycsXG4gICAgICAgICAgc2hvcnRfbmFtZTogJ0FpdGhvcycsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdFbnRlcnByaXNlIFJBRyBBcHBsaWNhdGlvbicsXG4gICAgICAgICAgdGhlbWVfY29sb3I6ICcjMDAwMDAwJyxcbiAgICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI2ZmZmZmZicsXG4gICAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxuICAgICAgICAgIGljb25zOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNyYzogJy9pY29uLTE5MngxOTIucG5nJyxcbiAgICAgICAgICAgICAgc2l6ZXM6ICcxOTJ4MTkyJyxcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNyYzogJy9pY29uLTUxMng1MTIucG5nJyxcbiAgICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgXG4gICAgICAvLyBCdW5kbGUgYW5hbHl6ZXIgKG9ubHkgaW4gYW5hbHl6ZSBtb2RlKVxuICAgICAgc2hvdWxkQW5hbHl6ZSAmJiB2aXN1YWxpemVyKHtcbiAgICAgICAgZmlsZW5hbWU6ICdkaXN0L2J1bmRsZS1hbmFseXNpcy5odG1sJyxcbiAgICAgICAgb3BlbjogdHJ1ZSxcbiAgICAgICAgZ3ppcFNpemU6IHRydWUsXG4gICAgICAgIGJyb3RsaVNpemU6IHRydWUsXG4gICAgICAgIHRlbXBsYXRlOiAndHJlZW1hcCdcbiAgICAgIH0pXG4gICAgXS5maWx0ZXIoQm9vbGVhbiksXG4gICAgXG4gICAgLy8gUGF0aCByZXNvbHV0aW9uXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgJ0AnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpLFxuICAgICAgICAnQGNvbXBvbmVudHMnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9jb21wb25lbnRzJyksXG4gICAgICAgICdAaG9va3MnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9ob29rcycpLFxuICAgICAgICAnQHV0aWxzJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvdXRpbHMnKSxcbiAgICAgICAgJ0BzZXJ2aWNlcyc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3NlcnZpY2VzJyksXG4gICAgICAgICdAdHlwZXMnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy90eXBlcycpLFxuICAgICAgICAnQGFzc2V0cyc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2Fzc2V0cycpXG4gICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvLyBEZXZlbG9wbWVudCBzZXJ2ZXIgY29uZmlndXJhdGlvblxuICAgIHNlcnZlcjoge1xuICAgICAgcG9ydDogMzAwMCxcbiAgICAgIGhvc3Q6IHRydWUsXG4gICAgICBjb3JzOiB0cnVlLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ3Jvc3MtT3JpZ2luLUVtYmVkZGVyLVBvbGljeSc6ICdjcmVkZW50aWFsbGVzcycsXG4gICAgICAgICdDcm9zcy1PcmlnaW4tT3BlbmVyLVBvbGljeSc6ICdzYW1lLW9yaWdpbidcbiAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8vIFByZXZpZXcgc2VydmVyIGNvbmZpZ3VyYXRpb25cbiAgICBwcmV2aWV3OiB7XG4gICAgICBwb3J0OiAzMDAwLFxuICAgICAgaG9zdDogdHJ1ZSxcbiAgICAgIGNvcnM6IHRydWVcbiAgICB9LFxuICAgIFxuICAgIC8vIERlcGVuZGVuY3kgb3B0aW1pemF0aW9uXG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICBpbmNsdWRlOiBbXG4gICAgICAgICdyZWFjdCcsXG4gICAgICAgICdyZWFjdC1kb20nLFxuICAgICAgICAncmVhY3Qtcm91dGVyLWRvbScsXG4gICAgICAgICd6dXN0YW5kJyxcbiAgICAgICAgJ3JlY2hhcnRzJyxcbiAgICAgICAgJ2RhdGUtZm5zJ1xuICAgICAgXSxcbiAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgJ2x1Y2lkZS1yZWFjdCdcbiAgICAgIF1cbiAgICB9LFxuICAgIFxuICAgIC8vIEJ1aWxkIGNvbmZpZ3VyYXRpb25cbiAgICBidWlsZDoge1xuICAgICAgdGFyZ2V0OiAnZXMyMDIwJyxcbiAgICAgIG91dERpcjogJ2Rpc3QnLFxuICAgICAgYXNzZXRzRGlyOiAnYXNzZXRzJyxcbiAgICAgIHNvdXJjZW1hcDogaXNQcm9kdWN0aW9uID8gZmFsc2UgOiB0cnVlLFxuICAgICAgbWluaWZ5OiBpc1Byb2R1Y3Rpb24gPyAndGVyc2VyJyA6IGZhbHNlLFxuICAgICAgXG4gICAgICAvLyBUZXJzZXIgb3B0aW9ucyBmb3IgcHJvZHVjdGlvblxuICAgICAgdGVyc2VyT3B0aW9uczogaXNQcm9kdWN0aW9uID8ge1xuICAgICAgICBjb21wcmVzczoge1xuICAgICAgICAgIGRyb3BfY29uc29sZTogdHJ1ZSxcbiAgICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlLFxuICAgICAgICAgIHB1cmVfZnVuY3M6IFsnY29uc29sZS5sb2cnLCAnY29uc29sZS5pbmZvJ10sXG4gICAgICAgICAgcGFzc2VzOiAyXG4gICAgICAgIH0sXG4gICAgICAgIG1hbmdsZToge1xuICAgICAgICAgIHNhZmFyaTEwOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIGZvcm1hdDoge1xuICAgICAgICAgIGNvbW1lbnRzOiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9IDogdW5kZWZpbmVkLFxuICAgICAgXG4gICAgICAvLyBSb2xsdXAgb3B0aW9ucyBmb3IgYWR2YW5jZWQgYnVuZGxpbmdcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICBtYWluOiByZXNvbHZlKF9fZGlybmFtZSwgJ2luZGV4Lmh0bWwnKVxuICAgICAgICB9LFxuICAgICAgICBcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgLy8gTWFudWFsIGNodW5rcyBmb3IgYmV0dGVyIGNvZGUgc3BsaXR0aW5nXG4gICAgICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAgICAgLy8gVmVuZG9yIGNodW5rc1xuICAgICAgICAgICAgICAndmVuZG9yLXJlYWN0JzogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgICAgICAgICAgICAgJ3ZlbmRvci1yb3V0ZXInOiBbJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICAgICAgICAgICAgJ3ZlbmRvci11aSc6IFsnbHVjaWRlLXJlYWN0JywgJ3Nvbm5lciddLFxuICAgICAgICAgICAgICAndmVuZG9yLWNoYXJ0cyc6IFsncmVjaGFydHMnXSxcbiAgICAgICAgICAgICAgJ3ZlbmRvci0zZCc6IFsndGhyZWUnXSxcbiAgICAgICAgICAgICAgJ3ZlbmRvci11dGlscyc6IFsnY2xzeCcsICd0YWlsd2luZC1tZXJnZScsICdmcmFtZXItbW90aW9uJ10sXG4gICAgICAgICAgICAgICd2ZW5kb3ItYXV0aCc6IFsnand0LWRlY29kZSddLFxuICAgICAgICAgICAgICAndmVuZG9yLWFuaW1hdGlvbic6IFsnZ3NhcCddXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIFxuICAgICAgICAgIC8vIEFzc2V0IG5hbWluZyBmb3IgYmV0dGVyIGNhY2hpbmdcbiAgICAgICAgICBjaHVua0ZpbGVOYW1lczogKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGBhc3NldHMvanMvW25hbWVdLVtoYXNoXS5qc2A7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBcbiAgICAgICAgICBhc3NldEZpbGVOYW1lczogKGFzc2V0SW5mbykgPT4ge1xuICAgICAgICAgICAgaWYgKC9cXC4ocG5nfGpwZT9nfGdpZnxzdmd8d2VicHxhdmlmKSQvaS50ZXN0KGFzc2V0SW5mby5uYW1lIHx8ICcnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2Fzc2V0cy9pbWFnZXMvW25hbWVdLVtoYXNoXVtleHRuYW1lXSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgvXFwuKHdvZmYyP3xlb3R8dHRmfG90ZikkL2kudGVzdChhc3NldEluZm8ubmFtZSB8fCAnJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdhc3NldHMvZm9udHMvW25hbWVdLVtoYXNoXVtleHRuYW1lXSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgvXFwuKGNzcykkL2kudGVzdChhc3NldEluZm8ubmFtZSB8fCAnJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdhc3NldHMvY3NzL1tuYW1lXS1baGFzaF1bZXh0bmFtZV0nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdJztcbiAgICAgICAgICB9LFxuICAgICAgICAgIFxuICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL2pzL1tuYW1lXS1baGFzaF0uanMnXG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICAvLyBFeHRlcm5hbCBkZXBlbmRlbmNpZXMgKGZvciBDRE4pXG4gICAgICAgIGV4dGVybmFsOiBpc1Byb2R1Y3Rpb24gJiYgZW52LlVTRV9DRE4gPT09ICd0cnVlJyA/IFtcbiAgICAgICAgICAncmVhY3QnLFxuICAgICAgICAgICdyZWFjdC1kb20nXG4gICAgICAgIF0gOiBbXVxuICAgICAgfSxcbiAgICAgIFxuICAgICAgLy8gQ2h1bmsgc2l6ZSB3YXJuaW5nc1xuICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxuICAgICAgXG4gICAgICAvLyBBc3NldCBzaXplIGxpbWl0XG4gICAgICBhc3NldHNJbmxpbmVMaW1pdDogNDA5NixcbiAgICAgIFxuICAgICAgLy8gQ1NTIGNvZGUgc3BsaXR0aW5nXG4gICAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXG4gICAgICBcbiAgICAgIC8vIENTUyBtaW5pZmljYXRpb25cbiAgICAgIGNzc01pbmlmeTogaXNQcm9kdWN0aW9uXG4gICAgfSxcbiAgICBcbiAgICAvLyBDU1MgY29uZmlndXJhdGlvblxuICAgIGNzczoge1xuICAgICAgZGV2U291cmNlbWFwOiAhaXNQcm9kdWN0aW9uLFxuICAgICAgcHJlcHJvY2Vzc29yT3B0aW9uczoge1xuICAgICAgICBzY3NzOiB7XG4gICAgICAgICAgYWRkaXRpb25hbERhdGE6IGBAaW1wb3J0IFwiQC9zdHlsZXMvdmFyaWFibGVzLnNjc3NcIjtgXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBwb3N0Y3NzOiB7XG4gICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICB0YWlsd2luZGNzcyxcbiAgICAgICAgICBhdXRvcHJlZml4ZXIsXG4gICAgICAgICAgLi4uKGlzUHJvZHVjdGlvbiA/IFtcbiAgICAgICAgICAgICAgY3NzbmFubyh7XG4gICAgICAgICAgICAgICAgcHJlc2V0OiBbJ2RlZmF1bHQnLCB7XG4gICAgICAgICAgICAgICAgICBkaXNjYXJkQ29tbWVudHM6IHtcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlQWxsOiB0cnVlXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgbm9ybWFsaXplV2hpdGVzcGFjZTogZmFsc2VcbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgXSA6IFtdKVxuICAgICAgICBdXG4gICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvLyBFbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAgICBkZWZpbmU6IHtcbiAgICAgIF9fQVBQX1ZFUlNJT05fXzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYubnBtX3BhY2thZ2VfdmVyc2lvbiksXG4gICAgICBfX0JVSUxEX1RJTUVfXzogSlNPTi5zdHJpbmdpZnkobmV3IERhdGUoKS50b0lTT1N0cmluZygpKSxcbiAgICAgIF9fQ09NTUlUX0hBU0hfXzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuVkVSQ0VMX0dJVF9DT01NSVRfU0hBIHx8ICdkZXYnKVxuICAgIH0sXG4gICAgXG4gICAgLy8gRVNCdWlsZCBjb25maWd1cmF0aW9uXG4gICAgZXNidWlsZDoge1xuICAgICAgZHJvcDogaXNQcm9kdWN0aW9uID8gWydjb25zb2xlJywgJ2RlYnVnZ2VyJ10gOiBbXSxcbiAgICAgIGxlZ2FsQ29tbWVudHM6ICdub25lJ1xuICAgIH1cbiAgfTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVyxTQUFTLGNBQWMsZUFBZTtBQUN0WSxPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBQ3hCLFNBQVMsa0JBQWtCO0FBQzNCLFNBQVMsZUFBZTtBQUN4QixPQUFP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QUssVUFBVSxRQUFRLEVBQUUsR0FBRztBQUNsRSxxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSwyQkFBMkIsS0FBSyxVQUFVLFFBQVEsRUFBRSxHQUFHO0FBQ3pELHFCQUFPO0FBQUEsWUFDVDtBQUVBLGdCQUFJLFlBQVksS0FBSyxVQUFVLFFBQVEsRUFBRSxHQUFHO0FBQzFDLHFCQUFPO0FBQUEsWUFDVDtBQUVBLG1CQUFPO0FBQUEsVUFDVDtBQUFBLFVBRUEsZ0JBQWdCO0FBQUEsUUFDbEI7QUFBQTtBQUFBLFFBR0EsVUFBVSxnQkFBZ0IsSUFBSSxZQUFZLFNBQVM7QUFBQSxVQUNqRDtBQUFBLFVBQ0E7QUFBQSxRQUNGLElBQUksQ0FBQztBQUFBLE1BQ1A7QUFBQTtBQUFBLE1BR0EsdUJBQXVCO0FBQUE7QUFBQSxNQUd2QixtQkFBbUI7QUFBQTtBQUFBLE1BR25CLGNBQWM7QUFBQTtBQUFBLE1BR2QsV0FBVztBQUFBLElBQ2I7QUFBQTtBQUFBLElBR0EsS0FBSztBQUFBLE1BQ0gsY0FBYyxDQUFDO0FBQUEsTUFDZixxQkFBcUI7QUFBQSxRQUNuQixNQUFNO0FBQUEsVUFDSixnQkFBZ0I7QUFBQSxRQUNsQjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFNBQVM7QUFBQSxRQUNQLFNBQVM7QUFBQSxVQUNQO0FBQUEsVUFDQTtBQUFBLFVBQ0EsR0FBSSxlQUFlO0FBQUEsWUFDZixRQUFRO0FBQUEsY0FDTixRQUFRLENBQUMsV0FBVztBQUFBLGdCQUNsQixpQkFBaUI7QUFBQSxrQkFDZixXQUFXO0FBQUEsZ0JBQ2I7QUFBQSxnQkFDQSxxQkFBcUI7QUFBQSxjQUN2QixDQUFDO0FBQUEsWUFDSCxDQUFDO0FBQUEsVUFDSCxJQUFJLENBQUM7QUFBQSxRQUNUO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBR0EsUUFBUTtBQUFBLE1BQ04saUJBQWlCLEtBQUssVUFBVSxRQUFRLElBQUksbUJBQW1CO0FBQUEsTUFDL0QsZ0JBQWdCLEtBQUssV0FBVSxvQkFBSSxLQUFLLEdBQUUsWUFBWSxDQUFDO0FBQUEsTUFDdkQsaUJBQWlCLEtBQUssVUFBVSxRQUFRLElBQUkseUJBQXlCLEtBQUs7QUFBQSxJQUM1RTtBQUFBO0FBQUEsSUFHQSxTQUFTO0FBQUEsTUFDUCxNQUFNLGVBQWUsQ0FBQyxXQUFXLFVBQVUsSUFBSSxDQUFDO0FBQUEsTUFDaEQsZUFBZTtBQUFBLElBQ2pCO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
