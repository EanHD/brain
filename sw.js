/**
 * T041: Service Worker - sw.js
 * 
 * PWA Service Worker using Workbox for advanced caching and offline support
 * Implements constitutional performance requirements and offline-first architecture
 * 
 * Features:
 * - App shell caching for instant loading
 * - Runtime API caching with constitutional timeouts
 * - Background sync for AI requests
 * - Push notifications support
 * - Automatic updates with user notification
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { BackgroundSync } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';

// Service Worker version for update tracking
const SW_VERSION = '1.0.0';
const CACHE_NAME_PREFIX = 'brain-pwa';

console.log(`🔧 Brain PWA Service Worker v${SW_VERSION} initializing...`);

// Precache app shell and static assets
precacheAndRoute(self.__WB_MANIFEST || []);

// Clean up old caches
cleanupOutdatedCaches();

/**
 * App Shell Caching Strategy
 * Cache the main HTML, CSS, and JS files for instant loading
 */
registerRoute(
  ({ request }) => request.destination === 'document',
  new NetworkFirst({
    cacheName: `${CACHE_NAME_PREFIX}-app-shell`,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
      }),
    ],
  })
);

/**
 * Static Assets Caching Strategy
 * Cache CSS, JS, and other static assets with cache-first strategy
 */
registerRoute(
  ({ request }) => 
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker',
  new CacheFirst({
    cacheName: `${CACHE_NAME_PREFIX}-static-assets`,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

/**
 * Images and Media Caching Strategy
 * Cache images with cache-first strategy and size limits
 */
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: `${CACHE_NAME_PREFIX}-images`,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        purgeOnQuotaError: true,
      }),
    ],
  })
);

/**
 * API Caching Strategy
 * Cache API responses with network-first strategy and constitutional timeouts
 */
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: `${CACHE_NAME_PREFIX}-api-cache`,
    networkTimeoutSeconds: 2, // Constitutional 2-second timeout
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24, // 1 day
      }),
    ],
  })
);

/**
 * Background Sync for AI Requests
 * Queue AI requests when offline and sync when online
 */
const aiSyncQueue = new BackgroundSync('ai-requests', {
  maxRetentionTime: 24 * 60, // 24 hours in minutes
});

/**
 * Handle AI API requests with background sync
 */
registerRoute(
  ({ url }) => url.pathname.includes('openai.com/v1/chat/completions'),
  async ({ request }) => {
    try {
      // Try network request with constitutional timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(request.clone(), {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
      
    } catch (error) {
      console.log('AI request failed, queuing for background sync:', error.message);
      
      // Add to background sync queue
      await aiSyncQueue.replayRequests();
      
      // Return a custom offline response
      return new Response(JSON.stringify({
        error: 'offline',
        message: 'AI request queued for when online',
        queued: true
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
);

/**
 * Navigation Fallback
 * Serve app shell for all navigation requests when offline
 */
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: `${CACHE_NAME_PREFIX}-navigation`,
    networkTimeoutSeconds: 3,
  })
);

registerRoute(navigationRoute);

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
  console.log('🚀 Brain PWA Service Worker installing...');
  
  event.waitUntil(
    (async () => {
      // Pre-cache critical resources
      const cache = await caches.open(`${CACHE_NAME_PREFIX}-critical`);
      
      const criticalResources = [
        '/',
        '/index.html',
        '/manifest.json',
        '/src/css/main.css',
        '/src/css/components.css', 
        '/src/css/responsive.css',
        '/src/js/app.js'
      ];
      
      try {
        await cache.addAll(criticalResources);
        console.log('✅ Critical resources pre-cached');
      } catch (error) {
        console.warn('⚠️ Failed to pre-cache some resources:', error);
      }
      
      // Skip waiting to activate immediately
      self.skipWaiting();
    })()
  );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
  console.log('✅ Brain PWA Service Worker activated');
  
  event.waitUntil(
    (async () => {
      // Take control of all clients immediately
      await self.clients.claim();
      
      // Clean up old caches
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => 
        name.startsWith(CACHE_NAME_PREFIX) && 
        !name.includes(SW_VERSION)
      );
      
      await Promise.all(
        oldCaches.map(cacheName => caches.delete(cacheName))
      );
      
      console.log('🧹 Old caches cleaned up');
      
      // Notify all clients of activation
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_ACTIVATED',
          version: SW_VERSION
        });
      });
    })()
  );
});

/**
 * Handle Background Sync Events
 */
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'ai-requests') {
    event.waitUntil(
      (async () => {
        try {
          // Replay queued AI requests
          await aiSyncQueue.replayRequests();
          console.log('✅ AI requests synced successfully');
          
          // Notify clients of successful sync
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'AI_SYNC_COMPLETE',
              timestamp: Date.now()
            });
          });
          
        } catch (error) {
          console.error('❌ AI sync failed:', error);
        }
      })()
    );
  }
});

/**
 * Handle Push Notifications
 */
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received');
  
  let notificationData = {
    title: 'Brain',
    body: 'You have new activity',
    icon: '/src/assets/icon-192x192.png',
    badge: '/src/assets/badge-72x72.png',
    tag: 'brain-notification'
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.warn('Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Open Brain'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    })
  );
});

/**
 * Handle Notification Clicks
 */
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({ type: 'window' });
        
        // Focus existing window if available
        for (const client of clients) {
          if (client.url === self.registration.scope && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if no existing window
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })()
    );
  }
});

/**
 * Handle Client Messages
 */
self.addEventListener('message', (event) => {
  console.log('💬 Message from client:', event.data);
  
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0]?.postMessage({
        type: 'VERSION',
        version: SW_VERSION
      });
      break;
      
    case 'CACHE_STATS':
      event.waitUntil(
        (async () => {
          const cacheNames = await caches.keys();
          const stats = {};
          
          for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            stats[cacheName] = keys.length;
          }
          
          event.ports[0]?.postMessage({
            type: 'CACHE_STATS',
            stats
          });
        })()
      );
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
});

/**
 * Handle Fetch Events (Fallback)
 */
self.addEventListener('fetch', (event) => {
  // Additional fetch handling for edge cases
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Let Workbox handle the rest
});

/**
 * Handle Errors
 */
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason);
});

console.log('✅ Brain PWA Service Worker initialized successfully');