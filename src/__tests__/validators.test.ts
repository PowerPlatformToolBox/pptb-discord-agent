import { describe, expect, it } from 'vitest';
import { ValidationError } from '../types/errors';
import {
  sanitizeIssueInput,
  validateChannelId,
  validateLabels,
  validateRepoName,
} from '../utils/validators';

describe('validateChannelId', () => {
  it('accepts 17 to 19 digit ids', () => {
    expect(validateChannelId('12345678901234567')).toBe(true);
    expect(validateChannelId('1234567890123456789')).toBe(true);
  });

  it('rejects short, long and non-numeric ids', () => {
    expect(validateChannelId('1234567890123456')).toBe(false);
    expect(validateChannelId('12345678901234567890')).toBe(false);
    expect(validateChannelId('abc45678901234567')).toBe(false);
  });
});

describe('validateRepoName', () => {
  it('accepts letters, digits, dots, dashes and underscores', () => {
    expect(validateRepoName('pptb-discord_assistant.v2')).toBe(true);
  });

  it('rejects spaces, slashes and empty names', () => {
    expect(validateRepoName('a b')).toBe(false);
    expect(validateRepoName('org/repo')).toBe(false);
    expect(validateRepoName('')).toBe(false);
  });
});

describe('sanitizeIssueInput', () => {
  it('trims whitespace', () => {
    expect(sanitizeIssueInput('  hi  ')).toBe('hi');
  });

  it('caps input at 2000 characters', () => {
    expect(sanitizeIssueInput('a'.repeat(3000))).toHaveLength(2000);
  });
});

describe('validateLabels', () => {
  it('trims labels and drops empty ones', () => {
    expect(validateLabels([' bug ', '', '  ', 'feature'])).toEqual(['bug', 'feature']);
  });

  it('throws on more than 10 labels', () => {
    const labels = Array.from({ length: 11 }, (_, i) => `l${i}`);
    expect(() => validateLabels(labels)).toThrow(ValidationError);
  });
});
