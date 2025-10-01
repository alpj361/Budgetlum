/**
 * Calendar utilities for payment date calculations with holiday awareness
 */

export interface PaymentProjection {
  date: Date;
  dayOfMonth: number;
  isAdjusted: boolean;
  originalDate?: Date;
  adjustmentReason?: string;
}

export interface HolidayInfo {
  date: Date;
  name: string;
  country: string;
}

/**
 * Central America holidays (major bank holidays)
 */
const CENTRAL_AMERICA_HOLIDAYS: Record<string, HolidayInfo[]> = {
  GT: [ // Guatemala
    { date: new Date(2024, 0, 1), name: 'Año Nuevo', country: 'GT' },
    { date: new Date(2024, 4, 1), name: 'Día del Trabajo', country: 'GT' },
    { date: new Date(2024, 5, 30), name: 'Día del Ejército', country: 'GT' },
    { date: new Date(2024, 8, 15), name: 'Día de la Independencia', country: 'GT' },
    { date: new Date(2024, 9, 20), name: 'Revolución de 1944', country: 'GT' },
    { date: new Date(2024, 10, 1), name: 'Día de Todos los Santos', country: 'GT' },
    { date: new Date(2024, 11, 25), name: 'Navidad', country: 'GT' },
    { date: new Date(2024, 11, 31), name: 'Fin de Año', country: 'GT' },
  ],
  SV: [ // El Salvador
    { date: new Date(2024, 0, 1), name: 'Año Nuevo', country: 'SV' },
    { date: new Date(2024, 4, 1), name: 'Día del Trabajo', country: 'SV' },
    { date: new Date(2024, 7, 6), name: 'Fiestas Agostinas', country: 'SV' },
    { date: new Date(2024, 8, 15), name: 'Día de la Independencia', country: 'SV' },
    { date: new Date(2024, 10, 2), name: 'Día de los Difuntos', country: 'SV' },
    { date: new Date(2024, 11, 25), name: 'Navidad', country: 'SV' },
  ],
  HN: [ // Honduras
    { date: new Date(2024, 0, 1), name: 'Año Nuevo', country: 'HN' },
    { date: new Date(2024, 4, 1), name: 'Día del Trabajo', country: 'HN' },
    { date: new Date(2024, 8, 15), name: 'Día de la Independencia', country: 'HN' },
    { date: new Date(2024, 9, 3), name: 'Día de Morazán', country: 'HN' },
    { date: new Date(2024, 9, 12), name: 'Día de la Raza', country: 'HN' },
    { date: new Date(2024, 11, 25), name: 'Navidad', country: 'HN' },
  ],
  // Add more countries as needed
};

/**
 * Get current date in user's timezone
 */
export const getCurrentDate = (): Date => {
  return new Date();
};

/**
 * Check if a date is a weekend
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

/**
 * Check if a date is a holiday
 */
export const isHoliday = (date: Date, countryCode: string): boolean => {
  const holidays = CENTRAL_AMERICA_HOLIDAYS[countryCode] || [];
  return holidays.some(holiday => 
    holiday.date.getDate() === date.getDate() &&
    holiday.date.getMonth() === date.getMonth()
  );
};

/**
 * Check if a date is a business day
 */
export const isBusinessDay = (date: Date, countryCode: string): boolean => {
  return !isWeekend(date) && !isHoliday(date, countryCode);
};

/**
 * Get next business day (skip weekends and holidays)
 */
