# madsnorgaard.net

My personal site. I am a developer and a documentary photographer, and the site is where both of those live. It is also the thing I use to try ideas out before they go anywhere serious, so it changes more often than a personal site probably should.

There is nothing exotic in here. A Nuxt frontend, a headless Drupal behind it, a WordPress that holds the photo archive, one VPS in Germany, and a deploy that runs on push. The interesting part is the wiring, and most of that is documented in the code next to the thing it explains.

## How it is put together

Three systems, one site:

- The frontend is Nuxt 3 with server-side rendering. It is what you see at madsnorgaard.net. IBM Plex Mono, dark, terminal-flavoured. Type `help` on the front page if you want to see how far that went.
- Writing, projects, CV and the about text come from a Drupal 11 instance at drupal.madsnorgaard.net over JSON:API. Drupal never serves a page to a visitor. Its repo is [drupal.madsnorgaard.net](https://github.com/madsnorgaard/drupal.madsnorgaard.net).
- The photo archive, stories, series and the Cold Turkey event wall come from a WordPress at photo.madsnorgaard.net through its REST API. That site redirects all its HTML here, so this is the canonical home for every photo page. Its repo is [photo.madsnorgaard.net](https://github.com/madsnorgaard/photo.madsnorgaard.net).

The Nuxt server layer in `frontend/server/` is the only thing that talks to the two backends. Pages call `/api/...` routes on their own origin and never fetch Drupal or WordPress directly. That keeps the backend hosts, tokens and rate-limit bypasses on the server, and lets me cache and reshape responses in one place.

Everything runs as Docker containers on one Contabo VPS behind Traefik v3, which handles routing and Let's Encrypt. The Compose file in this repo defines only the Nuxt container. It joins the shared `web` network for Traefik and the Drupal project's internal network so the two containers talk over Docker rather than the public internet.

## What is in the repo

```
docker-compose.yml       the Nuxt container, Traefik labels, www -> apex redirect
.env.example             the variables the container expects, with comments
frontend/                the Nuxt 3 app
  pages/                 routes: writing, projects, cv, archive, proj, stories, lab, photographs
  server/api/            BFF routes for Drupal, WordPress, GitHub and the event wall
  server/routes/og/      Open Graph cards rendered with Satori, fonts bundled
  components/            Terminal, photo walls, lightbox, cursor, status block
  tests/e2e/             Playwright specs
.github/workflows/       CI build, image build check, deploy trigger
```

Two things in `frontend/` deserve a sentence. `routeRules` in `nuxt.config.ts` carries the redirects left over from the WordPress era and the cache rules per route; read the comments there before adding to it. And `nuxt.config.ts` is also where the site identity lives: the Person schema, title template, sitemap and robots config.

## Running it locally

You need Node 22 and Docker. The frontend runs on its own against the public backends, so you do not need Drupal or WordPress running locally to work on it.

```bash
cd frontend
npm install
npm run dev
```

For the full container the way production runs it:

```bash
cp .env.example .env   # fill in the values
docker compose up -d
```

`.env.example` explains each variable. The GitHub token only raises the API rate limit for the status block. The photo API token is a shared secret with photo.madsnorgaard.net and is needed for likes and guestbook writes on the event wall, not for reading.

Note that `DRUPAL_BASE_URL` is read at build time. To point an already built server somewhere else, set `NUXT_DRUPAL_BASE_URL` instead.

## Tests

```bash
cd frontend
npm test
```

Playwright end-to-end specs under `frontend/tests/e2e/`. They start the dev server themselves. Most of them exist because something on the live site broke in a way I did not expect, so they are closer to a regression log than a test suite.

## Deploy

Push to `main`. The workflow in this repo does nothing but send a `repository_dispatch` to [contabo-infrastructure](https://github.com/madsnorgaard/contabo-infrastructure). That repo's deploy workflow runs on a self-hosted runner, syncs `frontend/` and the Compose file to the VPS, builds the image there and restarts the container. The run you want to watch is the one in contabo-infrastructure, not the ten-second trigger here.

Pages are cached with stale-while-revalidate and the global CSS is inlined into the HTML, so a change is only visible once the new container is up. If something looks stale after a green deploy, that is usually why.

## History

This repo started as the WordPress behind the old madsnorgaard.net. The WordPress was retired on 11 August 2026 and the site has been the Nuxt frontend since. The last WordPress database and uploads are archived outside the repo. A couple of Apache and PHP config files from that era are still tracked at the root and do nothing.
