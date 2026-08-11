# madsnorgaard.net

Personal site. Developer + photographer. The site is the project.

Drupal 11 as the content API. photo.madsnorgaard.net as the photo story backend. Nuxt 3 as the frontend that ties it together. Self-hosted on a Contabo VPS, deployed via GitHub Actions on every push.

## Stack

- **Nuxt 3** — SSR frontend, IBM Plex Mono, dark terminal aesthetic
- **Drupal 11** — headless CMS via JSON:API (writing, projects, CV, about)
- **photo.madsnorgaard.net** — headless photo story API backend
- **Docker + Traefik v3** — routing, SSL, Let's Encrypt
- **GitHub Actions** — CI/CD, builds Nuxt image and deploys to VPS2

> The original madsnorgaard.net WordPress (this repo's pre-Nuxt era) was fully
> retired on 2026-08-11: the local DDEV copy is stopped/unlisted and archived
> (DB dump + wp-content) at `~/archives/legacy-madsnorgaard-wp`. The gitignored
> `wp-*` files on disk can be deleted whenever.

## Setup

```bash
cp .env.example .env
docker compose up -d
```

## Nuxt frontend

```bash
cd frontend
npm install
npm run dev
```

Requires `NUXT_GITHUB_TOKEN` in `.env` for GitHub status API.

## Deploy

Push to `main`. GitHub Actions builds the Nuxt image on VPS2 and restarts the stack. No manual steps.
