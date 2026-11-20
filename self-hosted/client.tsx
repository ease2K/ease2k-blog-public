import { createRoot, hydrateRoot } from 'react-dom/client';
import Blog, { type View } from '../components/blog';
import type { Entry } from '../lib/content';
import { pageContent, preparePage } from './page-content';
import '../styles/globals.css';
import '../styles/corners.css';
import '../styles/reading.css';
import { smoothCorners } from '../lib/corners';
smoothCorners();
const bootstrap = document.getElementById('blog-bootstrap');
let initial: { initialData?: View; initialEntry?: Entry; initialLang?: "zh" | "en" } = {};
try { if (bootstrap?.textContent) initial = JSON.parse(bootstrap.textContent); } catch {}
const root = document.getElementById('root')!;
const path = window.location.pathname;
const app = <Blog initialPath={path} {...initial} />;
if (bootstrap) {
    const content = pageContent(path, initial.initialEntry, initial.initialLang || "zh");
    void preparePage(content).then(() => hydrateRoot(root, app), () => createRoot(root).render(app));
} else createRoot(root).render(app);
