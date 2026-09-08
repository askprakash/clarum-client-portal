import test from 'node:test'
import assert from 'node:assert/strict'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import { portalTokens, verifyAccessToken } from './auth.js'
import { clientId, tenantId } from './config.js'

const { privateKey, publicKey } = await generateKeyPair('RS256')
const jwk = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' }
const issuer = `https://${tenantId}.ciamlogin.com/${tenantId}/v2.0`
const calls = []
globalThis.fetch = async (url) => {
  calls.push(String(url))
  return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'Content-Type': 'application/json' } })
}
async function token(overrides = {}, expires = '5m') {
  return new SignJWT({ tid: tenantId, oid: 'fictitious-client', ...overrides })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuedAt().setIssuer(overrides.iss ?? issuer)
    .setAudience(overrides.aud ?? clientId).setExpirationTime(expires).sign(privateKey)
}

test('dedicated portal header survives a different proxy Authorization token', async () => {
  const valid = await token()
  const proxy = await token({ aud: 'azure-proxy' })
  const candidates = portalTokens({ headers: new Headers({
    Authorization: `Bearer ${proxy}`,
    'X-Authorization': `Bearer ${valid}`,
    'X-Portal-Authorization': `Bearer ${valid}`,
  }) })
  assert.deepEqual(candidates, [valid, proxy])
  assert.equal((await verifyAccessToken(candidates[0])).payload.oid, 'fictitious-client')
  await assert.rejects(verifyAccessToken(proxy))
})

test('rejects Graph audience, foreign tenant, unknown issuer, expiration and tampering', async () => {
  for (const claims of [
    { aud: '00000003-0000-0000-c000-000000000000' },
    { tid: 'another-tenant' },
    { iss: 'https://attacker.example/v2.0' },
  ]) await assert.rejects(verifyAccessToken(await token(claims)))
  await assert.rejects(verifyAccessToken(await token({}, 1)))
  const signed = await token()
  const pieces = signed.split('.')
  pieces[1] = Buffer.from(JSON.stringify({ tid: tenantId, aud: clientId, iss: issuer, oid: 'tampered' })).toString('base64url')
  await assert.rejects(verifyAccessToken(pieces.join('.')))
  assert.ok(calls.every(url => !url.includes('attacker.example')))
})

test('missing and malformed credentials yield no candidates', () => {
  assert.deepEqual(portalTokens({ headers: new Headers() }), [])
  assert.deepEqual(portalTokens({ headers: new Headers({ Authorization: 'Bearer invalid' }) }), [])
})
