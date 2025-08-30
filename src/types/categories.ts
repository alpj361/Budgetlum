export interface SubcategoryDef {
  id: string;
  label: string;
}

export interface CategoryDef {
  id: string;
  label: string; // Spanish display label
  subs: SubcategoryDef[];
}

// Stable IDs (snake-case). Labels are Spanish.
export const CATEGORIES: CategoryDef[] = [
  {
    id: "vivienda",
    label: "Vivienda",
    subs: [
      { id: "alquiler", label: "Alquiler" },
      { id: "hipoteca", label: "Hipoteca" },
      { id: "mantenimiento", label: "Mantenimiento" },
      { id: "seguro_hogar", label: "Seguro de hogar" },
      { id: "impuestos_propiedad", label: "Impuestos de propiedad" },
      { id: "otros_vivienda", label: "Otros" }
    ]
  },
  {
    id: "transporte",
    label: "Transporte",
    subs: [
      { id: "automovil", label: "Automóvil" },
      { id: "combustible", label: "Combustible" },
      { id: "ride_hailing", label: "Ride-hailing" },
      { id: "transporte_publico", label: "Transporte público" },
      { id: "estacionamiento", label: "Estacionamiento" },
      { id: "peajes", label: "Peajes" },
      { id: "mantenimiento_auto", label: "Mantenimiento auto" },
      { id: "otros_transporte", label: "Otros" }
    ]
  },
  {
    id: "alimentacion",
    label: "Alimentación",
    subs: [
      { id: "supermercado", label: "Supermercado" },
      { id: "restaurantes", label: "Restaurantes" },
      { id: "cafeteria", label: "Cafetería" },
      { id: "delivery", label: "Delivery" },
      { id: "otros_alimentacion", label: "Otros" }
    ]
  },
  {
    id: "salud",
    label: "Salud",
    subs: [
      { id: "seguro_salud", label: "Seguro de salud" },
      { id: "medicamentos", label: "Medicamentos" },
      { id: "consultas", label: "Consultas" },
      { id: "gimnasio", label: "Gimnasio" },
      { id: "otros_salud", label: "Otros" }
    ]
  },
  {
    id: "educacion",
    label: "Educación",
    subs: [
      { id: "colegiatura", label: "Colegiatura" },
      { id: "cursos", label: "Cursos" },
      { id: "libros", label: "Libros" },
      { id: "otros_educacion", label: "Otros" }
    ]
  },
  {
    id: "entretenimiento",
    label: "Entretenimiento",
    subs: [
      { id: "streaming", label: "Streaming" },
      { id: "cine", label: "Cine" },
      { id: "salidas", label: "Salidas" },
      { id: "juegos", label: "Juegos" },
      { id: "otros_entretenimiento", label: "Otros" }
    ]
  },
  {
    id: "compras",
    label: "Compras",
    subs: [
      { id: "ropa", label: "Ropa" },
      { id: "electronica", label: "Electrónica" },
      { id: "hogar", label: "Hogar" },
      { id: "otros_compras", label: "Otros" }
    ]
  },
  {
    id: "finanzas",
    label: "Finanzas",
    subs: [
      { id: "bancos", label: "Comisiones bancarias" },
      { id: "intereses", label: "Intereses" },
      { id: "inversiones", label: "Inversiones" },
      { id: "prestamos", label: "Préstamos" },
      { id: "otros_finanzas", label: "Otros" }
    ]
  },
  {
    id: "viajes",
    label: "Viajes",
    subs: [
      { id: "vuelos", label: "Vuelos" },
      { id: "hospedaje", label: "Hospedaje" },
      { id: "transporte_viaje", label: "Transporte" },
      { id: "otros_viajes", label: "Otros" }
    ]
  },
  {
    id: "servicios",
    label: "Servicios",
    subs: [
      { id: "luz", label: "Luz" },
      { id: "agua", label: "Agua" },
      { id: "internet", label: "Internet" },
      { id: "telefono", label: "Teléfono" },
      { id: "gas", label: "Gas" },
      { id: "otros_servicios", label: "Otros" }
    ]
  },
  {
    id: "ingresos",
    label: "Ingresos",
    subs: [
      { id: "salario", label: "Salario" },
      { id: "bonos", label: "Bonos" },
      { id: "otros_ingresos", label: "Otros" }
    ]
  },
  {
    id: "otros",
    label: "Otros",
    subs: [
      { id: "sin_especificar", label: "Sin especificar" }
    ]
  }
];

export const TOP_CATEGORY_LABELS: string[] = CATEGORIES.map((c) => c.label);

export const findCategoryById = (id: string) => CATEGORIES.find((c) => c.id === id);
export const findCategoryByLabel = (label: string) => CATEGORIES.find((c) => c.label.toLowerCase() === label.toLowerCase());
export const findSubById = (catId: string, subId?: string) => {
  const cat = findCategoryById(catId);
  if (!cat) return undefined;
  return cat.subs.find((s) => s.id === subId);
};
export const findSubByLabel = (catId: string, label: string) => {
  const cat = findCategoryById(catId);
  if (!cat) return undefined;
  return cat.subs.find((s) => s.label.toLowerCase() === label.toLowerCase());
};

export const getLabelsFromIds = (catId: string, subId?: string) => {
  const cat = findCategoryById(catId);
  if (!cat) return { categoryLabel: "Otros", subcategoryLabel: undefined };
  const sub = subId ? cat.subs.find((s) => s.id === subId) : undefined;
  return { categoryLabel: cat.label, subcategoryLabel: sub?.label };
};
