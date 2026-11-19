import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voiceStudioAuth } from '../../server/voiceStore.js';

const req = (id, pw) => ({ headers: { authorization: `Basic ${Buffer.from(`${id}:${pw}`).toString('base64')}` }, socket: {} });

test('the voice studio uses its own login when VOICE_STUDIO_ADMIN_* are set', () => {
  const env = { VOICE_STUDIO_ADMIN_ID: 'voicer', VOICE_STUDIO_ADMIN_PASSWORD: 'studio-pass', ADMIN_ACCOUNTS: 'siteadmin', ADMIN_PASSWORD: 'site-pass' };
  const auth = voiceStudioAuth(env);
  assert.equal(auth.on, true);
  assert.equal(auth.idOf(req('voicer', 'studio-pass')), 'voicer');
  assert.equal(auth.idOf(req('siteadmin', 'site-pass')), null);
  assert.equal(auth.idOf(req('voicer', 'wrong')), null);
});

test('without its own login the voice studio falls back to the platform admin', () => {
  const auth = voiceStudioAuth({ ADMIN_ACCOUNTS: 'siteadmin', ADMIN_PASSWORD: 'site-pass' });
  assert.equal(auth.idOf(req('siteadmin', 'site-pass')), 'siteadmin');
  assert.equal(voiceStudioAuth({}).on, false);
  // Only one of the pair set: not enough for its own login.
  assert.equal(voiceStudioAuth({ VOICE_STUDIO_ADMIN_ID: 'voicer', ADMIN_ACCOUNTS: 'a', ADMIN_PASSWORD: 'b' }).idOf(req('a', 'b')), 'a');
});
