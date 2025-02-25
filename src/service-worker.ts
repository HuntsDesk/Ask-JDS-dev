/// <reference lib="webworker" />

const CACHE_NAME = 'jds-app-cache-v1';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico'
];

interface CachePayload {
  url: string;
  options?: RequestInit;
}

interface MessageEvent {
  type: 'CACHE_URLS';
  payload: CachePayload[];
}

interface SyncMessage {
  id: string;
  content: string;
  timestamp: number;
}

interface ExtendedSelf extends ServiceWorkerGlobalScope {
  skipWaiting: () => void;
  clients: Clients;
}

declare const self: ExtendedSelf;

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event: FetchEvent) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle API requests
  if (event.request.url.includes('/rest/v1/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response;
        })
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          return caches.match(OFFLINE_URL) || new Response('Offline');
        })
    );
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});

// Handle background sync
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  const pendingMessages = await getPendingMessages();
  for (const msg of pendingMessages) {
    try {
      await sendMessage(msg);
      await removePendingMessage(msg.id);
    } catch (err) {
      console.error('Failed to sync message:', err);
    }
  }
}

async function getPendingMessages(): Promise<SyncMessage[]> {
  return [];
}

async function sendMessage(msg: SyncMessage): Promise<void> {
  // Implementation would send message to server
  console.log('Sending message:', msg);
}

async function removePendingMessage(id: string): Promise<void> {
  // Implementation would remove message from pending queue
  console.log('Removing pending message:', id);
}

self.addEventListener('message', (event: MessageEvent) => {
  if (event.type === 'CACHE_URLS') {
    event.waitUntil(
      cacheFiles(event.payload)
    );
  }
});

async function cacheFiles(files: CachePayload[]): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    files.map(file => cache.add(file.url))
  );
}

export {};