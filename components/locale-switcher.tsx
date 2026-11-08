import { cookies } from 'next/headers';
import { setLanguage } from '@/app/actions/language';
export async function LocaleSwitcher({returnTo}:{returnTo:string}) {
 const jar=await cookies(); const locale=(jar.get('jmt_locale')?.value??jar.get('skc_locale')?.value)==='en'?'en':'bn';
 return <form action={setLanguage} className="language-form"><input type="hidden" name="return_to" value={returnTo}/><button className="language-button" name="locale" value={locale==='bn'?'en':'bn'}>{locale==='bn'?'English':'বাংলা'}</button></form>;
}
