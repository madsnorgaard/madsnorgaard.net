# madsnorgaard.net

Personal site and photography portfolio for Mads Nørgaard. Currently running WordPress on Docker with Traefik, with an active migration to Drupal underway.

Also serves `photo.madsnorgaard.net` from the same container.

## Stack

- **WordPress** 6.9.1 on PHP 8.4 (Docker)
- **MySQL** 8.4
- **phpMyAdmin** for database management
- **Traefik v2** for SSL termination and routing
- **Let's Encrypt** for automatic HTTPS

## Setup

### 1. Prerequisites

- Docker and Docker Compose installed
- Traefik running with the `web` network: `docker network create web`
- Domain pointing to your server

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
WORDPRESS_DOMAIN=yourdomain.com
MYSQL_ROOT_PASSWORD=secure_root_password
MYSQL_USER=wordpress
MYSQL_PASSWORD=secure_password
MYSQL_DATABASE=wordpress
```

### 3. Start

```bash
docker compose up -d
```

WordPress will be available at `https://yourdomain.com` and `https://www.yourdomain.com`.
phpMyAdmin at `https://phpmyadmin.yourdomain.com`.

## WP-CLI

A `cli` service is included for scripted management. It does not auto-start:

```bash
# Run any WP-CLI command on production
docker compose run --rm cli wp core version
docker compose run --rm cli wp plugin update --all
docker compose run --rm cli wp theme update --all
docker compose run --rm cli wp cache flush

# Local (DDEV)
ddev wp plugin update --all
```

## wp-content

The `wp-content/` directory (themes, plugins, uploads) is gitignored. Manage via the WordPress admin or deploy separately.

## Roadmap

Active migration to **Drupal** - this site will become a Drupal-based CV and photography portfolio. The Docker and Traefik infrastructure carries over unchanged; only the application layer changes.

Target architecture: [drupal.madsnorgaard.net](https://github.com/madsnorgaard/drupal.madsnorgaard.net)
