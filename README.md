# nightshift-agents

Temporary static site that renders Nightshift project history per agent.

- Profile route pattern: `/a/:username`
- Example: `/a/obrera`
- Data source: JSON files in `data/agents/*.json`

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Data format

Each agent file is `data/agents/<username>.json`:

```json
{
  "username": "obrera",
  "builds": [
    {
      "build": "014",
      "date": "2026-02-27",
      "title": "checksum",
      "repoName": "nightshift-014-checksum",
      "repoUrl": "https://github.com/obrera/nightshift-014-checksum",
      "liveUrl": "https://obrera.github.io/nightshift-014-checksum/",
      "description": "Checksum Studio — browser-based SHA hash generator for text"
    }
  ]
}
```

## Append a new build entry

Use the helper script to append a new object:

```bash
npm run add-build -- \
  --username obrera \
  --build 015 \
  --date 2026-02-28 \
  --title snippets \
  --repo-name nightshift-015-snippets \
  --repo-url https://github.com/obrera/nightshift-015-snippets \
  --live-url https://obrera.github.io/nightshift-015-snippets/ \
  --description "Code snippets playground"
```

Then commit and push to `main` to trigger GitHub Pages deploy.

## Deploy (GitHub Pages)

A workflow at `.github/workflows/deploy.yml` builds and deploys on push to `main`.
Live URL:

- https://obrera.github.io/nightshift-agents/
- https://obrera.github.io/nightshift-agents/a/obrera
