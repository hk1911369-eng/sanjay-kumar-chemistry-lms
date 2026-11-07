import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
 return {
  name: 'JMT Academy',
  short_name: 'JMT Academy',
  description: 'Online and offline learning programmes from JMT Academy.',
  start_url: '/',
  display: 'standalone',
  background_color: '#f5f8fc',
  theme_color: '#102b52',
  icons: [{src:'/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}],
 };
}
