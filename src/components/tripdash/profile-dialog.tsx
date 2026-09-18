"use client";
import { UserRound } from "lucide-react";
import { Field, Form, Modal, Submit, text } from "./ui";
export type AdminProfile={name:string;phone:string;email:string};
export function ProfileDialog({profile,business,prototype,onSave,onClose}:{profile:AdminProfile;business:string;prototype:boolean;onSave:(profile:AdminProfile)=>Promise<void>;onClose:()=>void}) {
  return <Modal title="Profil administrator" onClose={onClose}><div className="profile-dialog-intro"><span><UserRound size={30}/></span><div><strong>{profile.name||"Administrator"}</strong><p>{business}</p><small>{prototype?"Profil demo · tersimpan di browser":"Akun bisnis"}</small></div></div><Form onSave={async data=>{await onSave({...profile,name:text(data,"name"),phone:text(data,"phone")});onClose();}}><Field label="Nama lengkap" name="name" defaultValue={profile.name} maxLength={100} required/><Field label="Email akun" value={profile.email} readOnly/><Field label="Nomor telepon" name="phone" type="tel" defaultValue={profile.phone} maxLength={30} pattern="[+0-9 ()\-]*" placeholder="08…"/><div className="editor-form-actions"><button type="button" className="td-secondary" onClick={onClose}>Batal</button><Submit>Simpan profil</Submit></div></Form></Modal>;
}
