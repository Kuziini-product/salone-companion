// Helpers to derive brand logo URL from website + country flag emoji from ISO3.

/** Strip protocol/path/www from a website URL to get a bare domain. */
export function extractDomain(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const u = new URL(url);
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

/** Best-effort brand logo URL. Caller should swap to fallback on 404. */
export function brandLogoUrl(website: string | null | undefined, size = 128): string | null {
  const domain = extractDomain(website);
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}?size=${size}`;
}

/** Fallback if Clearbit doesn't have the logo: Google's favicon service. */
export function faviconUrl(website: string | null | undefined, size = 128): string | null {
  const domain = extractDomain(website);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

/**
 * Free landing-page screenshot via WordPress mShots. Cached on their CDN —
 * first request may return a placeholder; second hit returns the real one.
 * The browser sends a User-Agent automatically so the request isn't blocked.
 */
export function landingScreenshotUrl(
  website: string | null | undefined,
  width = 1200,
  height = 800,
): string | null {
  if (!website) return null;
  const url = website.startsWith('http') ? website : `https://${website}`;
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=${width}&h=${height}`;
}

// ISO3 → ISO2 for the countries that show up at Salone. The common European
// + global brands. Falls back to the country code itself if missing.
const ISO3_TO_ISO2: Record<string, string> = {
  ITA: 'IT', DEU: 'DE', FRA: 'FR', GBR: 'GB', ESP: 'ES', PRT: 'PT', NLD: 'NL',
  BEL: 'BE', LUX: 'LU', AUT: 'AT', CHE: 'CH', LIE: 'LI', POL: 'PL', CZE: 'CZ',
  SVK: 'SK', SVN: 'SI', HRV: 'HR', SRB: 'RS', BIH: 'BA', MNE: 'ME', MKD: 'MK',
  ALB: 'AL', GRC: 'GR', BGR: 'BG', ROU: 'RO', MDA: 'MD', UKR: 'UA', BLR: 'BY',
  RUS: 'RU', LTU: 'LT', LVA: 'LV', EST: 'EE', FIN: 'FI', SWE: 'SE', NOR: 'NO',
  DNK: 'DK', ISL: 'IS', IRL: 'IE', HUN: 'HU', CYP: 'CY', MLT: 'MT', TUR: 'TR',
  USA: 'US', CAN: 'CA', MEX: 'MX', BRA: 'BR', ARG: 'AR', CHL: 'CL', COL: 'CO',
  PER: 'PE', URY: 'UY', VEN: 'VE', JPN: 'JP', CHN: 'CN', HKG: 'HK', TWN: 'TW',
  KOR: 'KR', IND: 'IN', SGP: 'SG', MYS: 'MY', THA: 'TH', VNM: 'VN', IDN: 'ID',
  PHL: 'PH', AUS: 'AU', NZL: 'NZ', ZAF: 'ZA', EGY: 'EG', MAR: 'MA', TUN: 'TN',
  LBN: 'LB', ISR: 'IL', JOR: 'JO', SAU: 'SA', ARE: 'AE', QAT: 'QA', KWT: 'KW',
  BHR: 'BH', OMN: 'OM', IRN: 'IR', PAK: 'PK', BGD: 'BD', LKA: 'LK',
};

/** Convert ISO3 country code to flag emoji (via ISO2). */
export function countryFlagEmoji(iso3: string | null | undefined): string {
  if (!iso3) return '';
  const iso2 = ISO3_TO_ISO2[iso3.toUpperCase()];
  if (!iso2) return '';
  // Regional indicator letters: A=0x1F1E6, codePoint = 0x1F1E6 + (letter-65)
  const A = 0x1F1E6;
  const codePoints = [...iso2].map((c) => A + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...codePoints);
}
