# Only owners/collaborators can create Links, even on a public repo

The repo is public (GitHub Pages free tier, and it's a template), which means **any** GitHub user can open an issue. The write workflow therefore guards on `issue.author_association ∈ {OWNER, MEMBER, COLLABORATOR}`; issues from anyone else are closed with a comment and never produce a Link. Without this guard, a public repo would let strangers mint `yourdomain/<anything>` → `<any site>` — an open-redirect / phishing vector hanging off your domain, plus Actions-minutes abuse.

## Considered Options

- **Owner/collaborator only (chosen):** private-write even on a public repo. Right default for a personal shortener.
- **Maintainer approval gate:** anyone opens an issue, a maintainer applies `approved` to proceed. More moving parts; deferred as an opt-in.
- **Open to anyone:** abuse magnet without a domain allowlist. Rejected.

## Consequences

- This auth check is load-bearing security, not boilerplate — **do not remove it** to "let people request links." Switch to the approval-gate model instead if open submissions are wanted.
- Because writers are trusted, Target URLs are trusted; the scheme allowlist + output escaping on the Redirect Page guard against mistakes, not adversaries.
