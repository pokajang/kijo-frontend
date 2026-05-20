import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'
import autoprefixer from 'autoprefixer'

const resolveMeta = (metaPath) => {
  try {
    const raw = fs.readFileSync(metaPath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export default defineConfig(({ command }) => {
  const isBuild = command === 'build'
  const metaPath = path.resolve(__dirname, 'public', 'meta.json')
  const existingMeta = resolveMeta(metaPath)
  const envVersion = process.env.VITE_APP_VERSION || process.env.VITE_COMMIT_SHA || null
  const version = envVersion || (isBuild ? new Date().toISOString() : existingMeta.version || 'dev')

  const buildMeta = {
    ...existingMeta,
    version,
  }

  if (process.env.VITE_MINIMUM_SUPPORTED_VERSION) {
    buildMeta.minimum_supported_version = process.env.VITE_MINIMUM_SUPPORTED_VERSION
  }

  if (process.env.VITE_FORCE_RELOAD) {
    buildMeta.force_reload = process.env.VITE_FORCE_RELOAD === 'true'
  }

  if (process.env.VITE_FORCE_RELOAD_MESSAGE) {
    buildMeta.message = process.env.VITE_FORCE_RELOAD_MESSAGE
  }

  if (isBuild) {
    try {
      fs.writeFileSync(metaPath, JSON.stringify(buildMeta, null, 2))
    } catch {
      // ignore write failures; build can still proceed
    }
  }

  return {
    base: '/',
    define: isBuild
      ? {
          'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
        }
      : {},
    build: {
      outDir: 'build',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined

            if (
              /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id)
            ) {
              return 'vendor-react'
            }
            if (/[\\/]node_modules[\\/]@coreui[\\/]/.test(id)) {
              return 'vendor-coreui'
            }
            if (/[\\/]node_modules[\\/](tinymce|@tinymce)[\\/]/.test(id)) {
              return 'vendor-editor'
            }
            if (
              /[\\/]node_modules[\\/](chart.js|@coreui[\\/]chartjs|@coreui[\\/]react-chartjs)[\\/]/.test(
                id,
              )
            ) {
              return 'vendor-charts'
            }
            if (
              /[\\/]node_modules[\\/](react-select|downshift|react-datepicker|react-joyride)[\\/]/.test(
                id,
              )
            ) {
              return 'vendor-ui'
            }

            return undefined
          },
        },
      },
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer({}), // add options if needed
        ],
      },
      preprocessorOptions: {
        scss: {
          quietDeps: true,
          silenceDeprecations: ['if-function'],
        },
      },
    },
    esbuild: {
      loader: 'jsx',
      include: /src[\\/].*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      force: true,
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: [
        {
          find: 'src/',
          replacement: `${path.resolve(__dirname, 'src')}/`,
        },
      ],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setupTests.js',
    },
    server: {
      historyApiFallback: true,
      port: 3000,
      fs: {
        allow: [path.resolve(__dirname, '..')],
      },
      proxy: {
        '/proxy': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/proxy/, ''),
        },
      },
    },
  }
})
