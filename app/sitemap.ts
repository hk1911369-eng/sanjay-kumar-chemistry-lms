import type { MetadataRoute } from 'next';
const base=(process.env.NEXT_PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL || 'https://sanjay-kumar-chemistry-lms.onrender.com').replace(/\/$/, '');
export default function sitemap(): MetadataRoute.Sitemap {
 const now=new Date();
 // Draft legal pages stay reachable for visitors but are excluded from search discovery until owner review.
 const paths=['','/courses','/about','/contact','/help'];
 return paths.map(path=>({url:base+path,lastModified:now,changeFrequency:path===''?'weekly':'monthly',priority:path===''?1:path.startsWith('/courses')?0.9:0.5}));
}
