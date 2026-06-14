# GitHub Issues + Actions are the only interface

There is no web UI, no API, and no database. The sole way to create, edit, or delete a Link is to open a GitHub Issue via one of three Issue Forms (`link-new`, `link-edit`, `link-delete`); GitHub Actions is the only process that mutates state. We chose this so the entire shortener is operable from anywhere GitHub is reachable, requires zero hosting or secrets, and inherits GitHub's auth, audit log, and notifications for free.

## Consequences

- The system is fully coupled to GitHub (Issues, Actions, Pages). Portability off GitHub means rebuilding the interface.
- No real-time creation — minting a Link takes as long as a CI run (seconds to a minute), and the issue is the receipt.
- `urls.json` (committed by Actions) plus closed issues form the durable audit trail; there is no separate datastore to back up.
