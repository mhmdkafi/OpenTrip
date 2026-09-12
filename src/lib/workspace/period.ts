export function periodBounds(kind: string, reference: string): [number, number] {
  if (kind === "all") return [-Infinity, Infinity];
  const [year,month,day] = reference.split("-").map(Number);
  const start = new Date(Date.UTC(year,month-1,day));
  const end = new Date(start);
  if (kind === "week") { start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7)); end.setTime(start.getTime()); end.setUTCDate(end.getUTCDate()+7); }
  else if (kind === "month") { start.setUTCDate(1); end.setUTCDate(1); end.setUTCMonth(end.getUTCMonth()+1); }
  else if (kind === "year") { start.setUTCMonth(0,1); end.setUTCFullYear(year+1,0,1); }
  else { end.setUTCDate(end.getUTCDate()+1); }
  return [start.getTime()-7*3600000,end.getTime()-7*3600000];
}
