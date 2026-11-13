/**
 * Reading the news for the work game: is a story about this company, is it
 * one we can use on a family platform, and what kind of event is it?
 *
 * Pure, so the server and the tests share it. Headlines are data: nothing
 * here (or anywhere) follows instructions found in them.
 */

/** Event kinds, checked in this order (the first match wins), with what they mean at work. */
export const EVENT_KINDS = [
  ['layoffs', /\b(lay ?offs?|laid off|lays off|job cuts?|cut(s|ting)? [\d,]+ (jobs|positions|roles|workers|employees)|workforce reduction|restructur\w*|downsiz\w*)\b/i],
  ['earnings-miss', /\b(miss(es|ed)? (estimates|expectations)|falls? short|cuts? (its )?(guidance|outlook|forecast)|lowers? (guidance|outlook|forecast)|profit warning|weak (results|quarter|outlook))\b/i],
  ['earnings-beat', /\b(beats? (estimates|expectations)|tops? (estimates|expectations)|record (revenue|sales|quarter|profit)|raises? (its )?(guidance|outlook|forecast)|strong (results|quarter))\b/i],
  ['earnings', /\b(earnings|quarterly results|Q[1-4] results|fiscal (quarter|year))\b/i],
  ['recall', /\b(recall\w*|outage|breach|hack(ed|ers)?|cyber ?attack|defect\w*|safety (issue|probe|concern))\b/i],
  ['legal', /\b(lawsuit|sues?|sued|settle(s|d|ment)?|antitrust|regulators?|probe|investigation|fine[sd]?|FTC|SEC charges)\b/i],
  ['leadership', /\b(CEO|chief executive|CFO|chief financial|resigns?|steps? down|appoint\w*|names? new|succession)\b/i],
  ['acquisition', /\b(acquir\w*|acquisition|merger|merge|takeover|to buy|deal to buy|buyout)\b/i],
  ['product', /\b(launch\w*|unveil\w*|introduc\w*|debut\w*|new (product|model|feature|service|app|chip)|rolls? out)\b/i],
  ['partnership', /\b(partner(s|ship)?|collaborat\w*|teams? up|wins? .{0,30}contract|signs? .{0,30}deal|agreement with)\b/i],
  ['analyst-up', /\b(upgrade[sd]?|raises? .{0,20}(price )?target|outperform|overweight|buy rating)\b/i],
  ['analyst-down', /\b(downgrade[sd]?|cuts? .{0,20}(price )?target|slash\w* .{0,20}target|underperform|underweight|sell rating)\b/i],
  ['capital', /\b(dividend|buyback|share repurchase|repurchase program)\b/i],
  ['expansion', /\b(hiring|to hire|expand\w*|new (plant|factory|office|store|headquarters|campus)|invest\w* \$?[\d.]+ ?(billion|million))\b/i]
];
export const EVENT_IDS = [...EVENT_KINDS.map(([id]) => id), 'other'];

/** What an event does to the company mood and to its people. */
export const EVENT_EFFECTS = {
  layoffs: { mood: -3, layoff: true, freezeDays: 7 },
  'earnings-miss': { mood: -2 },
  'earnings-beat': { mood: 2, bonus: 0.02 },
  earnings: { mood: 0 },
  recall: { mood: -1, urgent: true },
  legal: { mood: -1 },
  leadership: { mood: 0 },
  acquisition: { mood: 1 },
  product: { mood: 1 },
  partnership: { mood: 1 },
  'analyst-up': { mood: 1 },
  'analyst-down': { mood: -1 },
  capital: { mood: 1, bonus: 0.01 },
  expansion: { mood: 2 },
  other: { mood: 0 }
};

export function classify(headline, summary = '') {
  const text = `${headline} ${summary}`;
  return EVENT_KINDS.find(([, re]) => re.test(text))?.[0] ?? 'other';
}

/**
 * Stories we do not turn into missions on a platform children use: politics,
 * violence, crime, adult topics, disasters. (They are still stored, unused.)
 */
const UNSAFE = /\b(election|senator|congress\w*|democrat\w*|republican\w*|president (trump|biden)|trump|biden|white house|campaign|war|wars|military strike|missile|shooting|shot|killed|kill(s|ing)?|murder\w*|dead|deaths?|died|suicide|terror\w*|sex\w*|porn\w*|abuse\w*|assault\w*|drugs?|cannabis|marijuana|opioid\w*|gambling|casino|alcohol|beer|liquor|tobacco|cigarette\w*|vape|firearm\w*|guns?|weapon\w*|crypto\w*|bitcoin|tariff war)\b/i;
export const isSafe = (headline, summary = '') => !UNSAFE.test(`${headline} ${summary}`);

/** The short name a headline uses: "Apple", "Alphabet", "Coca-Cola", "Home Depot". */
export function shortName(name) {
  return String(name)
    .replace(/\(.*?\)/g, '')
    .replace(/,?\s+(Inc\.?|Incorporated|Corporation|Corp\.?|Company|Co\.?|Holdings?|Group|plc|Ltd\.?|Limited|S\.A\.|N\.V\.|Class [A-C]|The)$/gi, '')
    .replace(/^The\s+/i, '')
    .trim();
}

/**
 * Is a story about this company? Its symbol is tagged and either few companies
 * are (four or fewer) or the headline names it.
 */
export function isAbout(item, company) {
  const symbols = item.symbols ?? [];
  if (!symbols.includes(company.symbol)) return false;
  if (symbols.filter((s) => /^[A-Z.]+$/.test(s) && !['SPY', 'QQQ', 'DIA', 'IWM', 'SMH', 'GLD', 'XLK'].includes(s)).length <= 4) return true;
  const name = shortName(company.name).toLowerCase();
  const head = String(item.headline ?? '').toLowerCase();
  return (name.length >= 3 && head.includes(name)) || new RegExp(`\\b${company.symbol.replace('.', '\\.')}\\b`, 'i').test(item.headline ?? '');
}

/** Clean text from a feed: entities decoded, whitespace folded, cut short. */
export function cleanText(s, max) {
  return String(s ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
