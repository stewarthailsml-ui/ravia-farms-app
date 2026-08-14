"use client";

import { useState } from "react";
import { createClientSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClientSupabase()
      const { error } = await supabase.auth.signInWithPassword({
        // Trim so a trailing space from autofill or a mobile keyboard doesn't
        // read as a wrong credential. Supabase compares the password verbatim,
        // so only the surrounding whitespace goes.
        email: email.trim(),
        password,
      })
      if (error) {
        // Only "invalid_credentials" actually means bad password. Collapsing every
        // failure into that message hides rate limits, unconfirmed emails and
        // network/config errors, which all look like "my password stopped working".
        setError(
          error.code === "invalid_credentials"
            ? "Invalid email or password."
            : error.message
        );
        return;
      }
      router.push("/")
      router.refresh()
    } catch (err) {
      // signInWithPassword only *returns* auth errors; it throws on missing
      // Supabase env vars and on network/CORS failures. Without this the button
      // stuck on "Signing in…" forever with nothing shown — indistinguishable
      // from a rejected password.
      setError(err instanceof Error ? err.message : "Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-body">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="font-logo text-primary text-4xl">
            <i className="fas fa-seedling" /> Ravia Farms
          </div>
          <div className="text-accent text-[0.65rem] tracking-[0.15em] font-bold uppercase mt-1">
            Rooted and Nourished
          </div>
        </div>
        <Card>
          <h2 className="text-xl font-semibold mb-5">Sign in</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 text-[0.8rem] font-semibold text-muted uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 bg-[#1a1a1a] border border-hairline rounded-lg text-white outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block mb-2 text-[0.8rem] font-semibold text-muted uppercase">
                Password
              </label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error ? <p className="text-danger text-sm">{error}</p> : null}
            <Button type="submit" variant="success" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>
        <p className="text-center text-muted text-xs mt-4">
          Default demo: owner@ravia.farm / ravia1234
        </p>
      </div>
    </div>
  );
}
