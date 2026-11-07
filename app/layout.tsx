import type { Metadata } from 'next';
import './globals.css';
import { cookies } from 'next/headers';
const siteUrl = 'https://sanjay-kumar-chemistry-lms.onrender.com';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'JMT Academy | Online & Offline Learning', template: '%s | JMT Academy' },
  description: 'JMT Academy offers flexible online and offline learning programmes for HSC 2027, HSC 2028 and Admission Batch students.',
  applicationName: 'JMT Academy',
  keywords: ['JMT Academy','Online learning Bangladesh','Offline coaching academy','HSC 2027','HSC 2028','Admission Batch'],
  alternates: { canonical: '/' },
  openGraph: { type: 'website', url: siteUrl, siteName: 'JMT Academy', title: 'JMT Academy | Online & Offline Courses', description: 'Structured online and offline learning for HSC 2027, HSC 2028 and Admission Batch students.', locale: 'en_BD' },
  twitter: { card: 'summary', title: 'JMT Academy | Online & Offline Learning', description: 'Online and offline courses for HSC and Admission Batch students.' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
};
export default async function RootLayout({children}:{children:React.ReactNode}){
 const jar=await cookies(); const lang=jar.get('skc_locale')?.value==='en'?'en':'bn';
 const structuredData={ '@context':'https://schema.org','@type':'EducationalOrganization',name:'JMT Academy',url:siteUrl,description:'Online and offline learning for HSC 2027, HSC 2028 and Admission Batch students in Bangladesh.',areaServed:{'@type':'Country',name:'Bangladesh'},knowsAbout:['HSC 2027','HSC 2028','Admission Batch','Online learning','Offline coaching'],hasOfferCatalog:{'@type':'OfferCatalog',name:'JMT Academy Courses',url:siteUrl+'/courses',itemListElement:[{'@type':'OfferCatalog',name:'HSC 2027'},{'@type':'OfferCatalog',name:'HSC 2028'},{'@type':'OfferCatalog',name:'Admission Batch'}]}};
 return <html lang={lang}><head><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData).replace(/</g,'\\u003c')}} /></head><body>{children}</body></html>;
}
