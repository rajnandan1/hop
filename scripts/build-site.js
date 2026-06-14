'use strict';

// Builds the deployable site from scratch (ADR-0001: Redirect Pages are generated
// at deploy time, never committed). Output goes to ./site, which the deploy
// workflow uploads to GitHub Pages.

const fs = require('fs');
const path = require('path');

const { loadStore } = require('./lib/store');
const { renderRedirectPage } = require('./lib/render');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, 'site');
const PUBLIC_DIR = path.join(ROOT, 'public');
const URLS_FILE = path.join(ROOT, 'urls.json');
const CNAME_FILE = path.join(ROOT, 'CNAME');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

// Fill {{REPO_SLUG}} / {{REPO_URL}} / {{NEW_ISSUE_URL}} in static HTML so the
// landing and 404 pages can link back to this specific repo.
function templateHtml(dir, tokens) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      templateHtml(full, tokens);
    } else if (entry.name.endsWith('.html')) {
      const content = fs.readFileSync(full, 'utf8');
      fs.writeFileSync(full, content.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in tokens ? tokens[key] : m)));
    }
  }
}

function repoTokens() {
  const slug = process.env.GITHUB_REPOSITORY || '';
  const url = slug ? `https://github.com/${slug}` : '#';
  return {
    REPO_SLUG: slug,
    REPO_URL: url,
    NEW_ISSUE_URL: slug ? `${url}/issues/new/choose` : '#',
  };
}

function build() {
  fs.rmSync(SITE_DIR, { recursive: true, force: true });
  fs.mkdirSync(SITE_DIR, { recursive: true });

  // Landing page, 404, and any other static assets.
  if (fs.existsSync(PUBLIC_DIR)) {
    copyDir(PUBLIC_DIR, SITE_DIR);
    templateHtml(SITE_DIR, repoTokens());
  }

  // Disable Jekyll so directories and dotfiles are served verbatim.
  fs.writeFileSync(path.join(SITE_DIR, '.nojekyll'), '');

  // Carry the custom domain through to the published site if one is configured.
  if (fs.existsSync(CNAME_FILE)) {
    fs.copyFileSync(CNAME_FILE, path.join(SITE_DIR, 'CNAME'));
  }

  const store = loadStore(URLS_FILE);
  let count = 0;
  for (const [slug, rec] of Object.entries(store)) {
    const dir = path.join(SITE_DIR, slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderRedirectPage(rec.url));
    count++;
  }

  console.log(`Built ${count} redirect page(s) into ${path.relative(ROOT, SITE_DIR)}/`);
}

build();
