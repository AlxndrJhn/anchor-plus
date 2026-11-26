import { describe, expect, it } from 'vitest';
import * as path from 'path';
import { pathInside } from './file-system.util';

describe('pathInside', () => {
  const base = path.resolve('storage');

  it('puts segments under the base', () => {
    expect(pathInside('storage', 'a', 'b.png')).toBe(
      path.join(base, 'a', 'b.png'),
    );
  });

  it('refuses a path that leaves the base', () => {
    expect(() => pathInside('storage', '..', 'etc')).toThrow();
    expect(() => pathInside('storage', 'a/../../x')).toThrow();
    expect(() => pathInside('storage', path.resolve('/etc/passwd'))).toThrow();
    expect(() => pathInside('storage', '.')).toThrow();
  });
});
