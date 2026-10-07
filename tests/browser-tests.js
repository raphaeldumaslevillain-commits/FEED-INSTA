const frame = document.querySelector("#app");
const result = document.querySelector("#result");
const results = document.querySelector("#results");
const storageKey = "anekdote-feed-sandbox-v1";
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const waitUntil = async (predicate) => {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    if (Date.now() > deadline)
      throw new Error("État attendu absent après 5 secondes.");
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
    () => frame.contentDocument.querySelectorAll(".post").length >= 6,
  );
}
document.querySelector("#run").addEventListener("click", async () => {
  const run = document.querySelector("#run");
  run.disabled = true;
  results.replaceChildren();
  localStorage.removeItem(storageKey);
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
  ];
  let failed = 0;
  for (const [name, fn] of tests) {
    const item = document.createElement("li");
    try {
      await fn();
      item.textContent = `PASS — ${name}`;
      item.className = "pass";
    } catch (error) {
      failed++;
      item.textContent = `FAIL — ${name} : ${error.message}`;
      item.className = "fail";
    }
    results.append(item);
  }
  localStorage.removeItem(storageKey);
  await reload();
  result.textContent = `${tests.length - failed}/${tests.length} tests réussis · ${failed} échec(s).`;
  result.dataset.failures = String(failed);
  run.disabled = false;
});
