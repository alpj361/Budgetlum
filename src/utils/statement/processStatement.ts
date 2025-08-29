import { parseCsv } from "./parseCsv";
import { parseOfx } from "./parseOfx";
import { parseQif } from "./parseQif";
import { mapColumnsWithAI } from "./aiMapping";
import { categorizeDescriptionsBatch } from "../aiCategorization";
import { Expense } from "../../types/expense";

const tryParseDate = (raw: string): string => {
  const t = Date.parse(raw);
  if (!isNaN(t)) return new Date(t).toISOString();
  // try dd/MM/yyyy or MM/dd/yyyy
  const parts = raw.match(/\d+/g);
  if (parts && parts.length >= 3) {
    const a = parts[0]!; const b = parts[1]!; const c = parts[2]!;
    const year = c.length === 2 ? `20${c}` : c;
    const try1 = new Date(`${year}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`);
    const try2 = new Date(`${year}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`);
    return isNaN(try1.getTime()) ? try2.toISOString() : try1.toISOString();
  }
  return new Date().toISOString();
};

export const processStatementText = async (filename: string, text: string): Promise<Expense[]> => {
  const lower = filename.toLowerCase();
  let drafts: { date: string; description: string; amount: number }[] = [];

  if (lower.endsWith(".ofx") || text.includes("<OFX>")) {
    drafts = parseOfx(text);
  } else if (lower.endsWith(".qif") || text.startsWith("!Type:")) {
    drafts = parseQif(text);
  } else {
    const { headers, rows } = parseCsv(text);
    if (headers.length === 0) return [];
    const mapping = await mapColumnsWithAI(headers, rows.slice(0, 20));
    drafts = rows
      .map((row) => {
        const date = tryParseDate(row[mapping.dateIndex] || "");
        const desc = (row[mapping.descriptionIndex] || "Transaction").toString();
        const rawAmt = (row[mapping.amountIndex] || "0").toString().replace(/[^0-9\-\.]/g, "");
        const amt = Math.abs(parseFloat(rawAmt));
        if (isNaN(amt)) return null;
        return { date, description: desc, amount: amt };
      })
      .filter(Boolean) as any;
  }

  const categories = await categorizeDescriptionsBatch(drafts.map((d) => d.description));
  const expenses: Expense[] = drafts.map((d, i) => ({
    id: `${Date.now()}_${i}_${Math.random().toString(36).substring(2, 8)}`,
    amount: d.amount,
    description: d.description,
    category: categories[i] || "Other",
    date: d.date,
  }));
  return expenses;
};
