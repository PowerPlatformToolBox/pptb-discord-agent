/**
 * Input validation utilities
 */

import { ValidationError } from '../types/errors';

/**
 * Validate GitHub repository name
 */
export function validateRepoName(repoName: string): boolean {
  const repoPattern = /^[a-zA-Z0-9._-]+$/;
  return repoPattern.test(repoName);
}

/**
 * Sanitize user input for GitHub issue
 */
export function sanitizeIssueInput(input: string): string {
  // Remove potential injection attempts, trim whitespace
  return input.trim().substring(0, 2000);
}

/**
 * Validate and sanitize labels
 */
export function validateLabels(labels: string[]): string[] {
  if (labels.length > 10) {
    throw new ValidationError('Too many labels provided (max 10)');
  }

  return labels.map((label) => label.trim()).filter((label) => label.length > 0);
}
