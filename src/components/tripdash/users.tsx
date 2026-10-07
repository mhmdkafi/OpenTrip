"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { Field, Modal } from "./ui";
import { requestJson } from "./context";
import { useAutoDismiss } from "./use-auto-dismiss";

type Member = { id:string; name:string; email:string; role:"owner"|"admin"; lastSignInAt:string|null };
type Result = { users:Member[]; total:number; page:number; role:"owner"|"admin" };

const lastAccess = (value:string|null) => value
  ? `${new Date(value).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Jakarta"})} WIB`
  : "Never";

export function UsersPage() {
  const [page,setPage]=useState(1), [result,setResult]=useState<Result|null>(null);
  const [loading,setLoading]=useState(true), [error,setError]=useState(""), [notice,setNotice]=useState("");
  const [editing,setEditing]=useState<Member|"new"|null>(null), [deleting,setDeleting]=useState<Member|null>(null);
  const [busy,setBusy]=useState(false), [formError,setFormError]=useState("");
  const [refresh,setRefresh]=useState(0);
  useAutoDismiss(notice,()=>setNotice(""));
  useAutoDismiss(formError,()=>setFormError(""));
  const reload=useCallback(()=>setRefresh(n=>n+1),[]);
  useEffect(()=>{
    let active=true;
    requestJson(`/api/users?page=${page}`).then(data=>{if(active){setResult(data);setError("");}})
      .catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[page,refresh]);
  const owner=result?.role==="owner";
  async function submit(action:()=>Promise<unknown>, message:string, close:()=>void) {
    if(busy)return; setBusy(true); setFormError("");
    try{await action();close();setNotice(message);reload();}
    catch(e){setFormError(e instanceof Error?e.message:"Something went wrong.");}
    finally{setBusy(false);}
  }
  return <>
    <div className="page-heading"><div><h1>Users</h1><p>Owners and admins in this workspace.</p></div>
      {owner && <button className="td-button" onClick={()=>{setFormError("");setEditing("new");}}><Plus size={16} aria-hidden="true"/>Add admin</button>}
    </div>
    {notice&&<p className="notice" role="status">{notice}</p>}
    {error&&<p className="notice error" role="alert">{error}</p>}
    <section className="td-panel">
      <div className="panel-heading"><h2><Users size={18} className="inline mr-2" aria-hidden="true"/>User list{result?` (${result.total})`:""}</h2></div>
      {result?.role==="admin"&&<p className="empty-note mb-4">You can view all users. Only the owner can manage admins.</p>}
      {loading?<p role="status">Loading users…</p>:<>
        <div className="table-wrap"><table className="td-table"><thead><tr><th scope="col">Name / email</th><th scope="col">Role</th><th scope="col">Last access</th>{owner&&<th scope="col"><span className="sr-only">Actions</span></th>}</tr></thead>
          <tbody>{result?.users.map(user=><tr key={user.id}><td><strong>{user.name||"—"}</strong><div className="break-all">{user.email}</div></td><td><span className={`badge ${user.role==="owner"?"":"gray"}`}>{user.role==="owner"?"Owner":"Admin"}</span></td><td>{lastAccess(user.lastSignInAt)}</td>
            {owner&&<td>{user.role==="admin"&&<div className="flex gap-2 justify-end"><button className="table-icon" aria-label={`Edit ${user.email}`} onClick={()=>{setFormError("");setEditing(user);}}><Pencil size={15}/></button><button className="table-icon danger-button" aria-label={`Remove ${user.email}`} onClick={()=>{setFormError("");setDeleting(user);}}><Trash2 size={15}/></button></div>}</td>}</tr>)}</tbody></table></div>
        {result?.total===0&&<p className="empty-note mt-4">No users yet.</p>}
        <div className="table-foot"><span>Page {page} of {Math.max(1,Math.ceil((result?.total||0)/20))}</span><div className="flex gap-2"><button className="td-secondary" disabled={page===1} onClick={()=>{setLoading(true);setPage(p=>p-1);}}>Previous</button><button className="td-secondary" disabled={!result||page*20>=result.total} onClick={()=>{setLoading(true);setPage(p=>p+1);}}>Next</button></div></div>
      </>}
    </section>
    {editing&&<Modal title={editing==="new"?"Add admin":"Edit admin"} onClose={()=>{if(!busy)setEditing(null);}}>
      <p className="empty-note">{editing==="new"?"The new admin can sign in with this email and password, or with Google using the same email.":"Leave the password empty to keep the current one."}</p>
      {formError&&<p className="notice error" role="alert">{formError}</p>}
      <form onSubmit={e=>{
        e.preventDefault(); const data=new FormData(e.currentTarget);
        const body={name:String(data.get("name")),email:String(data.get("email")),password:String(data.get("password"))};
        void (editing==="new"
          ? submit(()=>requestJson("/api/users",body),"Admin added and can now sign in.",()=>setEditing(null))
          : submit(()=>requestJson("/api/users",{...body,id:editing.id},"PATCH"),"Admin updated.",()=>setEditing(null)));
      }}><fieldset disabled={busy} className="grid gap-4">
        <Field label="Full name" name="name" required minLength={2} maxLength={100} autoComplete="name" defaultValue={editing==="new"?"":editing.name}/>
        <Field label="Email" name="email" type="email" required autoComplete="off" defaultValue={editing==="new"?"":editing.email}/>
        <Field label={editing==="new"?"Initial password (at least 6 characters)":"New password (optional)"} name="password" type="password" required={editing==="new"} minLength={6} maxLength={128} autoComplete="new-password"/>
        <button type="submit" className="td-button">{busy?"Saving…":editing==="new"?"Add admin":"Save changes"}</button>
      </fieldset></form>
    </Modal>}
    {deleting&&<Modal title="Remove admin" onClose={()=>{if(!busy)setDeleting(null);}}>
      <p className="empty-note">Remove {deleting.name||deleting.email} from this workspace? They will no longer be able to sign in here.</p>
      {formError&&<p className="notice error" role="alert">{formError}</p>}
      <div className="confirm-actions"><button className="td-secondary" disabled={busy} onClick={()=>setDeleting(null)}>Cancel</button><button className="td-button danger-solid" disabled={busy} onClick={()=>void submit(()=>requestJson(`/api/users?id=${deleting.id}`,{},"DELETE"),"Admin removed.",()=>setDeleting(null))}>{busy?"Removing…":"Remove admin"}</button></div>
    </Modal>}
  </>;
}
