import React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { BackgroundCheckRequest } from "../../services/verification-service"

interface BackgroundCheckCardProps {
  check: BackgroundCheckRequest
  onPress: (check: BackgroundCheckRequest) => void
}

export const BackgroundCheckCard: React.FC<BackgroundCheckCardProps> = ({ check, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusColor = () => {
    switch (check.status) {
      case "completed":
        return COLORS.success
      case "pending":
      case "processing":
        return COLORS.warning
      case "failed":
        return COLORS.error
      default:
        return COLORS.grayDark
    }
  }

  const getStatusIcon = () => {
    switch (check.status) {
      case "completed":
        return "check-circle"
      case "pending":
        return "clock"
      case "processing":
        return "refresh-cw"
      case "failed":
        return "x-circle"
      default:
        return "help-circle"
    }
  }

  const getCheckTypeLabel = () => {
    switch (check.check_type) {
      case "basic":
        return "Basic Check"
      case "standard":
        return "Standard Check"
      case "comprehensive":
        return "Comprehensive Check"
      default:
        return "Background Check"
    }
  }

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(check)} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.title}>{getCheckTypeLabel()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Feather name={getStatusIcon()} size={12} color={COLORS.pureWhite} style={styles.statusIcon} />
          <Text style={styles.statusText}>{check.status.charAt(0).toUpperCase() + check.status.slice(1)}</Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Requested:</Text>
          <Text style={styles.infoValue}>{formatDate(check.created_at)}</Text>
        </View>

        {check.provider && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Provider:</Text>
            <Text style={styles.infoValue}>{check.provider}</Text>
          </View>
        )}

        {check.provider_reference_id && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Reference ID:</Text>
            <Text style={styles.infoValue}>{check.provider_reference_id}</Text>
          </View>
        )}

        {check.updated_at !== check.created_at && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Updated:</Text>
            <Text style={styles.infoValue}>{formatDate(check.updated_at)}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Feather name="chevron-right" size={20} color={COLORS.textLight} />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginRight: SIZES.xs,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs / 2,
    borderRadius: SIZES.xs,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.pureWhite,
  },
  infoContainer: {
    marginBottom: SIZES.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  footer: {
    alignItems: "flex-end",
  },
})

