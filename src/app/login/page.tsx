"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Landscape } from "@/components/tripdash/landscape";
import { useAuth } from "@/lib/auth/context";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
    try { const result = await login(email, password); if (!result.success) setError(result.error || "Login gagal."); else { router.replace("/dashboard"); router.refresh(); } }
    finally { setBusy(false); }
  }

  if (isLoading || session) return <p role="status">Memeriksa sesi…</p>;
  return <div className="login-layout">
    <section className="login-story" aria-label="Tentang TripDash">
      <Link href="/" className="brand-lockup"><Image src="/brand/rimbaloka-logo.jpeg" alt="Logo Rimbaloka Trip" width={46} height={46}/><div><strong>TripDash<span>.</span></strong><small>Rimbaloka Trip</small></div></Link>
      <div className="login-story-copy"><span className="eyebrow">TripDash</span><h1>Satu ruang kerja untuk setiap perjalanan.</h1><p>Kelola perjalanan dan data bisnis dalam satu workspace.</p></div>
      <div className="login-landscape"><Landscape variant={2}/></div>
      <p className="login-story-foot"><ShieldCheck size={15} aria-hidden="true"/> Akses sesuai keanggotaan workspace</p>
    </section>
    <main className="login-form-side">
      <div className="login-form-wrap">
        <span className="account-badge">Akun workspace</span>
        <h2>Selamat datang</h2>
        <p>Masuk untuk mengelola perjalanan dan data workspace Anda.</p>
        {error && <p role="alert" className="notice error">{error}</p>}
        <form onSubmit={signIn}>
          <label className="form-label" htmlFor="email">Alamat email<input id="email" type="email" className="td-input" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required/></label>
          <label className="form-label" htmlFor="password">Password<div className="password-input"><input id="password" className="td-input" autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} required/><button type="button" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}</button></div></label>
          <button className="td-button" type="submit" disabled={busy}>{busy ? "Memproses…" : "Login"}<ArrowRight size={16} aria-hidden="true"/></button>
        </form>
        <p className="login-register">Belum memiliki akun? Hubungi owner workspace untuk mendapatkan akses.</p>
        <p className="login-security"><ShieldCheck size={14} aria-hidden="true"/> Sesi dilindungi autentikasi</p>
      </div>
      <footer>© 2026 Rimbaloka Trip · TripDash</footer>
    </main>
  </div>;
}

export default function LoginPage() {
  return <Suspense fallback={<p role="status">Memuat login…</p>}><LoginForm/></Suspense>;
}
