'use strict';

// Slugs are lowercase to remove case as a footgun — GitHub Pages serves literal
// paths, so /Raj and /raj would otherwise be different Links. See ADR-0001 / CONTEXT.md.
const SLUG_PATTERN = /^[a-z0-9-]+$/;
const MAX_SLUG_LENGTH = 64;
const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'; // base36
const AUTO_SLUG_LENGTH = 6;

// Slugs that would shadow generated infrastructure or the data file itself.
const RESERVED_SLUGS = new Set([
  'assets',
  'api',
  '404',
  'index',
  'readme',
  'robots.txt',
  'sitemap.xml',
  '.github',
  'cname',
  'urls.json',
]);

function normalizeSlug(input) {
  return String(input == null ? '' : input).trim().toLowerCase();
}

function validateSlug(slug) {
  if (!slug) {
    return { ok: false, message: 'A slug is required.' };
  }
  if (slug.length > MAX_SLUG_LENGTH) {
    return { ok: false, message: `Slug must be ${MAX_SLUG_LENGTH} characters or fewer.` };
  }
  if (!SLUG_PATTERN.test(slug)) {
    return { ok: false, message: 'Slug may only contain lowercase letters, numbers, and hyphens.' };
  }
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { ok: false, message: 'Slug cannot start or end with a hyphen.' };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, message: `\`${slug}\` is a reserved slug and cannot be used.` };
  }
  return { ok: true };
}

// rng must return a float in [0, 1). Injectable so tests are deterministic.
function generateSlug(taken, rng = Math.random, length = AUTO_SLUG_LENGTH) {
  const isTaken = typeof taken === 'function' ? taken : (s) => Boolean(taken && taken[s]);
  for (let attempt = 0; attempt < 1000; attempt++) {
    let slug = '';
    for (let i = 0; i < length; i++) {
      slug += SLUG_ALPHABET[Math.floor(rng() * SLUG_ALPHABET.length)];
    }
    if (!isTaken(slug) && validateSlug(slug).ok) {
      return slug;
    }
  }
  throw new Error('Could not generate a unique slug after 1000 attempts.');
}

module.exports = {
  RESERVED_SLUGS,
  MAX_SLUG_LENGTH,
  normalizeSlug,
  validateSlug,
  generateSlug,
};
