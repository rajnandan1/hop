'use strict';

const fs = require('fs');
const { normalizeSlug, validateSlug, generateSlug } = require('./slug');
const { validateTarget } = require('./url');

// urls.json is the single source of truth (ADR-0001). Shape: an object keyed by
// slug for O(1) collision checks:
//   { "raj": { url, issue, createdBy, createdAt, updatedAt } }

function loadStore(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
  raw = raw.trim();
  if (!raw) return {};
  const data = JSON.parse(raw);
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}

function saveStore(file, store) {
  // Sort keys by createdAt (then slug) so diffs stay stable and readable.
  const ordered = {};
  const slugs = Object.keys(store).sort((a, b) => {
    const ca = store[a].createdAt || '';
    const cb = store[b].createdAt || '';
    return ca === cb ? a.localeCompare(b) : ca.localeCompare(cb);
  });
  for (const slug of slugs) ordered[slug] = store[slug];
  fs.writeFileSync(file, JSON.stringify(ordered, null, 2) + '\n');
}

function fail(message) {
  return { ok: false, message };
}

// Create a Link. Returns { ok, store, slug, op } or { ok:false, message }.
// Never mutates the input store.
function applyNew(store, { slugInput, url, issue, createdBy, now, rng } = {}) {
  const target = validateTarget(url);
  if (!target.ok) return fail(target.message);

  let slug;
  const requested = normalizeSlug(slugInput);
  if (requested) {
    const check = validateSlug(requested);
    if (!check.ok) return fail(check.message);
    if (store[requested]) return fail(`The slug \`${requested}\` is already taken. Pick another.`);
    slug = requested;
  } else {
    slug = generateSlug(store, rng);
  }

  const next = {
    ...store,
    [slug]: { url: target.url, issue, createdBy, createdAt: now, updatedAt: now },
  };
  return { ok: true, store: next, slug, op: 'new' };
}

// Change an existing Link's Target URL.
function applyEdit(store, { slugInput, url, now } = {}) {
  const slug = normalizeSlug(slugInput);
  if (!slug) return fail('A slug is required.');
  if (!store[slug]) return fail(`No link with slug \`${slug}\` exists.`);

  const target = validateTarget(url);
  if (!target.ok) return fail(target.message);

  const next = {
    ...store,
    [slug]: { ...store[slug], url: target.url, updatedAt: now },
  };
  return { ok: true, store: next, slug, op: 'edit' };
}

// Remove a Link.
function applyDelete(store, { slugInput } = {}) {
  const slug = normalizeSlug(slugInput);
  if (!slug) return fail('A slug is required.');
  if (!store[slug]) return fail(`No link with slug \`${slug}\` exists.`);

  const next = { ...store };
  delete next[slug];
  return { ok: true, store: next, slug, op: 'delete' };
}

module.exports = { loadStore, saveStore, applyNew, applyEdit, applyDelete };
