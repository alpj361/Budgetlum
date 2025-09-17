export interface CountryConfig {
  code: string;
  name: string;
  currency: {
    code: string;
    symbol: string;
    name: string;
  };
  mandatoryBonuses: Bonus[];
  seasonalPatterns: SeasonalPattern[];
  commonPayFrequencies: PayFrequency[];
  flag: string;
}

export interface Bonus {
  id: string;
  name: string;
  description: string;
  months: number[];
  calculation: "monthly_salary" | "percentage" | "fixed_amount";
  amount?: number;
  percentage?: number;
  mandatory: boolean;
  applies_to: "salary" | "all" | "formal_employment";
}

export interface SeasonalPattern {
  id: string;
  name: string;
  description: string;
  peak_months: number[];
  low_months: number[];
  industries: string[];
}

export interface PayFrequency {
  id: string;
  name: string;
  description: string;
  days_between: number;
  common_dates?: number[];
}

export const CENTRAL_AMERICA_COUNTRIES: CountryConfig[] = [
  {
    code: "MX",
    name: "México",
    currency: {
      code: "MXN",
      symbol: "$",
      name: "Peso Mexicano"
    },
    flag: "🇲🇽",
    mandatoryBonuses: [
      {
        id: "aguinaldo_mx",
        name: "Aguinaldo",
        description: "13er mes de salario",
        months: [12],
        calculation: "monthly_salary",
        mandatory: true,
        applies_to: "formal_employment"
      }
    ],
    seasonalPatterns: [
      {
        id: "tourist_season_mx",
        name: "Temporada turística",
        description: "Alta temporada en destinos turísticos",
        peak_months: [11, 12, 1, 2, 3, 4],
        low_months: [5, 6, 7, 8, 9, 10],
        industries: ["turismo", "hotelería", "restaurantes"]
      }
    ],
    commonPayFrequencies: [
      {
        id: "weekly",
        name: "Semanal",
        description: "Cada semana",
        days_between: 7
      },
      {
        id: "bi-weekly",
        name: "Quincenal",
        description: "Cada 15 días",
        days_between: 15,
        common_dates: [15, 30]
      },
      {
        id: "monthly",
        name: "Mensual",
        description: "Una vez al mes",
        days_between: 30,
        common_dates: [30]
      }
    ]
  },
  {
    code: "GT",
    name: "Guatemala",
    currency: {
      code: "GTQ",
      symbol: "Q",
      name: "Quetzal"
    },
    flag: "🇬🇹",
    mandatoryBonuses: [
      {
        id: "aguinaldo_gt",
        name: "Aguinaldo",
        description: "13er mes de salario",
        months: [12],
        calculation: "monthly_salary",
        mandatory: true,
        applies_to: "formal_employment"
      },
      {
        id: "bono14_gt",
        name: "Bono 14",
        description: "14to mes de salario",
        months: [7],
        calculation: "monthly_salary",
        mandatory: true,
        applies_to: "formal_employment"
      }
    ],
    seasonalPatterns: [
      {
        id: "coffee_harvest_gt",
        name: "Cosecha de café",
        description: "Temporada de cosecha de café",
        peak_months: [10, 11, 12, 1, 2],
        low_months: [3, 4, 5, 6, 7, 8, 9],
        industries: ["agricultura", "café", "exportación"]
      }
    ],
    commonPayFrequencies: [
      {
        id: "monthly",
        name: "Mensual",
        description: "Una vez al mes",
        days_between: 30,
        common_dates: [30]
      },
      {
        id: "bi-weekly",
        name: "Quincenal",
        description: "Cada 15 días",
        days_between: 15,
        common_dates: [15, 30]
      }
    ]
  },
  {
    code: "BZ",
    name: "Belice",
    currency: {
      code: "BZD",
      symbol: "BZ$",
      name: "Dólar de Belice"
    },
    flag: "🇧🇿",
    mandatoryBonuses: [],
    seasonalPatterns: [
      {
        id: "tourist_season_bz",
        name: "Temporada turística",
        description: "Alta temporada turística",
        peak_months: [11, 12, 1, 2, 3, 4],
        low_months: [5, 6, 7, 8, 9, 10],
        industries: ["turismo", "hotelería"]
      }
    ],
    commonPayFrequencies: [
      {
        id: "bi-weekly",
        name: "Bi-weekly",
        description: "Every two weeks",
        days_between: 14
      },
      {
        id: "monthly",
        name: "Monthly",
        description: "Once a month",
        days_between: 30
      }
    ]
  },
  {
    code: "HN",
    name: "Honduras",
    currency: {
      code: "HNL",
      symbol: "L",
      name: "Lempira"
    },
    flag: "🇭🇳",
    mandatoryBonuses: [
      {
        id: "decimotercer_hn",
        name: "Décimo tercer mes",
        description: "13er mes de salario",
        months: [12],
        calculation: "monthly_salary",
        mandatory: true,
        applies_to: "formal_employment"
      },
      {
        id: "decimocuarto_hn",
        name: "Décimo cuarto mes",
        description: "14to mes de salario",
        months: [7],
        calculation: "monthly_salary",
        mandatory: true,
        applies_to: "formal_employment"
      }
    ],
    seasonalPatterns: [
      {
        id: "agricultural_season_hn",
        name: "Temporada agrícola",
        description: "Cosecha y siembra",
        peak_months: [10, 11, 12, 1, 2, 3],
        low_months: [4, 5, 6, 7, 8, 9],
        industries: ["agricultura", "banano", "café"]
      }
    ],
    commonPayFrequencies: [
      {
        id: "monthly",
        name: "Mensual",
        description: "Una vez al mes",
        days_between: 30
      },
      {
        id: "bi-weekly",
        name: "Quincenal",
        description: "Cada 15 días",
        days_between: 15
      }
    ]
  },
  {
    code: "SV",
    name: "El Salvador",
    currency: {
      code: "USD",
      symbol: "$",
      name: "Dólar"
    },
    flag: "🇸🇻",
    mandatoryBonuses: [
      {
        id: "aguinaldo_sv",
        name: "Aguinaldo",
        description: "13er mes de salario",
        months: [12],
        calculation: "monthly_salary",
        mandatory: true,
        applies_to: "formal_employment"
      }
    ],
    seasonalPatterns: [
      {
        id: "remittances_sv",
        name: "Remesas familiares",
        description: "Incremento en temporadas festivas",
        peak_months: [11, 12, 5],
        low_months: [2, 3, 8, 9],
        industries: ["servicios", "comercio"]
      }
    ],
    commonPayFrequencies: [
      {
        id: "monthly",
        name: "Mensual",
        description: "Una vez al mes",
        days_between: 30
      },
      {
        id: "bi-weekly",
        name: "Quincenal",
        description: "Cada 15 días",
        days_between: 15
      }
    ]
  },
  {
    code: "NI",
    name: "Nicaragua",
    currency: {
      code: "NIO",
      symbol: "C$",
      name: "Córdoba"
    },
    flag: "🇳🇮",
    mandatoryBonuses: [
      {
        id: "aguinaldo_ni",
        name: "Aguinaldo",
        description: "13er mes de salario",
        months: [12],
        calculation: "monthly_salary",
        mandatory: true,
        applies_to: "formal_employment"
      }
    ],
    seasonalPatterns: [
      {
        id: "agricultural_ni",
        name: "Temporada agrícola",
        description: "Cosecha de productos agrícolas",
        peak_months: [10, 11, 12, 1, 2],
        low_months: [5, 6, 7, 8, 9],
        industries: ["agricultura", "café", "algodón"]
      }
    ],
    commonPayFrequencies: [
      {
        id: "monthly",
        name: "Mensual",
        description: "Una vez al mes",
        days_between: 30
      },
      {
        id: "bi-weekly",
        name: "Quincenal",
        description: "Cada 15 días",
        days_between: 15
      }
    ]
  },
  {
    code: "CR",
    name: "Costa Rica",
    currency: {
      code: "CRC",
      symbol: "₡",
      name: "Colón"
    },
    flag: "🇨🇷",
    mandatoryBonuses: [
      {
        id: "aguinaldo_cr",
        name: "Aguinaldo",
        description: "13er mes de salario",
        months: [12],
        calculation: "monthly_salary",
        mandatory: true,
        applies_to: "formal_employment"
      }
    ],
    seasonalPatterns: [
      {
        id: "tourist_season_cr",
        name: "Temporada turística",
        description: "Alta temporada seca",
        peak_months: [12, 1, 2, 3, 4],
        low_months: [5, 6, 7, 8, 9, 10, 11],
        industries: ["turismo", "hotelería", "ecoturismo"]
      }
    ],
    commonPayFrequencies: [
      {
        id: "monthly",
        name: "Mensual",
        description: "Una vez al mes",
        days_between: 30
      },
      {
        id: "bi-weekly",
        name: "Quincenal",
        description: "Cada 15 días",
        days_between: 15
      }
    ]
  },
  {
    code: "PA",
    name: "Panamá",
    currency: {
      code: "PAB",
      symbol: "B/.",
      name: "Balboa"
    },
    flag: "🇵🇦",
    mandatoryBonuses: [
      {
        id: "decimotercer_pa",
        name: "Décimo tercer mes",
        description: "13er mes dividido en tres pagos",
        months: [4, 8, 12],
        calculation: "monthly_salary",
        mandatory: true,
        applies_to: "formal_employment"
      }
    ],
    seasonalPatterns: [
      {
        id: "canal_trade_pa",
        name: "Comercio del Canal",
        description: "Actividad portuaria y comercial",
        peak_months: [1, 2, 3, 10, 11, 12],
        low_months: [5, 6, 7, 8, 9],
        industries: ["logística", "comercio", "servicios portuarios"]
      }
    ],
    commonPayFrequencies: [
      {
        id: "monthly",
        name: "Mensual",
        description: "Una vez al mes",
        days_between: 30
      },
      {
        id: "bi-weekly",
        name: "Quincenal",
        description: "Cada 15 días",
        days_between: 15
      }
    ]
  }
];

export const getCurrencySymbol = (countryCode: string): string => {
  const country = CENTRAL_AMERICA_COUNTRIES.find(c => c.code === countryCode);
  return country?.currency.symbol || "$";
};

export const getCountryBonuses = (countryCode: string): Bonus[] => {
  const country = CENTRAL_AMERICA_COUNTRIES.find(c => c.code === countryCode);
  return country?.mandatoryBonuses || [];
};

export const getSeasonalPatterns = (countryCode: string): SeasonalPattern[] => {
  const country = CENTRAL_AMERICA_COUNTRIES.find(c => c.code === countryCode);
  return country?.seasonalPatterns || [];
};

export const getPayFrequencies = (countryCode: string): PayFrequency[] => {
  const country = CENTRAL_AMERICA_COUNTRIES.find(c => c.code === countryCode);
  return country?.commonPayFrequencies || [];
};