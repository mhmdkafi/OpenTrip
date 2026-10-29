// Replaces the workspace inventory with a demo gear list and photos from Wikimedia Commons.
// Usage: npm run seed:inventory [-- <owner-email>] [--peek | --dry-run]
//   --peek     list the current inventory and exit
//   --dry-run  download the photos and print the plan without saving
// Photos are downloaded at run time; each one's author and licence are listed in GEAR below.
import { createClient } from "@supabase/supabase-js";
import { emptyWorkspace, type Inventory, type Workspace } from "../src/lib/workspace/types";

type Gear = { name: string; kind: Inventory["kind"]; total: number; damaged?: number; consumable?: boolean; reorderLevel?: number; photo: string; credit: string };

const GEAR: Gear[] = [
  { name: "Dome Tent 4P", kind: "operational", total: 12, damaged: 1, photo: "File:Camping tent on tarp.jpg", credit: "Eden Aviv, CC0" },
  { name: "Carrier 60L", kind: "rental", total: 15, photo: "File:Trekking-Rucksack.jpg", credit: "Hannah Duerr, CC BY-SA 4.0" },
  { name: "Sleeping Bag", kind: "rental", total: 20, damaged: 1, photo: "File:Mummy bag.jpg", credit: "Smack, public domain" },
  { name: "Sleeping Mat", kind: "rental", total: 25, damaged: 2, photo: "File:Self-inflating mat.jpg", credit: "Pierrelagrange, CC BY 3.0" },
  { name: "Trekking Pole (pair)", kind: "rental", total: 16, photo: "File:Retracted trekking poles.jpg", credit: "Sarang, public domain" },
  { name: "Headlamp", kind: "rental", total: 30, damaged: 2, photo: "File:Zebralight H600Fc Mk IV headlamp in a GITD silicone holder.jpg", credit: "Siarhei Besarab, CC BY-SA 4.0" },
  { name: "Rain Poncho", kind: "rental", total: 40, photo: "File:Julie a mis son poncho (2848363220).jpg", credit: "peupleloup, CC BY-SA 2.0" },
  { name: "Portable Stove", kind: "operational", total: 8, photo: "File:Primus stove.jpg", credit: "Mikael Korpela, CC BY-SA 3.0" },
  { name: "Gas Canister", kind: "operational", total: 24, consumable: true, reorderLevel: 10, photo: "File:Butane Canister Valve Connection.jpg", credit: "Jan van Bekkum, CC BY-SA 4.0" },
  { name: "Cookset", kind: "operational", total: 8, photo: "File:Schweizer Armee - Gamelle (Feldessgeschirr).JPG", credit: "Swiss Army mess tin, public domain" },
  { name: "First Aid Kit", kind: "operational", total: 6, photo: "File:First-aid travel kit 1.jpg", credit: "Renée Kools, CC BY 4.0" },
  { name: "Hand Warmer", kind: "operational", total: 50, consumable: true, reorderLevel: 20, photo: "File:Handwaermer11.jpg", credit: "Suricata, CC BY-SA 3.0" },
  { name: "Emergency Blanket", kind: "operational", total: 30, consumable: true, reorderLevel: 10, photo: "File:Emergency blanket 20110709.jpg", credit: "Tobosha, public domain" },
];

const USER_AGENT = "TripDashSeed/1.0 (inventory demo script)";
const MAX_IMAGE = 380_000; // the app accepts data URLs up to 400 KB
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Commons rate-limits bursts; space requests out and retry politely.
async function commons(url: string, attempt = 0): Promise<Response> {
  await wait(1200);
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if ((response.status === 429 || response.status >= 500) && attempt < 4) { await wait(5000 * (attempt + 1)); return commons(url, attempt + 1); }
  return response;
}

