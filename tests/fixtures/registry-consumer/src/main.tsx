import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// ?dark renders the dark theme, the way next-themes or shadcn's theme switch would.
if (new URLSearchParams(location.search).has('dark')) document.documentElement.classList.add('dark');
createRoot(document.getElementById('root')!).render(<App />);
