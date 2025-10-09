// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({  
  server: {
    headers: {
      // Content Security Policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://api.whatsapp.com https://trae-api-us.mchost.guru",
        "media-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
      ].join('; '),
      
      // Security Headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'accelerometer=()',
        'gyroscope=()'
      ].join(', '),
      
      // HSTS (HTTP Strict Transport Security)
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      
      // Cross-Origin Policies
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      
      // Cache Control for Security
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      
      // Additional Security Headers
      'X-Permitted-Cross-Domain-Policies': 'none',
      'X-Download-Options': 'noopen',
      'X-DNS-Prefetch-Control': 'off'
    }
  },
  
  // Build configuration for security
  build: {
    // Minify for production
    // Minify handled by Vite build options
    // Remove comments in production
    // Comments are removed automatically in production builds by Vite
    // Inline critical CSS
    inlineStylesheets: 'auto'
  },
  
  // Security-focused integrations
  integrations: [],
  
  // Vite configuration for additional security
  vite: {
    build: {
      // Source maps only in development
      sourcemap: process.env.NODE_ENV === 'development',
      // Rollup options for security
      rollupOptions: {
        output: {
          // Obfuscate chunk names
          chunkFileNames: 'assets/[hash].js',
          entryFileNames: 'assets/[hash].js',
          assetFileNames: 'assets/[hash].[ext]'
        }
      }
    },
    server: {
      // Additional server security
      hmr: {
        port: 24678 // Custom HMR port
      }
    },
    define: {
      // Remove console logs in production
      'console.log': process.env.NODE_ENV === 'production' ? '(() => {})' : 'console.log',
      'console.warn': process.env.NODE_ENV === 'production' ? '(() => {})' : 'console.warn',
      'console.error': process.env.NODE_ENV === 'production' ? '(() => {})' : 'console.error'
    }
  }
});
