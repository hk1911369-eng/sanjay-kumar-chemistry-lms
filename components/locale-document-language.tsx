'use client';
import { useEffect } from 'react';

export function LocaleDocumentLanguage() {
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\\s*)jmt_locale=(bn|en)(?:;|$)/);
    document.documentElement.lang = match?.[1] ?? 'bn';
  }, []);
  return null;
}