// Downloads a Commons file as a JPEG thumbnail data URL. 400px covers the largest view in the app
// and keeps the workspace record small, since photos are stored inside it.
async function photo(title: string) {
  for (const width of [400, 320]) {
    const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=${width}&titles=${encodeURIComponent(title)}`;
    const info = await commons(api).then(r => r.json());
    const thumb: string | undefined = (Object.values(info.query?.pages ?? {})[0] as { imageinfo?: { thumburl?: string }[] } | undefined)?.imageinfo?.[0]?.thumburl;
    if (!thumb) throw new Error(`No image found for ${title}`);
    const response = await commons(thumb);
    if (!response.ok) throw new Error(`Download failed for ${title}: ${response.status}`);
    const type = response.headers.get("content-type") ?? "image/jpeg";
    const data = `data:${type.includes("png") ? "image/png" : "image/jpeg"};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
    if (data.length <= MAX_IMAGE) return data;
  }
  throw new Error(`${title} is too large even at 320px`);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = (process.argv.slice(2).find(a => !a.startsWith("--")) || process.env.OWNER_EMAIL || "").trim().toLowerCase();
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.");
  if (!email) throw new Error("Usage: npm run seed:inventory -- <owner-email>");
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: user, error: userError } = await db.from("users").select("id").eq("email", email).maybeSingle();
  if (userError || !user) throw new Error(`No user found for ${email}.`);
  const { data: memberships } = await db.from("user_memberships").select("tenant_id,role").eq("user_id", user.id);
  const tenantId = (memberships?.find(m => m.role === "owner") ?? memberships?.[0])?.tenant_id;
  if (!tenantId) throw new Error(`${email} has no workspace.`);
  const { data: row, error: rowError } = await db.from("tripdash_workspaces").select("revision,data").eq("tenant_id", tenantId).maybeSingle();
  if (rowError) throw new Error(`Could not load the workspace: ${rowError.message}`);
  const current: Workspace = { ...emptyWorkspace(), ...(row?.data ?? {}) };

  if (process.argv.includes("--peek")) {
    const loans = current.inventory.reduce((n, item) => n + item.loans.length, 0);
    console.log(`revision ${row?.revision ?? 0}; ${current.inventory.length} items; ${loans} loans`);
    for (const item of current.inventory) console.log(`- ${item.name} (${item.consumable ? "consumable" : item.kind}) total ${item.total}, photo ${item.imageUrl ? "yes" : "no"}, loans ${item.loans.length}`);
    return;
  }

  const inventory: Inventory[] = [];
  for (const gear of GEAR) {
    const imageUrl = await photo(gear.photo);
    inventory.push({ id: crypto.randomUUID(), name: gear.name, kind: gear.kind, total: gear.total, damaged: gear.damaged ?? 0, ...(gear.consumable ? { consumable: true, stockTracked: true, reorderLevel: gear.reorderLevel } : {}), imageUrl, incidents: [], loans: [] });
    console.log(`${gear.name.padEnd(22)} ${String(Math.round(imageUrl.length / 1024)).padStart(4)} KB  ${gear.credit}`);
  }
  if (process.argv.includes("--dry-run")) { console.log(`Dry run: ${inventory.length} items would replace ${current.inventory.length}.`); return; }

  const next: Workspace = {
    ...current,
    inventory,
    audit: [...current.audit, { id: crypto.randomUUID(), userId: user.id, at: new Date().toISOString(), action: "seed.inventory", detail: `Replaced ${current.inventory.length} items with ${inventory.length} demo items` }],
  };
  const revision = (row?.revision ?? 0) + 1;
  const payload = { data: next, revision, updated_at: new Date().toISOString() };
  const { error: saveError } = row
    ? await db.from("tripdash_workspaces").update(payload).eq("tenant_id", tenantId).eq("revision", row.revision)
    : await db.from("tripdash_workspaces").insert({ tenant_id: tenantId, ...payload });
  if (saveError) throw new Error(`Could not save the workspace: ${saveError.message}`);
  console.log(`Replaced ${current.inventory.length} inventory items with ${inventory.length} demo items in workspace ${tenantId}.`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
