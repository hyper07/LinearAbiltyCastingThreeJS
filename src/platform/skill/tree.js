/** Skill tree layout for the loadout menu — branches and tier rows. */
export const SKILL_TREE_BRANCHES = [
  {
    id: 'frost',
    label: 'Frost',
    accent: '#5fd0ff',
    nodes: [{ skillId: 'frost-lance', tier: 1 }]
  },
  {
    id: 'storm',
    label: 'Storm',
    accent: '#7fb4ff',
    nodes: [{ skillId: 'storm-lance', tier: 1 }]
  },
  {
    id: 'ember',
    label: 'Ember',
    accent: '#ff8a3c',
    nodes: [{ skillId: 'cinder-fall', tier: 2 }]
  },
  {
    id: 'arcane',
    label: 'Arcane',
    accent: '#7ff0ff',
    nodes: [{ skillId: 'nova-beam', tier: 2 }]
  },
  {
    id: 'voltaic',
    label: 'Voltaic',
    accent: '#a98bff',
    nodes: [{ skillId: 'voltaic-snare', tier: 3 }]
  },
  {
    id: 'glacial',
    label: 'Glacial',
    accent: '#8ee8ff',
    nodes: [{ skillId: 'glacial-crown', tier: 3 }]
  }
];

/**
 * @param {import('../Platform.js').Platform} platform
 * @param {string} [loadoutId]
 */
export function buildSkillTree(platform, loadoutId) {
  const loadout = platform.loadouts.get(loadoutId ?? platform.getActiveLoadout()?.id);
  const equipped = new Set(loadout?.skills ?? []);

  return SKILL_TREE_BRANCHES.map((branch) => ({
    ...branch,
    nodes: branch.nodes.map((node) => {
      const skill = platform.skills.get(node.skillId);
      return {
        ...node,
        skill,
        equipped: equipped.has(node.skillId)
      };
    })
  }));
}

/**
 * @param {ReturnType<typeof buildSkillTree>} branches
 * @param {Map<string, object>} skillStatsById keyed by skill id
 */
export function enrichSkillTree(branches, skillStatsById) {
  return branches.map((branch) => ({
    ...branch,
    nodes: branch.nodes.map((node) => ({
      ...node,
      stats: skillStatsById.get(node.skillId) ?? null
    }))
  }));
}
