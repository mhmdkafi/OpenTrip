"use client";
import { useState } from "react";

import { driveFileId, driveThumbnail } from "@/lib/drive";

export function ProofImage({ url }: { url: string }) {
  const id = driveFileId(url);
  const [failed, setFailed] = useState(false);
  if (!id) return null;
  if (failed) return <p className="proof-note">Preview unavailable. Share the form’s upload folder as “Anyone with the link: Viewer”, or open the original proof.</p>;
  // eslint-disable-next-line @next/next/no-img-element -- external Drive thumbnail, not an optimizable asset
  return <a className="proof-image" href={url} target="_blank" rel="noopener noreferrer"><img src={driveThumbnail(id)} alt="Transfer proof" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/></a>;
}
