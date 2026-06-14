# hop ⚡

An issue-driven static **URL shortener** that runs entirely on GitHub — no server, no database. You create short links by opening a GitHub **issue**; a workflow validates it, writes it to `urls.json`, and **GitHub Pages** serves the redirect.

> Use this repo as a **template** to run your own shortener.

## Setup (once, after generating from the template)

1. **Enable Actions** — open the **Actions** tab and enable workflows if prompted.
2. **Create the labels** — Actions → **Setup labels** → **Run workflow**. (It also runs automatically on first import.)
3. **Turn on Pages** — Settings → **Pages** → set **Source = GitHub Actions**.
4. **First deploy** — Actions → **Deploy site** → **Run workflow**. Your landing page goes live at `https://<owner>.github.io/<repo>/`.
5. **(Optional) custom domain** — add a `CNAME` file containing your domain (e.g. `rajn.me`) and set it in Settings → Pages. The base URL is detected automatically — no other config needed.

## Usage

Open an issue from one of the templates (Issues → **New issue**):

| Template | What it does |
| --- | --- |
| **New link** | Create a link. Target URL required; slug optional (auto-generated if blank). |
| **Edit link** | Point an existing slug at a new Target URL. |
| **Delete link** | Remove a slug. |

A workflow processes the issue within a minute, comments the result, and closes it. On success the link is live shortly after, once the deploy finishes.

**Only repository owners and collaborators can create links** — issues from anyone else are closed automatically ([why](docs/adr/0002-owner-only-authorization.md)).

## Links

<!-- HOP:START -->

_No links yet. Open an issue using one of the link templates to create one._

<!-- HOP:END -->

## How it works

- **`urls.json`** is the single source of truth: `{ "<slug>": { url, issue, createdBy, createdAt, updatedAt } }`.
- **`.github/workflows/link.yml`** reacts to issues, validates input, mutates `urls.json` + this README, commits, and triggers a deploy.
- **`.github/workflows/deploy.yml`** rebuilds the whole site from `urls.json` (a `/<slug>/index.html` per link that instantly redirects, forwarding `?query` and `#hash`) and publishes it to Pages. Redirect pages are **never committed** — they're generated at deploy time ([why](docs/adr/0001-redirect-pages-built-at-deploy.md)).
- All logic lives in `scripts/lib/` and is covered by `npm test` (`node --test`).

See [`CONTEXT.md`](CONTEXT.md) for the glossary and [`docs/adr/`](docs/adr/) for the design decisions.

## Local development

```sh
npm test                 # run the unit tests
GITHUB_REPOSITORY=you/hop npm run build   # build the site into ./site
```
