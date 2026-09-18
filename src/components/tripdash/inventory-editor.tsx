"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Minus, Plus, Package, RotateCcw, Layers } from "lucide-react";
import type { Inventory } from "@/lib/workspace/types";
import { useWorkspace } from "./context";
import { Field, Form, Modal, Submit, text } from "./ui";

export function InventoryEditor({item,onClose}:{item?:Inventory;onClose:()=>void}) {
  const {mutate}=useWorkspace();
  const [total,setTotal]=useState(item?.total??0),[damaged,setDamaged]=useState(item?.damaged??0);
  const [mode,setMode]=useState(item?.stockTracked===false?"untracked":item?.consumable?"consumable":"returnable");
  const [imageUrl,setImageUrl]=useState(item?.imageUrl??""),[imageError,setImageError]=useState("");
  const [readingImage,setReadingImage]=useState(false);
  const imageRequest=useRef(0);
  const loaned=item?.loans.filter(l=>!l.returned).reduce((sum,l)=>sum+l.quantity,0)??0;
  const tracked=mode!=="untracked",consumable=mode==="consumable";
  const available=total-damaged-loaned;
  async function readImage(file?:File) {
    if(!file)return;
    const request=++imageRequest.current;
    setImageError("");setReadingImage(true);
    try {
      if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>8*1024*1024)throw new Error("Gunakan JPG, PNG, atau WebP maksimal 8 MB.");
      const bitmap=await createImageBitmap(file);
      try {
        const canvas=document.createElement("canvas");
        const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));
        canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
        canvas.getContext("2d")!.drawImage(bitmap,0,0,canvas.width,canvas.height);
        let data=canvas.toDataURL("image/webp",.85);
        for(const quality of [.7,.5,.3]){if(data.length<380000)break;data=canvas.toDataURL("image/webp",quality);}
        if(data.length>=380000)throw new Error("Foto terlalu kompleks. Coba foto dengan resolusi lebih kecil.");
        if(request===imageRequest.current)setImageUrl(data);
      } finally {bitmap.close();}
    } catch(e){if(request===imageRequest.current)setImageError(e instanceof Error?e.message:"Foto tidak dapat dibaca.");}
    finally{if(request===imageRequest.current)setReadingImage(false);}
  }
  return <Modal title={item?"Edit barang":"Tambah barang"} onClose={onClose} wide><div className="inventory-editor"><p className="editor-description">{item?"Perbarui foto, identitas, dan jumlah stok barang.":"Tambahkan perlengkapan agar stok dan penggunaannya dapat dipantau."}</p><Form onSave={async data=>{
    if(readingImage||imageError)throw new Error(imageError||"Tunggu foto selesai diproses.");
    if(tracked&&available<0)throw new Error("Stok total harus mencakup barang rusak dan yang sedang dipinjam.");
    const fields={name:text(data,"name"),kind:text(data,"kind") as "operational"|"rental",total,stockTracked:tracked,consumable,reorderLevel:Number(data.get("threshold")??5),imageUrl};
    await mutate(item?{action:"inventory.update",itemId:item.id,...fields,damaged,reason:text(data,"reason")}:{action:"inventory.create",...fields});onClose();
  }}>
    <div className="editor-columns">
      <section className="editor-photo-column"><h3>Foto barang</h3><label className="editor-photo-upload">{imageUrl?<Image src={imageUrl} alt="Pratinjau barang" width={320} height={320} unoptimized/>:<span><ImagePlus size={36}/><strong>Pilih foto barang</strong><small>Klik untuk memilih foto</small></span>}<input className="sr-only" aria-label="Foto barang" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void readImage(e.target.files?.[0])}/></label><p>JPG, PNG, WebP · maksimal 8 MB<br/>Foto dioptimalkan otomatis.</p>{readingImage&&<p role="status">Memproses foto…</p>}{imageError&&<p role="alert" className="editor-image-error">{imageError}</p>}{imageUrl&&<button type="button" className="text-link" onClick={()=>{imageRequest.current++;setImageUrl("");setImageError("");setReadingImage(false);}}>Hapus foto</button>}</section>
      <div className="editor-fields"><section><h3>Informasi barang</h3><Field label="Nama barang" name="name" defaultValue={item?.name} placeholder="Contoh: Tenda dome 4 orang" maxLength={200} required/><label className="form-label">Jenis barang<select className="td-input" name="kind" defaultValue={item?.kind??"operational"}><option value="operational">Operasional</option><option value="rental">Sewaan</option></select></label></section>
      <section><h3>Cara pencatatan</h3><div className="inventory-mode-options">{[{id:"returnable",title:"Dikembalikan",description:"Dipinjam untuk trip, lalu kembali ke stok.",Icon:RotateCcw},{id:"consumable",title:"Habis pakai",description:"Stok berkurang setiap kali digunakan.",Icon:Package},{id:"untracked",title:"Tanpa jumlah stok",description:"Simpan informasi barang tanpa menghitung jumlah.",Icon:Layers}].map(({id,title,description,Icon})=><label key={id} className={mode===id?"selected":""}><input type="radio" name="stock-mode" value={id} checked={mode===id} disabled={loaned>0&&id!=="returnable"} onChange={()=>setMode(id)}/><Icon size={18}/><span><strong>{title}</strong><small>{description}</small></span></label>)}</div>{loaned>0&&<p className="editor-help">{loaned} barang sedang dipinjam. Selesaikan pengembalian sebelum mengubah cara pencatatan.</p>}</section>
      {tracked&&<section><h3>Jumlah stok</h3><div className="form-grid"><label className="form-label">Stok total<div className="stock-stepper"><button type="button" className="td-secondary" aria-label="Kurangi stok total" disabled={total<=0} onClick={()=>setTotal(total-1)}><Minus size={16}/></button><input className="td-input" aria-label="Jumlah stok total" type="number" value={total} min={0} max={100000} required onChange={e=>setTotal(Number(e.target.value))}/><button type="button" className="td-secondary" aria-label="Tambah stok total" disabled={total>=100000} onClick={()=>setTotal(total+1)}><Plus size={16}/></button></div></label>{item&&<Field label="Barang rusak" type="number" value={damaged} min={0} max={total} onChange={e=>setDamaged(Number(e.target.value))}/>}</div><div className={available<0?"editor-stock-summary invalid":"editor-stock-summary"}><span>Stok tersedia</span><strong>{available} barang</strong><small>Total {total} − rusak {damaged} − dipinjam {loaned}</small></div>{consumable&&<Field label="Ingatkan jika stok ≤" name="threshold" type="number" min={0} max={100000} defaultValue={item?.reorderLevel??5} required/>}</section>}
      {item&&<section><Field label="Alasan perubahan" name="reason" placeholder="Contoh: tambah stok atau ganti foto barang" maxLength={200} required/></section>}</div>
    </div><div className="editor-form-actions"><button className="td-secondary" type="button" onClick={onClose}>Batal</button><Submit>{item?"Simpan barang":"Tambah barang"}</Submit></div>
  </Form></div></Modal>;
}
