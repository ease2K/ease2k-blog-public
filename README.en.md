# ease2k Personal Blog

[简体中文](README.zh-cn.md) | **English**

Source code for a personal blog featuring public journal entries, technical articles, projects, programming contest awards and certificates, and Codeforces / AtCoder ratings and history charts. The interface supports Chinese and English, light and dark themes, article tables of contents, Markdown, and mathematical notation.

Built with React, Vite, and Node.js. Public visitors see published content. A separate password-protected owner workspace is available through an SSH tunnel.

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

## Owner workspace

The unlisted workspace is available at `/_owner`. It accepts loopback or SSH-tunnel connections only; requests through the public proxy receive a 404 response.

To try it locally:

```bash
npm run build
npm run owner:setup
npm start
```

Set a password of at least 12 characters in the interactive terminal, then open http://localhost:3000/_owner. Password input is hidden and only a salted hash is stored. Never commit passwords or runtime credentials.

See the [owner workspace guide (Chinese)](self-hosted/OWNER.md) for server setup and tunnel instructions. The workspace supports Markdown editing and previews, drafts, publishing, revision history, recoverable deletion, and JSON backup exports. Publication times use Beijing time.

Online content and credentials are stored outside release directories: `self-hosted/data/editor/` locally and `/var/lib/ease2k-blog/editor/` on the server. Deployments preserve this data. Online edits are not automatically pushed to GitHub; export backups or back up the server data directory regularly.

## Reading and publishing

Lists use a lightweight index; article bodies load separately, and full-text search runs against published content on the server. Public pages include rendered HTML, per-article descriptions, sharing cards, structured data, a sitemap, and meaningful 404 responses. Drafts and owner APIs stay excluded.

The owner workspace provides private autosaved editing copies, browser recovery, image upload/paste/drop, generated excerpts, and estimated reading time. Changes go public only when explicitly published. Installation sets up daily backups of SQLite, authentication configuration, and images, with checksum and restoration checks. See the [owner guide](self-hosted/OWNER.md) and [backup and restore guide](self-hosted/BACKUP.md).

## Learning series, interactive examples, and code reading

`/series` groups published chapters into ordered learning paths, including the existing C++ STL introduction. The owner workspace edits series titles, descriptions, slugs, and chapter order. Each article can attach one HTML/CSS/JavaScript example, run only after the reader clicks Run in an isolated preview. Reader edits stay local. Code blocks support on-demand syntax highlighting, optional line numbers, folding, and highlighted lines such as `{2,4-6}`; copying preserves the complete original code. See the [owner guide](self-hosted/OWNER.md).

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

Technology topics include Java, MySQL, HTML, CSS, and JavaScript. Published articles are grouped by their tags; matching is case-insensitive, and JS is also recognized as JavaScript. Empty home-page sections stay hidden.

Common tag labels follow the selected site language. Matching Chinese and English spellings share one filter and can be searched in either language. Technical names and custom tags outside the translation dictionary keep their original text.

The owner workspace records the server time automatically on first publication and displays it to the minute in Beijing time (UTC+8). Saving a draft does not set its publication time. Later edits, unpublishing, and republishing preserve the original publication time.

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
npm run test:owner
npm run test:improvements
npm run test:learning
```

Build the project before running `npm test`. It checks public APIs, certificates, private-data isolation, and read-only restrictions. With Nginx installed, run `NGINX_BIN=/path/to/nginx npm run test:nginx` to check the reverse proxy script.

Bundled files provide initial content. Online edits are persisted with Node.js’s built-in SQLite support; no separate database server or third-party hosting configuration is required.

## Profiles

- [GitHub](https://github.com/ease2K)
- [Codeforces](https://codeforces.com/profile/ease2k)
- [AtCoder](https://atcoder.jp/users/ease2k)

## Source code and content usage

This repository showcases the implementation of the website. A project-wide open-source license has not been selected. See the [usage notice (Chinese)](USAGE.md) for viewing, forking, and other uses. Original articles, journal entries, certificate images, and third-party materials retain their respective rights. Publishing the source code does not grant blanket permission to republish those materials or change their attribution.
