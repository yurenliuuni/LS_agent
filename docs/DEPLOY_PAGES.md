# GitHub Pages

The first deploy token lacked `workflow` scope, so the Actions file is not in git yet.

1. Repo **Settings → Pages → Source: GitHub Actions**
2. Add `.github/workflows/pages.yml` (see README) **or** give the token `workflow` scope and restore the file.
3. Merge `ship-web-mvp` into `master`.
