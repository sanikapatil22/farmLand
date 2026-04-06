'use client';

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { applyDocumentLanguage, initializeI18n } from '@/lib/i18n';

export default function I18nProvider({ children }) {
  useEffect(() => {
    const instance = initializeI18n();
    applyDocumentLanguage(instance.language);

    const onLanguageChanged = (lng) => {
      applyDocumentLanguage(lng);
    };

    instance.on('languageChanged', onLanguageChanged);

    return () => {
      instance.off('languageChanged', onLanguageChanged);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
