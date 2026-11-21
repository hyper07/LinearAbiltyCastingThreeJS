/**
 * Text normalisation for generated voices: what the speech model is given to
 * read, per language, so numbers, sums, symbols, fractions, years, units and
 * emoji come out the way a teacher would say them.
 *
 *   speakable('3 + 7 = ?', 'en')     → 'three plus seven equals what?'
 *   speakable('1492년', 'ko')         → '천사백구십이 년'
 *   speakable('3/4', 'ja')           → '四分の三'
 *   speakable('30%', 'zh')           → '百分之三十'
 *   spokenKey(text, lang)            → the form used to compare a take's transcript with the script
 *   errorRate(script, heard, lang)   → word error rate (en, es) or character error rate (ko, ja, zh)
 *
 * Pure string work: the generator (scripts/voice-gen.mjs), the server and the
 * unit tests all use it.
 */

/* ---------------------------------------------------------------- shared */

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}︎️‍⃣]/gu;
const MINUS = '−';
const SUPER = { '²': 2, '³': 3 };

/** Strip emoji, pictographs and their joiners (keep the words around them). */
export const stripEmoji = (s) => String(s ?? '').replace(EMOJI, '');

const toInt = (s) => Number(String(s).replace(/[,\s  ]/g, ''));

/* ---------------------------------------------------------------- English */

