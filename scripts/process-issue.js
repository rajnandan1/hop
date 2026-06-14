'use strict';

// Runs inside the "Process link issue" workflow. Reads the issue event, mutates
// urls.json + README, and reports back via:
//   - $GITHUB_OUTPUT:  result=success|failure, op, slug
//   - $RUNNER_TEMP/comment.md:  the markdown body to post on the issue
// It does NOT call the GitHub API or close the issue — the workflow does that
// using these outputs (keeps API auth and side effects in one place).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { loadStore, saveStore, applyNew, applyEdit, applyDelete } = require('./lib/store');
const { parseIssueForm } = require('./lib/parse-issue');
const { deriveBaseUrl, renderReadmeBlock, applyReadmeBlock } = require('./lib/render');

const ROOT = path.resolve(__dirname, '..');
const URLS_FILE = path.join(ROOT, 'urls.json');
const README_FILE = path.join(ROOT, 'README.md');

// Crypto-backed rng in [0, 1) for slug generation.
const rng = () => crypto.randomInt(0, 1_000_000) / 1_000_000;

function readCname() {
  try {
    return fs.readFileSync(path.join(ROOT, 'CNAME'), 'utf8').trim();
  } catch (_err) {
    return '';
  }
}

function setOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

function writeComment(markdown) {
  const dir = process.env.RUNNER_TEMP || ROOT;
  fs.writeFileSync(path.join(dir, 'comment.md'), markdown + '\n');
}

function main() {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const issue = event.issue || {};
  const labels = (issue.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
  const fields = parseIssueForm(issue.body || '');
  const now = new Date().toISOString();
  const store = loadStore(URLS_FILE);

  let result;
  if (labels.includes('link-new')) {
    result = applyNew(store, {
      slugInput: fields['Custom slug (optional)'],
      url: fields['Target URL'],
      issue: issue.number,
      createdBy: issue.user && issue.user.login,
      now,
      rng,
    });
  } else if (labels.includes('link-edit')) {
    result = applyEdit(store, { slugInput: fields['Slug'], url: fields['New target URL'], now });
  } else if (labels.includes('link-delete')) {
    result = applyDelete(store, { slugInput: fields['Slug'] });
  } else {
    result = { ok: false, message: 'This issue has no recognized link label.' };
  }

  if (!result.ok) {
    writeComment(`❌ ${result.message}\n\nOpen a new issue to try again.`);
    setOutput('result', 'failure');
    return;
  }

  saveStore(URLS_FILE, result.store);

  const baseUrl = deriveBaseUrl({ repository: process.env.GITHUB_REPOSITORY, cname: readCname() });
  const readme = fs.readFileSync(README_FILE, 'utf8');
  fs.writeFileSync(README_FILE, applyReadmeBlock(readme, renderReadmeBlock(result.store, baseUrl)));

  let comment;
  if (result.op === 'delete') {
    comment = `🗑️ Deleted \`/${result.slug}\`. It will stop resolving once the deploy finishes (~1 min).`;
  } else {
    const target = result.store[result.slug].url;
    const shortUrl = `${baseUrl}${result.slug}`;
    const verb = result.op === 'edit' ? 'Updated' : 'Created';
    comment = `✅ ${verb} \`/${result.slug}\` → ${target}\n\nIt will be live at <${shortUrl}> once the deploy finishes (~1 min).`;
  }
  writeComment(comment);

  setOutput('result', 'success');
  setOutput('op', result.op);
  setOutput('slug', result.slug);
}

main();
