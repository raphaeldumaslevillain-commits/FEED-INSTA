const test = require("node:test");
const assert = require("node:assert/strict");
const model = require("../model.js");
const upload = (id) => ({
  id: `upload-${id}`,
  src: "data:image/png;base64,YWJj",
  alt: `${id}.png`,
});
test("an exchange preserves the exact slot of all unrelated posts", () => {
  const before = model.fresh();
  const after = model.swap(before, "activations", "team");
  assert.deepEqual(
    after.map((p) => p.id),
    ["expertises", "team", "mots-fleches", "emoji", "glace", "activations"],
  );
  assert.equal(before[1].id, "activations");
  assert.equal(after[0], before[0]);
});
test("the pinned post cannot be a source or a target", () => {
  const posts = model.fresh();
  for (const post of posts) {
    assert.equal(model.swap(posts, "expertises", post.id), posts);
    assert.equal(model.swap(posts, post.id, "expertises"), posts);
  }
  assert.equal(model.swap(posts, "missing", "team"), posts);
});
test("multiple uploads insert after the pin and preserve supplied order", () => {
  const before = model.fresh();
  const after = model.insert(before, [upload("a"), upload("b")]);
  assert.deepEqual(
    after.map((p) => p.id),
    ["expertises", "upload-a", "upload-b", ...before.slice(1).map((p) => p.id)],
  );
  assert.equal(after[0], before[0]);
  assert.equal(after[1].uploaded, true);
  assert.equal(before.length, 6);
});
test("untrusted additions cannot replace the pinned post or duplicate an id", () => {
  const before = model.fresh();
  const after = model.insert(before, [
    { ...upload("a"), id: "expertises", pinned: true },
    upload("a"),
    upload("a"),
    null,
    { id: "external", src: "https://example.com/file.png" },
  ]);
  assert.equal(after.length, 7);
  assert.equal(after[0].id, "expertises");
  assert.equal(after[1].pinned, false);
});
test("only uploaded posts can be deleted", () => {
  const posts = model.insert(model.fresh(), [upload("a")]);
  assert.equal(model.remove(posts, "expertises"), posts);
  assert.equal(model.remove(posts, "team"), posts);
  assert.equal(model.remove(posts, "missing"), posts);
  assert.equal(model.remove(posts, "upload-a").length, 6);
});
test("restore enforces the original pin, sources and metadata", () => {
  const saved = [
    { id: "team", src: "https://malicious.invalid", pinned: true },
    upload("a"),
    { id: "expertises", src: "fake" },
    upload("a"),
  ];
  const restored = model.restore(saved);
  assert.equal(restored[0].id, "expertises");
  assert.equal(restored[0].src, model.initialPosts[0].src);
  assert.equal(restored[1].id, "team");
  assert.equal(restored[1].pinned, undefined);
  assert.equal(restored.filter((p) => p.id === "upload-a").length, 1);
  assert.equal(restored.length, 7);
  assert.equal(restored.filter((p) => p.pinned).length, 1);
});
test("restore rejects unsafe image sources and recovers from invalid state", () => {
  assert.equal(model.restore(null).length, 6);
  assert.equal(model.restore("invalid").length, 6);
  assert.equal(model.restore(Array(101).fill(upload("x"))).length, 6);
  const unsafe = [
    { id: "upload-svg", src: "data:image/svg+xml;base64,YWJj" },
    { id: "upload-script", src: "javascript:alert(1)" },
    { id: "unknown", src: "data:image/png;base64,YWJj" },
  ];
  assert.deepEqual(model.restore(unsafe), model.fresh());
});
test("long sequences of exchanges and insertions keep the invariant", () => {
  let posts = model.fresh();
  for (let i = 0; i < 30; i++) {
    posts = model.insert(posts, [upload(String(i))]);
    posts = model.swap(posts, posts[1].id, posts[posts.length - 1].id);
    posts = model.restore(JSON.parse(JSON.stringify(posts)));
    assert.equal(posts[0].id, "expertises");
    assert.equal(posts.filter((p) => p.pinned).length, 1);
    assert.equal(new Set(posts.map((p) => p.id)).size, posts.length);
  }
});
