import type { Metadata } from 'next';
import './globals.css';
import { LocaleDocumentLanguage } from '@/components/locale-document-language';
import { Inter, Noto_Sans_Bengali } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const bengali = Noto_Sans_Bengali({ subsets: ['bengali'], variable: '--font-bengali', display: 'swap' });
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL || 'https://sanjay-kumar-chemistry-lms.onrender.com').replace(/\/$/, '');
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'JMT Academy | Online & Offline Learning', template: '%s | JMT Academy' },
  description: 'JMT Academy is a multi-subject learning platform in Bangladesh, supporting school, higher-secondary, admission, university, vocational and skills programmes through flexible online and offline learning.',
  applicationName: 'JMT Academy',
  keywords: ['JMT Academy','Multi-subject learning Bangladesh','Online learning','Offline learning','Physics','Chemistry','Biology','Mathematics','Bangla','English','ICT','University preparation','Vocational education'],
  openGraph: { type: 'website', siteName: 'JMT Academy', title: 'JMT Academy | Multi-Subject Learning', description: 'Structured online and offline learning across school, admission, university, vocational and skills programmes.', locale: 'en_BD' },
  twitter: { card: 'summary', title: 'JMT Academy | Multi-Subject Learning', description: 'Online and offline courses across school, admission, university and vocational programmes.' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
};
export default function RootLayout({children}:{children:React.ReactNode}){
 const structuredData={ '@context':'https://schema.org','@type':'EducationalOrganization',name:'JMT Academy',url:siteUrl,description:'A multi-subject online and offline learning platform in Bangladesh for school, higher-secondary, admission, university, vocational and skills education.',areaServed:{'@type':'Country',name:'Bangladesh'},knowsAbout:['Physics','Chemistry','Biology','Mathematics','Bangla','English','ICT','Business studies','Humanities','University preparation','Vocational education','Skills training','Online learning','Offline learning'],hasOfferCatalog:{'@type':'OfferCatalog',name:'JMT Academy Courses',url:siteUrl+'/courses'}};
 return <html lang="bn"><head><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData).replace(/</g,'\\u003c')}} /></head><body className={`${inter.variable} ${bengali.variable}`}><LocaleDocumentLanguage />{children}</body></html>;
}
