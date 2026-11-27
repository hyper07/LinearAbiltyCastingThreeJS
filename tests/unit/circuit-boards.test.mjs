// knowledge/circuit-boards.json: the board teardown data behind Circuit Lab's Inspect mode.
// Every part must be teachable (name, role, specs, kind text), placed on its board,
// and wired to nets that exist; pin groups must name real pins; sources carry licences.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const doc = JSON.parse(readFileSync(new URL('../../knowledge/circuit-boards.json', import.meta.url), 'utf8'));
const NET_KINDS = new Set(['power', 'ground', 'signal', 'local']);
const LOOKS = new Set(['cap', 'res', 'ferrite', 'fuse', 'varistor', 'resarray', 'led', 'tantalum', 'diode', 'melf', 'sot23', 'sot223', 'soic', 'qfn', 'qfp', 'dip', 'crystal', 'resonator', 'inductor', 'electrolytic', 'dcjack', 'usbb', 'usbmicro', 'usbmini', 'button', 'header-f', 'header-m', 'header-down', 'jumper', 'pads', 'module', 'antenna', 'none']);

test('circuit boards: the expected boards are there, with sources and licences', () => {
  const ids = doc.boards.map((b) => b.id);
  for (const id of ['esp32_devkit_v1', 'esp32_devkitc_v4', 'arduino_uno_r3', 'arduino_nano_v3', 'arduino_mega2560_r3', 'rpi_pico']) assert.ok(ids.includes(id), `missing board ${id}`);
  assert.equal(new Set(ids).size, ids.length, 'board ids are unique');
  for (const b of doc.boards) {
    assert.ok(b.name && b.summary && b.licence && b.positionsNote, `${b.id}: name, summary, licence, positionsNote`);
    assert.ok(['design-file', 'estimated'].includes(b.positions), `${b.id}: positions flag`);
    assert.ok(['pins-up', 'female', 'castellated'].includes(b.pinRows), `${b.id}: pinRows`);
    assert.ok(b.size.w > 10 && b.size.h > 10 && b.size.t > 0, `${b.id}: size`);
    assert.ok(b.sources.length >= 1, `${b.id}: at least one source`);
    for (const s of b.sources) assert.ok(s.title && s.licence && s.used, `${b.id}: source ${s.title} has title, licence, used`);
    if (b.positions === 'design-file') assert.ok(b.sources.some((s) => /CC BY-SA/.test(s.licence)), `${b.id}: design-file positions name the share-alike design`);
  }
});

test('circuit boards: every kind has the teaching text', () => {
  for (const [id, k] of Object.entries(doc.kinds)) {
    assert.ok(k.label && k.kid && k.deep, `kind ${id}: label, kid, deep`);
    assert.ok(Array.isArray(k.facts) && Array.isArray(k.misconceptions), `kind ${id}: facts, misconceptions`);
    assert.ok(k.kid.length <= 160, `kind ${id}: the kid line stays one line`);
  }
});

test('circuit boards: every part has a name, role, specs, kind and a place on the board', () => {
  for (const b of doc.boards) {
    const refs = b.parts.map((p) => p.ref);
    assert.equal(new Set(refs).size, refs.length, `${b.id}: refs are unique`);
    for (const p of b.parts) {
      const at = `${b.id} ${p.ref}`;
      assert.ok(p.name && p.role, `${at}: name and role`);
      assert.ok(doc.kinds[p.kind], `${at}: kind ${p.kind} exists`);
      assert.ok(p.specs && Object.keys(p.specs).length >= 1, `${at}: specs`);
      for (const v of Object.values(p.specs)) assert.equal(typeof v, 'string', `${at}: spec values are text`);
      assert.ok(p.package, `${at}: package`);
      assert.ok(LOOKS.has(p.look), `${at}: look ${p.look}`);
      for (const k of ['x', 'y', 'rot', 'w', 'd', 'h']) assert.ok(Number.isFinite(p[k]), `${at}: ${k} is a number`);
      assert.ok(p.w > 0 && p.d > 0 && p.h >= 0, `${at}: positive size`);
      if (p.side) assert.ok(['top', 'bottom'].includes(p.side), `${at}: side`);
      if (p.partOf) assert.ok(refs.includes(p.partOf), `${at}: partOf ${p.partOf} exists`);
      if (p.fitted === false) continue;
      // centre on the board (connectors may overhang a little, as the USB socket does)
      assert.ok(p.x >= -3 && p.x <= b.size.w + 3 && p.y >= -3 && p.y <= b.size.h + 3, `${at}: centre (${p.x}, ${p.y}) on the ${b.size.w} × ${b.size.h} board`);
    }
  }
});

