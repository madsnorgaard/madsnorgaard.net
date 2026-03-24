# madsnorgaard.net

Personal site. Developer + photographer. The site is the project.

Drupal 11 as the content API. WordPress as the photo and story backend. Nuxt 3 as the frontend that ties it together. Self-hosted on a Contabo VPS, deployed via GitHub Actions on every push.

## Stack

- **Nuxt 3** — SSR frontend, IBM Plex Mono, dark terminal aesthetic
- **Drupal 11** — headless CMS via JSON:API (writing, projects, CV, about)
- **WordPress** — headless photo backend for photo.madsnorgaard.net
- **MySQL 8.4**
- **Docker + Traefik v2** — routing, SSL, Let's Encrypt
- **GitHub Actions** — CI/CD, builds Nuxt image and deploys to VPS2

## Setup

```bash
cp .env.example .env
docker compose up -d
```

## WP-CLI

```bash
docker compose run --rm cli wp plugin update --all
docker compose run --rm cli wp cache flush
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

## wp-content

Themes and plugins are tracked. Uploads, cache, and generated files are not.
