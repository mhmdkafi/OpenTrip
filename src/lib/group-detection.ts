export interface BookingParticipant {
  id: string;
  bookingId: string;
  name: string;
  facility: string;
  meetingPoint: string;
  totalBill: number;
  paidAmount: number;
  remaining: number;
  evidenceUrl: string | null;
  evidenceType: "google_drive" | "google_sheets" | "external";
  evidenceId: string | null;
  evidenceHash: string | null;
}

export interface GroupCandidate {
  groupId: string;
  participants: BookingParticipant[];
  matchMethod: "url_canonical" | "file_id" | "hash_content" | "hash_pixels";
  confidence: number;
  totalBill: number;
  totalPaid: number;
  remaining: number;
  accessStatus: "accessible" | "restricted" | "unknown";
}

export interface HashAlgorithm {
  name: string;
  compute: (data: ArrayBuffer) => Promise<string>;
}

export function extractDriveFileId(url: string): string | null {
   const patterns = [
     /\/d\/([a-zA-Z0-9-_]+)/,
     /\/folders\/([a-zA-Z0-9-_]+)/,
     /id=([a-zA-Z0-9-_]+)/,
     /^([a-zA-Z0-9-_]{20,})$/,
   ];

   for (const pattern of patterns) {
     const match = url.match(pattern);
     if (match && match[1]) {
       return match[1];
     }
   }

   return null;
 }

  export function canonicalizeGoogleUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    if (urlObj.hostname === "docs.google.com" || urlObj.hostname.endsWith(".google.com") || urlObj.hostname.endsWith("drive.google.com")) {
      if (urlObj.pathname.includes("/spreadsheets/")) {
        const spreadsheetId = urlObj.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
        const gid = urlObj.searchParams.get("gid");
        
        if (spreadsheetId) {
          const cleanUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
          return gid ? `${cleanUrl}?gid=${gid}` : cleanUrl;
        }
      } else if (urlObj.pathname.includes("/file/d/") || urlObj.pathname.includes("/open")) {
        const fileId = extractDriveFileId(url);
        if (fileId) {
          return `https://drive.google.com/file/d/${fileId}/view`;
        }
      }
    }
    
    return urlObj.toString();
  } catch {
    return url;
  }
}

export function detectGroupsByUrl(participants: BookingParticipant[]): GroupCandidate[] {
  const urlMap = new Map<string, BookingParticipant[]>();

  for (const participant of participants) {
    if (participant.evidenceUrl) {
      const canonicalUrl = canonicalizeGoogleUrl(participant.evidenceUrl);
      const key = `url:${canonicalUrl}`;

      if (!urlMap.has(key)) {
        urlMap.set(key, []);
      }
      urlMap.get(key)!.push(participant);
    }
  }

  const groups: GroupCandidate[] = [];

  for (const [key, groupParticipants] of urlMap) {
    if (groupParticipants.length < 2) continue;

    const canonicalUrl = key.replace("url:", "");
    const totalBill = groupParticipants.reduce((sum, p) => sum + p.totalBill, 0);
    const totalPaid = groupParticipants.reduce((sum, p) => sum + p.paidAmount, 0);
    const remaining = groupParticipants.reduce((sum, p) => sum + p.remaining, 0);

    groups.push({
      groupId: `url_${canonicalUrl.replace(/[^a-zA-Z0-9]/g, "").slice(-8)}`,
      participants: groupParticipants,
      matchMethod: "url_canonical",
      confidence: 0.95,
      totalBill,
      totalPaid,
      remaining,
      accessStatus: "accessible",
    });
  }

  return groups;
}

export function detectGroupsByFileId(participants: BookingParticipant[]): GroupCandidate[] {
  const fileIdMap = new Map<string, BookingParticipant[]>();

  for (const participant of participants) {
    if (participant.evidenceUrl && participant.evidenceType === "google_drive") {
      const fileId = extractDriveFileId(participant.evidenceUrl);
      if (fileId) {
        const key = `file:${fileId}`;

        if (!fileIdMap.has(key)) {
          fileIdMap.set(key, []);
        }
        fileIdMap.get(key)!.push(participant);
      }
    }
  }

  const groups: GroupCandidate[] = [];

  for (const [key, groupParticipants] of fileIdMap) {
    if (groupParticipants.length < 2) continue;

    const fileId = key.replace("file:", "");
    const totalBill = groupParticipants.reduce((sum, p) => sum + p.totalBill, 0);
    const totalPaid = groupParticipants.reduce((sum, p) => sum + p.paidAmount, 0);
    const remaining = groupParticipants.reduce((sum, p) => sum + p.remaining, 0);

    groups.push({
      groupId: `file_${fileId.slice(0, 8)}`,
      participants: groupParticipants,
      matchMethod: "file_id",
      confidence: 0.9,
      totalBill,
      totalPaid,
      remaining,
      accessStatus: "accessible",
    });
  }

  return groups;
}

async function computeHashFromArrayBuffer(buffer: ArrayBuffer, algorithm: string = "SHA-256"): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function computeImageHash(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return await computeHashFromArrayBuffer(arrayBuffer);
  } catch {
    return null;
  }
}

async function computePixelHash(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);
    
    const canvas = new OffscreenCanvas(32, 32);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(imageBitmap, 0, 0, 32, 32);
    const imageData = ctx.getImageData(0, 0, 32, 32);
    
    const pixels = imageData.data;
    const pixelBuffer = new Uint8Array(pixels.length / 4);
    
    for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      pixelBuffer[j] = Math.floor((r + g + b) / 3);
    }

    return await computeHashFromArrayBuffer(pixelBuffer.buffer);
  } catch {
    return null;
  }
}

