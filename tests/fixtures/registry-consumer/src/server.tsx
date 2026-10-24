import { renderToString } from 'react-dom/server';
import { App } from './App';

// Installed components must render on the server without touching browser APIs.
const html = renderToString(<App />);
for (const marker of ['data-slot="input-counter"', 'data-slot="textarea-hint"', 'data-slot="input"', 'data-slot="textarea"', 'data-slot="field"', 'data-slot="button"', 'data-slot="dropdown-trigger"', 'data-slot="select-trigger"', 'data-slot="button-group"', 'data-slot="split-button"', 'data-slot="skeleton"', 'data-slot="card"', 'data-slot="announcement"', 'data-slot="checkbox"', 'data-slot="radio-group"', 'data-slot="accordion-trigger"', 'data-slot="accordion-content"', 'data-slot="calendar"', 'data-slot="calendar-day-button"', 'data-range-middle', 'data-slot="date-picker-trigger"', 'value="2026-01-12"','data-slot="radio"', 'data-slot="announcement-dismiss"', 'data-slot="avatar"', 'data-slot="avatar-group-count"',  'data-slot="skeleton-reveal"', 'data-ascii-skeleton',  'data-slot="split-button-trigger"', 'data-slot="link-button"', 'data-slot="badge"', 'data-slot="chip"', 'data-slot="action-card"', 'data-slot="action-card-menu-trigger"', 'ld-atom', 'rounded-[999px]']) {
  if (!html.includes(marker)) throw new Error(`Server render is missing ${marker}`);
}
console.log('Server render passed.');
