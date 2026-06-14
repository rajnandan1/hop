'use strict';

const README_START = '<!-- HOP:START -->';
const README_END = '<!-- HOP:END -->';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Work out the public base URL with no configuration:
//   CNAME present            -> https://<custom-domain>/
//   repo is <owner>.github.io -> https://<owner>.github.io/
//   otherwise                -> https://<owner>.github.io/<repo>/
// Always returns a value ending in "/". See ADR (auto-derive) and CONTEXT.md.
function deriveBaseUrl({ repository, cname } = {}) {
  const domain = (cname || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (domain) return `https://${domain}/`;

  const [owner, repo] = String(repository || '').split('/');
  if (!owner || !repo) return '/';

  const ownerLower = owner.toLowerCase();
  if (repo.toLowerCase() === `${ownerLower}.github.io`) {
    return `https://${ownerLower}.github.io/`;
  }
  return `https://${ownerLower}.github.io/${repo}/`;
}

// The static stub served at /<slug>/. Redirects instantly, forwards the query
// string and fragment, falls back to a bare meta-refresh when JS is disabled.
function renderRedirectPage(target) {
  const safeAttr = escapeHtml(target);
  // Escape "<" so a target containing "</script>" can't break out of the block.
  const safeJs = JSON.stringify(String(target)).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${safeAttr}">
<link rel="canonical" href="${safeAttr}">
<title>Redirecting…</title>
<script>
  (function () {
    var target = ${safeJs};
    var search = location.search;
    if (search) {
      target += (target.indexOf('?') === -1 ? '?' : '&') + search.slice(1);
    }
    if (location.hash && target.indexOf('#') === -1) {
      target += location.hash;
    }
    location.replace(target);
  })();
</script>
</head>
<body>
<p>Redirecting to <a href="${safeAttr}">${safeAttr}</a>…</p>
</body>
</html>
`;
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch (_err) {
    return url;
  }
}

// The auto-generated link table that lives between the README markers.
function renderReadmeBlock(store, baseUrl) {
  const slugs = Object.keys(store).sort((a, b) => {
    const ca = store[a].createdAt || '';
    const cb = store[b].createdAt || '';
    return ca === cb ? a.localeCompare(b) : ca.localeCompare(cb);
  });

  if (slugs.length === 0) {
    return '_No links yet. Open an issue using one of the link templates to create one._';
  }

  const lines = [
    '| Short link | Target | Added | Source |',
    '| --- | --- | --- | --- |',
  ];
  for (const slug of slugs) {
    const rec = store[slug];
    const shortUrl = `${baseUrl}${slug}`;
    const added = (rec.createdAt || '').slice(0, 10);
    const source = rec.issue ? `#${rec.issue}` : '';
    lines.push(`| [/${slug}](${shortUrl}) | [${hostOf(rec.url)}](${rec.url}) | ${added} | ${source} |`);
  }
  return lines.join('\n');
}

// Replace the content between the README markers, leaving the rest untouched.
function applyReadmeBlock(readme, block) {
  const startIdx = readme.indexOf(README_START);
  const endIdx = readme.indexOf(README_END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`README is missing the ${README_START} / ${README_END} markers.`);
  }
  const before = readme.slice(0, startIdx + README_START.length);
  const after = readme.slice(endIdx);
  return `${before}\n\n${block}\n\n${after}`;
}

module.exports = {
  README_START,
  README_END,
  escapeHtml,
  deriveBaseUrl,
  renderRedirectPage,
  renderReadmeBlock,
  applyReadmeBlock,
};
