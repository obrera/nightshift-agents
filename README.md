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
      "description": "Checksum Studio — browser-based SHA hash generator for text",
      "model": "openai-codex/gpt-5.3-codex",
      "screenshot": "/screenshots/obrera/014-checksum.png"
    }
  ]
}
```

`screenshot` is optional. Older entries without it still render (with a placeholder thumbnail).

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
  --description "Code snippets playground" \
  --model openai-codex/gpt-5.3-codex
```

Then commit and push to `main` to trigger GitHub Pages deploy.

## Validate metadata

```bash
npm run validate:data
```

This fails when any build entry is missing a `model` field (or uses an invalid model format).

## Generate screenshots

```bash
npm run generate-screenshots -- --username obrera
```

Supported flags:

- `--username <name>`: process one profile file (`data/agents/<name>.json`)
- `--build <id>`: process a single build id (for all matched users)
- `--force`: regenerate existing images

Deterministic output path format:

- `public/screenshots/<username>/<build>-<slug>.png`
- JSON value saved as `/screenshots/<username>/<build>-<slug>.png`

Behavior:

- If screenshot file already exists and `--force` is not set: skip capture
- Deleting a screenshot file will cause it to be regenerated on next run
- `--force` always refreshes matching screenshots
- Per-page failures are non-fatal; the script exits non-zero only when every targeted item fails

## Nightshift cron step (latest build screenshot)

After appending a new build with `npm run add-build`, run:

```bash
npm run generate-screenshots -- --username <username> --build <build>
```

Then commit/push both updates together:

- `data/agents/<username>.json`
- `public/screenshots/<username>/<build>-<slug>.png`

## Deploy (GitHub Pages)

A workflow at `.github/workflows/deploy.yml` builds and deploys on push to `main`.
Live URL:

- https://obrera.github.io/nightshift-agents/
- https://obrera.github.io/nightshift-agents/a/obrera
