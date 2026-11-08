import Link from 'next/link';
import type { ReactNode } from 'react';
import { signOut } from '@/app/actions/auth';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { PortalIcon, type PortalIconName } from '@/components/portal-icon';

export type PortalRole = 'student' | 'teacher' | 'staff' | 'admin';

type NavItem = { key: string; label: string; href: string; icon: PortalIconName };
type NavGroup = { label: string; items: NavItem[] };

const navigation: Record<PortalRole, NavGroup[]> = {
  student: [
    { label: 'MY LEARNING', items: [
      { key: 'overview', label: 'My dashboard', href: '/student', icon: 'home' },
      { key: 'learning', label: 'Learning room', href: '/student#courses', icon: 'book-open' },
      { key: 'courses', label: 'Explore courses', href: '/courses', icon: 'book' },
      { key: 'announcements', label: 'Announcements', href: '/student#announcements', icon: 'bell' },
      { key: 'feedback', label: 'Teacher feedback', href: '/student#feedback', icon: 'pencil' },
      { key: 'academic', label: 'Classes & exams', href: '/academic', icon: 'calendar' },
      { key: 'notifications', label: 'Notifications inbox', href: '/academic#notifications', icon: 'users' },
    ]},
    { label: 'MY ACCOUNT', items: [
      { key: 'profile', label: 'My profile', href: '/student#profile', icon: 'user' },
      { key: 'payments', label: 'Fees & payments', href: '/student#payments', icon: 'wallet' },
      { key: 'help', label: 'Help centre', href: '/help', icon: 'help' },
    ]},
  ],
  teacher: [
    { label: 'TEACHING', items: [
      { key: 'overview', label: 'Workspace overview', href: '/teacher', icon: 'home' },
      { key: 'classes', label: 'Assigned courses', href: '/teacher#assigned-courses', icon: 'book-open' },
      { key: 'chapters', label: 'Chapter manager', href: '/teacher#chapter-manager', icon: 'book' },
      { key: 'lessons', label: 'Lesson studio', href: '/teacher#lesson-creator', icon: 'pencil' },
      { key: 'library', label: 'Lesson library', href: '/teacher#lesson-library', icon: 'chart' },
      { key: 'academic', label: 'Classes & exams', href: '/academic', icon: 'calendar' },
      { key: 'notifications', label: 'Notifications inbox', href: '/academic#notifications', icon: 'users' },
      { key: 'learning-insights', label: 'Learning insights', href: '/teacher/learning', icon: 'chart' },
      { key: 'students', label: 'Students & attendance', href: '/students/manage', icon: 'graduation-cap' },
    ]},
  ],
  staff: [
    { label: 'ACADEMIC OPERATIONS', items: [
      { key: 'overview', label: 'Staff workspace', href: '/teacher', icon: 'home' },
      { key: 'classes', label: 'Assigned courses', href: '/teacher#assigned-courses', icon: 'book-open' },
      { key: 'chapters', label: 'Chapter manager', href: '/teacher#chapter-manager', icon: 'book' },
      { key: 'lessons', label: 'Lesson studio', href: '/teacher#lesson-creator', icon: 'pencil' },
      { key: 'library', label: 'Lesson library', href: '/teacher#lesson-library', icon: 'chart' },
      { key: 'academic', label: 'Classes & exams', href: '/academic', icon: 'calendar' },
      { key: 'notifications', label: 'Notifications inbox', href: '/academic#notifications', icon: 'users' },
      { key: 'students', label: 'Students & attendance', href: '/students/manage', icon: 'graduation-cap' },
    ]},
  ],
  admin: [
    { label: 'MANAGEMENT', items: [
      { key: 'overview', label: 'Admin overview', href: '/admin', icon: 'home' },
      { key: 'students', label: 'Student records', href: '/students/manage', icon: 'graduation-cap' },
      { key: 'payments', label: 'Payment reviews', href: '/admin#payment-reviews', icon: 'wallet' },
      { key: 'finance', label: 'Finance & accounts', href: '/admin/finance', icon: 'chart' },
      { key: 'settings', label: 'Payment settings', href: '/admin#payment-settings', icon: 'settings' },
      { key: 'academy-settings', label: 'Academy profile & location', href: '/admin/settings', icon: 'map-pin' },
      { key: 'teachers', label: 'Teacher assignments', href: '/admin#teacher-assignments', icon: 'users' },
      { key: 'announcements', label: 'Announcements', href: '/admin#announcements', icon: 'bell' },
      { key: 'courses', label: 'Course studio', href: '/admin/courses', icon: 'book' },
      { key: 'learning-graph', label: 'Subjects & concept graph', href: '/admin/learning', icon: 'chart' },
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
    <main className={`portal-shell portal-layout portal-role-${role}`}>
      <aside className="portal-sidebar">
        <Link className="portal-brand" href="/" aria-label="JMT Academy home">
          <span className="portal-brand-symbol"><PortalIcon name="flask" size={22}/></span>
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
                  <span className="portal-nav-icon"><PortalIcon name={item.icon} size={16}/></span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="portal-sidebar-footer">
          <Link href="/"><PortalIcon name="arrow-left" size={15}/> Visit public website</Link>
          <span>Organised learning. Clear progress.</span>
        </div>
      </aside>
      <div className="portal-workspace">
        <header className="portal-header portal-topbar">
          <div className="portal-topbar-title">
            <span>YOUR WORKSPACE</span>
            <strong>{title}</strong>
          </div>
          {role !== 'student' && <details className="portal-mobile-drawer">
            <summary><PortalIcon name="menu" size={17}/> Menu</summary>
            <div className="portal-mobile-drawer-panel">
              {navigation[role].flatMap(group => group.items).map(item => (
                <Link className={active === item.key ? 'is-active' : ''} href={item.href} key={item.key}>
                  <PortalIcon name={item.icon} size={17}/><span>{item.label}</span>
                </Link>
              ))}
            </div>
          </details>}
          <div className="portal-topbar-actions">
            <LocaleSwitcher returnTo={returnTo} />
            <form action={signOut}><button className="quiet-button" type="submit">Sign out</button></form>
          </div>
        </header>
        {children}
      </div>
      {role === 'student' && <nav className="student-bottom-nav" aria-label="Student quick navigation">
        {[
          {key:'overview',label:'Home',href:'/student',icon:'home' as const},
          {key:'courses',label:'Courses',href:'/courses',icon:'book-open' as const},
          {key:'learning',label:'Learn',href:'/student#courses',icon:'graduation-cap' as const},
          {key:'payments',label:'Fees',href:'/student#payments',icon:'wallet' as const},
          {key:'profile',label:'Profile',href:'/student#profile',icon:'user' as const},
        ].map(item => <Link key={item.key} href={item.href} className={active===item.key?'is-active':''} aria-current={active===item.key?'page':undefined}>
          <PortalIcon name={item.icon} size={19}/><span>{item.label}</span>
        </Link>)}
      </nav>}
    </main>
  );
}
