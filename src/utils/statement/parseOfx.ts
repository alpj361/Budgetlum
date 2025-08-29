export interface ParsedItem { date: string; description: string; amount: number }

export const parseOfx = (text: string): ParsedItem[] => {
  const items: ParsedItem[] = [];
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
  for (const block of blocks) {
    const amountMatch = block.match(/<TRNAMT>([^\n<]+)/i);
    const dateMatch = block.match(/<DTPOSTED>([^\n<]+)/i);
    const nameMatch = block.match(/<(NAME|MEMO)>([^\n<]+)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].trim()) : 0;
    const rawDate = dateMatch ? dateMatch[1].substring(0, 8) : ""; // YYYYMMDD
    const y = rawDate.substring(0, 4);
    const m = rawDate.substring(4, 6);
    const d = rawDate.substring(6, 8);
    const date = new Date(`${y}-${m}-${d}`).toISOString();
    const description = nameMatch ? nameMatch[2].trim() : "Transaction";
    const amt = Math.abs(amount); // treat as expense value
    if (!isNaN(amt)) {
      items.push({ date, description, amount: amt });
    }
  }
  return items;
};
