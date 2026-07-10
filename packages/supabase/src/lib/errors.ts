import type { PostgrestError } from '@supabase/supabase-js';

export class SupabaseServiceError extends Error {
  readonly code: string;
  readonly details: string | null;
  readonly hint: string | null;

  constructor(message: string, options?: { code?: string; details?: string | null; hint?: string | null }) {
    super(message);
    this.name = 'SupabaseServiceError';
    this.code = options?.code ?? 'unknown';
    this.details = options?.details ?? null;
    this.hint = options?.hint ?? null;
  }

  static fromPostgrest(error: PostgrestError): SupabaseServiceError {
    return new SupabaseServiceError(error.message, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }
}

export function assertData<T>(data: T | null, error: PostgrestError | null, notFoundMessage?: string): T {
  if (error) throw SupabaseServiceError.fromPostgrest(error);
  if (data === null && notFoundMessage) throw new SupabaseServiceError(notFoundMessage, { code: 'not_found' });
  return data as T;
}

export function assertOk(error: PostgrestError | null): void {
  if (error) throw SupabaseServiceError.fromPostgrest(error);
}
