export interface CountryCurrency {
  country: string
  currency: string
  locale: string
  decimals: number
}

export const CURRENCY_DECIMALS: Record<string, number> = {
  AED: 2,
  SAR: 2,
  QAR: 2,
  EGP: 2,
  INR: 2,
  PKR: 2,
  TRY: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  ZAR: 2,
  AUD: 2,
  SGD: 2,
  KWD: 3,
  BHD: 3,
  OMR: 3,
  JOD: 3,
  TND: 3,
  LYD: 3,
  JPY: 0,
  KRW: 0,
}

export const COUNTRY_CURRENCIES: Record<string, CountryCurrency> = {
  'GCC — MENA': { country: 'GCC — MENA', currency: 'AED', locale: 'en-AE', decimals: 2 },
  'Saudi Arabia': { country: 'Saudi Arabia', currency: 'SAR', locale: 'en-SA', decimals: 2 },
  UAE: { country: 'UAE', currency: 'AED', locale: 'en-AE', decimals: 2 },
  Kuwait: { country: 'Kuwait', currency: 'KWD', locale: 'en-KW', decimals: 3 },
  Bahrain: { country: 'Bahrain', currency: 'BHD', locale: 'en-BH', decimals: 3 },
  Oman: { country: 'Oman', currency: 'OMR', locale: 'en-OM', decimals: 3 },
  Qatar: { country: 'Qatar', currency: 'QAR', locale: 'en-QA', decimals: 2 },
  Egypt: { country: 'Egypt', currency: 'EGP', locale: 'en-EG', decimals: 2 },
  India: { country: 'India', currency: 'INR', locale: 'en-IN', decimals: 2 },
  Pakistan: { country: 'Pakistan', currency: 'PKR', locale: 'en-PK', decimals: 2 },
  Turkey: { country: 'Turkey', currency: 'TRY', locale: 'tr-TR', decimals: 2 },
  Africa: { country: 'Africa', currency: 'ZAR', locale: 'en-ZA', decimals: 2 },
  Europe: { country: 'Europe', currency: 'EUR', locale: 'de-DE', decimals: 2 },
  'Asia Pacific': { country: 'Asia Pacific', currency: 'AUD', locale: 'en-AU', decimals: 2 },
  Americas: { country: 'Americas', currency: 'USD', locale: 'en-US', decimals: 2 },
  Global: { country: 'Global', currency: 'USD', locale: 'en-US', decimals: 2 },
}

const FALLBACK: CountryCurrency = COUNTRY_CURRENCIES.Global

const storedRegion = typeof localStorage !== 'undefined' ? localStorage.getItem('erp-region') : null
let active: CountryCurrency = COUNTRY_CURRENCIES[storedRegion || ''] || COUNTRY_CURRENCIES['GCC — MENA']

export function getCountryCurrency(country: string): CountryCurrency {
  return COUNTRY_CURRENCIES[country] || FALLBACK
}

export function setActiveCountry(country: string): CountryCurrency {
  active = getCountryCurrency(country)
  return active
}

export function getActiveCountry(): CountryCurrency {
  return active
}

export function getActiveCurrency(): string {
  return active.currency
}

export function formatMoney(value: any, currency?: string): string {
  const code = currency || active.currency
  const decimals = CURRENCY_DECIMALS[code] ?? active.decimals
  const raw = Number(value)
  const amount = Number.isFinite(raw) ? raw : 0
  return `${code} ${amount.toLocaleString(active.locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}
