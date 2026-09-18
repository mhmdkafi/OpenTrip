import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export default async function Icon() {
  const logo = await readFile(join(process.cwd(), "public/brand/rimbaloka-logo.jpeg"));
  // The circular container uses the original logo without altering the source asset.
  // ImageResponse renders server-side and requires a plain image element.
  // eslint-disable-next-line @next/next/no-img-element
  return new ImageResponse(<div style={{ display: "flex", width: 64, height: 64, borderRadius: 32, overflow: "hidden" }}><img src={`data:image/jpeg;base64,${logo.toString("base64")}`} width={64} height={64} alt=""/></div>, size);
}
