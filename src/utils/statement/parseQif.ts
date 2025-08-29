export interface ParsedItem { date: string; description: string; amount: number }

export const parseQif = (text: string): ParsedItem[] => {
  const items: ParsedItem[] = [];
  const blocks = text.split(/^\^\s*$/m);
  for (const block of blocks) {
    const d = (block.match(/^D(.+)$/m) || [])[1];
    const tStr = (block.match(/^T(.+)$/m) || [])[1];
    const p = (block.match(/^P(.+)$/m) || [])[1] || (block.match(/^M(.+)$/m) || [])[1];
    if (!tStr) continue;
    const amount = Math.abs(parseFloat(tStr.replace(/,/g, "")));
    if (isNaN(amount)) continue;
    let dateISO = new Date().toISOString();
    if (d) {
      // QIF dates can be like MM/DD'YY or DD/MM/YYYY depending on export
      const cleaned = d.replace(/'/g, "/");
      const parts = cleaned.match(/\d+/g) || [];
      if (parts.length >= 3) {
        const a = parts[0]!; const b = parts[1]!; const c = parts[2]!;
        const year = c.length === 2 ? `20${c}` : c;
        const try1 = new Date(`${year}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`);
        const try2 = new Date(`${year}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`);
        dateISO = isNaN(try1.getTime()) ? try2.toISOString() : try1.toISOString();
      }
    }
    items.push({ date: dateISO, description: p || "Transaction", amount });
  }
  return items;
};
