export interface CsvParsed {
  headers: string[];
  rows: string[][];
}

const splitCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === "," || ch === ";") && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result.map((c) => c.replace(/^"|"$/g, ""));
};

export const parseCsv = (text: string): CsvParsed => {
  const lines = text
    .replace(/\uFEFF/g, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map(splitCsvLine);
  return { headers, rows };
};
