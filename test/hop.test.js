'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { normalizeSlug, validateSlug, generateSlug } = require('../scripts/lib/slug');
const { validateTarget } = require('../scripts/lib/url');
const { applyNew, applyEdit, applyDelete } = require('../scripts/lib/store');
const { parseIssueForm } = require('../scripts/lib/parse-issue');
const {
  deriveBaseUrl,
  renderRedirectPage,
  renderReadmeBlock,
  applyReadmeBlock,
  README_START,
  README_END,
} = require('../scripts/lib/render');

const NOW = '2026-06-14T10:00:00.000Z';

// A deterministic rng cycling through fixed values, for stable slug generation.
function seededRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

// --- slug ------------------------------------------------------------------

test('normalizeSlug lowercases and trims', () => {
  assert.equal(normalizeSlug('  MyLink '), 'mylink');
  assert.equal(normalizeSlug(null), '');
});

test('validateSlug accepts a clean slug', () => {
  assert.equal(validateSlug('my-link-1').ok, true);
});

test('validateSlug rejects bad charset, edges, length, and reserved words', () => {
  assert.equal(validateSlug('Has Space').ok, false);
  assert.equal(validateSlug('under_score').ok, false);
  assert.equal(validateSlug('-lead').ok, false);
  assert.equal(validateSlug('trail-').ok, false);
  assert.equal(validateSlug('a'.repeat(65)).ok, false);
  assert.equal(validateSlug('api').ok, false);
  assert.equal(validateSlug('urls.json').ok, false);
  assert.equal(validateSlug('').ok, false);
});

