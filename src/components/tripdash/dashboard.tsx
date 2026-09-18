"use client";
import { useEffect, useState } from "react";
import { FileSpreadsheet, ShieldCheck, Link2 } from "lucide-react";
import { useWorkspace, requestJson } from "./context";
import { Panel } from "./ui";
import { Trips } from "./trips";
import { Participants } from "./participants";
import { Finance } from "./finance";
import { Inventory } from "./inventory";
import { Attendance } from "./attendance";
import { Overview } from "./overview";
import { TripDetail } from "./trip-detail";
const titles: Record<string,string>={overview:"Overview",trips:"Trip Schedule",participants:"Peserta & Pembayaran",finance:"Cashflow",inventory:"Inventory",attendance:"Absensi",settings:"Pengaturan"};
const descriptions: Record<string,string>={overview:"Jadwal dan status operasional Rimbaloka Trip.",trips:"Jadwal keberangkatan, peserta, dan sumber pendaftaran.",participants:"Daftar peserta dan verifikasi pembayaran.",finance:"Pemasukan, pengeluaran, dan hasil per trip.",inventory:"",attendance:"Daftar hadir peserta per titik mepo.",settings:"Akun dan koneksi data."};
export function Dashboard({section,tripId}:{section:string;tripId?:string}) {
 const {loading,error,notice,prototype}=useWorkspace();
 const [viewDate]=useState(()=>prototype?new Date("2026-09-13T12:00:00"):new Date());
 return <>{!tripId&&<div className="page-heading"><div><h1>{titles[section]}</h1>{descriptions[section]&&<p>{descriptions[section]}</p>}</div>{section==="overview"&&<span className="view-date">{viewDate.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Jakarta"})}</span>}</div>}
 {error&&<p role="alert" className="notice error">{error}</p>}{notice&&<p role="status" className="notice">{notice}</p>}
 {loading?<p role="status">Memuat data ruang kerja…</p>:<>{section==="overview"&&<Overview/>}{section==="trips"&&(tripId?<TripDetail tripId={tripId}/>:<Trips/>)}{section==="participants"&&<Participants/>}{section==="finance"&&<Finance/>}{section==="inventory"&&<Inventory/>}{section==="attendance"&&<Attendance/>}{section==="settings"&&<Settings/>}</>}</>;
}
function Settings(){
 const {run,busy,prototype,reset}=useWorkspace();const [google,setGoogle]=useState<{configured:boolean;connected:boolean}|null>(prototype?{configured:true,connected:true}:null);const [error,setError]=useState("");
 useEffect(()=>{if(!prototype)requestJson("/api/google/status").then(setGoogle).catch(e=>setError(e.message));},[prototype]);
 return <div className="section-stack"><Panel title="Identitas ruang kerja"><div className="business-profile"><div className="profile-mark">R</div><div><h3>Rimbaloka Trip</h3><p>Open trip & outdoor experiences</p><span className="badge">Administrator · Akses semua fitur</span></div></div><div className="settings-facts"><div><small>Nama aplikasi</small><strong>TripDash</strong></div><div><small>Zona waktu</small><strong>Asia/Jakarta (WIB)</strong></div><div><small>Mata uang</small><strong>Rupiah Indonesia (IDR)</strong></div></div></Panel><Panel title="Integrasi Google Sheets"><div className="integration-card"><div className="integration-icon"><FileSpreadsheet size={29}/></div><div><h3>Google Spreadsheet</h3><p>Baca respons Google Form langsung dari spreadsheet Anda.</p></div><span className={`badge ${google?.connected?"":"gray"}`}>{google?.connected?prototype?"Simulasi terhubung":"Terhubung":"Belum terhubung"}</span></div>{error&&<p role="alert">{error}</p>}{!prototype&&google&&!google.configured&&<p className="empty-note">Koneksi belum tersedia. Administrator perlu melengkapi konfigurasi Google.</p>}<div className="flex flex-wrap gap-3 mt-5">{prototype?<button className="td-button" onClick={()=>setGoogle({configured:true,connected:!google?.connected})}><Link2 size={15}/>{google?.connected?"Simulasikan putus koneksi":"Simulasikan hubungkan Google"}</button>:google?.configured&&<a className="td-button" href="/api/google/connect"><Link2 size={15}/>{google.connected?"Hubungkan ulang":"Hubungkan Google"}</a>}{!prototype&&google?.connected&&<button className="td-secondary" disabled={busy} onClick={()=>void run(async()=>{await requestJson("/api/google/status",{},"DELETE");setGoogle({...google,connected:false});})}>Putuskan koneksi</button>}</div><p className="settings-hint"><ShieldCheck size={15}/> Hanya membaca data. Spreadsheet asli tetap utuh.</p></Panel>{prototype&&<Panel title="Tentang prototipe"><p className="empty-note">Gunakan prototipe ini untuk mencoba alur operasional. Nama, pembayaran, dan stok merupakan simulasi; perubahan tersimpan hanya di browser ini. Tidak ada pesan atau transaksi yang dikirim.</p><button className="td-secondary mt-4" onClick={reset}>Kembalikan data simulasi awal</button></Panel>}</div>;
}
