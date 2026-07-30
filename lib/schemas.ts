// Canonical schemas now live in supabase/functions/_shared/schemas.ts (Deno-portable,
// bundled with every Edge Function). This file re-exports them so the Next.js side
// (modal forms, etc.) keeps validating against the exact same source of truth.
export * from "../supabase/functions/_shared/schemas";
