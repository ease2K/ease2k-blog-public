# ease2k Personal Blog

[简体中文](README.md) | **English**

Source code for a personal blog featuring public journal entries, technical articles, projects, programming contest awards and certificates, and Codeforces / AtCoder ratings and history charts. The interface supports Chinese and English, light and dark themes, article tables of contents, Markdown, and mathematical notation.

Built with React, Vite, and Node.js. The public read-only server lives in `self-hosted/`. The website provides no sign-in, online editing, or private-content views.

## Local development

Requires Node.js >= 22.13.

```bash
npm ci
npm run dev
```

Open the local URL printed in the terminal, normally http://127.0.0.1:5173. The development server supports hot updates for page components and styles. A local Node.js service provides the public-content and rating APIs. Restart the development server after changing `lib/content.ts`, journal data, or tutorial data.

## Build and run

```bash
npm run build
npm start
```

Open http://localhost:3000. The server listens on the loopback interface; production deployments use Nginx as a reverse proxy. Use `PORT` and `BLOG_ORIGIN` to configure the listening port and the Host accepted by the server. These values must match the reverse proxy configuration.

## Edit content

| Content | File or directory |
| --- | --- |
| Public journal entries | `lib/journal.json` |
| Articles, projects, profile, and award metadata | `lib/content.ts` |
| Programming contest tutorial sources | `content/competitions/` |
| Redacted certificates and thumbnails | `public/awards/` |
| Page layout | `components/blog.tsx` |
| Styles | `styles/globals.css` |
| Rating data and history fetching | `lib/ratings.mjs` |

Use an ISO 8601 timestamp with a time zone for an entry’s `date`, such as `2026-10-30T19:30:00+08:00`. Lists and detail pages display the time to the minute in Beijing time (UTC+8). Date-only records retain a date-only display.

After editing tutorial sources, run `node scripts/import-competition-tutorials.mjs` to update the tutorial data.

## Package for deployment

```bash
npm run package
```

The deployment archive is written to `outputs/ease2k-blog-linux.tar.gz`, together with a SHA-256 checksum file. See the [self-hosted deployment guide (Chinese)](self-hosted/README.md) for upload, update, and service verification instructions.

## Repository contents and local backups

The repository contains source code, the dependency lockfile, public content, redacted images, and deployment scripts. Keep environment files, keys, database files, original certificates, generated builds, deployment archives, browser logs, and test screenshots outside version control.

Original certificates are kept locally in `work/certificate-originals/` and are excluded from uploads. Run `scripts/redact-certificates.mjs` only when those originals are available. Normal builds use the redacted images already included in the repository.

Adding ignore rules does not remove files from earlier commits. Check both staged files and commit history before pushing. Back up databases and original images separately.

## Validation

```bash
npm run check
npm test
npm run test:ratings
```

Build the project before running `npm test`. It checks public APIs, certificates, private-data isolation, and read-only restrictions. With Nginx installed, run `NGINX_BIN=/path/to/nginx npm run test:nginx` to check the reverse proxy script.

Public content is read from files. No database, sign-in service, or third-party hosting configuration is required.

## Profiles

- [GitHub](https://github.com/ease2K)
- [Codeforces](https://codeforces.com/profile/ease2k)
- [AtCoder](https://atcoder.jp/users/ease2k)

## Source code and content usage

This repository showcases the implementation of the website. A project-wide open-source license has not been selected. See the [usage notice (Chinese)](USAGE.md) for viewing, forking, and other uses. Original articles, journal entries, certificate images, and third-party materials retain their respective rights. Publishing the source code does not grant blanket permission to republish those materials or change their attribution.
