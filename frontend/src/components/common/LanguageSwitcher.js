'use client';

import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { persistLanguage, SUPPORTED_LANGUAGES } from '@/lib/i18n';

const OPTIONS = [
  { code: 'en', label: 'English', native: 'English', flag: 'US' },
  { code: 'as', label: 'Assamese', native: 'অসমীয়া', flag: 'IN' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', flag: 'IN' },
  { code: 'brx', label: 'Bodo', native: 'बड़ो', flag: 'IN' },
  { code: 'doi', label: 'Dogri', native: 'डोगरी', flag: 'IN' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', flag: 'IN' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: 'IN' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', flag: 'IN' },
  { code: 'ks', label: 'Kashmiri', native: 'कॉशुर', flag: 'IN' },
  { code: 'kok', label: 'Konkani', native: 'कोंकणी', flag: 'IN' },
  { code: 'mai', label: 'Maithili', native: 'मैथिली', flag: 'IN' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', flag: 'IN' },
  { code: 'mni', label: 'Manipuri', native: 'ꯃꯤꯇꯩꯂꯣꯟ', flag: 'IN' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', flag: 'IN' },
  { code: 'ne', label: 'Nepali', native: 'नेपाली', flag: 'IN' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ', flag: 'IN' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: 'IN' },
  { code: 'sa', label: 'Sanskrit', native: 'संस्कृतम्', flag: 'IN' },
  { code: 'sat', label: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ', flag: 'IN' },
  { code: 'sd', label: 'Sindhi', native: 'سنڌي', flag: 'IN' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', flag: 'IN' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: 'IN' },
  { code: 'ur', label: 'Urdu', native: 'اردو', flag: 'IN' },
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const value = (i18n?.language || 'en').split('-')[0];

  const handleChange = async (event) => {
    const next = event.target.value;
    if (!SUPPORTED_LANGUAGES.includes(next)) {
      return;
    }

    await i18n.changeLanguage(next);
    persistLanguage(next);
  };

  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
      <Languages className="h-4 w-4 text-emerald-600" />
      <span className="hidden sm:inline">{t('language')}</span>
      <select
        value={value}
        onChange={handleChange}
        className="bg-transparent text-sm font-semibold text-slate-800 outline-none"
        aria-label={t('select_language')}
      >
        {OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {option.flag} {option.label} ({option.native})
          </option>
        ))}
      </select>
    </label>
  );
}
