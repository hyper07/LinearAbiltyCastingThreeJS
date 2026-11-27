/**
 * The chat box's brain: a request + the game's data → a patch (src/shared/studio/patch.js).
 *
 *   1. With an LM model configured (LLM_PLATFORM_BASE_URL…, server/api/llm.js): the request, a
 *      compact view of the game and the patch's JSON schema go to the model, which must answer
 *      with JSON in that schema. Its answer is NOT trusted: validatePatch checks it field by
 *      field and against the game (ids that exist, limits, known music), strings are cleaned.
 *   2. No model, a slow one, or an answer that does not fit: the offline keyword planner
 *      (planner.js) — the chat box always works.
 *
 * The caller applies the patch, validates the resulting data again, and only then writes.
 */
import { LM_PATCH_SCHEMA, validatePatch } from '../../src/shared/studio/patch.js';
import { planFromText } from '../../src/shared/studio/planner.js';
import { ACCESSORIES, BEHAVIOURS, BIOMES, BODIES, COLLECTIBLES, FEATURES, GOALS, SFX_EVENTS, SOUNDS, TIMES, WEATHERS } from '../../src/shared/studio/spec.js';
import { scrub } from '../api/ai.js';

/** Words a kids' game never shows (a short list; public content is also reviewed by the admin). */
const BLOCKED = /\b(fuck\w*|shit\w*|bitch\w*|cunt|porn\w*|sex\w*|nazi\w*|suicid\w*|kill yourself|rape\w*|nigg\w*|fag\w*)\b/gi;

/** Text safe to put in a kids' game: no contact details, no links, no blocked words. */
export function kidSafe(text, max) {
  return scrub(String(text ?? ''), max).replace(BLOCKED, '…');
}

/** Clean every free-text field of a patch (in place) — names, lines, stories, the summary. */
export function cleanPatchText(patch) {
  patch.summary = kidSafe(patch.summary, 240);
  for (const o of patch.ops) {
    if (o.map?.name != null) o.map.name = kidSafe(o.map.name, 40) || 'New Map';
    if (o.map?.story != null) o.map.story = kidSafe(o.map.story, 240);
    if (o.character?.name != null && o.op !== 'addSpawn') o.character.name = kidSafe(o.character.name, 40) || 'Friend';
    if (o.character?.line != null) o.character.line = kidSafe(o.character.line, 160);
    if (o.rules?.intro != null) o.rules.intro = kidSafe(o.rules.intro, 240);
  }
  return patch;
}

/** What the model sees of the game: enough to name things, nothing it does not need. */
export function gameView(data) {
  return {
    style: data.style,
    rules: data.rules,
    maps: data.maps.maps.map((m, i) => ({ n: i + 1, id: m.id, name: m.name, biome: m.biome, size: m.size, features: m.features, weather: m.weather, time: m.time, collectible: m.collectible, collectibles: m.collectibles, spawns: m.spawns, music: m.music })),
    player: { name: data.cast.player.name, body: data.cast.player.body, speed: data.cast.player.speed },
    characters: data.cast.characters.map((c) => ({ id: c.id, name: c.name, role: c.role, body: c.body, speed: c.speed, health: c.health, damage: c.damage, size: c.size, behaviour: c.behaviour })),
    music: data.audio.music,
    sfx: data.audio.sfx
  };
}

export function systemPrompt(tracks) {
  return [
    'You change a children\'s video game that is stored as JSON data. The maker (often a child or a teacher) asks for a change in plain words; you answer ONLY with a JSON patch that follows the given schema.',
    'Each op has every field; set the ones the op does not use to null. Inside map/character/rules/style objects, null means "leave it as it is".',
    'Ops: addMap {map} (a new level at the end; give it a fitting name, biome and features) · updateMap {target: map id, map} · removeMap {target} · addCharacter {character with role enemy|boss|npc|ally, body, count; target = map id to place it in, or null for the last map} · addSpawn {target: map id, character.name = an EXISTING character id, character.count} · updateCharacter {target: character id, character} · removeCharacter {target} · setPlayer {character} · setRules {rules} · setStyle {style} · setMusic {track; target = map id for one map, else null} · setSfx {target: event, sound} · useAsset {asset} (only ids you were given).',
    `Biomes: ${BIOMES.join(', ')}. Features: ${FEATURES.join(', ')}. Weather: ${WEATHERS.join(', ')}. Time: ${TIMES.join(', ')}. Collectibles: ${COLLECTIBLES.join(', ')}.`,
    `Bodies: ${BODIES.join(', ')}. Accessories: ${ACCESSORIES.join(', ')}. Behaviours: ${BEHAVIOURS.join(', ')}. Goals: ${GOALS.join(', ')}.`,
    `Sound events: ${SFX_EVENTS.join(', ')}. Sounds: ${SOUNDS.join(', ')}. Music tracks: ${tracks.map((t) => `${t.id} (${t.mood ?? (t.tags ?? []).join('/')})`).join(', ')}, none.`,
    'Speeds: player 4–9, monsters 1–5, bosses 1–4 ("slower" ≈ ×0.7, "faster" ≈ ×1.35). Health: monsters 1–4, bosses 8–30. Damage 0–3. Sizes 0.6–2.5.',
    'Keep it friendly for children: no violence beyond cartoon bonks, no scary or grown-up content, no real people, brands or links. If the request is not about changing the game, or is not suitable, return ops [] and say so kindly in summary.',
    'summary: one short friendly sentence saying what you changed.'
  ].join('\n');
}

/**
 * @param {{ model?: { available: boolean, chat: Function }, tracks: () => object[], log?: (l: string) => void }} options
 */
export function createChatPlanner({ model = null, tracks = () => [], log = () => {} } = {}) {
  /**
   * @returns {Promise<{ patch: object, source: 'lm'|'keywords', note: string|null }>}
   */
  return async function plan({ text, data, focusMap = null, premium = false, maxTokens = 1200, catalog = {} }) {
    const request = kidSafe(text, 600);
    const list = tracks();
    const offline = (note) => {
      const p = planFromText(request, data, { focusMap, tracks: list });
      const patch = cleanPatchText({ summary: p.summary, ops: p.ops });
      const check = validatePatch(patch, data, catalog);
      return { patch: check.ok ? patch : { summary: p.summary, ops: [] }, source: 'keywords', note, understood: p.understood && check.ok };
    };
    if (!request) return { patch: { summary: 'Type what you would like to change.', ops: [] }, source: 'keywords', note: null, understood: false };
    if (!model?.available) return offline(null);
    try {
      const answer = await model.chat({
        name: 'studio_patch',
        schema: LM_PATCH_SCHEMA,
        maxTokens,
        temperature: 0.2,
        premium,
        messages: [
          { role: 'system', content: systemPrompt(list) },
          { role: 'user', content: `The game now:\n${JSON.stringify(gameView(data))}\n\nThe map the maker is looking at: ${focusMap ?? data.maps.maps.at(-1)?.id}\n\nThe request: ${request}` }
        ]
      });
      const check = validatePatch(answer, data, catalog);
      if (!check.ok) {
        log(`[studio] the LM model's patch did not fit: ${check.problems.slice(0, 3).join('; ')}`);
        return offline("The LM model's answer did not fit the game, so the offline planner made this change.");
      }
      return { patch: cleanPatchText(check.patch), source: 'lm', note: null, understood: check.patch.ops.length > 0 };
    } catch (error) {
      log(`[studio] LM model: ${error.message}`);
      return offline('The LM model did not answer, so the offline planner made this change.');
    }
  };
}
