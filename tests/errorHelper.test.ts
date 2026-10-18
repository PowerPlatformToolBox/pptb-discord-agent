import { describe, expect, it } from '@jest/globals';
import { createErrorLogObject, getErrorMessage, getErrorStack } from '../src/utils/errorHelper';

describe('errorHelper', () => {
  it('reads message and stack from Error instances', () => {
    const error = new Error('boom');
    expect(getErrorMessage(error)).toBe('boom');
    expect(getErrorStack(error)).toBe(error.stack);
  });

  it('stringifies non-Error values and has no stack for them', () => {
    expect(getErrorMessage('oops')).toBe('oops');
    expect(getErrorStack('oops')).toBeUndefined();
  });

  it('builds a log object', () => {
    expect(createErrorLogObject('x')).toEqual({ error: 'x', stack: undefined });
  });
});
