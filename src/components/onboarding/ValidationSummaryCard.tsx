import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ChatValidationState, SyncSummary } from "../../contexts/AIChatContext";

interface Props {
  validation: ChatValidationState | null;
  syncSummary: SyncSummary | null;
}

const getStatusColor = (validation: ChatValidationState | null) => {
  if (!validation) return "#CBD5F5";
  if (validation.errors.length > 0 || validation.schemaErrors.length > 0) return "#FCA5A5";
  if (validation.suggestions.length > 0) return "#FDE68A";
  return "#BBF7D0";
};

const getStatusIcon = (validation: ChatValidationState | null) => {
  if (!validation) return "information-circle-outline";
  if (validation.errors.length > 0 || validation.schemaErrors.length > 0) return "alert-circle";
  if (validation.suggestions.length > 0) return "help-circle-outline";
  return "checkmark-circle";
};

export const ValidationSummaryCard: React.FC<Props> = ({ validation, syncSummary }) => {
  const statusColor = getStatusColor(validation);
  const iconName = getStatusIcon(validation);

  const hasErrors = !!validation && (validation.errors.length > 0 || validation.schemaErrors.length > 0);
  const hasSuggestions = !!validation && validation.suggestions.length > 0;

  return (
    <View
      style={{
        backgroundColor: statusColor,
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={iconName as any} size={20} color="#1F2937" />
        <Text style={{ fontWeight: "600", fontSize: 16, color: "#111827" }}>
          {hasErrors
            ? "Necesitamos confirmar algunos datos"
            : hasSuggestions
              ? "Casi listo, revisa esto"
              : "Datos sincronizados"}
        </Text>
      </View>

      {validation && validation.schemaErrors.length > 0 && (
        <View style={{ gap: 4 }}>
          {validation.schemaErrors.map((error) => (
            <Text key={error} style={{ color: "#7F1D1D", fontSize: 13 }}>
              • {error}
            </Text>
          ))}
        </View>
      )}

      {validation && validation.errors.length > 0 && (
        <View style={{ gap: 4 }}>
          {validation.errors.map((error) => (
            <Text key={error} style={{ color: "#7F1D1D", fontSize: 13 }}>
              • {error}
            </Text>
          ))}
        </View>
      )}

      {validation && validation.suggestions.length > 0 && (
        <View style={{ gap: 4 }}>
          {validation.suggestions.map((suggestion) => (
            <Text key={suggestion} style={{ color: "#92400E", fontSize: 13 }}>
              • {suggestion}
            </Text>
          ))}
        </View>
      )}

      {syncSummary && !hasErrors && (
        <View style={{ gap: 4 }}>
          <Text style={{ color: "#065F46", fontSize: 13 }}>
            • Ingresos actualizados: {syncSummary.incomesUpdated + syncSummary.incomesCreated}
          </Text>
          {syncSummary.goalsCreated > 0 && (
            <Text style={{ color: "#065F46", fontSize: 13 }}>
              • Nuevas metas detectadas: {syncSummary.goalsCreated}
            </Text>
          )}
          {syncSummary.profileUpdated && (
            <Text style={{ color: "#065F46", fontSize: 13 }}>
              • Preferencias ajustadas automáticamente
            </Text>
          )}
        </View>
      )}
    </View>
  );
};
