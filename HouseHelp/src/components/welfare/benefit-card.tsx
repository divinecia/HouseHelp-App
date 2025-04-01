import React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { WorkerBenefit } from "../../services/welfare-service"

interface BenefitCardProps {
  benefit: WorkerBenefit
  onPress: (benefit: WorkerBenefit) => void
}

export const BenefitCard: React.FC<BenefitCardProps> = ({ benefit, onPress }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"

    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusColor = () => {
    switch (benefit.status) {
      case "active":
        return COLORS.success
      case "pending":
        return COLORS.warning
      case "expired":
        return COLORS.grayDark
      case "cancelled":
        return COLORS.error
      default:
        return COLORS.grayDark
    }
  }

  const getStatusText = () => {
    switch (benefit.status) {
      case "active":
        return "Active"
      case "pending":
        return "Pending"
      case "expired":
        return "Expired"
      case "cancelled":
        return "Cancelled"
      default:
        return benefit.status
    }
  }

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(benefit)} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.title}>{benefit.benefit_type_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        {benefit.policy_number && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Policy Number:</Text>
            <Text style={styles.infoValue}>{benefit.policy_number}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Start Date:</Text>
          <Text style={styles.infoValue}>{formatDate(benefit.start_date)}</Text>
        </View>

        {benefit.end_date && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>End Date:</Text>
            <Text style={styles.infoValue}>{formatDate(benefit.end_date)}</Text>
          </View>
        )}

        {benefit.monthly_premium !== null && benefit.monthly_premium !== undefined && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Monthly Premium:</Text>
            <Text style={styles.infoValue}>${benefit.monthly_premium.toFixed(2)}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>View Details</Text>
        <Feather name="chevron-right" size={20} color={COLORS.primary} />
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
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginRight: SIZES.xs,
  },
  statusBadge: {
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: SIZES.xs,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  infoContainer: {
    marginBottom: SIZES.md,
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
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: COLORS.primary,
    marginRight: SIZES.xs,
  },
})

