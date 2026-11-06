import { createRoot } from 'react-dom/client';
import Owner from '../components/owner';
import '../styles/globals.css';
import '../styles/owner.css';
import '../styles/corners.css';
import '../styles/reading.css';
import { smoothCorners } from '../lib/corners';
smoothCorners();
createRoot(document.getElementById('root')!).render(<Owner />);
