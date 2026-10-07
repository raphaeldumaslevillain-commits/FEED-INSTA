/* Shared state rules: every mutation preserves the source pinned post. */
(function (root, factory) {
  const model = factory();
  if (typeof module === "object" && module.exports) module.exports = model;
  else root.FeedModel = model;
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";
  const initialPosts = Object.freeze(
    [
      {
        id: "expertises",
        src: "assets/posts/01-expertises.jpg",
        alt: "Nos expertises — campagne d’influence, stratégie, événements, UGC, gifting, performance et affiliation",
        pinned: true,
        carousel: false,
      },
      {
        id: "activations",
        src: "assets/posts/02-activations.jpg",
        alt: "Récap des plus belles activations de ce début d’année",
        carousel: true,
      },
      {
        id: "mots-fleches",
        src: "assets/posts/03-mots-fleches.jpg",
        alt: "Les Mots Fléchés by Anekdote — parasols orange",
        carousel: true,
      },
      {
        id: "emoji",
        src: "assets/posts/04-emoji.jpg",
        alt: "L’émoji qu’on a vs l’émoji qu’on mérite",
        carousel: true,
      },
      {
        id: "glace",
        src: "assets/posts/05-glace.jpg",
        alt: "Glace orange Anekdote sous les palmiers",
        carousel: false,
      },
      {
        id: "team",
        src: "assets/posts/06-team.jpg",
        alt: "Une membre de l’équipe Anekdote au travail",
        carousel: true,
      },
    ].map(Object.freeze),
  );
  const fresh = () => initialPosts.map((post) => ({ ...post }));
  function swap(posts, sourceId, targetId) {
    const from = posts.findIndex((p) => p.id === sourceId);
    const to = posts.findIndex((p) => p.id === targetId);
    if (from < 1 || to < 1 || from === to) return posts;
    const next = posts.slice();
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  }
  function insert(posts, additions) {
    const ids = new Set(posts.map((p) => p.id));
    const valid = additions
      .filter(
        (p) =>
          p &&
          typeof p.id === "string" &&
          p.id &&
          typeof p.src === "string" &&
          p.src.startsWith("data:image/") &&
          !ids.has(p.id) &&
          ids.add(p.id),
      )
      .map((p) => ({
        id: p.id,
        src: p.src,
        alt: String(p.alt || "Nouveau post"),
        uploaded: true,
        pinned: false,
        carousel: false,
      }));
    return valid.length ? [posts[0], ...valid, ...posts.slice(1)] : posts;
  }
  function remove(posts, id) {
    const post = posts.find((p) => p.id === id);
    return post?.uploaded && !post.pinned
      ? posts.filter((p) => p.id !== id)
      : posts;
  }
  function restore(value) {
    if (!Array.isArray(value) || value.length > 100) return fresh();
    const originals = new Map(initialPosts.map((p) => [p.id, p]));
    const seen = new Set(["expertises"]);
    const restored = [{ ...initialPosts[0] }];
    for (const item of value) {
      if (!item || seen.has(item.id)) continue;
      if (originals.has(item.id)) restored.push({ ...originals.get(item.id) });
      else if (
        typeof item.id === "string" &&
        item.id.startsWith("upload-") &&
        typeof item.src === "string" &&
        /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(
          item.src,
        )
      ) {
        restored.push({
          id: item.id,
          src: item.src,
          alt: String(item.alt || "Nouveau post").slice(0, 200),
          uploaded: true,
          pinned: false,
          carousel: false,
        });
      } else continue;
      seen.add(item.id);
    }
    // A stale or corrupted saved composition cannot drop source posts.
    for (const original of initialPosts.slice(1))
      if (!seen.has(original.id)) restored.push({ ...original });
    return restored;
  }
  return Object.freeze({ initialPosts, fresh, swap, insert, remove, restore });
});
