import { ELEMENT_NAMES } from '../items/Items.js';
import { NPC_ROLES } from './Npcs.js';
import { SUBJECTS, mainAnswer } from './Study.js';

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

  /**
   * A tutor talks to a child: short, warm, simple, on topic, and it helps the
   * child think rather than handing over answers. The parent's notes (the
   * "personality" box) say what the child is learning.
   */
  _tutorSystem(npc) {
    const d = npc.data;
    const st = d.study ?? {};
    const subject = st.subject === 'custom' ? 'the lessons their parent wrote' : SUBJECTS[st.subject]?.toLowerCase() ?? 'school subjects';
    const current = npc.study?.current;
    return [
      `You are ${d.name}, a kind, patient tutor in a friendly fantasy game. You are talking with a child about ${st.age ?? 8} years old.`,
      d.persona ? `What the parent told you about this child and their lessons: ${d.persona}` : '',
      `Today you are helping them study ${subject}.`,
      current ? `The question they are working on: "${current.q}" (do not just give away the answer to it — help them work it out).` : '',
      'How to talk:',
      `- Use short, simple words a ${st.age ?? 8}-year-old knows. At most 3 short sentences.`,
      '- Be warm and encouraging. Praise effort. Mistakes are part of learning.',
      '- Explain step by step, with small everyday examples (apples, toys, steps).',
      '- Stay on schoolwork, learning and this friendly game. If asked about anything scary, grown-up, unsafe or private, kindly say that is a question for a parent, and go back to studying.',
      '- Never ask for or repeat personal details (full name, school, address, phone, photos).',
      '- Never mention being an AI or a game. No markdown.'
    ]
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Help on one study question.
   * @param {'hint'|'explain'} kind hint: nudge without the answer; explain: why the answer is right
   * @returns {Promise<string|null>} null when the AI is off or unreachable
   */
  async studyHelp(npc, kind, question) {
    if (!npc.data.ai || !question) return null;
    const ask =
      kind === 'hint'
        ? `Give one small hint for this question, without saying the answer: "${question.q}"`
        : `The answer to "${question.q}" is ${mainAnswer(question.a)}. Explain simply why, in 2 short sentences.`;
    try {
      return await this._complete([{ role: 'system', content: this._tutorSystem(npc) }, { role: 'user', content: `${ask} /no_think` }], 300);
    } catch {
      return null;
    }
  }

  _system(npc, context) {
    const d = npc.data;
    if (d.role === 'tutor') return this._tutorSystem(npc);
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
    const history = npc.state.history.slice(-6);
    // `/no_think` is Qwen3's switch for "answer directly": without it the
    // model spends its token budget reasoning and the reply comes back empty.
    const reply = await this._complete([{ role: 'system', content: this._system(npc, context) }, ...history, { role: 'user', content: `${text} /no_think` }], 700);
    npc.state.history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
    return reply;
  }

  async _complete(messages, maxTokens) {
    const status = await fetch(`${ENDPOINT}/status`).then((r) => r.json()).catch(() => null);
    if (!status?.ok) throw new Error('the AI model is offline');
    const response = await fetch(`${ENDPOINT}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'npc', messages, temperature: 0.75, maxTokens, timeoutMs: 90_000 })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
    let reply = String(body?.choices?.[0]?.message?.content ?? '').trim();
    // Some models still wrap a stray reasoning block; keep only the answer.
    reply = reply.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    // Plain speech in a dialogue box: drop markdown emphasis and headings.
    reply = reply.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|\s)[*_](\S[^*_]*?)[*_](?=\s|$|[.,!?])/g, '$1$2').replace(/^#+\s*/gm, '');
    if (!reply) throw new Error('empty reply');
    return reply;
  }
}
