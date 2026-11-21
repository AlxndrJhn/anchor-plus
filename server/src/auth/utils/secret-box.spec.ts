import { describe, expect, it } from 'vitest';
import { SecretBox } from './secret-box';

describe('SecretBox', () => {
  const box = new SecretBox('a-sufficiently-long-secret', 'totp');

  it('opens what it sealed, and seals the same text differently each time', () => {
    const a = box.seal('JBSWY3DPEHPK3PXP');
    const b = box.seal('JBSWY3DPEHPK3PXP');
    expect(a).not.toBe(b);
    expect(a).not.toContain('JBSWY3DPEHPK3PXP');
    expect(SecretBox.isSealed(a)).toBe(true);
    expect(box.open(a)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('passes a secret from before sealing through', () => {
    expect(box.open('JBSWY3DPEHPK3PXP')).toBe('JBSWY3DPEHPK3PXP');
  });

  it('answers null for another key, another purpose, or a changed value', () => {
    const sealed = box.seal('JBSWY3DPEHPK3PXP');
    expect(
      new SecretBox('another-long-secret', 'totp').open(sealed),
    ).toBeNull();
    expect(
      new SecretBox('a-sufficiently-long-secret', 'other').open(sealed),
    ).toBeNull();
    const raw = Buffer.from(sealed.slice(3), 'base64');
    raw[raw.length - 1] ^= 1;
    expect(box.open(`v1:${raw.toString('base64')}`)).toBeNull();
    expect(box.open('v1:short')).toBeNull();
  });
});
