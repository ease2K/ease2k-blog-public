import { createRoot, hydrateRoot } from 'react-dom/client';
import Blog from '../components/blog';
import '../styles/globals.css';
import '../styles/corners.css';
import '../styles/reading.css';
import { smoothCorners } from '../lib/corners';
smoothCorners();
const bootstrap = document.getElementById('blog-bootstrap');
let initial = {};
try { if (bootstrap?.textContent) initial = JSON.parse(bootstrap.textContent); } catch {}
const root = document.getElementById('root')!;
const app = <Blog initialPath={window.location.pathname} {...initial} />;
if (bootstrap) hydrateRoot(root, app); else createRoot(root).render(app);
