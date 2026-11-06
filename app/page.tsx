import Link from 'next/link';
import { cookies } from 'next/headers';
import { translations, type Locale } from '@/lib/i18n';
import { setLanguage } from '@/app/actions/language';

const courses = [
  { slug: 'hsc-2027-chemistry', key: 'hsc27' as const, title: 'HSC 2027 Chemistry', detail: 'A dedicated Chemistry learning path for HSC 2027.' },
  { slug: 'hsc-2028-chemistry', key: 'hsc28' as const, title: 'HSC 2028 Chemistry', detail: 'A dedicated Chemistry learning path for HSC 2028.' },
  { slug: 'admission-chemistry', key: 'admission' as const, title: 'Admission Chemistry', detail: 'Chemistry preparation for university admission candidates.' },
];
export default async function Home() {
  const jar = await cookies();
  const locale: Locale = jar.get('skc_locale')?.value === 'en' ? 'en' : 'bn';
  const t = translations[locale];
  return <main>
    <div className="top">CHEMISTRY LEARNING · HSC · ADMISSION</div>
    <nav><Link className="brand" href="/"><span className="logo">⚗</span><span>{t.brand}<small>{t.tagline}</small></span></Link>
      <div className="navlinks"><Link href="/">{t.home}</Link><Link href="/courses">{t.courses}</Link><Link href="/about">{t.about}</Link><Link href="/contact">{t.contact}</Link>
        <form action={setLanguage} className="language-form"><input type="hidden" name="return_to" value="/"/><button name="locale" value={locale === 'bn' ? 'en' : 'bn'} className="language-button">{locale === 'bn' ? 'English' : 'বাংলা'}</button></form>
        <Link className="btn" href="/login">{t.login} ↗</Link></div></nav>
    <section className="hero" id="home"><div><span className="eyebrow">YOUR CHEMISTRY LEARNING SPACE</span><h1>{t.heroTitle}</h1><p>{t.heroText}</p><Link className="btn" href="/courses">{t.explore} →</Link>
      <div className="stats"><b>3 courses <small>Only HSC and Admission</small></b><b>৳700 <small>{t.price}</small></b><b>Manual review <small>Verified by Admin</small></b></div></div>
      <div className="portrait"><div className="avatar">⚗</div><h2>Sanjay Kumar</h2><p>Chemistry Instructor</p><small>Instructor biography and photograph can be added by Admin.</small></div></section>
    <section className="section" id="courses"><h2>{t.courses}</h2><p className="muted">{t.heroText}</p><div className="grid three">{courses.map(c=><article className="course" key={c.slug}><span>CHEMISTRY PROGRAM</span><h3>{t[c.key]}</h3><p>{c.detail}</p><b>৳700</b><br/><Link href={`/courses/${c.slug}`}>{t.explore} →</Link></article>)}</div></section>
    <section className="section alt"><h2>{t.how}</h2><div className="grid">{[t.step1,t.step2,t.step3,t.step4].map((s,i)=><article className="card" key={i}><div className="symbol">{i+1}</div><p>{s}</p></article>)}</div></section>
    <footer>{t.footer} · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/help">Help / FAQ</Link></footer>
  </main>;
}
