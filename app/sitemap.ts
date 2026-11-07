import type { MetadataRoute } from 'next';
const base='https://sanjay-kumar-chemistry-lms.onrender.com';
export default function sitemap(): MetadataRoute.Sitemap {
 const now=new Date();
 const paths=['','/courses','/courses/hsc-2027-chemistry','/courses/hsc-2028-chemistry','/courses/admission-chemistry','/about','/contact','/help','/privacy','/terms'];
 return paths.map(path=>({url:base+path,lastModified:now,changeFrequency:path===''?'weekly':'monthly',priority:path===''?1:path.startsWith('/courses')?0.9:0.5}));
}
