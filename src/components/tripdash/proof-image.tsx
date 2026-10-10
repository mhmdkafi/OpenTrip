"use client";
import { useState } from "react";

// Google Form uploads live in Drive; the thumbnail endpoint renders an image the browser can display.
export const driveFileId = (url: string) => url.match(/\/file\/d\/([\w-]{20,})/)?.[1] ?? url.match(/[?&]id=([\w-]{20,})/)?.[1] ?? null;

export function ProofImage({ url }: { url: string }) {
  const id = driveFileId(url);
  const [failed, setFailed] = useState(false);
  if (!id) return null;
  if (failed) return <p className="proof-note">Preview unavailable. Share the form’s upload folder as “Anyone with the link: Viewer”, or open the original proof.</p>;
  // eslint-disable-next-line @next/next/no-img-element -- external Drive thumbnail, not an optimizable asset
  return <a className="proof-image" href={url} target="_blank" rel="noopener noreferrer"><img src={`https://drive.google.com/thumbnail?id=${id}&sz=w1200`} alt="Transfer proof" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/></a>;
}