export async function detectGroupsByHash(
  participants: BookingParticipant[],
  algorithm: "content" | "pixels" = "content"
): Promise<GroupCandidate[]> {
  const hashMap = new Map<string, BookingParticipant[]>();

  for (const participant of participants) {
    if (!participant.evidenceUrl || participant.evidenceType !== "google_drive") {
      continue;
    }

    const hash = await (algorithm === "content"
      ? computeImageHash(participant.evidenceUrl)
      : computePixelHash(participant.evidenceUrl));

    if (hash) {
      const key = `hash_${algorithm}:${hash}`;

      if (!hashMap.has(key)) {
        hashMap.set(key, []);
      }
      hashMap.get(key)!.push(participant);
    }
  }

  const groups: GroupCandidate[] = [];

  for (const [key, groupParticipants] of hashMap) {
    if (groupParticipants.length < 2) continue;

    const hash = key.replace(`hash_${algorithm}:`, "");
    const totalBill = groupParticipants.reduce((sum, p) => sum + p.totalBill, 0);
    const totalPaid = groupParticipants.reduce((sum, p) => sum + p.paidAmount, 0);
    const remaining = groupParticipants.reduce((sum, p) => sum + p.remaining, 0);

    groups.push({
      groupId: `hash_${algorithm}_${hash.slice(0, 8)}`,
      participants: groupParticipants,
      matchMethod: algorithm === "content" ? "hash_content" : "hash_pixels",
      confidence: algorithm === "content" ? 0.8 : 0.7,
      totalBill,
      totalPaid,
      remaining,
      accessStatus: "accessible",
    });
  }

  return groups;
}

export async function detectGroups(participants: BookingParticipant[]): Promise<GroupCandidate[]> {
  const urlGroups = detectGroupsByUrl(participants);
  const fileIdGroups = detectGroupsByFileId(participants);
  const hashGroups = await detectGroupsByHash(participants);

  const allGroups = [...urlGroups, ...fileIdGroups, ...hashGroups];
  const deduplicated = new Map<string, GroupCandidate>();

  for (const group of allGroups) {
    const participantIds = group.participants.map((p) => p.id).sort().join(",");
    const key = `${participantIds}:${group.matchMethod}`;

    if (!deduplicated.has(key) || group.confidence > deduplicated.get(key)!.confidence) {
      deduplicated.set(key, group);
    }
  }

  return Array.from(deduplicated.values())
    .sort((a, b) => b.participants.length - a.participants.length)
    .map((group, index) => ({
      ...group,
      groupId: `group_${index + 1}_${group.groupId}`,
    }));
}

export function computeGroupAllocation(
  groupParticipants: BookingParticipant[],
  totalPaymentAmount: number
): AllocationPlan {
  const totalBill = groupParticipants.reduce((sum, p) => sum + p.totalBill, 0);
  const totalPaid = groupParticipants.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalRemaining = groupParticipants.reduce((sum, p) => sum + Math.max(0, p.remaining), 0);

  const excessFunds = Math.max(0, totalPaymentAmount - totalRemaining);
  const canFullyPay = totalPaymentAmount >= totalRemaining;

  const allocation: AllocationItem[] = [];

  if (canFullyPay) {
    for (const participant of groupParticipants) {
      const remaining = Math.max(0, participant.remaining);
      allocation.push({
        participantId: participant.id,
        participantName: participant.name,
        totalBill: participant.totalBill,
        alreadyPaid: participant.paidAmount,
        remaining: participant.remaining,
        allocated: remaining,
        remainingAfterAllocation: 0,
      });
    }
  } else {
    let remainingPool = totalPaymentAmount;
    const participantsWithRemaining = groupParticipants.filter(p => p.remaining > 0);
    
    for (const participant of participantsWithRemaining) {
      const allocate = Math.min(participant.remaining, remainingPool);
      allocation.push({
        participantId: participant.id,
        participantName: participant.name,
        totalBill: participant.totalBill,
        alreadyPaid: participant.paidAmount,
        remaining: Math.max(0, participant.remaining),
        allocated: allocate,
        remainingAfterAllocation: Math.max(0, participant.remaining) - allocate,
      });
      remainingPool -= allocate;
    }
    
    for (const participant of groupParticipants) {
      if (participant.remaining <= 0) {
        allocation.push({
          participantId: participant.id,
          participantName: participant.name,
          totalBill: participant.totalBill,
          alreadyPaid: participant.paidAmount,
          remaining: participant.remaining,
          allocated: 0,
          remainingAfterAllocation: Math.max(0, participant.remaining),
        });
      }
    }
  }

  return {
    groupParticipants,
    allocation,
    totalBill,
    totalPaid,
    totalRemaining,
    totalPaymentAmount,
    excessFunds,
    canFullyPay,
    participantsCanBeFullyPaid: allocation.every((item) => item.remainingAfterAllocation === 0),
  };
}

export interface AllocationItem {
  participantId: string;
  participantName: string;
  totalBill: number;
  alreadyPaid: number;
  remaining: number;
  allocated: number;
  remainingAfterAllocation: number;
}

export interface AllocationPlan {
  groupParticipants: BookingParticipant[];
  allocation: AllocationItem[];
  totalBill: number;
  totalPaid: number;
  totalRemaining: number;
  totalPaymentAmount: number;
  excessFunds: number;
  canFullyPay: boolean;
  participantsCanBeFullyPaid: boolean;
}