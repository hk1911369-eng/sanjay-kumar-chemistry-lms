import type { Metadata } from 'next';
import './globals.css';
import { cookies } from 'next/headers';
export const metadata:Metadata={title:'Sanjay Kumar Chemistry',description:'Structured Chemistry learning for HSC 2027, HSC 2028 and Admission students.'};
export default async function RootLayout({children}:{children:React.ReactNode}){const jar=await cookies();const lang=jar.get('skc_locale')?.value==='en'?'en':'bn';return <html lang={lang}><body>{children}</body></html>}
