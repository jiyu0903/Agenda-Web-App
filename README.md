# Bloom & Bond Diary

A Flask-powered diary app for local development, configured to deploy on Netlify as a static site with serverless API functions and durable Netlify Blobs storage.

## Local Flask development

```powershell
python manage.py
```

The local Flask app uses SQLite. Run the regression suite with:

```powershell
pytest -q
```

## Deploy to Netlify

1. Push this project to a Git repository and import it in Netlify.
2. Netlify detects `netlify.toml`; the configured build command is `npm run build`, the publish directory is `public`, and API functions are in `netlify/functions`.
3. Deploy the site. Netlify Blobs is used by the functions for entries, archive records, and reminders; the deployed app does not use the local SQLite database.

To build the static site locally before deployment:

```sh
npm install
npm run build
```

The build script converts the Flask template's static asset references and copies assets into the generated `public/` folder. That folder is build output and is intentionally excluded from version control.

For local Netlify function testing, install/use the Netlify CLI and run:

```sh
npx netlify dev
```

## Important privacy note

The app currently has no authentication. Anyone who can access the deployed URL can read, add, archive, and restore diary entries and reminders. Do not deploy personal diary data publicly until access control is added or the Netlify site is otherwise protected.

## Deployment architecture

- Flask + SQLite: local development and tests.
- Static HTML/CSS/JavaScript: generated for Netlify by `scripts/build.mjs`.
- Netlify Functions + Netlify Blobs: deployed API and persistent hosted data.
