/**
 * Shared TypeScript types for OpenCode.
 * Mirrors the Supabase database schema.
 */

export interface Profile {
  id: string; // matches auth.users.id
  username: string;
  created_at: string;
  updated_at: string;
}
