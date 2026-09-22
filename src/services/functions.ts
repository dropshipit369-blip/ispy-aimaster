import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/** An error returned by one of our edge functions, carrying the HTTP status, machine code and any extra fields. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | undefined
  readonly details: Record<string, unknown>

  constructor(message: string, status: number, code?: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/**
 * Calls a Supabase Edge Function with the signed-in user's session.
 * Every iSpy function speaks JSON and returns `{ error, code, ...details }` on failure.
 */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (!error) return data as T

  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response
    let payload: Record<string, unknown> = {}
    try {
      payload = (await response.json()) as Record<string, unknown>
    } catch {
      // Non-JSON gateway error; fall through to a generic message.
    }
    const message = typeof payload.error === 'string' ? payload.error : `Request failed (${response.status}). Please retry.`
    const code = typeof payload.code === 'string' ? payload.code : undefined
    throw new ApiError(message, response.status, code, payload)
  }

  throw new ApiError('Could not reach iSpy. Check your connection and retry.', 0, 'network_error')
}
