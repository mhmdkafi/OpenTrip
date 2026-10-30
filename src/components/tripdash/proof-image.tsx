"use client";
import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { driveFileId, driveThumbnail } from "@/lib/drive";

// Warms the browser cache so the next proofs appear instantly; each proof is fetched once per page load.
const warmed = new Set<string>();
export function preloadProof(url: string) {
  const id = driveFileId(url);
  if (!id || warmed.has(id)) return;
  warmed.add(id);
  const image = new Image();
  image.referrerPolicy = "no-referrer";
  image.src = driveThumbnail(id);
}

export function ProofImage({ url }: { url: string }) {
  const id = driveFileId(url);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  if (!id) return null;
  if (state === "failed") return <p className="proof-note">Preview unavailable. Share the form’s upload folder as “Anyone with the link: Viewer”.</p>;
  return <a className={`proof-image is-${state}`} href={url} target="_blank" rel="noopener noreferrer" aria-busy={state === "loading"}>
    {/* Receipt-shaped placeholder in the final frame, so nothing jumps when the image arrives. */}
    {state === "loading" && <span className="proof-skeleton" aria-hidden="true"><span className="proof-skel-card"><ImageIcon size={26}/><i className="is-wide"/><i className="is-amount"/><i/><i/><i className="is-short"/><i/><i className="is-short"/></span></span>}
    {/* eslint-disable-next-line @next/next/no-img-element -- external Drive thumbnail, not an optimizable asset */}
    <img src={driveThumbnail(id)} alt="Transfer proof" referrerPolicy="no-referrer" onLoad={() => setState("ready")} onError={() => setState("failed")}/>
  </a>;
}
