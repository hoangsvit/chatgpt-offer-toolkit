// Local suggestions only: browser language/region is not verified billing information.
// No network request, account access, location permission or storage is required.
const currencies: Readonly<Record<string, string>> = Object.freeze({
  US:'USD', VN:'VND', GB:'GBP', CA:'CAD', AU:'AUD', NZ:'NZD', JP:'JPY',
  KR:'KRW', SG:'SGD', MY:'MYR', TH:'THB', ID:'IDR', PH:'PHP', IN:'INR',
  TW:'TWD', HK:'HKD', MO:'MOP', CN:'CNY', KH:'KHR', LA:'LAK', MM:'MMK',
  BD:'BDT', PK:'PKR', LK:'LKR', NP:'NPR', BN:'BND', TL:'USD',
  AT:'EUR', BE:'EUR', BG:'EUR', HR:'EUR', CY:'EUR', EE:'EUR', FI:'EUR',
  FR:'EUR', DE:'EUR', GR:'EUR', IE:'EUR', IT:'EUR', LV:'EUR', LT:'EUR',
  LU:'EUR', MT:'EUR', NL:'EUR', PT:'EUR', SK:'EUR', SI:'EUR', ES:'EUR',
  AD:'EUR', MC:'EUR', SM:'EUR', VA:'EUR', ME:'EUR', XK:'EUR',
  CH:'CHF', LI:'CHF', DK:'DKK', NO:'NOK', SE:'SEK', IS:'ISK',
  PL:'PLN', CZ:'CZK', HU:'HUF', RO:'RON', RS:'RSD', AL:'ALL', BA:'BAM',
  MK:'MKD', UA:'UAH', MD:'MDL', TR:'TRY', GE:'GEL', AM:'AMD',
  IL:'ILS', AE:'AED', SA:'SAR', QA:'QAR', KW:'KWD', BH:'BHD', OM:'OMR',
  JO:'JOD', EG:'EGP', MA:'MAD', TN:'TND', ZA:'ZAR', NG:'NGN', KE:'KES',
  GH:'GHS', TZ:'TZS', UG:'UGX', ET:'ETB', RW:'RWF', MX:'MXN',
  BR:'BRL', AR:'ARS', CL:'CLP', CO:'COP', PE:'PEN', UY:'UYU', PY:'PYG',
  BO:'BOB', EC:'USD', PA:'PAB', CR:'CRC', GT:'GTQ', DO:'DOP', SV:'USD',
  HN:'HNL', NI:'NIO', JM:'JMD', TT:'TTD', KZ:'KZT', UZ:'UZS'
});
export function currencyForCountry(country: string): string | null {
  const code = country.trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(currencies,code) ? currencies[code] ?? null : null;
}
export function suggestBilling(locales: readonly string[]): {country:string;currency:string|null} | null {
  for (const value of locales) {
    try {
      // Do not maximize language-only tags: e.g. "en" does not establish a country.
      const country = new Intl.Locale(value.replaceAll('_','-')).region;
      if (country && /^[A-Z]{2}$/.test(country) && country !== 'ZZ' && country !== 'EU') {
        return {country,currency:currencyForCountry(country)};
      }
    } catch { /* ignore invalid locale */ }
  }
  return null;
}

export const BILLING_PREFERENCE_KEY = 'offerToolkitConfirmedBillingV1';
export function parseBillingPreference(value: unknown): {country:string;currency:string} | null {
  if (!value || typeof value !== 'object') return null;
  const {country,currency} = value as {country?:unknown;currency?:unknown};
  return typeof country === 'string' && /^[A-Z]{2}$/.test(country) &&
    typeof currency === 'string' && /^[A-Z]{3}$/.test(currency) ? {country,currency} : null;
}
