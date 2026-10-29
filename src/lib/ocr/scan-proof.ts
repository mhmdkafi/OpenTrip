import { tmpdir } from "node:os";
import { createWorker, type Worker } from "tesseract.js";
import { driveFileId, driveThumbnail } from "@/lib/drive";
import { parseTransferAmount } from "./transfer-amount";

// One OCR worker per server instance; language data is cached in the temp folder after the first download.
let worker: Promise<Worker> | null = null;
const getWorker = () => worker ??= createWorker("eng", undefined, { cachePath: tmpdir() }).catch(error => { worker = null; throw error; });

// Returns the amount read from a transfer proof, or null when the image is unreachable or has no amount.
export async function scanProofAmount(proofUrl: string): Promise<number | null> {
  const id = driveFileId(proofUrl);
  if (!id) return null;
  const response = await fetch(driveThumbnail(id, 1000), { signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!response?.ok || !response.headers.get("content-type")?.startsWith("image/")) return null;
  const image = Buffer.from(await response.arrayBuffer());
  const { data } = await (await getWorker()).recognize(image);
  return parseTransferAmount(data.text);
}
