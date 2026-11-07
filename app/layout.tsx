import type { Metadata } from 'next';
import './globals.css';
import { cookies } from 'next/headers';
const siteUrl = 'https://sanjay-kumar-chemistry-lms.onrender.com';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Sanjay Kumar Chemistry | HSC 2027, HSC 2028 & Admission Chemistry', template: '%s | Sanjay Kumar Chemistry' },
  description: 'Learn Chemistry online in Bangladesh with Sanjay Kumar. Explore HSC 2027 Chemistry, HSC 2028 Chemistry and University Admission Chemistry courses in Bangla and English.',
  applicationName: 'Sanjay Kumar Chemistry',
  keywords: ['Sanjay Kumar Chemistry','Chemistry Bangladesh','HSC Chemistry 2027','HSC Chemistry 2028','Admission Chemistry','Online Chemistry course Bangladesh','এইচএসসি রসায়ন','ভর্তি রসায়ন','Chemistry course Bangla'],
  alternates: { canonical: '/' },
  openGraph: { type: 'website', url: siteUrl, siteName: 'Sanjay Kumar Chemistry', title: 'Sanjay Kumar Chemistry | HSC & Admission Courses', description: 'Structured online Chemistry learning for HSC 2027, HSC 2028 and university admission students in Bangladesh.', locale: 'en_BD' },
  twitter: { card: 'summary', title: 'Sanjay Kumar Chemistry | HSC & Admission Courses', description: 'Online Chemistry learning for HSC and university admission students in Bangladesh.' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
};
export default async function RootLayout({children}:{children:React.ReactNode}){
 const jar=await cookies(); const lang=jar.get('skc_locale')?.value==='en'?'en':'bn';
 const structuredData={ '@context':'https://schema.org','@type':'EducationalOrganization',name:'Sanjay Kumar Chemistry',url:siteUrl,description:'Online Chemistry learning for HSC 2027, HSC 2028 and university admission students in Bangladesh.',areaServed:{'@type':'Country',name:'Bangladesh'},knowsAbout:['Chemistry','HSC Chemistry','University Admission Chemistry'],hasOfferCatalog:{'@type':'OfferCatalog',name:'Chemistry Courses',itemListElement:[{'@type':'OfferCatalog',name:'HSC 2027 Chemistry',url:siteUrl+'/courses/hsc-2027-chemistry'},{'@type':'OfferCatalog',name:'HSC 2028 Chemistry',url:siteUrl+'/courses/hsc-2028-chemistry'},{'@type':'OfferCatalog',name:'Admission Chemistry',url:siteUrl+'/courses/admission-chemistry'}]}};
 return <html lang={lang}><head><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData).replace(/</g,'\\u003c')}} /></head><body>{children}</body></html>;
}
