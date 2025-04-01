import React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { UserVerification } from "../../services/verification-service"

interface VerificationCardProps {
  verification: UserVerification
  onPress: (verification: UserVerification) => void
}

export const VerificationCard: React.FC<VerificationCardProps> = ({ verification, onPress }) => {
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
    switch (verification.status) {
      case "approved":
        return COLORS.success
      case "pending":
        return COLORS.warning
      case "rejected":
        return COLORS.error
      case "expired":
        return COLORS.grayDark
      default:
        return COLORS.grayDark
    }
  }

  const getStatusIcon = () => {
    switch (verification.status) {
      case "approved":
        return "check-circle"
      case "pending":
        return "clock"
      case "rejected":
        return "x-circle"
      case "expired":
        return "alert-circle"
      default:
        return "help-circle"
    }
  }

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(verification)} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.title}>{verification.verification_type_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Feather name={getStatusIcon()} size={12} color={COLORS.pureWhite} style={styles.statusIcon} />
          <Text style={styles.statusText}>
            {verification.status.charAt(0).toUpperCase() + verification.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Requested:</Text>
          <Text style={styles.infoValue}>{formatDate(verification.created_at)}</Text>
        </View>

        {verification.verified_at && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Verified:</Text>
            <Text style={styles.infoValue}>{formatDate(verification.verified_at)}</Text>
          </View>
        )}

        {verification.expires_at && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Expires:</Text>
            <Text style={styles.infoValue}>{formatDate(verification.expires_at)}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Documents:</Text>
          <Text style={styles.infoValue}>{verification.documents?.length || 0} uploaded</Text>
        </View>
      </View>

      {verification.rejection_reason && (
        <View style={styles.rejectionContainer}>
          <Text style={styles.rejectionLabel}>Reason for rejection:</Text>
          <Text style={styles.rejectionText}>{verification.rejection_reason}</Text>
        </View>
      )}

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
  rejectionContainer: {
    backgroundColor: `${COLORS.error}10`,
    padding: SIZES.sm,
    borderRadius: SIZES.xs,
    marginBottom: SIZES.sm,
  },
  rejectionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.error,
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  footer: {
    alignItems: "flex-end",
  },
})