export const getNextBusinessDay = (date: Date, countryCode: string): Date => {
  let nextDay = new Date(date);
  
  while (!isBusinessDay(nextDay, countryCode)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
};

/**
 * Get previous business day (skip weekends and holidays)
 */
export const getPreviousBusinessDay = (date: Date, countryCode: string): Date => {
  let prevDay = new Date(date);
  
  while (!isBusinessDay(prevDay, countryCode)) {
    prevDay.setDate(prevDay.getDate() - 1);
  }
  
  return prevDay;
};

/**
 * Adjust payment date if it falls on weekend or holiday
 * Default: moves to previous business day (most common in Central America)
 */
export const adjustPaymentDate = (
  date: Date, 
  countryCode: string,
  direction: 'previous' | 'next' = 'previous'
): PaymentProjection => {
  if (isBusinessDay(date, countryCode)) {
    return {
      date,
      dayOfMonth: date.getDate(),
      isAdjusted: false,
    };
  }

  const originalDate = new Date(date);
  const adjustedDate = direction === 'previous' 
    ? getPreviousBusinessDay(date, countryCode)
    : getNextBusinessDay(date, countryCode);

  let adjustmentReason = '';
  if (isWeekend(originalDate)) {
    adjustmentReason = `Ajustado de ${getDayName(originalDate)} a día hábil`;
  } else if (isHoliday(originalDate, countryCode)) {
    adjustmentReason = `Ajustado por feriado a día hábil`;
  }

  return {
    date: adjustedDate,
    dayOfMonth: adjustedDate.getDate(),
    isAdjusted: true,
    originalDate,
    adjustmentReason,
  };
};

/**
 * Project next payment dates based on day of month
 */
export const projectNextPayments = (
  dayOfMonth: number,
  countryCode: string,
  numberOfPayments: number = 3,
  adjustForHolidays: boolean = true
): PaymentProjection[] => {
  const projections: PaymentProjection[] = [];
  const today = getCurrentDate();
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();

  for (let i = 0; i < numberOfPayments; i++) {
    // Move to next month
    if (i > 0) {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }

    // Get the target date (handling month-end edge cases)
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const targetDay = Math.min(dayOfMonth, lastDayOfMonth);
    let paymentDate = new Date(currentYear, currentMonth, targetDay);

    // Skip if this date is in the past
    if (paymentDate < today && i === 0) {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      paymentDate = new Date(currentYear, currentMonth, targetDay);
    }

    // Adjust for holidays if needed
    if (adjustForHolidays) {
      const projection = adjustPaymentDate(paymentDate, countryCode);
      projections.push(projection);
    } else {
      projections.push({
        date: paymentDate,
        dayOfMonth: paymentDate.getDate(),
        isAdjusted: false,
      });
    }
  }

  return projections;
};

/**
 * Project payments for bi-weekly frequency (15 and 30)
 */
export const projectBiWeeklyPayments = (
  paymentDates: number[],
  countryCode: string,
  numberOfPayments: number = 6,
  adjustForHolidays: boolean = true
): PaymentProjection[] => {
  const projections: PaymentProjection[] = [];
  const today = getCurrentDate();
  const dates = [...paymentDates].sort((a, b) => a - b);

  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();
  let dateIndex = 0;

  while (projections.length < numberOfPayments) {
    const dayOfMonth = dates[dateIndex];
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const targetDay = Math.min(dayOfMonth, lastDayOfMonth);
    const paymentDate = new Date(currentYear, currentMonth, targetDay);

    // Only add if in future
    if (paymentDate >= today) {
      if (adjustForHolidays) {
        projections.push(adjustPaymentDate(paymentDate, countryCode));
      } else {
        projections.push({
          date: paymentDate,
          dayOfMonth: paymentDate.getDate(),
          isAdjusted: false,
        });
      }
    }

    // Move to next date
    dateIndex++;
    if (dateIndex >= dates.length) {
      dateIndex = 0;
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
  }

  return projections;
};

/**
 * Project payments for weekly frequency
 */
export const projectWeeklyPayments = (
  dayOfWeek: number, // 0 = Sunday, 5 = Friday
  countryCode: string,
  numberOfPayments: number = 4,
  adjustForHolidays: boolean = true
): PaymentProjection[] => {
  const projections: PaymentProjection[] = [];
  const today = getCurrentDate();
  let currentDate = new Date(today);

  // Find next occurrence of the day
  while (currentDate.getDay() !== dayOfWeek) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  for (let i = 0; i < numberOfPayments; i++) {
    if (adjustForHolidays) {
      projections.push(adjustPaymentDate(new Date(currentDate), countryCode));
    } else {
      projections.push({
        date: new Date(currentDate),
        dayOfMonth: currentDate.getDate(),
        isAdjusted: false,
      });
    }

    // Move to next week
    currentDate.setDate(currentDate.getDate() + 7);
  }

  return projections;
};

/**
 * Format projection for display
 */
export const formatProjection = (projection: PaymentProjection): string => {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 
                  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  
  const day = projection.date.getDate();
  const month = months[projection.date.getMonth()];
  const dayName = days[projection.date.getDay()];

  let formatted = `${day} ${month} (${dayName})`;

  if (projection.isAdjusted && projection.originalDate) {
    const origDay = projection.originalDate.getDate();
    formatted = `${origDay} ${month} → ${day} ${month} (${dayName})`;
  }

  return formatted;
};

/**
 * Get day name in Spanish
 */
export const getDayName = (date: Date): string => {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return days[date.getDay()];
};

/**
 * Get month name in Spanish
 */
export const getMonthName = (date: Date): string => {
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return months[date.getMonth()];
};

/**
 * Format date for display in Spanish
 */
export const formatDateSpanish = (date: Date): string => {
  const day = date.getDate();
  const month = getMonthName(date);
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
};

