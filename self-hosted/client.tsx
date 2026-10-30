import { createRoot } from 'react-dom/client';
import Blog from '../components/blog';
import '../styles/globals.css';
createRoot(document.getElementById('root')!).render(<Blog initialPath={window.location.pathname} />);
