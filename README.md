# itr_dashboard

Static site deployed to GitHub Pages.

## How it deploys

`.github/workflows/main.yml` uploads the whole repository root as the Pages
artifact and deploys it on every push to `main` (or via **Run workflow** in the
Actions tab). There is no build step: whatever static files sit in the repo root
are what gets served.

## Working on it

Add HTML/CSS/JS at the root (`index.html` is the entry point), push to `main`,
and the workflow publishes the result.