test('generateSlug produces a valid base36 slug avoiding collisions', () => {
  // First candidate "aaaaaa" is taken, so it must roll forward.
  const rng = seededRng([0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
  const slug = generateSlug({ aaaaaa: {} }, rng);
  assert.equal(slug.length, 6);
  assert.equal(validateSlug(slug).ok, true);
  assert.notEqual(slug, 'aaaaaa');
});

// --- url --------------------------------------------------------------------

test('validateTarget accepts http and https and normalizes', () => {
  assert.equal(validateTarget('https://rajnandan.com').ok, true);
  assert.equal(validateTarget('http://example.com/a?b=1#c').ok, true);
});

test('validateTarget rejects non-http schemes, blanks, and junk', () => {
  assert.equal(validateTarget('javascript:alert(1)').ok, false);
  assert.equal(validateTarget('ftp://example.com').ok, false);
  assert.equal(validateTarget('not a url').ok, false);
  assert.equal(validateTarget('   ').ok, false);
});

// --- store: new -------------------------------------------------------------

test('applyNew with a custom slug creates the record without mutating input', () => {
  const store = {};
  const res = applyNew(store, {
    slugInput: 'Raj',
    url: 'https://rajnandan.com',
    issue: 42,
    createdBy: 'rajnandan1',
    now: NOW,
  });
  assert.equal(res.ok, true);
  assert.equal(res.slug, 'raj');
  assert.deepEqual(res.store.raj, {
    url: 'https://rajnandan.com/',
    issue: 42,
    createdBy: 'rajnandan1',
    createdAt: NOW,
    updatedAt: NOW,
  });
  assert.deepEqual(store, {}, 'input store must not be mutated');
});

test('applyNew auto-generates a slug when none is given', () => {
  const rng = seededRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
  const res = applyNew({}, { url: 'https://example.com', now: NOW, rng });
  assert.equal(res.ok, true);
  assert.equal(res.slug.length, 6);
});

test('applyNew rejects a taken slug', () => {
  const store = { raj: { url: 'https://old.com', createdAt: NOW, updatedAt: NOW } };
  const res = applyNew(store, { slugInput: 'raj', url: 'https://new.com', now: NOW });
  assert.equal(res.ok, false);
  assert.match(res.message, /already taken/);
});

test('applyNew rejects a bad target URL', () => {
  const res = applyNew({}, { slugInput: 'x', url: 'javascript:alert(1)', now: NOW });
  assert.equal(res.ok, false);
});

// --- store: edit ------------------------------------------------------------

test('applyEdit updates target and updatedAt, preserves provenance', () => {
  const store = {
    raj: { url: 'https://old.com/', issue: 1, createdBy: 'me', createdAt: NOW, updatedAt: NOW },
  };
  const res = applyEdit(store, { slugInput: 'raj', url: 'https://new.com', now: '2026-07-01T00:00:00.000Z' });
  assert.equal(res.ok, true);
  assert.equal(res.store.raj.url, 'https://new.com/');
  assert.equal(res.store.raj.createdAt, NOW);
  assert.equal(res.store.raj.updatedAt, '2026-07-01T00:00:00.000Z');
  assert.equal(res.store.raj.createdBy, 'me');
});

test('applyEdit rejects an unknown slug', () => {
  const res = applyEdit({}, { slugInput: 'nope', url: 'https://x.com', now: NOW });
  assert.equal(res.ok, false);
  assert.match(res.message, /No link with slug/);
});

// --- store: delete ----------------------------------------------------------

test('applyDelete removes the record', () => {
  const store = { raj: { url: 'https://x.com', createdAt: NOW, updatedAt: NOW } };
  const res = applyDelete(store, { slugInput: 'Raj' });
  assert.equal(res.ok, true);
  assert.equal(res.store.raj, undefined);
  assert.ok(store.raj, 'input store must not be mutated');
});

test('applyDelete rejects an unknown slug', () => {
  const res = applyDelete({}, { slugInput: 'nope' });
  assert.equal(res.ok, false);
});

// --- parse-issue ------------------------------------------------------------

test('parseIssueForm extracts headings and treats _No response_ as empty', () => {
  const body = [
    '### Target URL',
    '',
    'https://rajnandan.com',
    '',
    '### Custom slug (optional)',
    '',
    '_No response_',
  ].join('\n');
  const fields = parseIssueForm(body);
  assert.equal(fields['Target URL'], 'https://rajnandan.com');
  assert.equal(fields['Custom slug (optional)'], '');
});

// --- render: base url -------------------------------------------------------

test('deriveBaseUrl prefers CNAME, then user-site, then project-site', () => {
  assert.equal(deriveBaseUrl({ repository: 'raj/hop', cname: 'rajn.me' }), 'https://rajn.me/');
  assert.equal(deriveBaseUrl({ repository: 'Raj/Raj.github.io' }), 'https://raj.github.io/');
  assert.equal(deriveBaseUrl({ repository: 'Raj/hop' }), 'https://raj.github.io/hop/');
});

// --- render: redirect page --------------------------------------------------

test('renderRedirectPage escapes the target and forwards query/hash in JS', () => {
  const html = renderRedirectPage('https://example.com/"><script>x');
  assert.ok(!html.includes('"><script>x'), 'raw target must be escaped in attributes');
  assert.ok(html.includes('location.replace'));
  assert.ok(html.includes('location.search'));
  assert.ok(html.includes('rel="canonical"'));
});

// --- render: readme ---------------------------------------------------------

test('renderReadmeBlock builds a table sorted by createdAt', () => {
  const store = {
    b: { url: 'https://b.com', issue: 2, createdAt: '2026-02-01T00:00:00Z' },
    a: { url: 'https://a.com', issue: 1, createdAt: '2026-01-01T00:00:00Z' },
  };
  const block = renderReadmeBlock(store, 'https://rajn.me/');
  assert.ok(block.indexOf('/a') < block.indexOf('/b'), 'older link comes first');
  assert.ok(block.includes('https://rajn.me/a'));
  assert.ok(block.includes('#1'));
});

test('renderReadmeBlock shows a placeholder when empty', () => {
  assert.match(renderReadmeBlock({}, 'https://rajn.me/'), /No links yet/);
});

test('applyReadmeBlock replaces only the marked region', () => {
  const readme = `# Hop\n\nintro\n\n${README_START}\nOLD\n${README_END}\n\nfooter\n`;
  const out = applyReadmeBlock(readme, 'NEW');
  assert.ok(out.includes('NEW'));
  assert.ok(!out.includes('OLD'));
  assert.ok(out.includes('intro'));
  assert.ok(out.includes('footer'));
});

test('applyReadmeBlock throws when markers are missing', () => {
  assert.throws(() => applyReadmeBlock('# no markers', 'NEW'), /markers/);
});
