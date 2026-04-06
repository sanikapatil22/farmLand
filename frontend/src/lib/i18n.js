'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from '../../locales/en/common.json';
import asCommon from '../../locales/as/common.json';
import bnCommon from '../../locales/bn/common.json';
import brxCommon from '../../locales/brx/common.json';
import doiCommon from '../../locales/doi/common.json';
import guCommon from '../../locales/gu/common.json';
import hiCommon from '../../locales/hi/common.json';
import knCommon from '../../locales/kn/common.json';
import ksCommon from '../../locales/ks/common.json';
import kokCommon from '../../locales/kok/common.json';
import maiCommon from '../../locales/mai/common.json';
import mlCommon from '../../locales/ml/common.json';
import mniCommon from '../../locales/mni/common.json';
import mrCommon from '../../locales/mr/common.json';
import neCommon from '../../locales/ne/common.json';
import orCommon from '../../locales/or/common.json';
import paCommon from '../../locales/pa/common.json';
import saCommon from '../../locales/sa/common.json';
import satCommon from '../../locales/sat/common.json';
import sdCommon from '../../locales/sd/common.json';
import taCommon from '../../locales/ta/common.json';
import teCommon from '../../locales/te/common.json';
import urCommon from '../../locales/ur/common.json';

const STORAGE_KEY = 'farmchain_language';
export const SUPPORTED_LANGUAGES = [
  'en',
  'as',
  'bn',
  'brx',
  'doi',
  'gu',
  'hi',
  'kn',
  'ks',
  'kok',
  'mai',
  'ml',
  'mni',
  'mr',
  'ne',
  'or',
  'pa',
  'sa',
  'sat',
  'sd',
  'ta',
  'te',
  'ur',
];

function getInitialLanguage() {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
    return stored;
  }

  const browserLang = (navigator.language || 'en').toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : 'en';
}

export function persistLanguage(language) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, language);
  }
}

export function applyDocumentLanguage(language) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.lang = language || 'en';
  document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
}

export function initializeI18n() {
  if (i18n.isInitialized) {
    return i18n;
  }

  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { common: enCommon },
        as: { common: asCommon },
        bn: { common: bnCommon },
        brx: { common: brxCommon },
        doi: { common: doiCommon },
        gu: { common: guCommon },
        hi: { common: hiCommon },
        kn: { common: knCommon },
        ks: { common: ksCommon },
        kok: { common: kokCommon },
        mai: { common: maiCommon },
        ml: { common: mlCommon },
        mni: { common: mniCommon },
        mr: { common: mrCommon },
        ne: { common: neCommon },
        or: { common: orCommon },
        pa: { common: paCommon },
        sa: { common: saCommon },
        sat: { common: satCommon },
        sd: { common: sdCommon },
        ta: { common: taCommon },
        te: { common: teCommon },
        ur: { common: urCommon },
      },
      lng: getInitialLanguage(),
      fallbackLng: 'en',
      defaultNS: 'common',
      ns: ['common'],
      interpolation: { escapeValue: false },
      returnNull: false,
      returnEmptyString: false,
    });

  persistLanguage(i18n.language);
  return i18n;
}

export default i18n;
