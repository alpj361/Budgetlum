import React from "react";
import { View, Text } from "react-native";

interface ConversationalGuidanceProps {
  type: "intro" | "foundation" | "stability" | "success";
  stabilityPattern?: "consistent" | "seasonal" | "variable";
  monthlyEstimate?: number;
}

const getGuidanceContent = (
  type: ConversationalGuidanceProps["type"],
  stabilityPattern?: string,
  monthlyEstimate?: number
) => {
  switch (type) {
    case "intro":
      return {
        title: "Hablemos de tu ingreso principal 💬",
        message: "Vamos a configurar la base sólida de tu presupuesto. Empezaremos con tu ingreso más confiable - el dinero en el que puedes contar cada mes.",
        emoji: "🏗️",
        color: "blue",
      };

    case "foundation":
      return {
        title: "Construyendo tu fundación financiera",
        message: "No incluyas bonos, horas extra, o comisiones variables por ahora. Esos los agregaremos después como 'dinero sorpresa' para que no dependas de ellos en tu presupuesto básico.",
        emoji: "🧱",
        color: "amber",
      };

    case "stability":
      const stabilityMessages = {
        consistent: "¡Excelente! Tu ingreso constante hará que el presupuesto sea súper predecible y fácil de seguir.",
        seasonal: "Perfecto, usaremos un enfoque conservador para que tu presupuesto funcione incluso en los meses más bajos.",
        variable: "Genial, crearemos un presupuesto inteligente que se adapte a la naturaleza variable de tu trabajo.",
      };
      return {
        title: "Entendemos tu situación 👍",
        message: stabilityMessages[stabilityPattern as keyof typeof stabilityMessages] || "",
        emoji: "📊",
        color: "green",
      };

    case "success":
      return {
        title: "¡Perfecto! Ya tienes tu base financiera",
        message: `Con $${monthlyEstimate?.toLocaleString()}/mes como fundación, podrás crear un presupuesto sólido. Más adelante agregaremos ingresos extras y bonificaciones.`,
        emoji: "🎉",
        color: "emerald",
      };

    default:
      return {
        title: "",
        message: "",
        emoji: "",
        color: "gray",
      };
  }
};

export default function ConversationalGuidance({
  type,
  stabilityPattern,
  monthlyEstimate,
}: ConversationalGuidanceProps) {
  const content = getGuidanceContent(type, stabilityPattern, monthlyEstimate);

  if (!content.message) return null;

  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    green: "bg-green-50 border-green-200 text-green-800",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    gray: "bg-gray-50 border-gray-200 text-gray-800",
  };

  return (
    <View className={`p-4 rounded-xl border mb-6 ${colorClasses[content.color as keyof typeof colorClasses]}`}>
      {content.title && (
        <Text className="font-semibold mb-2">
          {content.emoji} {content.title}
        </Text>
      )}
      <Text className="text-sm leading-5">
        {content.message}
      </Text>
    </View>
  );
}