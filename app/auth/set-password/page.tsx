"use client";

import { useEffect, useState } from "react";
import { createClientSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Landing page for a staff invite link (see supabase/functions/staff/index.ts's
// inviteUserByEmail redirectTo). Supabase's browser client detects the session
// from the invite link's URL fragment automatically on load; this page just
// asks the invitee to set a password to finish provisioning their account.
export default function SetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    createClientSupabase()
      .auth.getSession()
      .then(({ data }) => {
        setHasSession(!!data.session);
        setReady(true);
      });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await createClientSupabase().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
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
          <h2 className="text-xl font-semibold mb-5">Set your password</h2>
          {!ready ? (
            <p className="text-muted text-sm">Checking your invite link…</p>
          ) : !hasSession ? (
            <p className="text-danger text-sm">
              This invite link is invalid or has expired. Ask your farm admin to send a new one.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 text-[0.8rem] font-semibold text-muted uppercase">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full p-3 bg-[#1a1a1a] border border-hairline rounded-lg text-white outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block mb-2 text-[0.8rem] font-semibold text-muted uppercase">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  className="w-full p-3 bg-[#1a1a1a] border border-hairline rounded-lg text-white outline-none focus:border-primary"
                />
              </div>
              {error ? <p className="text-danger text-sm">{error}</p> : null}
              <Button type="submit" variant="success" className="w-full" disabled={loading}>
                {loading ? "Saving…" : "Set Password & Continue"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
