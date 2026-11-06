import { ELEMENT_NAMES } from '../items/Items.js';
import { NPC_ROLES } from './Npcs.js';

const ENDPOINT = './api/ai';

/** What the NPC may tell the player about the spells — plain facts, no numbers to invent. */
const SPELL_TIPS = [
  'Frost Lance (1): a line of ice that chills and slows everything it crosses — good against groups closing in.',
  'Storm Lance (2): a fast lightning line that shocks — great for a quick hit at range.',
  'Cinder Fall (3): a meteor lobbed to a point; big burst and burning cracks — best on clustered monsters.',
  'Nova Beam (4): a sustained beam that keeps burning along a line — strongest on big targets like the Rift Golem.',
  'Voltaic Snare (5): a far-cast circle that roots and shocks what is inside — trap groups, then hit them.',
  'Glacial Crown (6): a far-cast ring of ice blades that freezes — a wall to stop rushers.',
  'Potions: R drinks a health potion (45% heal), Z drinks a focus potion (all spells ready).',
  'Tab opens the bag: equip weapons for bonus stats, read skill books to rank up a spell.'
];

/**
 * An NPC's voice. With a model reachable it answers in character, knowing the
 * level's story and goal and the player's current state; without one it falls
 * back to the NPC's own scripted lines, so a level never depends on the AI.
 */
export class NpcBrain {
  /**
   * @param {import('./Npcs.js').Npc} npc
   * @param {string} text what the player said
   * @param {object} context from App: level, run, player, quest
   * @returns {Promise<{ text: string, source: 'ai'|'script', note?: string }>}
   */
  async reply(npc, text, context) {
    if (npc.data.ai) {
      try {
        return { text: await this._ask(npc, text, context), source: 'ai' };
      } catch (error) {
        return { text: this.scripted(npc), source: 'script', note: error.message };
      }
    }
    return { text: this.scripted(npc), source: 'script' };
  }

  /** The next scripted line, round and round. */
  scripted(npc) {
    const lines = npc.data.lines?.filter(Boolean) ?? [];
    if (!lines.length) return npc.data.greeting || '…';
    const line = lines[npc.state.lineIndex % lines.length];
    npc.state.lineIndex += 1;
    return line;
  }

  _system(npc, context) {
    const d = npc.data;
    const { level, player, quest } = context;
    const role = NPC_ROLES[d.role]?.label ?? 'Guide';
    const skills = Object.entries(player.skills)
      .filter(([, rank]) => rank > 0)
      .map(([el, rank]) => `${ELEMENT_NAMES[el]} rank ${rank}`)
      .join(', ') || 'none';
    return [
      `You are ${d.name}, a ${role.toLowerCase()} in a fantasy arena game where the player is a spellcaster fighting waves of monsters.`,
      d.persona ? `Your character: ${d.persona}` : 'You are wise, warm and a little weary of the war.',
      level ? `This place: "${level.name}". ${level.story?.intro?.text ?? ''}` : '',
      level ? `The player's goal here: ${context.goal}. Progress: ${context.progress}.` : '',
      `Monsters here: ${context.monsters}.`,
      `The player right now: ${player.healthPct}% health, ${player.gold} gold, ${player.potions.health} health potions, ${player.potions.focus} focus potions, weapon: ${player.weapon}, spell ranks: ${skills}.`,
      quest ? `Your quest for them: ${quest}.` : '',
      d.lines?.length ? `Things you know and like to say: ${d.lines.join(' | ')}` : '',
      'Facts about the player\'s spells and items (use them for advice, never invent others):',
      ...SPELL_TIPS.map((t) => `- ${t}`),
      'Rules: stay in character; answer in at most 3 short sentences; give concrete, useful advice for the player\'s situation when asked; never mention being an AI or a game; do not invent items, prices or rewards.'
    ]
      .filter(Boolean)
      .join('\n');
  }

  async _ask(npc, text, context) {
    const status = await fetch(`${ENDPOINT}/status`).then((r) => r.json()).catch(() => null);
    if (!status?.ok) throw new Error('the AI model is offline');
    const history = npc.state.history.slice(-6);
    const response = await fetch(`${ENDPOINT}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // `/no_think` is Qwen3's switch for "answer directly": without it the
        // model spends its token budget reasoning and the reply comes back empty.
        messages: [{ role: 'system', content: this._system(npc, context) }, ...history, { role: 'user', content: `${text} /no_think` }],
        temperature: 0.75,
        maxTokens: 700,
        timeoutMs: 90_000
      })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
    let reply = String(body?.choices?.[0]?.message?.content ?? '').trim();
    // Some models still wrap a stray reasoning block; keep only the answer.
    reply = reply.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    // Plain speech in a dialogue box: drop markdown emphasis and headings.
    reply = reply.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|\s)[*_](\S[^*_]*?)[*_](?=\s|$|[.,!?])/g, '$1$2').replace(/^#+\s*/gm, '');
    if (!reply) throw new Error('empty reply');
    npc.state.history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
    return reply;
  }
}
