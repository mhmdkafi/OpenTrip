import { cpus, tmpdir } from "node:os";
import { createScheduler, createWorker, type Scheduler } from "tesseract.js";
import { driveFileId, driveThumbnail } from "@/lib/drive";
import { parseTransferAmount } from "./transfer-amount";

// A small pool of OCR workers per server instance, so several proofs are read at once.
// Language data is cached in the temp folder after the first download.
const WORKERS = Math.max(1, Math.min(4, cpus().length - 1));
let pool: Promise<Scheduler> | null = null;
const getPool = () => pool ??= (async () => {
  const scheduler = createScheduler();
  const workers = await Promise.all(Array.from({ length: WORKERS }, () => createWorker("eng", undefined, { cachePath: tmpdir() })));
  for (const worker of workers) scheduler.addWorker(worker);
  return scheduler;
})().catch(error => { pool = null; throw error; });

// A 600px-wide thumbnail keeps receipt amounts legible while halving OCR time.
async function download(proofUrl: string) {
  const id = driveFileId(proofUrl);
  if (!id) return null;
  const response = await fetch(driveThumbnail(id, 600), { signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!response?.ok || !response.headers.get("content-type")?.startsWith("image/")) return null;
  return Buffer.from(await response.arrayBuffer());
}

// Reads the transferred amount from each proof; null when the image is unreachable or shows no amount.
// `onResult` fires per proof as soon as it is read, so callers can show amounts progressively.
export async function scanProofAmounts(proofUrls: string[], onResult?: (proofUrl: string, amount: number | null) => void) {
  const scheduler = getPool();
  const amounts = await Promise.all(proofUrls.map(async url => {
    const image = await download(url);
    if (!image) return null;
    const { data } = await (await scheduler).addJob("recognize", image);
    return parseTransferAmount(data.text);
  }).map((job, index) => job.catch(() => null).then(amount => { onResult?.(proofUrls[index], amount); return amount; })));
  return new Map(proofUrls.map((url, index) => [url, amounts[index]]));
}
