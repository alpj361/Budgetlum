import { CATEGORIES } from "../../types/categories";

export interface HeuristicSuggestion {
  categoryId: string;
  subcategoryId?: string;
  confidence: number; // 0-1
}

const KEYWORDS: Record<string, { sub?: string; words: string[] }> = {
  alimentacion: { words: ["restaurante", "comida", "almuerzo", "cena", "cafetería", "cafe", "bar", "supermercado", "market", "tienda"], sub: "restaurantes" },
  supermercado: { words: ["super", "supermercado", "grocery", "mercado", "despensa"], sub: "supermercado" },
  transporte: { words: ["uber", "didi", "cabify", "taxi", "bus", "metro", "gasolina", "combustible", "peaje", "estacionamiento"], sub: "ride_hailing" },
  servicios: { words: ["luz", "electricidad", "agua", "internet", "fibra", "teléfono", "celular", "móvil", "gas"], sub: "internet" },
  compras: { words: ["amazon", "mercadolibre", "falabella", "h&m", "zara", "boutique", "tienda"], sub: "electronica" },
  salud: { words: ["farmacia", "medicina", "doctor", "consulta", "hospital", "gimnasio"], sub: "medicamentos" },
  entretenimiento: { words: ["netflix", "spotify", "disney", "cine", "concierto", "teatro", "juego"], sub: "streaming" },
  finanzas: { words: ["comision", "comisión", "interes", "interés", "banco", "transferencia"], sub: "bancos" },
  viajes: { words: ["vuelo", "hotel", "airbnb", "uber", "taxi", "tour"], sub: "hospedaje" },
};

export const suggestCategory = (text: string): HeuristicSuggestion | null => {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return null;

  let best: HeuristicSuggestion | null = null;
  for (const cat of CATEGORIES) {
    const entry = KEYWORDS[cat.id as keyof typeof KEYWORDS];
    if (!entry) continue;
    const hits = entry.words.filter((w) => t.includes(w)).length;
    if (hits > 0) {
      const conf = Math.min(1, 0.4 + hits * 0.15);
      const subId = entry.sub && cat.subs.find((s) => s.id === entry.sub) ? entry.sub : undefined;
      const suggestion: HeuristicSuggestion = { categoryId: cat.id, subcategoryId: subId, confidence: conf };
      if (!best || suggestion.confidence > best.confidence) best = suggestion;
    }
  }
  return best;
};
