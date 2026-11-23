/**
 * Player nicknames for a kids' game, pure: keep only friendly characters,
 * cap the length, and swap anything rude for a cute random name. Used for
 * your own name (rider select) and for every remote player's name on arrival.
 */

export const NAME_MAX = 12;

const FIRST = ['Snowy', 'Fluffy', 'Zippy', 'Bouncy', 'Sunny', 'Frosty', 'Puffy', 'Twinkle', 'Mittens', 'Sparkle', 'Cocoa', 'Sprinkle', 'Bubbles', 'Pebble', 'Maple'];
const LAST = ['Pup', 'Bean', 'Muffin', 'Star', 'Bun', 'Paws', 'Drop', 'Puff', 'Flake', 'Berry', 'Cub', 'Pie'];

/**
 * A tiny filter: words a nickname must never contain (checked on the letters
 * only, so "b.a.d" spacing and look-alike digits don't sneak past). Kept short
 * and plain; it is a safety net, not a moderation system.
 */
const BLOCK = ['fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'whore', 'slut', 'fag', 'nigg', 'nazi', 'hitler', 'rape', 'porn', 'crap', 'piss', 'bastard', 'retard', 'idiot', 'stupid', 'poop', 'wank', 'twat', 'boob', 'penis', 'vagina', 'kkk', 'asshole', 'sexy'];
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', $: 's', '@': 'a', '!': 'i' };

/** True if the name has none of the blocked words in it. */
export function isClean(name) {
  const flat = String(name ?? '').toLowerCase().replace(/[01345678$@!]/g, (c) => LEET[c] ?? c).replace(/[^a-z]/g, '');
  return !BLOCK.some((w) => flat.includes(w));
}

/** A cute random name ("Fluffy Bean"), fitting the length cap. `rand` = () => [0, 1). */
export function randomName(rand = Math.random) {
  for (let i = 0; i < 20; i++) {
    const n = `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]}`;
    if (n.length <= NAME_MAX) return n;
  }
  return 'Snowy Pup';
}

/**
 * Clean up a nickname: letters (any alphabet), digits, spaces, - ' . only,
 * no doubled spaces, at most NAME_MAX characters, and nothing rude (then a
 * random cute name instead). Empty → `fallback`.
 */
export function cleanName(raw, fallback = 'Rider') {
  let s = String(raw ?? '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} '.-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  s = [...s].slice(0, NAME_MAX).join('').trim();
  if (!s) return fallback;
  if (!isClean(s)) return randomName();
  return s;
}
