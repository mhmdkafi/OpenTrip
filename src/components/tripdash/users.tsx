"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Users } from "lucide-react";
import { Field, Modal } from "./ui";
import { requestJson } from "./context";
import { useAutoDismiss } from "./use-auto-dismiss";

type Member = { id:string; name:string; email:string; role:"owner"|"admin"; status:string; createdAt:string };
type Result = { users:Member[]; total:number; page:number; role:"owner"|"admin" };

export function UsersPage() {
  const [page,setPage]=useState(1), [result,setResult]=useState<Result|null>(null);
  const [loading,setLoading]=useState(true), [error,setError]=useState(""), [notice,setNotice]=useState("");
  const [open,setOpen]=useState(false), [busy,setBusy]=useState(false), [formError,setFormError]=useState("");
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
  return <>
    <div className="page-heading"><div><h1>Users</h1><p>Owners and admins in this workspace.</p></div>
      {result?.role==="owner" && <button className="td-button" onClick={()=>{setFormError("");setOpen(true);}}><Plus size={16} aria-hidden="true"/>Add admin</button>}
    </div>
    {notice&&<p className="notice" role="status">{notice}</p>}
    {error&&<p className="notice error" role="alert">{error}</p>}
    <section className="td-panel">
      <div className="panel-heading"><h2><Users size={18} className="inline mr-2" aria-hidden="true"/>Daftar pengguna{result?` (${result.total})`:""}</h2><button className="td-secondary" onClick={()=>{setLoading(true);reload();}} disabled={loading}><RefreshCw size={15} aria-hidden="true"/>Reload</button></div>
      {result?.role==="admin"&&<p className="empty-note mb-4">You can view all users. Only the owner can add admins.</p>}
      {loading?<p role="status">Loading users…</p>:<>
        <div className="table-wrap"><table className="td-table"><thead><tr><th scope="col">Name / email</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Added</th></tr></thead>
          <tbody>{result?.users.map(user=><tr key={user.id}><td><strong>{user.name||"—"}</strong><div className="break-all">{user.email}</div></td><td><span className={`badge ${user.role==="owner"?"":"gray"}`}>{user.role==="owner"?"Owner":"Admin"}</span></td><td>{user.status==="active"?"Active":"Inactive"}</td><td>{new Date(user.createdAt).toLocaleDateString("en-GB")}</td></tr>)}</tbody></table></div>
        {result?.total===0&&<p className="empty-note mt-4">No users yet.</p>}
        <div className="table-foot"><span>Page {page} of {Math.max(1,Math.ceil((result?.total||0)/20))}</span><div className="flex gap-2"><button className="td-secondary" disabled={page===1} onClick={()=>{setLoading(true);setPage(p=>p-1);}}>Previous</button><button className="td-secondary" disabled={!result||page*20>=result.total} onClick={()=>{setLoading(true);setPage(p=>p+1);}}>Next</button></div></div>
      </>}
    </section>
    {open&&<Modal title="Add admin" onClose={()=>{if(!busy)setOpen(false);}}>
      <p className="empty-note">The new admin can sign in and access this workspace. Share the email and initial password with the account owner.</p>
      {formError&&<p className="notice error" role="alert">{formError}</p>}
      <form onSubmit={async e=>{
        e.preventDefault(); if(busy)return; const data=new FormData(e.currentTarget);setBusy(true);setFormError("");
        try{await requestJson("/api/users",{name:String(data.get("name")),email:String(data.get("email")),password:String(data.get("password"))});setOpen(false);setNotice("Admin added and can now sign in.");reload();}
        catch(error){setFormError(error instanceof Error?error.message:"Could not create the account.");}
        finally{setBusy(false);}
      }}><fieldset disabled={busy} className="grid gap-4">
        <Field label="Full name" name="name" required minLength={2} maxLength={100} autoComplete="name"/>
        <Field label="Email" name="email" type="email" required autoComplete="off"/>
        <Field label="Initial password (at least 6 characters)" name="password" type="password" required minLength={6} maxLength={128} autoComplete="new-password"/>
        <p className="empty-note">Role: Admin</p><button type="submit" className="td-button">{busy?"Adding…":"Add admin"}</button>
      </fieldset></form>
    </Modal>}
  </>;
}
