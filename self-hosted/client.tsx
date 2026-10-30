import { createRoot } from 'react-dom/client';
import Blog from './generated/blog';
import '../app/globals.css';
createRoot(document.getElementById('root')!).render(<Blog initialPath={window.location.pathname} />);
