/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

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

interface ExtendableMessageEvent extends ExtendableEvent {
  data: {
    type: 'CACHE_URLS';
    payload: CachePayload[];
  };
}

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  void self.skipWaiting();
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
  void self.clients.claim();
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
// This interface is defined for future implementation of background sync functionality
/*
interface PendingMessage {
  id: string;
  content: string;
  timestamp: number;
}
*/

// Message handling functions
// These functions are commented out as they're not currently used
// but may be needed in future implementations

/*
export const getPendingMessages = async (): Promise<PendingMessage[]> => {
  const db = await openDB();
  return db.getAll('pendingMessages');
};

export const sendMessage = async (message: PendingMessage): Promise<void> => {
  const db = await openDB();
  await db.add('pendingMessages', message);
};

export const removePendingMessage = async (id: string): Promise<void> => {
  const db = await openDB();
  await db.delete('pendingMessages', id);
};
*/

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      cacheFiles(event.data.payload)
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