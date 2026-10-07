"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Minus, Plus, Package, RotateCcw } from "lucide-react";
import type { Inventory } from "@/lib/workspace/types";
import { useWorkspace } from "./context";
import { Field, Form, Modal, Submit, text } from "./ui";

export function InventoryEditor({item,onClose}:{item?:Inventory;onClose:()=>void}) {
  const {mutate}=useWorkspace();
  const minTotal=item?0:1;
  const [total,setTotal]=useState(item?.total??minTotal),[damaged,setDamaged]=useState(item?.damaged??0);
  const [mode,setMode]=useState(item?.consumable?"consumable":"returnable");
  const [imageUrl,setImageUrl]=useState(item?.imageUrl??""),[imageError,setImageError]=useState("");
  const [readingImage,setReadingImage]=useState(false);
  const imageRequest=useRef(0);
  const loaned=item?.loans.filter(l=>!l.returned).reduce((sum,l)=>sum+l.quantity,0)??0;
  const consumable=mode==="consumable";
  const available=total-damaged-loaned;
  async function readImage(file?:File) {
    if(!file)return;
    const request=++imageRequest.current;
    setImageError("");setReadingImage(true);
    try {
      if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>8*1024*1024)throw new Error("Use a JPG, PNG, or WebP up to 8 MB.");
      const bitmap=await createImageBitmap(file);
      try {
        const canvas=document.createElement("canvas");
        const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));
        canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
        canvas.getContext("2d")!.drawImage(bitmap,0,0,canvas.width,canvas.height);
        let data=canvas.toDataURL("image/webp",.85);
        for(const quality of [.7,.5,.3]){if(data.length<380000)break;data=canvas.toDataURL("image/webp",quality);}
        if(data.length>=380000)throw new Error("The photo is too complex. Try a lower-resolution photo.");
        if(request===imageRequest.current)setImageUrl(data);
      } finally {bitmap.close();}
    } catch(e){if(request===imageRequest.current)setImageError(e instanceof Error?e.message:"Could not read the photo.");}
    finally{if(request===imageRequest.current)setReadingImage(false);}
  }
  return <Modal title={item?"Edit item":"Add item"} onClose={onClose} wide><div className="inventory-editor"><p className="editor-description">{item?"Update the item's photo, details, and stock.":"Add equipment so its stock and usage can be tracked."}</p><Form onSave={async data=>{
    if(readingImage||imageError)throw new Error(imageError||"Wait for the photo to finish processing.");
    if(available<0)throw new Error("Total stock must cover damaged items and items on loan.");
    if(!item&&total<1)throw new Error("Starting stock must be at least 1.");
    const fields={name:text(data,"name"),kind:text(data,"kind") as "operational"|"rental",total,stockTracked:true,consumable,reorderLevel:Number(data.get("threshold")??5),imageUrl};
    await mutate(item?{action:"inventory.update",itemId:item.id,...fields,damaged,reason:text(data,"reason")}:{action:"inventory.create",...fields});onClose();
  }}>
    <div className="editor-columns">
      <section className="editor-photo-column"><h3>Item photo</h3><label className="editor-photo-upload">{imageUrl?<Image src={imageUrl} alt="Item preview" width={320} height={320} unoptimized/>:<span><ImagePlus size={36}/><strong>Choose an item photo</strong><small>Click to select a photo</small></span>}<input className="sr-only" aria-label="Item photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void readImage(e.target.files?.[0])}/></label><p>JPG, PNG, WebP · up to 8 MB<br/>Photos are optimized automatically.</p>{readingImage&&<p role="status">Processing photo…</p>}{imageError&&<p role="alert" className="editor-image-error">{imageError}</p>}{imageUrl&&<button type="button" className="text-link" onClick={()=>{imageRequest.current++;setImageUrl("");setImageError("");setReadingImage(false);}}>Remove photo</button>}</section>
      <div className="editor-fields"><section><h3>Item details</h3><Field label="Item name" name="name" defaultValue={item?.name} placeholder="Example: 4-person dome tent" maxLength={200} required/><label className="form-label">Item type<select className="td-input" name="kind" defaultValue={item?.kind??"operational"}><option value="operational">Operational</option><option value="rental">Rental</option></select></label></section>
      <section><h3>Tracking method</h3><div className="inventory-mode-options">{[{id:"returnable",title:"Returnable",description:"Lent out for a trip, then returned to stock.",Icon:RotateCcw},{id:"consumable",title:"Consumable",description:"Stock goes down each time it is used.",Icon:Package}].map(({id,title,description,Icon})=><label key={id} className={mode===id?"selected":""}><input type="radio" name="stock-mode" value={id} checked={mode===id} disabled={loaned>0&&id!=="returnable"} onChange={()=>setMode(id)}/><Icon size={18}/><span><strong>{title}</strong><small>{description}</small></span></label>)}</div>{loaned>0&&<p className="editor-help">{loaned} items are on loan. Finish returning them before changing the tracking method.</p>}</section>
      <section><h3>Stock</h3><div className="form-grid"><label className="form-label">Total stock<div className="stock-stepper"><button type="button" className="td-secondary" aria-label="Decrease total stock" disabled={total<=minTotal} onClick={()=>setTotal(total-1)}><Minus size={16}/></button><input className="td-input" aria-label="Total stock" type="number" value={total} min={minTotal} max={100000} required onChange={e=>setTotal(Number(e.target.value))}/><button type="button" className="td-secondary" aria-label="Increase total stock" disabled={total>=100000} onClick={()=>setTotal(total+1)}><Plus size={16}/></button></div>{!item&&<small>At least 1 when first created.</small>}</label>{item&&<Field label="Damaged" type="number" value={damaged} min={0} max={total} onChange={e=>setDamaged(Number(e.target.value))}/>}</div><div className={available<0?"editor-stock-summary invalid":"editor-stock-summary"}><span>Available stock</span><strong>{available} items</strong><small>Total {total} − damaged {damaged} − on loan {loaned}</small></div>{consumable&&<Field label="Remind me when stock ≤" name="threshold" type="number" min={0} max={100000} defaultValue={item?.reorderLevel??5} required/>}</section>
      {item&&<section><Field label="Reason for change (optional)" name="reason" placeholder="Example: restocked or replaced the photo" maxLength={200}/></section>}</div>
    </div><div className="editor-form-actions"><button className="td-secondary" type="button" onClick={onClose}>Cancel</button><Submit>{item?"Save item":"Add item"}</Submit></div>
  </Form></div></Modal>;
}
