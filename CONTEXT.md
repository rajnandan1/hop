# Hop

A GitHub template repository that operates a URL shortener entirely through GitHub Issues and Actions, serving redirects from GitHub Pages. There is no server and no database — issues are the input, a committed data file is the source of truth, and generated static pages are the output.

## Language

**Link**:
A single mapping from a Slug to a Target URL. The core entity of the system.
_Avoid_: Entry, record, row, shortlink

**Slug**:
The short path segment that identifies a Link (e.g. `raj` in `yourname.github.io/raj`). User-chosen when supplied on the issue, otherwise auto-generated.
_Avoid_: Short URL, code, alias, key

**Target URL**:
The destination a Link redirects to (e.g. `https://rajnandan.com`).
_Avoid_: Full URL, long URL, destination URL, original URL

**Redirect Page**:
The generated static page served at `/<slug>/` that sends the browser to the Target URL. Generated from the source-of-truth data file, never hand-edited.
_Avoid_: Redirect file, stub, shim
