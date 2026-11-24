/**
 * AI Arcademia's controls on the mountain: the one table its key handler
 * reads and How to play lists (shared/helpPanel.js), in the player's language.
 * H (or I) is How to play; B takes the view back to your buddy (it was H).
 */
import { t } from './i18n/index.js';

/** `map`: the current study world (maps.js), so O names its whole view. */
export function controls(map = null) {
  return {
    title: t('help.title'),
    goal: t('help.goal'),
    groups: [
      { name: t('help.gMove'), rows: [
        { id: 'move', keys: ['W', 'A', 'S', 'D'], codes: ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'], does: t('help.move'), touch: t('help.tTap') },
        { id: 'run', keys: ['Shift'], codes: ['ShiftLeft', 'ShiftRight'], does: t('help.run') },
        { id: 'enter', keys: ['Enter'], codes: ['Enter'], does: t('help.enter'), touch: t('help.tTap') }
      ] },
      { name: t('help.gCamera'), rows: [
        { id: 'look', keys: ['Drag', 'Wheel'], codes: [], does: t('help.look'), touch: `${t('help.tDrag')} · ${t('help.tPinch')}` },
        { id: 'zoom', keys: ['+', '−'], codes: ['Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract'], does: t('help.zoom') },
        { id: 'camTurn', keys: [',', '.'], codes: ['Comma', 'Period'], does: t('help.turn'), pad: 'Right stick' },
        { id: 'camTilt', keys: ['[', ']'], codes: ['BracketLeft', 'BracketRight'], does: t('help.tilt') },
        { id: 'camBehind', keys: ['/'], codes: ['Slash'], does: t('help.behind') },
        { id: 'buddy', keys: ['B'], codes: ['KeyB'], does: t('help.buddy') }
      ] },
      { name: t('help.gMenus'), rows: [
        { id: 'night', keys: ['N'], codes: ['KeyN'], does: t('help.night') },
        { id: 'sound', keys: ['M'], codes: ['KeyM'], does: t('help.sound') },
        { id: 'help', keys: ['H', 'I'], codes: ['KeyH', 'KeyI'], does: t('help.help') },
        { id: 'esc', keys: ['Esc'], codes: ['Escape'], does: t('help.esc') }
      ] },
      { name: t('help.gMap'), rows: [
        { id: 'map', keys: ['O'], codes: ['KeyO'], does: t(map?.whole && map.whole !== 'hud.whole' ? map.whole : 'help.whole') }
      ] }
    ]
  };
}
