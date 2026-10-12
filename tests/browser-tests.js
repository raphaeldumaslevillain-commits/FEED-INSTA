let frame = document.querySelector("#app");
const result = document.querySelector("#result");
const results = document.querySelector("#results");
const storageKey = "anekdote-feed-sandbox-v1";
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const waitUntil = async (predicate) => {
  const deadline = Date.now() + 10000;
  while (!predicate()) {
    if (Date.now() > deadline)
      throw new Error("État attendu absent après 10 secondes.");
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
};
async function reload() {
  const loaded = new Promise((resolve) =>
    frame.addEventListener("load", resolve, { once: true }),
  );
  frame.contentWindow.location.reload();
  await loaded;
  await waitUntil(
    () =>
      frame.contentDocument.querySelectorAll(".post").length >= 6 &&
      !frame.contentDocument.querySelector("#editor-toggle").disabled,
  );
}
async function clearSaved() {
  localStorage.removeItem(storageKey);
  await new Promise((resolve, reject) => {
    const request = indexedDB.open("anekdote-feed-sandbox-v2", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("compositions");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("compositions", "readwrite");
      transaction.objectStore("compositions").clear();
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}
async function saved() {
  await waitUntil(
    () =>
      frame.contentDocument.querySelector("#save-status").dataset.state !==
      "saving",
  );
  assert(
    frame.contentDocument.querySelector("#save-status").dataset.state ===
      "saved",
    "La sauvegarde n’a pas été confirmée.",
  );
}
async function reopen() {
  await saved();
  const old = frame;
  const next = old.cloneNode(false);
  const loaded = new Promise((resolve) =>
    next.addEventListener("load", resolve, { once: true }),
  );
  old.replaceWith(next);
  frame = next;
  await loaded;
  await waitUntil(
    () =>
      frame.contentDocument.querySelector("#editor-toggle") &&
      !frame.contentDocument.querySelector("#editor-toggle").disabled,
  );
}
document.querySelector("#run").addEventListener("click", async () => {
  const run = document.querySelector("#run");
  run.disabled = true;
  results.replaceChildren();
  await clearSaved();
  await reload();
  const doc = () => frame.contentDocument;
  const win = () => frame.contentWindow;
  const cards = () => [...doc().querySelectorAll(".post")];
  const ids = () => cards().map((p) => p.dataset.id);
  const toggle = () => doc().querySelector("#editor-toggle").click();
  const checkPin = () =>
    assert(
      cards()[0].dataset.id === "expertises" && !cards()[0].draggable,
      "Le post épinglé a bougé.",
    );
  function drag(from, to) {
    const source = cards()[from],
      target = cards()[to];
    const transfer = new (win().DataTransfer)();
    const start = new (win().DragEvent)("dragstart", {
      bubbles: true,
      cancelable: true,
      dataTransfer: transfer,
    });
    source.dispatchEvent(start);
    if (!start.defaultPrevented) {
      target.dispatchEvent(
        new (win().DragEvent)("dragover", {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        }),
      );
      target.dispatchEvent(
        new (win().DragEvent)("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        }),
      );
    }
    source.dispatchEvent(
      new (win().DragEvent)("dragend", {
        bubbles: true,
        dataTransfer: transfer,
      }),
    );
    return start;
  }
  async function files(paths, names) {
    const transfer = new (win().DataTransfer)();
    for (let i = 0; i < paths.length; i++) {
      const blob = await fetch(paths[i]).then((response) => response.blob());
      transfer.items.add(
        new (win().File)([blob], names[i], { type: blob.type }),
      );
    }
    return transfer;
  }
  function drop(transfer, target = doc().querySelector("#post-grid")) {
    target.dispatchEvent(
      new (win().DragEvent)("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      }),
    );
  }
  const tests = [
    [
      "Six vrais posts, stories non cliquables, mode aperçu verrouillé",
      async () => {
        assert(cards().length === 6, "Nombre de posts incorrect.");
        assert(
          doc().querySelectorAll(".stories .story").length === 8,
          "Stories manquantes.",
        );
        assert(
          !doc().querySelector(".post a,.story a"),
          "Lien cliquable présent.",
        );
        assert(
          cards().every((card) => !card.draggable),
          "Drag actif hors mode éditeur.",
        );
        assert(
          cards().every((card) => card.tabIndex === -1),
          "Post interactif hors mode éditeur.",
        );
        checkPin();
      },
    ],
    [
      "Échange de deux posts en mode éditeur",
      async () => {
        toggle();
        const before = ids();
        drag(1, 5);
        const after = ids();
        assert(
          after[1] === before[5] && after[5] === before[1],
          "Échange incorrect.",
        );
        assert(
          after[2] === before[2] && after[3] === before[3],
          "Les autres positions ont changé.",
        );
        checkPin();
      },
    ],
    [
      "L’épingle refuse le déplacement et les drops internes",
      async () => {
        const before = ids().join();
        assert(drag(0, 2).defaultPrevented, "Départ de drag épinglé accepté.");
        drag(1, 0);
        assert(
          ids().join() === before,
          "Le drop sur le post épinglé a changé l’ordre.",
        );
        checkPin();
      },
    ],
    [
      "Déplacement au clavier et annulation",
      async () => {
        const before = ids();
        cards()[1].focus();
        cards()[1].dispatchEvent(
          new (win().KeyboardEvent)("keydown", {
            key: "ArrowRight",
            bubbles: true,
            cancelable: true,
          }),
        );
        assert(ids()[2] === before[1], "Déplacement au clavier absent.");
        doc().querySelector("#undo").click();
        assert(ids().join() === before.join(), "Annulation incorrecte.");
        checkPin();
      },
    ],
    [
      "Import multiple par drop sur le post épinglé",
      async () => {
        drop(
          await files(
            ["../assets/posts/04-emoji.jpg", "../assets/posts/05-glace.jpg"],
            ["premier.jpg", "second.jpg"],
          ),
          cards()[0],
        );
        await waitUntil(() => cards().length === 8);
        assert(
          cards()[1].querySelector("img").alt === "premier.jpg",
          "Ordre du premier import incorrect.",
        );
        assert(
          cards()[2].querySelector("img").alt === "second.jpg",
          "Ordre du second import incorrect.",
        );
        assert(
          doc().querySelector("#publication-count").textContent === "543",
          "Compteur incorrect.",
        );
        checkPin();
      },
    ],
    [
      "Un faux post se déplace et peut être supprimé",
      async () => {
        const newId = ids()[1];
        drag(1, 5);
        assert(ids()[5] === newId, "Le faux post ne se déplace pas.");
        cards()[5].click();
        doc().querySelector("#remove-post").click();
        assert(
          cards().length === 7 && !ids().includes(newId),
          "Suppression du faux post incorrecte.",
        );
        checkPin();
      },
    ],
    [
      "Un original ne peut pas être supprimé",
      async () => {
        cards()
          .find((card) => card.dataset.id === "team")
          .click();
        assert(
          doc().querySelector("#remove-post").disabled,
          "Suppression originale autorisée.",
        );
        checkPin();
      },
    ],
    [
      "Fichier texte et faux JPEG rejetés",
      async () => {
        const before = cards().length;
        const transfer = new (win().DataTransfer)();
        transfer.items.add(
          new (win().File)(["texte"], "document.txt", { type: "text/plain" }),
        );
        drop(transfer);
        await waitUntil(() =>
          doc()
            .querySelector("#editor-status")
            .textContent.includes("format non pris en charge"),
        );
        const fake = new (win().DataTransfer)();
        fake.items.add(
          new (win().File)(["pas une image"], "faux.jpg", {
            type: "image/jpeg",
          }),
        );
        drop(fake);
        await waitUntil(() =>
          doc()
            .querySelector("#editor-status")
            .textContent.includes("pas une image valide"),
        );
        assert(cards().length === before, "Fichier invalide ajouté.");
        checkPin();
      },
    ],
    [
      "Le mode aperçu bloque réorganisation et import",
      async () => {
        toggle();
        const before = ids().join();
        drag(1, 3);
        drop(await files(["../assets/posts/04-emoji.jpg"], ["désactivé.jpg"]));
        await new Promise((resolve) => setTimeout(resolve, 100));
        assert(ids().join() === before, "Mutation hors mode éditeur.");
        assert(
          cards().every((card) => !card.draggable),
          "Drag actif hors mode éditeur.",
        );
        checkPin();
      },
    ],
    [
      "La sauvegarde restaure la composition sans activer l’éditeur",
      async () => {
        const before = ids().join();
        await saved();
        await reload();
        assert(
          ids().join() === before,
          "La composition sauvegardée est perdue.",
        );
        assert(
          doc().querySelector("#editor-toggle").getAttribute("aria-pressed") ===
            "false",
          "Éditeur activé au chargement.",
        );
        checkPin();
      },
    ],
    [
      "Réinitialisation et annulation restaurent correctement les images",
      async () => {
        toggle();
        const before = ids().join();
        doc().querySelector("#reset").click();
        assert(cards().length === 6, "Réinitialisation incorrecte.");
        doc().querySelector("#undo").click();
        assert(
          ids().join() === before,
          "Annulation de réinitialisation incorrecte.",
        );
        checkPin();
      },
    ],
    [
      "Désactivation pendant un import : aucune mutation tardive",
      async () => {
        const transfer = await files(
          ["../assets/posts/04-emoji.jpg"],
          ["annulé.jpg"],
        );
        const before = ids().join();
        drop(transfer);
        toggle();
        await new Promise((resolve) => setTimeout(resolve, 100));
        assert(ids().join() === before, "Import ajouté après désactivation.");
        checkPin();
      },
    ],
    [
      "Tous les visuels et icônes se chargent sans image cassée",
      async () => {
        await waitUntil(() => [...doc().images].every((img) => img.complete));
        assert(
          [...doc().images].every((img) => img.naturalWidth > 0),
          "Image cassée.",
        );
      },
    ],
    [
      "Les photos et leur ordre reviennent après fermeture et nouvelle ouverture",
      async () => {
        const before = cards().map((card) => ({
          id: card.dataset.id,
          src: card.querySelector("img").getAttribute("src"),
        }));
        assert(before.length > 6, "Aucune photo importée à contrôler.");
        await reopen();
        const after = cards().map((card) => ({
          id: card.dataset.id,
          src: card.querySelector("img").getAttribute("src"),
        }));
        assert(
          JSON.stringify(before) === JSON.stringify(after),
          "Photo ou position perdue après fermeture.",
        );
        checkPin();
      },
    ],
    [
      "Les anciennes sauvegardes sont migrées avec leurs images",
      async () => {
        const image = await fetch("../assets/posts/04-emoji.jpg").then(
          (response) => response.blob(),
        );
        const src = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(image);
        });
        const legacy = win().FeedModel.fresh();
        [legacy[1], legacy[5]] = [legacy[5], legacy[1]];
        legacy.splice(1, 0, {
          id: "upload-migration",
          src,
          alt: "ancienne-photo.jpg",
          uploaded: true,
        });
        await clearSaved();
        localStorage.setItem(storageKey, JSON.stringify(legacy));
        await reload();
        await saved();
        assert(
          ids().join() === legacy.map((post) => post.id).join(),
          "Ancien ordre perdu pendant la migration.",
        );
        assert(
          cards()[1].querySelector("img").getAttribute("src") === src,
          "Ancienne photo perdue pendant la migration.",
        );
        assert(
          localStorage.getItem(storageKey) === null,
          "Ancienne copie non remplacée après migration.",
        );
        await reopen();
        assert(
          ids()[1] === "upload-migration",
          "La migration ne survit pas à la fermeture.",
        );
        checkPin();
      },
    ],
    [
      "Une image de plus de 5 Mo est sauvegardée et restaurée",
      async () => {
        toggle();
        const bytes = new Uint8Array(6 * 1024 * 1024);
        bytes.set(
          Uint8Array.from(
            atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
            (char) => char.charCodeAt(0),
          ),
        );
        const transfer = new (win().DataTransfer)();
        transfer.items.add(
          new (win().File)([bytes], "photo-volumineuse.gif", {
            type: "image/gif",
          }),
        );
        const count = cards().length;
        drop(transfer);
        await waitUntil(() => cards().length === count + 1);
        await saved();
        const id = ids()[1];
        assert(
          cards()[1].querySelector("img").getAttribute("src").length >
            5 * 1024 * 1024,
          "Le test n’excède pas la petite capacité du stockage précédent.",
        );
        drag(1, cards().length - 1);
        await reopen();
        assert(
          ids().at(-1) === id,
          "L’image volumineuse ou sa position n’a pas été restaurée.",
        );
        await waitUntil(() => cards().at(-1).querySelector("img").complete);
        assert(
          cards().at(-1).querySelector("img").naturalWidth === 1,
          "L’image restaurée est cassée.",
        );
        checkPin();
      },
    ],
    [
      "Plusieurs sauvegardes rapides conservent la dernière composition",
      async () => {
        toggle();
        for (let i = 0; i < 12; i++) drag(1, 2 + (i % 4));
        const latest = ids().join();
        await reopen();
        assert(
          ids().join() === latest,
          "Une sauvegarde ancienne a remplacé la dernière composition.",
        );
        checkPin();
      },
    ],
    [
      "Un échec de sauvegarde est affiché et peut être réessayé",
      async () => {
        toggle();
        const prototype = win().IDBDatabase.prototype;
        const transaction = prototype.transaction;
        try {
          prototype.transaction = function (...args) {
            const tx = transaction.apply(this, args);
            if (args[1] === "readwrite") tx.abort();
            return tx;
          };
          drag(1, 2);
          await waitUntil(
            () => doc().querySelector("#save-status").dataset.state === "error",
          );
          assert(
            !doc().querySelector("#retry-save").hidden,
            "Bouton de nouvelle tentative absent.",
          );
        } finally {
          prototype.transaction = transaction;
        }
        const latest = ids().join();
        doc().querySelector("#retry-save").click();
        await saved();
        await reopen();
        assert(
          ids().join() === latest,
          "La nouvelle tentative a perdu les modifications.",
        );
        checkPin();
      },
    ],
    [
      "La réinitialisation enregistrée ne fait pas revenir les anciens ajouts",
      async () => {
        toggle();
        doc().querySelector("#reset").click();
        await reopen();
        assert(
          cards().length === 6 &&
            doc().querySelector("#publication-count").textContent === "541",
          "Les anciennes photos sont revenues après réinitialisation.",
        );
        checkPin();
      },
    ],
    [
      "Le repli sur une sauvegarde simple fonctionne sans IndexedDB",
      async () => {
        const window = win();
        const descriptor = Object.getOwnPropertyDescriptor(window, "indexedDB");
        try {
          Object.defineProperty(window, "indexedDB", {
            value: undefined,
            configurable: true,
          });
          const storage = window.FeedStorage.create({ sandbox: true });
          const loaded = await storage.load();
          assert(loaded.backend === "localStorage", "Repli indisponible.");
          await storage.save(window.FeedModel.fresh());
          const restored = await window.FeedStorage.create({
            sandbox: true,
          }).load();
          assert(
            restored.posts.length === 6,
            "Le repli ne conserve pas la composition.",
          );
        } finally {
          if (descriptor)
            Object.defineProperty(window, "indexedDB", descriptor);
          else delete window.indexedDB;
          localStorage.removeItem(storageKey);
        }
      },
    ],
  ];
  let failed = 0;
  for (const [name, fn] of tests) {
    const item = document.createElement("li");
    try {
      await fn();
      await saved();
      item.textContent = `PASS — ${name}`;
      item.className = "pass";
    } catch (error) {
      failed++;
      item.textContent = `FAIL — ${name} : ${error.message}`;
      item.className = "fail";
    }
    results.append(item);
  }
  await clearSaved();
  await reload();
  result.textContent = `${tests.length - failed}/${tests.length} tests réussis · ${failed} échec(s).`;
  result.dataset.failures = String(failed);
  run.disabled = false;
});
