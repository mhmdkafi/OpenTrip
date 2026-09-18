"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

function LoginForm() {
  const [email,setEmail]=useState(""), [password,setPassword]=useState(""), [error,setError]=useState("");
  const [loading,setLoading]=useState(false), [showPassword,setShowPassword]=useState(false);
  const params=useSearchParams(), router=useRouter(); const {login}=useAuth();
  return <main className="auth-page"><section className="auth-card"><Link href="/login" className="auth-brand"><Image src="/brand/rimbaloka-logo.jpeg" alt="Rimbaloka Trip" width={56} height={56}/><div><strong>TripDash.</strong><span>Rimbaloka Trip</span></div></Link><h1>Login</h1><p className="auth-intro">Masuk ke akun untuk mengelola perjalanan dan keuangan.</p>
    {params.get("registered")==="1"&&<p role="status" className="notice">Akun berhasil dibuat. Periksa email konfirmasi, lalu masuk.</p>}
    {params.get("demo")==="ended"&&<p role="status" className="notice">Anda telah keluar dari demo. Data simulasi tetap tersimpan di browser ini.</p>}
    {error&&<p className="notice error" role="alert">{error}</p>}
    <form onSubmit={async e=>{e.preventDefault();setError("");setLoading(true);try{const result=await login(email,password);if(result.success){router.replace("/dashboard");router.refresh();}else setError(result.error??"Login gagal.");}catch{setError("Login gagal. Silakan coba kembali.");}finally{setLoading(false);}}}>
      <label className="form-label">Alamat email<input type="email" className="td-input" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required disabled={loading}/></label>
      <label className="form-label">Password<div className="password-input"><input className="td-input" autoComplete="current-password" type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} required disabled={loading}/><button type="button" aria-label={showPassword?"Sembunyikan password":"Tampilkan password"} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
      <button className="td-button" disabled={loading} type="submit">{loading?"Memproses…":"Login"}<ArrowRight size={16}/></button>
    </form><p className="auth-register">Belum memiliki akun? <Link href="/register">Daftar akun</Link></p><div className="auth-demo"><span>Ingin mencoba tampilan terlebih dahulu?</span><Link href="/prototype" className="td-secondary">Buka demo</Link></div>
  </section></main>;
}
export default function LoginPage(){return <Suspense fallback={<p>Memuat login…</p>}><LoginForm/></Suspense>;}
