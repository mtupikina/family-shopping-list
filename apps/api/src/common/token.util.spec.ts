import { generateToken, hashToken, parseDurationToMs } from './token.util';

describe('token.util', () => {
  it('hashes tokens deterministically', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('def'));
  });

  it('generates unique tokens', () => {
    expect(generateToken()).not.toBe(generateToken());
  });

  it('parses duration strings', () => {
    expect(parseDurationToMs('15m')).toBe(15 * 60 * 1000);
    expect(parseDurationToMs('90d')).toBe(90 * 24 * 60 * 60 * 1000);
  });
});
