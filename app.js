(function () {
  "use strict";
  const model = window.FeedModel;
  const params = new URLSearchParams(window.location.search);
  const storage = window.FeedStorage.create({
    sandbox: params.get("sandbox") === "1",
  });
  const grid = document.querySelector("#post-grid");
  const toggle = document.querySelector("#editor-toggle");
  const controls = document.querySelector("#editor-controls");
  const input = document.querySelector("#image-input");
  const uploadZone = document.querySelector("#upload-zone");
  const status = document.querySelector("#editor-status");
  const selectionLabel = document.querySelector("#selection-label");
  const backButton = document.querySelector("#move-back");
  const nextButton = document.querySelector("#move-next");
  const removeButton = document.querySelector("#remove-post");
  const undoButton = document.querySelector("#undo");
  const saveNote = document.querySelector(".save-note");
  const retrySave = document.querySelector("#retry-save");
  let saveVersion = 0;
  let dirty = false;
  let ready = false;
  let posts = model.fresh();
  let editing = false;
  let selectedId = null;
  let draggedId = null;
  let touchDrag = null;
  let importGeneration = 0;
  let importQueue = Promise.resolve();
  const history = [];
  if (new URLSearchParams(window.location.search).get("view") === "reference")
    document.body.classList.add("reference-view");
  function announce(message, error = false) {
    status.textContent = message;
    status.classList.toggle("error", error);
  }
  function savedNote(backend) {
    retrySave.textContent = "Réessayer la sauvegarde";
    saveNote.dataset.state = "saved";
    saveNote.textContent =
      backend === "indexeddb"
        ? "Photos et composition enregistrées. Vous les retrouverez à la prochaine ouverture dans ce navigateur."
        : "Composition enregistrée dans ce navigateur. Le stockage des photos est limité ici.";
    retrySave.hidden = true;
  }
  function save() {
    const version = ++saveVersion;
    dirty = true;
    saveNote.dataset.state = "saving";
    saveNote.textContent = "Enregistrement des photos et de la composition…";
    retrySave.hidden = true;
    return storage
      .save(posts)
      .then((result) => {
        if (version !== saveVersion) return;
        dirty = false;
        savedNote(result.backend);
      })
      .catch(() => {
        if (version !== saveVersion) return;
        saveNote.dataset.state = "error";
        saveNote.textContent =
          "Sauvegarde impossible. Gardez cette page ouverte et réessayez pour conserver vos modifications.";
        retrySave.hidden = false;
        announce(
          "Vos dernières modifications n’ont pas encore pu être enregistrées.",
          true,
        );
      });
  }
  retrySave.addEventListener("click", () =>
    ready ? save() : loadComposition(),
  );
  window.addEventListener("beforeunload", (event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
  function icon(name, className = "") {
    const image = document.createElement("img");
    image.src = `assets/icons/${name}.svg`;
    image.alt = "";
    image.draggable = false;
    image.className = className;
    return image;
  }
  function updateControls() {
    const index = posts.findIndex((p) => p.id === selectedId);
    const post = posts[index];
    selectionLabel.textContent =
      index > 0
        ? `Post ${index + 1} sur ${posts.length} sélectionné.`
        : "Sélectionnez un post pour le déplacer.";
    backButton.disabled = !editing || index <= 1;
    nextButton.disabled = !editing || index < 1 || index >= posts.length - 1;
    removeButton.disabled = !editing || !post?.uploaded;
    undoButton.disabled = history.length === 0;
    grid
      .querySelectorAll(".post")
      .forEach((card) =>
        card.classList.toggle(
          "selected",
          editing && card.dataset.id === selectedId,
        ),
      );
  }
  function render() {
    const activeId = document.activeElement?.closest(".post")?.dataset.id;
    const fragment = document.createDocumentFragment();
    for (const post of posts) {
      const card = document.createElement("figure");
      card.className = "post";
      card.dataset.id = post.id;
      card.dataset.pinned = String(Boolean(post.pinned));
      card.draggable = editing && !post.pinned;
      if (editing && !post.pinned) {
        card.tabIndex = 0;
        card.setAttribute(
          "aria-label",
          `${post.alt}. Utilisez les flèches pour déplacer ce post.`,
        );
      }
      const image = document.createElement("img");
      image.src = post.src;
      image.alt = post.alt;
      image.width = 480;
      image.height = 640;
      image.draggable = false;
      image.decoding = "async";
      card.append(image);
      if (post.pinned) {
        const badge = icon("pin-filled", "post-badge pinned");
        badge.alt = "Publication épinglée — position verrouillée";
        card.append(badge);
        card.title = "Post épinglé : cette position est verrouillée.";
      } else if (post.carousel) {
        const badge = icon("carousel", "post-badge");
        badge.alt = "Carrousel";
        card.append(badge);
      }
      const hover = document.createElement("div");
      hover.className = "post-hover";
      hover.setAttribute("aria-hidden", "true");
      hover.append(icon("heart-filled"), icon("message-circle-filled"));
      card.append(hover);
      if (!post.pinned) {
        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "drag-handle";
        handle.setAttribute("aria-label", `Déplacer le post ${post.alt}`);
        handle.tabIndex = -1;
        handle.append(icon("grid-dots"));
        card.append(handle);
      }
      fragment.append(card);
    }
    grid.replaceChildren(fragment);
    grid.setAttribute("aria-label", `${posts.length} publications du feed`);
    document.querySelector("#publication-count").textContent =
      541 + posts.filter((p) => p.uploaded).length;
    updateControls();
    if (activeId && editing)
      grid
        .querySelector(`[data-id="${CSS.escape(activeId)}"]`)
        ?.focus({ preventScroll: true });
  }
  function commit(nextPosts, message) {
    if (!editing || nextPosts === posts) return;
    history.push(posts);
    if (history.length > 30) history.shift();
    posts = nextPosts;
    save();
    render();
    announce(message);
  }
  function swap(sourceId, targetId) {
    commit(
      model.swap(posts, sourceId, targetId),
      "Positions échangées. Le post épinglé reste en place.",
    );
  }
  function clearDrag() {
    draggedId = null;
    grid.classList.remove("file-over");
    uploadZone.classList.remove("file-over");
    grid
      .querySelectorAll(".drop-target,.dragging")
      .forEach((card) => card.classList.remove("drop-target", "dragging"));
    if (touchDrag) {
      touchDrag.ghost?.remove();
      touchDrag = null;
    }
  }
  toggle.addEventListener("click", () => {
    editing = !editing;
    importGeneration++;
    selectedId = null;
    clearDrag();
    document.body.classList.toggle("editing", editing);
    toggle.setAttribute("aria-pressed", String(editing));
    controls.hidden = !editing;
    input.disabled = !editing;
    announce(editing ? "Mode éditeur activé." : "Mode aperçu activé.");
    render();
  });
  grid.addEventListener("click", (event) => {
    if (!editing) return;
    const card = event.target.closest(".post");
    if (!card || card.dataset.pinned === "true") return;
    selectedId = card.dataset.id;
    updateControls();
  });
  grid.addEventListener("focusin", (event) => {
    const card = event.target.closest(".post");
    if (editing && card?.dataset.pinned !== "true") {
      selectedId = card?.dataset.id || null;
      updateControls();
    }
  });
  function moveSelected(step) {
    const index = posts.findIndex((p) => p.id === selectedId);
    const target = posts[index + step];
    if (editing && index > 0 && target && !target.pinned)
      swap(selectedId, target.id);
  }
  grid.addEventListener("keydown", (event) => {
    if (!editing || event.target.closest(".post")?.dataset.pinned === "true")
      return;
    const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };
    if (Object.hasOwn(steps, event.key)) {
      event.preventDefault();
      moveSelected(steps[event.key]);
    } else if (event.key === "Escape") {
      clearDrag();
      selectedId = null;
      updateControls();
    }
  });
  backButton.addEventListener("click", () => moveSelected(-1));
  nextButton.addEventListener("click", () => moveSelected(1));
  removeButton.addEventListener("click", () => {
    const next = model.remove(posts, selectedId);
    if (next !== posts) {
      selectedId = null;
      commit(next, "Faux post supprimé.");
    }
  });
  undoButton.addEventListener("click", () => {
    if (!editing || !history.length) return;
    posts = history.pop();
    selectedId = null;
    save();
    render();
    announce("Dernière modification annulée.");
  });
  document.querySelector("#reset").addEventListener("click", () => {
    if (!editing) return;
    importGeneration++;
    selectedId = null;
    clearDrag();
    commit(
      model.fresh(),
      "Les six publications d’origine sont restaurées. Vous pouvez annuler cette action.",
    );
  });
  grid.addEventListener("dragstart", (event) => {
    const card = event.target.closest(".post");
    if (!editing || !card || card.dataset.pinned === "true") {
      event.preventDefault();
      return;
    }
    draggedId = card.dataset.id;
    selectedId = draggedId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-anekdote-post", draggedId);
    event.dataTransfer.setData("text/plain", draggedId);
    card.classList.add("dragging");
    updateControls();
  });
  const hasFiles = (event) =>
    Array.from(event.dataTransfer?.types || []).includes("Files");
  grid.addEventListener("dragover", (event) => {
    if (!editing) return;
    if (hasFiles(event)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      grid.classList.add("file-over");
    } else if (draggedId) {
      event.preventDefault();
      const card = event.target.closest(".post");
      const movable =
        card && card.dataset.pinned !== "true" && card.dataset.id !== draggedId;
      event.dataTransfer.dropEffect = movable ? "move" : "none";
      grid
        .querySelectorAll(".drop-target")
        .forEach((el) => el.classList.remove("drop-target"));
      if (movable) card.classList.add("drop-target");
    }
  });
  grid.addEventListener("dragleave", (event) => {
    if (!grid.contains(event.relatedTarget)) grid.classList.remove("file-over");
  });
  grid.addEventListener("drop", (event) => {
    event.preventDefault();
    if (!editing) return;
    if (event.dataTransfer.files.length)
      enqueueImport(event.dataTransfer.files);
    else if (draggedId) {
      const card = event.target.closest(".post");
      if (card) swap(draggedId, card.dataset.id);
    }
    clearDrag();
  });
  grid.addEventListener("dragend", clearDrag);
  // File drops never navigate away from the preview, including outside editor mode.
  window.addEventListener("dragover", (event) => {
    if (hasFiles(event)) event.preventDefault();
  });
  window.addEventListener("drop", (event) => {
    if (hasFiles(event)) {
      event.preventDefault();
      clearDrag();
    }
  });
  uploadZone.addEventListener("dragover", (event) => {
    if (editing && hasFiles(event)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      uploadZone.classList.add("file-over");
    }
  });
  uploadZone.addEventListener("dragleave", () =>
    uploadZone.classList.remove("file-over"),
  );
  uploadZone.addEventListener("drop", (event) => {
    event.preventDefault();
    if (editing) enqueueImport(event.dataTransfer.files);
    clearDrag();
  });
  input.addEventListener("change", () => {
    enqueueImport(input.files);
    input.value = "";
  });
  input.addEventListener("focus", () => uploadZone.classList.add("file-over"));
  input.addEventListener("blur", () =>
    uploadZone.classList.remove("file-over"),
  );
  function dataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Lecture impossible."));
      reader.readAsDataURL(file);
    });
  }
  async function prepareImage(file) {
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.type,
      )
    )
      throw new Error(`${file.name} : format non pris en charge.`);
    if (file.size > 15 * 1024 * 1024)
      throw new Error(`${file.name} : limite de 15 Mo dépassée.`);
    const objectURL = URL.createObjectURL(file);
    const image = new Image();
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () =>
          reject(
            new Error(`${file.name} : ce fichier n’est pas une image valide.`),
          );
        image.src = objectURL;
      });
      if (!image.naturalWidth || !image.naturalHeight)
        throw new Error(`${file.name} : image illisible.`);
      if (file.type === "image/gif") return await dataURL(file);
      const factor = Math.min(
        1,
        1600 / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * factor));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * factor));
      canvas
        .getContext("2d")
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/webp", 0.92);
    } finally {
      URL.revokeObjectURL(objectURL);
    }
  }
  function enqueueImport(files) {
    if (!editing || !files?.length) return;
    const batch = Array.from(files);
    const generation = importGeneration;
    importQueue = importQueue
      .then(async () => {
        if (!editing || generation !== importGeneration) return;
        announce("Préparation des images…");
        const additions = [];
        const errors = [];
        for (const file of batch.slice(0, 20)) {
          if (posts.length + additions.length >= 100) {
            errors.push("Limite de 100 posts atteinte.");
            break;
          }
          try {
            const src = await prepareImage(file);
            additions.push({
              id: `upload-${crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2)}`,
              src,
              alt: file.name,
            });
          } catch (error) {
            errors.push(error.message);
          }
        }
        if (batch.length > 20)
          errors.push("Importez au maximum 20 images à la fois.");
        if (!editing || generation !== importGeneration) return;
        if (additions.length) {
          selectedId = additions[0].id;
          commit(
            model.insert(posts, additions),
            `${additions.length} nouveau${additions.length > 1 ? "x" : ""} post${additions.length > 1 ? "s" : ""} ajouté${additions.length > 1 ? "s" : ""} après le post épinglé.`,
          );
        }
        if (errors.length)
          announce(
            `${additions.length ? `${additions.length} image(s) ajoutée(s). ` : ""}${errors.join(" ")}`,
            true,
          );
      })
      .catch(() =>
        announce("L’import a échoué. Réessayez avec une autre image.", true),
      );
  }
  // Touch devices drag from the handle so ordinary scrolling still works.
  grid.addEventListener("pointerdown", (event) => {
    if (
      !editing ||
      event.pointerType === "mouse" ||
      !event.target.closest(".drag-handle")
    )
      return;
    const handle = event.target.closest(".drag-handle");
    const card = handle.closest(".post");
    if (card.dataset.pinned === "true") return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    selectedId = card.dataset.id;
    touchDrag = {
      id: selectedId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      ghost: null,
    };
    updateControls();
  });
  grid.addEventListener("pointermove", (event) => {
    if (!touchDrag || event.pointerId !== touchDrag.pointerId || !editing)
      return;
    event.preventDefault();
    if (
      !touchDrag.ghost &&
      Math.hypot(
        event.clientX - touchDrag.startX,
        event.clientY - touchDrag.startY,
      ) < 6
    )
      return;
    if (!touchDrag.ghost) {
      touchDrag.ghost = document.createElement("img");
      touchDrag.ghost.src = posts.find((p) => p.id === touchDrag.id).src;
      touchDrag.ghost.className = "touch-ghost";
      touchDrag.ghost.alt = "";
      document.body.append(touchDrag.ghost);
    }
    touchDrag.ghost.style.left = `${event.clientX}px`;
    touchDrag.ghost.style.top = `${event.clientY}px`;
    const card = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest(".post");
    grid
      .querySelectorAll(".drop-target")
      .forEach((el) => el.classList.remove("drop-target"));
    if (
      card &&
      card.dataset.pinned !== "true" &&
      card.dataset.id !== touchDrag.id
    )
      card.classList.add("drop-target");
    const scroller = document.querySelector(".phone-scroll");
    const bounds = scroller.getBoundingClientRect();
    if (event.clientY > bounds.bottom - 36) scroller.scrollTop += 12;
    else if (event.clientY < bounds.top + 36) scroller.scrollTop -= 12;
  });
  grid.addEventListener("pointerup", (event) => {
    if (!touchDrag || event.pointerId !== touchDrag.pointerId) return;
    const id = touchDrag.id;
    const moved = Boolean(touchDrag.ghost);
    const card = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest(".post");
    clearDrag();
    if (editing && moved && card) swap(id, card.dataset.id);
  });
  grid.addEventListener("pointercancel", clearDrag);
  window.addEventListener("blur", clearDrag);
  input.disabled = true;
  toggle.disabled = true;
  grid.setAttribute("aria-busy", "true");
  saveNote.dataset.state = "loading";
  render();
  function loadComposition() {
    toggle.disabled = true;
    retrySave.hidden = true;
    grid.setAttribute("aria-busy", "true");
    return storage
      .load()
      .then(async (result) => {
        if (result.posts) posts = model.restore(result.posts);
        render();
        ready = true;
        if (result.posts) announce("Votre composition a été restaurée.");
        if (result.migrate) await save();
        else if (result.backend === "memory") {
          saveNote.dataset.state = "error";
          saveNote.textContent =
            "Le stockage est indisponible. Gardez cette page ouverte pour conserver vos modifications.";
          announce(
            "Le navigateur ne permet pas de sauvegarder votre composition.",
            true,
          );
          retrySave.hidden = false;
        } else savedNote(result.backend);
        toggle.disabled = false;
      })
      .catch(() => {
        saveNote.dataset.state = "error";
        saveNote.textContent =
          "Impossible de charger votre sauvegarde. Réessayez pour retrouver vos photos.";
        announce(
          "Votre sauvegarde n’a pas pu être chargée. Elle n’a pas été remplacée.",
          true,
        );
        retrySave.textContent = "Réessayer le chargement";
        retrySave.hidden = false;
      })
      .finally(() => grid.setAttribute("aria-busy", "false"));
  }
  loadComposition();
})();
