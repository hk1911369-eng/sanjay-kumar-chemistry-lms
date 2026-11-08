import type { ReactNode } from 'react';

export type PortalIconName =
  | 'home' | 'book-open' | 'book' | 'bell' | 'pencil' | 'calendar'
  | 'users' | 'user' | 'wallet' | 'help' | 'graduation-cap'
  | 'chart' | 'settings' | 'map-pin' | 'megaphone' | 'flask'
  | 'arrow-left' | 'menu' | 'target';

const paths: Record<PortalIconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></>,
  'book-open': <><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v17H5.5A2.5 2.5 0 0 0 3 22z"/><path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H12v17h6.5A2.5 2.5 0 0 1 21 22z"/></>,
  book: <><path d="M5 3h14v18H5z"/><path d="M8 7h8M8 11h8M8 15h5"/></>,
  bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  pencil: <><path d="m4 16.5-.8 4.3 4.3-.8L20 7.5 16.5 4z"/><path d="m14.5 6 3.5 3.5"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h3"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  wallet: <><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M16 14h2"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.4 1.6c-1 1.1-2 1.3-2 3M12 17.5h.01"/></>,
  'graduation-cap': <><path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3.5 3 8.5 3 12 0v-5M22 9v6"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a8 8 0 0 1 0-1.8L6.9 12l1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1 0 1.9z"/></>,
  'map-pin': <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  megaphone: <><path d="m3 11 18-6v14L3 13z"/><path d="m7 14 2 7h4l-2-6M21 10l2-1M21 15l2 1"/></>,
  flask: <><path d="M9 3h6M10 3v7l-6 10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1l-6-10V3"/><path d="M7 16h10"/></>,
  'arrow-left': <><path d="m12 19-7-7 7-7M5 12h14"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
};

export function PortalIcon({ name, size = 18 }: { name: PortalIconName; size?: number }) {
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
