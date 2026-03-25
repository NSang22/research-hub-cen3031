import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@research-hub/shared';

type Rule = {
  field: string;
  required?: boolean;
  type?: 'string' | 'array' | 'uuid' | 'object' | 'enum';
  /** Allowed values when type is 'enum' */
  values?: string[];
  minLength?: number;
  label?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateField(value: unknown, rule: Rule): string | null {
  const label = rule.label ?? rule.field;

  if (rule.required && (value === undefined || value === null || value === '')) {
    return `${label} is required`;
  }
  if (value === undefined || value === null || value === '') return null;

  if (rule.type === 'uuid' && typeof value === 'string' && !UUID_RE.test(value)) {
    return `${label} must be a valid UUID`;
  }
  if (rule.type === 'string' && typeof value !== 'string') {
    return `${label} must be a string`;
  }
  if (rule.type === 'array' && !Array.isArray(value)) {
    return `${label} must be an array`;
  }
  if (rule.type === 'array' && Array.isArray(value)) {
    const hasNonString = value.some((v) => typeof v !== 'string');
    if (hasNonString) return `${label} must be an array of strings`;
  }
  if (rule.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return `${label} must be a plain object`;
    }
  }
  if (rule.type === 'enum') {
    if (!rule.values?.includes(value as string)) {
      return `${label} must be one of: ${rule.values?.join(', ')}`;
    }
  }
  if (rule.minLength && typeof value === 'string' && value.trim().length < rule.minLength) {
    return `${label} must be at least ${rule.minLength} character(s)`;
  }

  return null;
}

/**
 * Returns Express middleware that validates req.body against the provided rules.
 * Responds with 400 and the first validation error if any rule fails.
 */
export function validateBody(rules: Rule[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const rule of rules) {
      const error = validateField(req.body[rule.field], rule);
      if (error) {
        const response: ApiResponse<never> = { success: false, error };
        res.status(400).json(response);
        return;
      }
    }
    next();
  };
}
