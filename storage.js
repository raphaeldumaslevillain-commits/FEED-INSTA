/* Durable, atomic snapshots. Test pages use a separate database and legacy key. */
(function (root) {
  "use strict";
  function create({ sandbox = false } = {}) {
    const databaseName = sandbox
      ? "anekdote-feed-sandbox-v2"
      : "anekdote-feed-v2";
    const legacyKey = sandbox ? "anekdote-feed-sandbox-v1" : "anekdote-feed-v1";
    const storeName = "compositions";
    let connection = null;
    let backend = "indexeddb";
    let queue = Promise.resolve();
    let retentionRequested = false;
    function database() {
      if (connection) return connection;
      connection = new Promise((resolve, reject) => {
        let request;
        try {
          request = root.indexedDB.open(databaseName, 1);
        } catch (error) {
          reject(error);
          return;
        }
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(storeName))
            request.result.createObjectStore(storeName);
        };
        request.onerror = () => reject(request.error);
        request.onblocked = () =>
          reject(
            new Error("La base de sauvegarde est occupée par un autre onglet."),
          );
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            connection = null;
          };
          resolve(db);
        };
      });
      return connection;
    }
    async function read() {
      const db = await database();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const request = transaction.objectStore(storeName).get("current");
        let value;
        request.onsuccess = () => {
          value = request.result;
        };
        transaction.oncomplete = () => resolve(value);
        transaction.onabort = () =>
          reject(
            transaction.error ||
              new Error("Lecture de la sauvegarde interrompue."),
          );
      });
    }
    async function write(posts) {
      const db = await database();
      return new Promise((resolve, reject) => {
        let transaction;
        // Strict durability asks supported browsers to flush before confirming.
        try {
          transaction = db.transaction(storeName, "readwrite", {
            durability: "strict",
          });
        } catch (_) {
          transaction = db.transaction(storeName, "readwrite");
        }
        transaction
          .objectStore(storeName)
          .put({ version: 2, posts, savedAt: Date.now() }, "current");
        transaction.oncomplete = () => resolve({ backend: "indexeddb" });
        transaction.onabort = () =>
          reject(transaction.error || new Error("Enregistrement interrompu."));
      });
    }
    function legacy() {
      const raw = root.localStorage.getItem(legacyKey);
      if (!raw) return null;
      const value = JSON.parse(raw);
      return Array.isArray(value) ? value : null;
    }
    async function load() {
      try {
        await database();
      } catch (_) {
        backend = "localStorage";
      }
      if (backend === "indexeddb") {
        // A failed read of an existing database must not overwrite its saved photos.
        const saved = await read();
        if (saved?.version === 2 && Array.isArray(saved.posts))
          return { posts: saved.posts, backend, migrate: false };
      }
      try {
        const posts = legacy();
        return {
          posts,
          backend,
          migrate: Boolean(posts) && backend === "indexeddb",
        };
      } catch (_) {
        // An inaccessible legacy store must not disable a working IndexedDB.
        return {
          posts: null,
          backend: backend === "indexeddb" ? backend : "memory",
          migrate: false,
        };
      }
    }
    function save(posts) {
      // Capture now; queued writes must never read a later mutable array.
      const snapshot = posts.map((post) => ({ ...post }));
      const operation = queue
        .catch(() => {})
        .then(async () => {
          if (backend === "localStorage") {
            root.localStorage.setItem(legacyKey, JSON.stringify(snapshot));
            return { backend };
          }
          const result = await write(snapshot);
          // Remove the old copy only after the durable transaction succeeds.
          try {
            root.localStorage.removeItem(legacyKey);
          } catch (_) {}
          if (
            !sandbox &&
            !retentionRequested &&
            snapshot.some((post) => post.uploaded)
          ) {
            retentionRequested = true;
            // Optional retention never blocks an already saved snapshot.
            try {
              root.navigator.storage?.persist?.().catch(() => {});
            } catch (_) {}
          }
          return result;
        });
      queue = operation;
      return operation;
    }
    return Object.freeze({ load, save });
  }
  root.FeedStorage = Object.freeze({ create });
})(window);
