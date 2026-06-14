# Redirect Pages are built at deploy time from a single source-of-truth `urls.json`

`urls.json` is the only durable representation of Links in git. The per-slug Redirect Pages (`/<slug>/index.html`) are **not committed** — they are regenerated wholesale from `urls.json` by the deploy job and published via the GitHub Actions Pages deploy. We chose this so git history isn't polluted by a generated folder per Link, and so edits/renames/deletes are trivially correct (a from-scratch rebuild can't leave stale folders behind).

## Considered Options

- **Committed folders (deploy-from-branch):** simplest, redirects visible in the tree, but git fills with machine-generated folders and history becomes mostly bot commits.
- **Single `404.html` SPA:** one file reads `urls.json` and redirects client-side, but Pages serves it with an HTTP 404 status and it hard-requires JS.
- **Build-at-deploy (chosen):** clean repo, correct deletes, real HTTP 200 static stubs.

## Consequences

- Redirects are not browsable in the repo tree — `urls.json` is the place to inspect state.
- GitHub Pages source must be set to **"GitHub Actions"**, not "deploy from a branch".
- The issue workflow commits `urls.json` *and* deploys in the same run, because a commit made with the default `GITHUB_TOKEN` does not re-trigger a separate `push` workflow.