test('circuit boards: nets reference real nets, and header nets match their pins', () => {
  for (const b of doc.boards) {
    const names = b.nets.map((n) => n.name);
    assert.equal(new Set(names).size, names.length, `${b.id}: net names unique`);
    const nets = new Set(names);
    const owners = new Set([...b.parts.map((p) => p.ref), ...b.pins.map((p) => p.part)]);
    for (const n of b.nets) {
      assert.ok(NET_KINDS.has(n.kind), `${b.id} net ${n.name}: kind`);
      for (const r of n.parts) assert.ok(owners.has(r), `${b.id} net ${n.name}: member ${r} exists`);
    }
    for (const p of b.parts) {
      const vals = Object.values(p.nets ?? {});
      if (!vals.length) assert.ok(p.note || p.fitted === false, `${b.id} ${p.ref}: no nets needs a note`);
      for (const v of vals) assert.ok(nets.has(v), `${b.id} ${p.ref}: net ${v} is listed`);
    }
    for (const pin of b.pins) {
      if (pin.net === null) assert.equal(pin.name, 'NC', `${b.id} ${pin.id}: only NC pins have no net`);
      else assert.ok(nets.has(pin.net), `${b.id} ${pin.id}: net ${pin.net}`);
    }
    // each header part touches exactly the nets of its own pins
    for (const p of b.parts.filter((x) => /^header/.test(x.kind))) {
      const pinNets = new Set(b.pins.filter((q) => q.part === p.ref && q.net).map((q) => q.net));
      if (!pinNets.size) continue;
      for (const v of Object.values(p.nets)) assert.ok(pinNets.has(v), `${b.id} ${p.ref}: header net ${v} is one of its pins`);
    }
    // power and ground exist on every board
    assert.ok(b.nets.some((n) => n.kind === 'ground'), `${b.id}: a ground net`);
    assert.ok(b.nets.some((n) => n.kind === 'power'), `${b.id}: a power net`);
  }
});

test('circuit boards: pins are unique, on the board, and pin groups name real pins', () => {
  for (const b of doc.boards) {
    const ids = b.pins.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, `${b.id}: pin ids unique`);
    for (const p of b.pins) assert.ok(p.x >= 0 && p.x <= b.size.w && p.y >= 0 && p.y <= b.size.h, `${b.id} ${p.id}: on the board`);
    const pinParts = new Set(b.pins.map((p) => p.part));
    for (const part of pinParts) assert.ok(b.parts.some((p) => p.ref === part) || b.pinRows === 'castellated', `${b.id}: pin part ${part} is a part`);
    const names = new Set(b.pins.map((p) => p.name));
    const groupIds = b.pinGroups.map((g) => g.id);
    assert.equal(new Set(groupIds).size, groupIds.length, `${b.id}: group ids unique`);
    for (const g of b.pinGroups) {
      assert.ok(g.label && g.note && /^#[0-9a-f]{6}$/i.test(g.color), `${b.id} group ${g.id}: label, note, colour`);
      for (const n of g.pins) assert.ok(names.has(n), `${b.id} group ${g.id}: pin ${n} exists`);
    }
    for (const c of b.callouts) assert.ok(groupIds.includes(c), `${b.id}: callout ${c} is a pin group`);
  }
});

test('circuit boards: the facts students meet first are right', () => {
  const board = (id) => doc.boards.find((b) => b.id === id);
  const part = (id, ref) => board(id).parts.find((p) => p.ref === ref);
  const v1 = board('esp32_devkit_v1');
  assert.equal(v1.labBoard, 'esp32_devkit');
  assert.equal(part('esp32_devkit_v1', 'U1').marking, 'ESP32-WROOM-32');
  assert.match(part('esp32_devkit_v1', 'U2').name, /AMS1117-3\.3/);
  assert.equal(part('esp32_devkit_v1', 'U2').nets.OUT, '+3V3');
  assert.equal(v1.pins.length, 30);
  // input-only pins are the ones the ESP32 cannot drive
  assert.deepEqual(new Set(v1.pinGroups.find((g) => g.id === 'input-only').pins), new Set(['D34', 'D35', 'VP', 'VN']));
  assert.equal(board('esp32_devkitc_v4').pins.length, 38);
  const uno = board('arduino_uno_r3');
  assert.equal(uno.positions, 'design-file');
  assert.equal(uno.size.w, 68.58);
  assert.equal(uno.size.h, 53.34);
  assert.equal(part('arduino_uno_r3', 'ZU4').kind, 'mcu');
  assert.equal(part('arduino_uno_r3', 'U3').kind, 'usb-uart');
  assert.equal(part('arduino_uno_r3', 'U1').nets['3'], 'VIN', 'the 5 V regulator takes VIN');
  assert.equal(uno.pins.find((p) => p.name === 'D13').net, 'SCK');
  assert.equal(board('arduino_mega2560_r3').pins.filter((p) => /^D\d+$/.test(p.name)).length, 54);
  assert.ok(board('arduino_nano_v3').parts.some((p) => p.side === 'bottom' && p.kind === 'usb-uart'), 'the Nano\'s FT232RL is on the underside');
  const pico = board('rpi_pico');
  assert.equal(pico.size.t, 1.0);
  assert.equal(pico.pins.length, 40);
  assert.equal(pico.pins.find((p) => p.id === 'P40').name, 'VBUS');
  assert.equal(part('rpi_pico', 'U2').nets.EN, '3V3_EN');
});
