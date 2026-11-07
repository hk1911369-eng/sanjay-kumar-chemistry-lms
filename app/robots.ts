import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
 const base=(process.env.NEXT_PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL || 'https://sanjay-kumar-chemistry-lms.onrender.com').replace(/\/$/, '');
 return { rules:[{userAgent:'*',allow:'/',disallow:['/admin','/teacher','/student','/portal','/learn/','/api/','/auth/','/reset-password']}], sitemap:base+'/sitemap.xml', host:base };
}
