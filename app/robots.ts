import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
 const base='https://sanjay-kumar-chemistry-lms.onrender.com';
 return { rules:[{userAgent:'*',allow:'/',disallow:['/admin','/teacher','/student','/portal','/learn/','/api/','/auth/','/reset-password']}], sitemap:base+'/sitemap.xml', host:base };
}
