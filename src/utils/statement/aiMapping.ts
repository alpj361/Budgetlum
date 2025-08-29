import { getOpenAIChatResponse } from "../../api/chat-service";

export interface ColumnMapping {
  dateIndex: number;
  amountIndex: number;
  descriptionIndex: number;
}

const heuristicMap = (headers: string[]): ColumnMapping => {
  const lower = headers.map((h) => h.toLowerCase());
  const find = (candidates: string[]) => lower.findIndex((h) => candidates.some((c) => h.includes(c)));
  const dateIndex = find(["date", "posted", "transaction date", "fecha"]);
  const amountIndex = find(["amount", "importe", "valor", "monto", "debit", "credit"]);
  const descriptionIndex = find(["description", "memo", "merchant", "payee", "detalle", "name"]);
  return {
    dateIndex: dateIndex >= 0 ? dateIndex : 0,
    amountIndex: amountIndex >= 0 ? amountIndex : 1,
    descriptionIndex: descriptionIndex >= 0 ? descriptionIndex : 2,
  };
};

export const mapColumnsWithAI = async (headers: string[], sampleRows: string[][]): Promise<ColumnMapping> => {
  try {
    const prompt = `You map CSV headers to indices. Given headers and a few sample rows, return ONLY JSON {"dateIndex":number,"amountIndex":number,"descriptionIndex":number}. Headers: ${JSON.stringify(headers)}\nSamples: ${JSON.stringify(sampleRows.slice(0, 10))}`;
    const res = await getOpenAIChatResponse(prompt);
    const parsed = JSON.parse(res.content.trim());
    if (
      typeof parsed.dateIndex === "number" &&
      typeof parsed.amountIndex === "number" &&
      typeof parsed.descriptionIndex === "number"
    ) {
      return parsed as ColumnMapping;
    }
    return heuristicMap(headers);
  } catch (e) {
    return heuristicMap(headers);
  }
};
