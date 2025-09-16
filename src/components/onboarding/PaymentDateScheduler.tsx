import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import SelectionCard from "./SelectionCard";
import { PaymentStructure, PaymentSchedule } from "../../types/user";

interface PaymentDateSchedulerProps {
  paymentStructure: PaymentStructure;
  selectedSchedule: PaymentSchedule | null;
  onScheduleChange: (schedule: PaymentSchedule) => void;
}


const getScheduleOptionsForStructure = (structure: PaymentStructure): PaymentSchedule[] => {
  switch (structure.type) {
    case "monthly":
      return [
        {
          type: "fixed-dates",
          dates: [30],
          description: "Último día del mes",
        },
        {
          type: "fixed-dates",
          dates: [15],
          description: "El día 15 de cada mes",
        },
        {
          type: "fixed-dates",
          dates: [1],
          description: "Primer día del mes",
        },
        {
          type: "day-pattern",
          pattern: "last-friday",
          description: "Último viernes del mes",
        },
      ];

    case "bi-monthly":
      return [
        {
          type: "fixed-dates",
          dates: [1, 15],
          description: "1ro y 15 de cada mes",
        },
        {
          type: "fixed-dates",
          dates: [15, 30],
          description: "15 y último día del mes",
        },
        {
          type: "fixed-dates",
          dates: [10, 25],
          description: "10 y 25 de cada mes",
        },
        {
          type: "day-pattern",
          pattern: "first-friday",
          description: "Primer y tercer viernes",
        },
      ];

    case "bi-weekly":
      return [
        {
          type: "day-pattern",
          pattern: "bi-weekly-friday",
          description: "Cada 14 días (viernes)",
        },
        {
          type: "day-pattern",
          pattern: "every-friday",
          description: "Todos los viernes (alternando semanas)",
        },
      ];

    case "weekly":
      return [
        {
          type: "day-pattern",
          pattern: "every-friday",
          description: "Todos los viernes",
        },
      ];

    default:
      return [
        {
          type: "custom",
          description: "Fechas personalizadas",
        },
      ];
  }
};

const getScheduleIcon = (schedule: PaymentSchedule): string => {
  if (schedule.type === "fixed-dates") return "calendar-outline";
  if (schedule.pattern?.includes("friday")) return "time";
  return "calendar";
};

const getSchedulePreview = (schedule: PaymentSchedule): string => {
  switch (schedule.type) {
    case "fixed-dates":
      if (schedule.dates?.length === 1) {
        const day = schedule.dates[0];
        if (day === 30) return "28, 29, 30 o 31 (último día disponible)";
        return `Día ${day} de cada mes`;
      } else if (schedule.dates?.length === 2) {
        return `Días ${schedule.dates[0]} y ${schedule.dates[1]} de cada mes`;
      }
      return schedule.description;

    case "day-pattern":
      switch (schedule.pattern) {
        case "every-friday":
          return "Viernes de cada semana";
        case "bi-weekly-friday":
          return "Viernes cada 14 días exactos";
        case "first-friday":
          return "Primer viernes + 2 semanas después";
        case "last-friday":
          return "Último viernes de cada mes";
        default:
          return schedule.description;
      }

    default:
      return schedule.description;
  }
};

export default function PaymentDateScheduler({
  paymentStructure,
  selectedSchedule,
  onScheduleChange,
}: PaymentDateSchedulerProps) {
  const scheduleOptions = getScheduleOptionsForStructure(paymentStructure);

  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-900 mb-2">
        ¿Qué días específicos te pagan?
      </Text>

      <Text className="text-gray-600 mb-4">
        Esto nos ayuda a crear un calendario preciso de tus ingresos
      </Text>

      <ScrollView className="max-h-80">
        {scheduleOptions.map((schedule, index) => {
          const isSelected = selectedSchedule?.description === schedule.description;
          const icon = getScheduleIcon(schedule);
          const preview = getSchedulePreview(schedule);

          return (
            <View key={index} className="mb-3">
              <SelectionCard
                title={schedule.description}
                description={preview}
                icon={icon as any}
                isSelected={isSelected}
                onPress={() => onScheduleChange(schedule)}
              />

              {/* Show preview when selected */}
              {isSelected && (
                <View className="mt-2 ml-4 p-3 bg-blue-50 rounded-lg">
                  <Text className="text-blue-800 font-medium text-sm mb-1">
                    📅 Vista previa del calendario:
                  </Text>
                  <Text className="text-blue-700 text-sm">
                    {getCalendarPreview(schedule, paymentStructure)}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Show structure info */}
      <View className="p-4 bg-emerald-50 rounded-xl mt-4">
        <Text className="text-emerald-800 font-medium text-sm text-center">
          ✓ {paymentStructure.description} - {getPaymentsPerYearText(paymentStructure)}
        </Text>
      </View>
    </View>
  );
}

const getCalendarPreview = (schedule: PaymentSchedule, structure: PaymentStructure): string => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  switch (schedule.type) {
    case "fixed-dates":
      if (schedule.dates?.length === 1) {
        const day = schedule.dates[0];
        return `Próximo pago: ${day}/${currentMonth + 1}/${currentYear}`;
      } else if (schedule.dates?.length === 2) {
        const [day1, day2] = schedule.dates;
        return `Próximos pagos: ${day1}/${currentMonth + 1} y ${day2}/${currentMonth + 1}`;
      }
      break;

    case "day-pattern":
      switch (schedule.pattern) {
        case "every-friday":
          return "Próximo viernes de cada semana";
        case "bi-weekly-friday":
          return "Cada 14 días exactos desde el último viernes";
        case "last-friday":
          return "Último viernes de cada mes";
        default:
          return "Patrón de días configurado";
      }
      break;
  }

  return "Calendario personalizado";
};

const getPaymentsPerYearText = (structure: PaymentStructure): string => {
  switch (structure.type) {
    case "monthly":
      return "12 pagos al año";
    case "bi-monthly":
      return "24 pagos al año";
    case "bi-weekly":
      return "26 pagos al año";
    case "weekly":
      return "52 pagos al año";
    default:
      return "Frecuencia variable";
  }
};