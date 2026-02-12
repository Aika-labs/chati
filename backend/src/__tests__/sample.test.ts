import { describe, it, expect } from 'vitest';

describe('Sample Test Suite', () => {
  it('should pass basic assertion', () => {
    expect(true).toBe(true);
  });

  it('should perform basic math', () => {
    expect(1 + 1).toBe(2);
  });
});