const EN_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
export function enNumber(n) {
  n = Math.trunc(n);
  if (n < 0) return `minus ${enNumber(-n)}`;
  if (n < 20) return EN_ONES[n];
  if (n < 100) return EN_TENS[Math.floor(n / 10)] + (n % 10 ? `-${EN_ONES[n % 10]}` : '');
  if (n < 1000) return `${EN_ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${enNumber(n % 100)}` : ''}`;
  for (const [size, word] of [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']]) {
    if (n >= size) {
      const rest = n % size;
      return `${enNumber(Math.floor(n / size))} ${word}${rest ? (rest < 100 ? ` and ${enNumber(rest)}` : ` ${enNumber(rest)}`) : ''}`;
    }
  }
  return String(n);
}
/** A year the way people say it: 1492 → fourteen ninety-two, 1903 → nineteen oh three, 2009 → two thousand nine. */
export function enYear(n) {
  if (n >= 2000 && n < 2010) return n === 2000 ? 'two thousand' : `two thousand ${EN_ONES[n - 2000]}`;
  const hi = Math.floor(n / 100), lo = n % 100;
  if (lo === 0) return `${enNumber(hi)} hundred`;
  return `${enNumber(hi)} ${lo < 10 ? `oh ${EN_ONES[lo]}` : enNumber(lo)}`;
}
const EN_ORD = { 1: 'first', 2: 'second', 3: 'third', 5: 'fifth', 8: 'eighth', 9: 'ninth', 12: 'twelfth' };
export function enOrdinal(n) {
  if (EN_ORD[n]) return EN_ORD[n];
  if (n > 20 && n < 100 && n % 10) return `${EN_TENS[Math.floor(n / 10)]}-${enOrdinal(n % 10)}`;
  const w = enNumber(n);
  return w.endsWith('y') ? `${w.slice(0, -1)}ieth` : `${w}th`;
}
function enFraction(a, b) {
  const num = enNumber(a);
  if (b === 2) return `${num} ${a === 1 ? 'half' : 'halves'}`;
  if (b === 4) return `${num} ${a === 1 ? 'quarter' : 'quarters'}`;
  return `${num} ${enOrdinal(b)}${a === 1 ? '' : 's'}`;
}
const digitsEn = (s) => [...s].map((d) => EN_ONES[+d]).join(' ');

const EN = {
  plus: 'plus', minus: 'minus', times: 'times', divided: 'divided by', equals: 'equals', what: 'what', neg: 'minus',
  squared: (x) => `${x} squared`, cubed: (x) => `${x} cubed`, root: (x) => `the square root of ${x}`,
  percent: (x) => `${x} percent`, degrees: (x, unit) => `${x} degrees${unit === 'C' ? ' Celsius' : unit === 'F' ? ' Fahrenheit' : ''}`,
  money: { '£': ['pound', 'pounds'], $: ['dollar', 'dollars'], '€': ['euro', 'euros'] },
  units: { 'km/h': 'kilometres per hour', 'm/s': 'metres per second', km: 'kilometres', cm: 'centimetres', kg: 'kilograms', mm: 'millimetres', s: 'seconds', m: 'metres', g: 'grams' },
  squareUnit: (u) => `square ${u}`,
  number: enNumber, fraction: enFraction,
  decimal: (i, f) => `${enNumber(i)} point ${digitsEn(f)}`
};

function english(s) {
  s = s.replace(/\b(mid-)?(1[0-9]|20)(\d)0s\b/g, (_, mid, c, d) => `${mid ? 'mid ' : ''}${d === '0' ? `${enNumber(+c)} hundreds` : `${enNumber(+c)} ${EN_TENS[+d].replace(/y$/, 'ies')}`}`);
  s = s.replace(/\b(\d+)(st|nd|rd|th)\b/g, (_, n) => enOrdinal(+n));
  // Years: four digits with no thousands comma, 1000–2099 (other big numbers are written with commas).
  s = s.replace(/(?<![\d.,])(1\d{3}|20\d{2})(?![\d,.]\d|\s?%|\s?°)/g, (_, y) => enYear(+y));
  return s;
}

/* ---------------------------------------------------------------- Spanish */

const ES_ONES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const ES_TENS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const ES_HUNDREDS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
export function esNumber(n, { apocope = false } = {}) {
  n = Math.trunc(n);
  if (n < 0) return `menos ${esNumber(-n)}`;
  const one = (w) => (apocope ? w.replace(/uno$/, 'ún').replace(/^ún$/, 'un').replace(/veintiún$/, 'veintiún') : w);
  if (n < 30) return one(ES_ONES[n]);
  if (n < 100) return ES_TENS[Math.floor(n / 10)] + (n % 10 ? ` y ${one(ES_ONES[n % 10])}` : '');
  if (n === 100) return 'cien';
  if (n < 1000) return ES_HUNDREDS[Math.floor(n / 100)] + (n % 100 ? ` ${esNumber(n % 100, { apocope })}` : '');
  if (n < 1e6) {
    const k = Math.floor(n / 1000);
    return `${k === 1 ? '' : `${esNumber(k, { apocope: true })} `}mil${n % 1000 ? ` ${esNumber(n % 1000, { apocope })}` : ''}`;
  }
  const m = Math.floor(n / 1e6);
  return `${m === 1 ? 'un millón' : `${esNumber(m, { apocope: true })} millones`}${n % 1e6 ? ` ${esNumber(n % 1e6, { apocope })}` : ''}`;
}
const ES_DEN = { 2: ['medio', 'medios'], 3: ['tercio', 'tercios'], 4: ['cuarto', 'cuartos'], 5: ['quinto', 'quintos'], 6: ['sexto', 'sextos'], 7: ['séptimo', 'séptimos'], 8: ['octavo', 'octavos'], 9: ['noveno', 'novenos'], 10: ['décimo', 'décimos'], 100: ['centésimo', 'centésimos'] };
function esFraction(a, b) {
  const d = ES_DEN[b];
  if (d) return `${a === 1 ? 'un' : esNumber(a)} ${a === 1 ? d[0] : d[1]}`;
  return `${esNumber(a)} entre ${esNumber(b)}`;
}
const ES = {
  plus: 'más', minus: 'menos', times: 'por', divided: 'entre', equals: 'es igual a', what: 'cuánto', neg: 'menos',
  squared: (x) => `${x} al cuadrado`, cubed: (x) => `${x} al cubo`, root: (x) => `la raíz cuadrada de ${x}`,
  percent: (x) => `${x} por ciento`, degrees: (x, unit) => `${x} grados${unit === 'C' ? ' centígrados' : unit === 'F' ? ' Fahrenheit' : ''}`,
  money: { '£': ['libra', 'libras'], $: ['dólar', 'dólares'], '€': ['euro', 'euros'] },
  units: { 'km/h': 'kilómetros por hora', 'm/s': 'metros por segundo', km: 'kilómetros', cm: 'centímetros', kg: 'kilos', mm: 'milímetros', s: 'segundos', m: 'metros', g: 'gramos' },
  squareUnit: (u) => `${u} cuadrados`,
  number: esNumber, fraction: esFraction,
  decimal: (i, f) => `${esNumber(i)} coma ${f.startsWith('0') ? [...f].map((d) => ES_ONES[+d]).join(' ') : esNumber(+f)}`
};
function spanish(s) {
  // "80 000" (a space between thousands) is one number.
  return s.replace(/\b(\d{1,3})((?: \d{3})+)(?!\d)/g, (_, a, b) => a + b.replace(/ /g, ''));
}

/* ---------------------------------------------------------------- Korean */

const KO_SINO = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
/** Sino-Korean: 1492 → 천사백구십이, 384000 → 삼십팔만 사천. */
export function koSino(n) {
  n = Math.trunc(n);
  if (n < 0) return `마이너스 ${koSino(-n)}`;
  if (n === 0) return '영';
  const small = (x) => {
    let out = '';
    for (const [v, w] of [[1000, '천'], [100, '백'], [10, '십']]) {
      const d = Math.floor(x / v) % 10;
      if (d) out += (d === 1 ? '' : KO_SINO[d]) + w;
    }
    return out + (x % 10 ? KO_SINO[x % 10] : '');
  };
  const parts = [];
  for (const [v, w] of [[1e8, '억'], [1e4, '만']]) {
    const k = Math.floor(n / v) % 10000;
    if (k) parts.push((k === 1 && w === '만' ? '' : small(k)) + w);
  }
  if (n % 10000) parts.push(small(n % 10000));
  return parts.join(' ');
}
const KO_NATIVE = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉'];
const KO_NATIVE_MOD = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'];
const KO_NATIVE_TENS = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];
/** Native Korean (1–99), the form before a counter: 1 → 한, 20 → 스무, 21 → 스물한. */
export function koNative(n, { counter = true } = {}) {
  if (n <= 0 || n >= 100) return koSino(n);
  const t = Math.floor(n / 10), o = n % 10;
  if (counter && n === 20) return '스무';
  return KO_NATIVE_TENS[t] + (o ? (counter ? KO_NATIVE_MOD : KO_NATIVE)[o] : '');
}
/** Counters read with native numbers (below 100). */
const KO_NATIVE_COUNTERS = ['개', '명', '마리', '살', '시간', '시', '번', '줄', '칸', '조각', '묶음', '권', '잔', '장', '그루', '송이', '병', '켤레', '벌', '채', '가지', '배', '걸음', '바퀴', '방울', '군데', '사람'];
const KO_COUNTER_RE = new RegExp(`^(${KO_NATIVE_COUNTERS.sort((a, b) => b.length - a.length).join('|')})`);
function koInt(n, after) {
  if (after.startsWith('월')) return n === 6 ? '유' : n === 10 ? '시' : koSino(n);
  if (n > 0 && n < 100 && KO_COUNTER_RE.test(after) && !/^(번지|번호|시대|시기|시작|개월|배율)/.test(after)) return `${koNative(n)} `;
  return koSino(n);
}
const KO = {
  plus: '더하기', minus: '빼기', times: '곱하기', divided: '나누기', equals: '는', what: '얼마', neg: '마이너스',
  squared: (x) => `${x}의 제곱`, cubed: (x) => `${x}의 세제곱`, root: (x) => `루트 ${x}`,
  percent: (x) => `${x} 퍼센트`, degrees: (x, unit) => `${unit === 'F' ? '화씨 ' : ''}${x}도`,
  money: { '£': ['파운드', '파운드'], $: ['달러', '달러'], '€': ['유로', '유로'] },
  units: { 'km/h': '킬로미터 퍼 아워', 'm/s': '미터 퍼 세컨드', km: '킬로미터', cm: '센티미터', kg: '킬로그램', mm: '밀리미터', s: '초', m: '미터', g: '그램' },
  squareUnit: (u) => `제곱${u}`,
  number: koSino,
  fraction: (a, b) => `${koSino(b)}분의 ${koSino(a)}`,
  decimal: (i, f) => `${koSino(i)} 점 ${[...f].map((d) => KO_SINO[+d]).join('')}`
};

/* ---------------------------------------------------------------- Japanese */

const JA_D = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
/** Kanji numerals: 1492 → 千四百九十二, 300000 → 三十万. */
export function jaNumber(n) {
  n = Math.trunc(n);
  if (n < 0) return `マイナス${jaNumber(-n)}`;
  if (n === 0) return 'ゼロ';
  const small = (x) => {
    let out = '';
    for (const [v, w] of [[1000, '千'], [100, '百'], [10, '十']]) {
      const d = Math.floor(x / v) % 10;
      if (d) out += (d === 1 ? '' : JA_D[d]) + w;
    }
    return out + (x % 10 ? JA_D[x % 10] : '');
  };
  let out = '';
  for (const [v, w] of [[1e8, '億'], [1e4, '万']]) {
    const k = Math.floor(n / v) % 10000;
    if (k) out += small(k) + w;
  }
  return out + (n % 10000 ? small(n % 10000) : '');
}
const JA_TSU = ['', 'ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'いつつ', 'むっつ', 'ななつ', 'やっつ', 'ここのつ'];
const JA_KANA_D = ['れい', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
const JA = {
  plus: 'たす', minus: 'ひく', times: 'かける', divided: 'わる', equals: 'は', what: 'いくつ', neg: 'マイナス',
  squared: (x) => `${x}の二乗`, cubed: (x) => `${x}の三乗`, root: (x) => `ルート${x}`,
  percent: (x) => `${x}パーセント`, degrees: (x, unit) => `${unit === 'F' ? 'カ氏' : ''}${x}度`,
  money: { '£': ['ポンド', 'ポンド'], $: ['ドル', 'ドル'], '€': ['ユーロ', 'ユーロ'] },
  units: { 'km/h': 'キロメートル毎時', 'm/s': 'メートル毎秒', km: 'キロメートル', cm: 'センチメートル', kg: 'キログラム', mm: 'ミリメートル', s: '秒', m: 'メートル', g: 'グラム' },
  squareUnit: (u) => `平方${u}`,
  number: jaNumber,
  fraction: (a, b) => `${jaNumber(b)}分の${jaNumber(a)}`,
  decimal: (i, f) => `${i === 0 ? 'れい' : jaNumber(i)}てん${[...f].map((d) => JA_KANA_D[+d]).join('')}`,
  intWithContext: (n, after) => (n > 0 && n < 10 && after.startsWith('つ') ? `\u0000${JA_TSU[n]}` : jaNumber(n))
};

/* ---------------------------------------------------------------- Chinese */

const ZH_D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
/** Chinese numerals: 1492 → 一千四百九十二, 28000 → 两万八千 (两 before 千/万). */
export function zhNumber(n) {
  n = Math.trunc(n);
  if (n < 0) return `负${zhNumber(-n)}`;
  if (n === 0) return '零';
  const small = (x, lead) => {
    let out = '', zero = false;
    for (const [v, w] of [[1000, '千'], [100, '百'], [10, '十'], [1, '']]) {
      const d = Math.floor(x / v) % 10;
      if (!d) {
        if (out) zero = true;
        continue;
      }
      if (zero) out += '零';
      zero = false;
      out += (d === 1 && v === 10 && !out && lead ? '' : d === 2 && v >= 1000 && !out ? '两' : ZH_D[d]) + w;
    }
    return out;
  };
  let out = '';
  for (const [v, w] of [[1e8, '亿'], [1e4, '万']]) {
    const k = Math.floor(n / v) % 10000;
    if (k) out += (k === 2 ? '两' : small(k, !out)) + w;
  }
  const rest = n % 10000;
  if (rest) out += (out && rest < 1000 ? '零' : '') + small(rest, !out);
  return out;
}
const ZH = {
  plus: '加', minus: '减', times: '乘', divided: '除以', equals: '等于', what: '多少', neg: '负',
  squared: (x) => `${x}的平方`, cubed: (x) => `${x}的立方`, root: (x) => `${x}的平方根`,
  percent: (x) => `百分之${x}`, degrees: (x, unit) => `${unit === 'F' ? '华氏' : ''}${x}度`,
  money: { '£': ['英镑', '英镑'], $: ['美元', '美元'], '€': ['欧元', '欧元'] },
  units: { 'km/h': '千米每小时', 'm/s': '米每秒', km: '千米', cm: '厘米', kg: '千克', mm: '毫米', s: '秒', m: '米', g: '克' },
  squareUnit: (u) => `平方${u}`,
  number: zhNumber,
  fraction: (a, b) => `${zhNumber(b)}分之${zhNumber(a)}`,
  decimal: (i, f) => `${zhNumber(i)}点${[...f].map((d) => ZH_D[d]).join('')}`,
  // Years are read digit by digit: 1492年 → 一四九二年.
  intWithContext: (n, after, raw) => (/^年/.test(after) && raw.length >= 3 ? [...raw].map((d) => ZH_D[+d]).join('') : zhNumber(n))
};

const LANGS = { en: EN, es: ES, ko: KO, ja: JA, zh: ZH };
const CJK = new Set(['ko', 'ja', 'zh']);

/* ---------------------------------------------------------------- the pipeline */

const NUM = String.raw`\d+(?:[.,]\d+)?`;
/**
 * What the speech model reads for a line of the script (or any text).
 * Unknown languages get only the language-independent clean-up.
 */
export function speakable(text, lang = 'en') {
  const L = LANGS[lang];
  let s = stripEmoji(text).normalize('NFC');
  s = s.replace(/[＿_]{2,}/g, '…').replace(/[   ]/g, ' ');
  // A symbol in brackets after its own name — 퍼센트(%) — is not read twice.
  s = s.replace(/\s*[(（]\s*[%％]\s*[)）]/g, '');
  if (!L) return tidy(s, lang);
  if (lang === 'es') s = spanish(s);
  if (lang === 'en') s = english(s);
  // Thousands separators: 384,000 → 384000 (not in Spanish/European decimals like 21,5).
  s = s.replace(/\b\d{1,3}(?:,\d{3})+(?!\d)/g, (m) => m.replace(/,/g, ''));
  const sp = lang === 'ja' || lang === 'zh' ? '' : ' ';
  const word = (w) => `${sp}${w}${sp}`;

  // Sums: "= ?" asks for the answer; operators between operands.
  s = s.replace(/\s*=\s*[?？]/g, `${word(lang === 'ko' ? '\u0001' : L.equals)}${L.what}?`);
  const operand = String.raw`(?:\d|[xX]\b|[)）]|[²³])`;
  s = s.replace(new RegExp(`(${operand})\\s*\\+\\s*(?=[\\d(（xX])`, 'g'), `$1${word(L.plus)}`);
  s = s.replace(new RegExp(`(${operand})\\s*[${MINUS}]\\s*(?=[\\d(（xX])`, 'g'), `$1${word(L.minus)}`);
  s = s.replace(new RegExp(`(${operand})\\s+-\\s+(?=[\\d(（xX])`, 'g'), `$1${word(L.minus)}`);
  s = s.replace(/\s*×\s*/g, word(L.times)).replace(/\s*÷\s*/g, word(L.divided));
  s = s.replace(/\s*=\s*/g, word(lang === 'ko' ? '\u0001' : L.equals));
  s = s.replace(/(^|[\s(（:：、,，])\+(?=\d)/g, `$1${L.plus}${sp}`);
  s = s.replace(/\s+\+\s+/g, word(L.plus)).replace(/(^|[\s(（、,，])[%％](?=$|[\s)）、,，])/g, (m, pre) => `${pre}${L.percent('').trim()}`);
  s = s.replace(new RegExp(`(^|[^\\d\\s])?(\\s*)${MINUS}(?=\\d)`, 'g'), (m, pre = '', ws) => `${pre}${ws}${L.neg}${sp}`);

  // Powers and roots.
  s = s.replace(new RegExp(`√\\s*(${NUM}|[a-z])`, 'g'), (_, x) => L.root(x));
  s = s.replace(/(cm|km|m)([²³])/g, (_, u, p) => (p === '²' ? L.squareUnit(L.units[u]) : L.units[u]));
  s = s.replace(new RegExp(`(${NUM}|[a-z])\\s*([²³])`, 'g'), (_, x, p) => (SUPER[p] === 2 ? L.squared(x) : L.cubed(x)));

  // Money, percentages, degrees, units.
  s = s.replace(new RegExp(`([£$€])\\s*(${NUM})`, 'g'), (_, c, x) => `${x} ${L.money[c][+x === 1 ? 0 : 1]}`);
  s = s.replace(new RegExp(`(${NUM})\\s*([£$€])`, 'g'), (_, x, c) => `${x} ${L.money[c][+x === 1 ? 0 : 1]}`);
  s = s.replace(new RegExp(`(${NUM})\\s*[%％]`, 'g'), (_, x) => L.percent(x));
  s = s.replace(new RegExp(`(${NUM})\\s*°(?:\\s*([CF])(?![A-Za-z]))?`, 'g'), (_, x, u) => L.degrees(x, u));
  s = s.replace(/°/g, '');
  s = s.replace(new RegExp(`(${NUM})\\s*(km\\/h|m\\/s|km|cm|kg|mm|m|s|g)(?![\\p{L}\\d/])`, 'gu'), (_, x, u) => `${x}${sp || (lang === 'ko' ? ' ' : '')}${L.units[u]}`);
  s = s.replace(/\((m\/s|km\/h)\)/g, '').replace(/\b(m\/s|km\/h)\b/g, (u) => L.units[u]);

  // Fractions and decimals.
  s = s.replace(/(?<![\d/])(\d{1,3})\/(\d{1,3})(?![\d/])/g, (_, a, b) => L.fraction(+a, +b));
  s = s.replace(/(?<![\d.,])(\d+)[.,](\d+)(?![\d])/g, (m, i, f, at, all) => {
    // "1, 2, 3" lists and "5,000" were handled above; here a comma or point inside a number is a decimal.
    if (all[at + i.length] === ',' && lang !== 'es') return m;
    return L.decimal(+i, f);
  });

  // An algebra x next to a number: 3x → three x.
  if (lang === 'es') s = s.replace(/(\d)\s*x(?![A-Za-z])/g, '$1 equis').replace(/\bx\b/g, 'equis');
  else if (lang === 'ja') s = s.replace(/(\d)?\s*(?<![A-Za-z])x(?![A-Za-z])/g, (_, d) => `${d ?? ''}エックス`);
  else s = s.replace(/(\d)x\b/g, '$1 x');

  // Whole numbers.
  s = s.replace(/\d+/g, (raw, at, all) => {
    const n = Number(raw);
    const after = all.slice(at + raw.length).replace(/^\s+/, (w) => (lang === 'ko' ? '' : w));
    if (lang === 'ko') return koInt(n, after);
    if (L.intWithContext) return L.intWithContext(n, after, raw);
    if (lang === 'es') {
      const noun = /^\s*[\p{L}]/u.test(after) && !/^\s*(y|o|e|u|ni|más|menos|por|entre|es|son|de|al|a|en|que|coma|cuarto|cuartos|tercio|medio)\b/u.test(after);
      // 1, 21, 31 … before a noun agree with its gender (un / una): the model reads those digits itself.
      if (noun && n % 10 === 1 && n % 100 !== 11 && n < 1000) return raw;
      return esNumber(n, { apocope: noun });
    }
    return L.number(n);
  });
  s = s.replace(/\u0000(\p{L}+)つ/gu, '$1').replace(/\u0000/g, '');
  return tidy(s, lang);
}

function tidy(s, lang) {
  s = s
    .replace(/\s*[—–]\s*/g, lang === 'ja' || lang === 'zh' ? '，' : ', ')
    .replace(/[()（）]/g, lang === 'ja' || lang === 'zh' ? '、' : ', ')
    .replace(/[*#~^|<>{}[\]\\]/g, ' ')
    .replace(/\s+([,.!?;:，。！？])/g, '$1')
    .replace(/([,，、])\s*(?=[,，、.。!！?？])/g, '')
    .replace(/(^|[.!?。！？]\s*)[,，、]\s*/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (lang === 'zh' || lang === 'ja') s = s.replace(/、、+/g, '、').replace(/、([。！？，])/g, '$1').replace(/^[、，\s]+|[、，\s]+$/g, '');
  if (lang === 'ja' || lang === 'zh') s = s.replace(/\?/g, '？').replace(/!/g, '！');
  if (lang === 'ko') s = koParticles(s);
  return s;
}

/** Korean: the topic particle for "=" by the last syllable's final consonant, and particles after words this file put in. */
function koParticles(s) {
  const batchim = (ch) => {
    const c = ch.charCodeAt(0) - 0xac00;
    return c >= 0 && c < 11172 && c % 28 !== 0;
  };
  s = s.replace(/(\S)\s*\u0001\s*/g, (_, ch) => `${ch}${batchim(ch) ? '은' : '는'} `).replace(/\u0001/g, '');
  return s.replace(/(제곱|세제곱)(는|를|가|와)(?![가-힣])/g, (_, w, p) => w + { 는: '은', 를: '을', 가: '이', 와: '과' }[p]);
}

/* ---------------------------------------------------------------- checking a take */

const KATA = /[ァ-ヶ]/g;
/**
 * The comparable form of a text: normalised as above, lower-case, without
 * punctuation (and for Korean, Japanese and Chinese without spaces; katakana
 * as hiragana). Used on both the script line and what speech recognition heard.
 */
export function spokenKey(text, lang = 'en') {
  let s = speakable(text, lang).toLowerCase();
  if (lang === 'es' || lang === 'en') s = s.normalize('NFD').replace(/\p{M}/gu, '');
  if (lang === 'ja') s = s.replace(KATA, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  s = s.replace(/(\p{L})-(?=\p{L})/gu, '$1').replace(/[^\p{L}\p{N}\s]/gu, ' ');
  if (CJK.has(lang)) return s.replace(/\s+/g, '');
  return s.replace(/\s+/g, ' ').trim();
}

function levenshtein(a, b) {
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Word (en, es) or character (ko, ja, zh) error rate of what was heard against the script. */
export function errorRate(script, heard, lang = 'en') {
  const a = spokenKey(script, lang), b = spokenKey(heard, lang);
  const ta = CJK.has(lang) ? [...a] : a.split(' ').filter(Boolean);
  const tb = CJK.has(lang) ? [...b] : b.split(' ').filter(Boolean);
  if (!ta.length) return tb.length ? 1 : 0;
  return levenshtein(ta, tb) / ta.length;
}
/** Whether a language's error rate is per character. */
export const usesCer = (lang) => CJK.has(lang);
