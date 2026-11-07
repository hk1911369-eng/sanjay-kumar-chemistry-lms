import Link from 'next/link';
import type { ReactNode } from 'react';
import { signOut } from '@/app/actions/auth';
import { LocaleSwitcher } from '@/components/locale-switcher';

export type PortalRole = 'student' | 'teacher' | 'staff' | 'admin';

type NavItem = { key: string; label: string; href: string; icon: string };
type NavGroup = { label: string; items: NavItem[] };

const navigation: Record<PortalRole, NavGroup[]> = {
  student: [
    { label: 'MY LEARNING', items: [
      { key: 'overview', label: 'My dashboard', href: '/student', icon: '⌂' },
      { key: 'learning', label: 'Learning room', href: '/student#courses', icon: '▣' },
      { key: 'courses', label: 'Explore courses', href: '/courses', icon: '▤' },
      { key: 'announcements', label: 'Announcements', href: '/student#announcements', icon: '◉' },
      { key: 'feedback', label: 'Teacher feedback', href: '/student#feedback', icon: '✎' },
      { key: 'academic', label: 'Classes & exams', href: '/academic', icon: '◷' },
    ]},
    { label: 'MY ACCOUNT', items: [
      { key: 'profile', label: 'My profile', href: '/student#profile', icon: '◌' },
      { key: 'payments', label: 'Fees & payments', href: '/student#payments', icon: '৳' },
      { key: 'help', label: 'Help centre', href: '/help', icon: '?' },
    ]},
  ],
  teacher: [
    { label: 'TEACHING', items: [
      { key: 'overview', label: 'Workspace overview', href: '/teacher', icon: '⌂' },
      { key: 'classes', label: 'Assigned courses', href: '/teacher#assigned-courses', icon: '▣' },
      { key: 'chapters', label: 'Chapter manager', href: '/teacher#chapter-manager', icon: '▤' },
      { key: 'lessons', label: 'Lesson studio', href: '/teacher#lesson-creator', icon: '✎' },
      { key: 'library', label: 'Lesson library', href: '/teacher#lesson-library', icon: '▥' },
      { key: 'academic', label: 'Classes & exams', href: '/academic', icon: '◷' },
      { key: 'students', label: 'Students & attendance', href: '/students/manage', icon: '♙' },
    ]},
  ],
  staff: [
    { label: 'ACADEMIC OPERATIONS', items: [
      { key: 'overview', label: 'Staff workspace', href: '/teacher', icon: '⌂' },
      { key: 'classes', label: 'Assigned courses', href: '/teacher#assigned-courses', icon: '▣' },
      { key: 'chapters', label: 'Chapter manager', href: '/teacher#chapter-manager', icon: '▤' },
      { key: 'lessons', label: 'Lesson studio', href: '/teacher#lesson-creator', icon: '✎' },
      { key: 'library', label: 'Lesson library', href: '/teacher#lesson-library', icon: '▥' },
      { key: 'academic', label: 'Classes & exams', href: '/academic', icon: '◷' },
      { key: 'students', label: 'Students & attendance', href: '/students/manage', icon: '♙' },
    ]},
  ],
  admin: [
    { label: 'MANAGEMENT', items: [
      { key: 'overview', label: 'Admin overview', href: '/admin', icon: '⌂' },
      { key: 'students', label: 'Student records', href: '/students/manage', icon: '♙' },
      { key: 'payments', label: 'Payment reviews', href: '/admin#payment-reviews', icon: '৳' },
      { key: 'settings', label: 'Payment settings', href: '/admin#payment-settings', icon: '⚙' },
      { key: 'teachers', label: 'Teacher assignments', href: '/admin#teacher-assignments', icon: '♧' },
      { key: 'announcements', label: 'Announcements', href: '/admin#announcements', icon: '◉' },
      { key: 'courses', label: 'Course studio', href: '/admin/courses', icon: '▤' },
    ]},
  ],
};

const roleNames: Record<PortalRole, string> = {
  student: 'Student workspace',
  teacher: 'Teacher workspace',
  staff: 'Staff workspace',
  admin: 'Administration',
};

export function PortalLayout({
  role,
  active,
  title,
  returnTo,
  children,
}: {
  role: PortalRole;
  active: string;
  title: string;
  returnTo: string;
  children: ReactNode;
}) {
  return (
    <main className="portal-shell portal-layout">
      <aside className="portal-sidebar">
        <Link className="portal-brand" href="/" aria-label="JMT Academy home">
          <span className="portal-brand-symbol">⚗</span>
          <span className="portal-brand-copy">JMT Academy<small>ONLINE & OFFLINE LEARNING</small></span>
        </Link>
        <div className="portal-role-label">{roleNames[role]}</div>
        <nav className="portal-navigation" aria-label="Workspace navigation">
          {navigation[role].map((group) => (
            <div className="portal-nav-group" key={group.label}>
              <span className="portal-nav-heading">{group.label}</span>
              {group.items.map((item) => (
                <Link
                  className={`portal-nav-link${active === item.key ? ' is-active' : ''}`}
                  href={item.href}
                  key={item.key}
                  aria-current={active === item.key ? 'page' : undefined}
                >
                  <span className="portal-nav-icon" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="portal-sidebar-footer">
          <Link href="/">← Visit public website</Link>
          <span>Organised learning. Clear progress.</span>
        </div>
      </aside>
      <div className="portal-workspace">
        <header className="portal-header portal-topbar">
          <div className="portal-topbar-title">
            <span>YOUR WORKSPACE</span>
            <strong>{title}</strong>
          </div>
          <div className="portal-topbar-actions">
            <LocaleSwitcher returnTo={returnTo} />
            <form action={signOut}><button className="quiet-button" type="submit">Sign out</button></form>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
