"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";

const callbackErrors: Record<string, string> = {
  oauth: "Google sign-in failed. Please try again.",
  "no-access": "This Google account has no workspace access. Ask your workspace owner to add you.",
};

function GoogleIcon() {
  return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
  </svg>;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const params = useSearchParams();
  const [error, setError] = useState(() => { const base = callbackErrors[params.get("error") ?? ""] ?? ""; const detail = params.get("detail"); return base && detail ? `${base} (${detail})` : base; });
  const [busy, setBusy] = useState(false);
  const { login, session, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && session) router.replace("/dashboard");
  }, [isLoading, session, router]);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try { const result = await login(email, password); if (!result.success) setError(result.error || "Sign-in failed."); else { router.replace("/dashboard"); router.refresh(); } }
    finally { setBusy(false); }
  }

  async function signInWithGoogle() {
    setBusy(true); setError("");
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
    if (error) { setError(callbackErrors.oauth); setBusy(false); }
  }

  if (isLoading || session) return <p role="status">Checking session…</p>;
  return <div className="login-layout">
    <section className="login-story" aria-label="About TripDash">
      <div className="login-story-copy"><h1>One workspace for every trip.</h1><p>Manage trips and business data in a single workspace.</p></div>
    </section>
    <main className="login-form-side">
      <Image className="login-logo" src="/brand/rimbaloka-logo.jpeg" alt="Rimbaloka Trip" width={52} height={52}/>
      <div className="login-form-wrap">
        <h2>Welcome back</h2>
        <p>Sign in to manage your trips and workspace data.</p>
        {error && <p role="alert" className="notice error">{error}</p>}
        <form onSubmit={signIn}>
          <input type="email" className="td-input" aria-label="Email" placeholder="Email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required/>
          <div className="password-input"><input className="td-input" aria-label="Password" placeholder="Password" autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} required/><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}</button></div>
          <button className="td-button" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
        <div className="login-divider"><span>or</span></div>
        <button type="button" className="td-secondary login-google" disabled={busy} onClick={() => void signInWithGoogle()}><GoogleIcon/>Continue with Google</button>
      </div>
    </main>
  </div>;
}

export default function LoginPage() {
  return <Suspense fallback={<p role="status">Loading…</p>}><LoginForm/></Suspense>;
}
