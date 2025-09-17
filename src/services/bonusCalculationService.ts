import { CENTRAL_AMERICA_COUNTRIES, Bonus, getCountryBonuses } from '../types/centralAmerica';

export interface BonusCalculation {
  bonus: Bonus;
  annualAmount: number;
  monthlyEquivalent: number;
  nextPaymentDate: Date;
  nextPaymentAmount: number;
}

export interface AnnualBonusSummary {
  totalAnnualBonuses: number;
  monthlyEquivalent: number;
  calculations: BonusCalculation[];
  country: string;
}

export class BonusCalculationService {

  /**
   * Calculate all bonuses for a given salary and country
   */
  static calculateAnnualBonuses(
    monthlySalary: number,
    countryCode: string,
    currentYear: number = new Date().getFullYear()
  ): AnnualBonusSummary {
    const bonuses = getCountryBonuses(countryCode);
    const calculations: BonusCalculation[] = [];

    for (const bonus of bonuses) {
      const calculation = this.calculateSingleBonus(bonus, monthlySalary, currentYear);
      calculations.push(calculation);
    }

    const totalAnnualBonuses = calculations.reduce((sum, calc) => sum + calc.annualAmount, 0);
    const monthlyEquivalent = totalAnnualBonuses / 12;

    return {
      totalAnnualBonuses,
      monthlyEquivalent,
      calculations,
      country: countryCode
    };
  }

  /**
   * Calculate a single bonus
   */
  private static calculateSingleBonus(
    bonus: Bonus,
    monthlySalary: number,
    currentYear: number
  ): BonusCalculation {
    let annualAmount = 0;

    switch (bonus.calculation) {
      case "monthly_salary":
        // Each month in the bonus.months array equals one monthly salary
        annualAmount = monthlySalary * bonus.months.length;
        break;
      case "percentage":
        annualAmount = monthlySalary * (bonus.percentage || 0) / 100;
        break;
      case "fixed_amount":
        annualAmount = bonus.amount || 0;
        break;
    }

    const monthlyEquivalent = annualAmount / 12;
    const nextPayment = this.getNextBonusPayment(bonus, currentYear);

    return {
      bonus,
      annualAmount,
      monthlyEquivalent,
      nextPaymentDate: nextPayment.date,
      nextPaymentAmount: nextPayment.amount
    };
  }

  /**
   * Get the next bonus payment date and amount
   */
  private static getNextBonusPayment(
    bonus: Bonus,
    currentYear: number
  ): { date: Date; amount: number } {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based

    // Find the next payment month
    let nextPaymentMonth = bonus.months.find(month => month > currentMonth);
    let paymentYear = currentYear;

    // If no payment this year, take the first payment of next year
    if (!nextPaymentMonth) {
      nextPaymentMonth = bonus.months[0];
      paymentYear = currentYear + 1;
    }

    // Create the payment date (typically end of month for bonuses)
    const paymentDate = new Date(paymentYear, nextPaymentMonth - 1,
      this.getPaymentDayForCountryAndBonus(bonus, nextPaymentMonth));

    // Calculate payment amount based on bonus structure
    let paymentAmount = 0;
    if (bonus.calculation === "monthly_salary") {
      // For monthly salary bonuses, typically one payment per occurrence
      paymentAmount = 1; // This will be multiplied by actual salary later
    } else if (bonus.calculation === "percentage") {
      paymentAmount = bonus.percentage || 0;
    } else {
      paymentAmount = bonus.amount || 0;
    }

    return {
      date: paymentDate,
      amount: paymentAmount
    };
  }

  /**
   * Get typical payment day for bonus in specific country
   */
  private static getPaymentDayForCountryAndBonus(bonus: Bonus, month: number): number {
    // Most Central American countries pay bonuses at the end of the month
    // or specific dates based on labor laws

    if (bonus.id.includes("decimotercer_pa")) {
      // Panama's 13th month is split into 3 payments
      if (month === 4) return 30; // April
      if (month === 8) return 31; // August
      if (month === 12) return 20; // December
    }

    // Default to last day of month for most bonuses
    const lastDay = new Date(new Date().getFullYear(), month, 0).getDate();
    return lastDay;
  }

  /**
   * Get effective monthly income including bonuses
   */
  static getEffectiveMonthlyIncome(
    baseMonthlySalary: number,
    countryCode: string
  ): number {
    const bonusSummary = this.calculateAnnualBonuses(baseMonthlySalary, countryCode);
    return baseMonthlySalary + bonusSummary.monthlyEquivalent;
  }

  /**
   * Check if current date is near a bonus payment
   */
  static getUpcomingBonuses(
    countryCode: string,
    daysAhead: number = 30
  ): Bonus[] {
    const bonuses = getCountryBonuses(countryCode);
    const currentDate = new Date();
    const futureDate = new Date();
    futureDate.setDate(currentDate.getDate() + daysAhead);

    const upcomingBonuses: Bonus[] = [];

    for (const bonus of bonuses) {
      for (const month of bonus.months) {
        const bonusDate = new Date(currentDate.getFullYear(), month - 1,
          this.getPaymentDayForCountryAndBonus(bonus, month));

        if (bonusDate >= currentDate && bonusDate <= futureDate) {
          upcomingBonuses.push(bonus);
          break; // Don't add the same bonus multiple times
        }
      }
    }

    return upcomingBonuses;
  }

  /**
   * Format bonus amount for display
   */
  static formatBonusAmount(amount: number, currencySymbol: string): string {
    return `${currencySymbol}${amount.toLocaleString('es-GT', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  }

  /**
   * Get bonus explanation text for country
   */
  static getBonusExplanation(countryCode: string): string {
    const country = CENTRAL_AMERICA_COUNTRIES.find(c => c.code === countryCode);

    if (!country || country.mandatoryBonuses.length === 0) {
      return "No hay bonos obligatorios configurados para este país.";
    }

    const bonusDescriptions = country.mandatoryBonuses.map(bonus => {
      const monthNames = bonus.months.map(m => {
        const monthName = new Date(0, m - 1).toLocaleString('es', { month: 'long' });
        return monthName.charAt(0).toUpperCase() + monthName.slice(1);
      }).join(' y ');

      return `• ${bonus.name}: ${bonus.description} (${monthNames})`;
    }).join('\n');

    return `En ${country.name}, los trabajadores formales tienen derecho a:\n\n${bonusDescriptions}\n\nEstos bonos se incluyen automáticamente en tu configuración.`;
  }

  /**
   * Validate if user is eligible for bonuses
   */
  static isEligibleForBonuses(
    employmentType: "formal" | "informal" | "freelance" | "business",
    countryCode: string
  ): boolean {
    const bonuses = getCountryBonuses(countryCode);

    // Check if any bonuses apply to this employment type
    return bonuses.some(bonus => {
      switch (bonus.applies_to) {
        case "salary":
        case "formal_employment":
          return employmentType === "formal";
        case "all":
          return true;
        default:
          return false;
      }
    });
  }
}