# Guffhead (~/code/guffhead)

Cloudflare Worker `guffhead`, deployed with `npx wrangler deploy` (pushing to GitHub does not deploy; it's free
either way). Data lives in the shared **wwg** D1 database: only touch `gh_` tables. Never write to `players`,
`memberships` or any `cg_` table, and warn Carl before any change that could affect another game's tables.

When giving Carl deploy steps: one copy-paste block, starting with `cd ~/code/guffhead`, including
`git pull`/`git add`/`git commit`/`git push` as needed. Commit messages are a plain description, no attribution lines.

Every change Carl deploys: bump BUILD (and NOTE) in `public/build.js`, so phones on the old page get the "tap to update" bar.
