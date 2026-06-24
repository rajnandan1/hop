<p align="center">
  <img src="public/hop-mark.svg" alt="hop" width="80">
</p>

<h1 align="center">hop</h1>

An issue-driven static **URL shortener** that runs entirely on GitHub — no server, no database. You create short links by opening a GitHub **issue**; a workflow validates it, writes it to `urls.json`, and **GitHub Pages** serves the redirect.

<p align="center">
  <a href="https://github.com/rajnandan1/hop/generate"><img src="cta.png" alt="Use this template" width="300"></a>
</p>

> **Want your own?** The button above creates a new **public** repo from this template — then follow **[Get started](#get-started)** below. ~2 minutes, no server and no secrets to configure.

## Get started

After generating your own repo from this template:

1. **Enable Actions.** Open the **Actions** tab and click to enable workflows if prompted.
2. **Create the labels.** Actions → **Setup labels** → **Run workflow**. (Also runs automatically on first import.)
3. **Turn on Pages (one-time).** Settings → **Pages** → under **Build and deployment**, set **Source = GitHub Actions**. GitHub doesn't allow a workflow to enable Pages for you, so this single click is required once. The deploy will fail with a reminder until you do it.
4. **Deploy.** Actions → **Deploy site** → **Run workflow**. Your shortener goes live at `https://<you>.github.io/<repo>/`.

That's all you need. Open a **New link** issue (see [Usage](#usage)) and your first short link is live within a minute.

5. **(Optional) custom domain.** Go to **Settings → Pages**, type your domain under **Custom domain** (e.g. `links.example.com`), and click **Save**. GitHub adds the `CNAME` file for you, shows the exact DNS records to set at your domain provider, and verifies them. hop redeploys on its own and starts using your domain — nothing to edit by hand.

## Usage

Open an issue from one of the templates (Issues → **New issue**):

| Template        | What it does                                                                 |
| --------------- | ---------------------------------------------------------------------------- |
| **New link**    | Create a link. Target URL required; slug optional (auto-generated if blank). |
| **Edit link**   | Point an existing slug at a new Target URL.                                  |
| **Delete link** | Remove a slug.                                                               |

A workflow processes the issue within a minute, comments the result, and closes it. On success the link is live shortly after, once the deploy finishes.

**Only repository owners and collaborators can create links** — issues from anyone else are closed automatically ([why](docs/adr/0002-owner-only-authorization.md)).

## Links

<!-- HOP:START -->

_No links yet. Open an issue using one of the link templates to create one._

<!-- HOP:END -->

## How it works

- **`urls.json`** is the single source of truth: `{ "<slug>": { url, issue, createdBy, createdAt, updatedAt } }`.
- **`.github/workflows/link.yml`** reacts to issues, validates input, mutates `urls.json` + this README, commits, and triggers a deploy.
- **`.github/workflows/deploy.yml`** rebuilds the whole site from `urls.json` (a `/<slug>/index.html` per link that instantly redirects, forwarding `?query` and `#hash`) and publishes it to Pages. Redirect pages are **never committed** — they're generated at deploy time

## Local development

```sh
npm test                 # run the unit tests
GITHUB_REPOSITORY=you/hop npm run build   # build the site into ./site
```
