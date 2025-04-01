import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { COLORS, SIZES } from "../../config/theme"
import type { Referral } from "../../services/referral-service"

interface ReferralCardProps {
  referral: Referral
  onPress?: (referral: Referral) => void
}

export const ReferralCard: React.FC<ReferralCardProps> = ({ referral, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusColor = () => {
    switch (referral.status) {
      case "completed":
        return COLORS.success
      case "pending":
        return COLORS.warning
      case "expired":
        return COLORS.error
      default:
        return COLORS.grayDark
    }
  }

  const getStatusText = () => {
    switch (referral.status) {
      case "completed":
        return "Completed"
      case "pending":
        return "Pending"
      case "expired":
        return "Expired"
      default:
        return referral.status
    }
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress && onPress(referral)}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{referral.referred_user_name || "Anonymous"}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Referred On:</Text>
          <Text style={styles.infoValue}>{formatDate(referral.created_at)}</Text>
        </View>

        {referral.status === "completed" && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Completed On:</Text>
              <Text style={styles.infoValue}>{formatDate(referral.completed_at || "")}</Text>
            </View>

            {referral.reward_amount && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Reward:</Text>
                <Text style={styles.infoValue}>${referral.reward_amount.toFixed(2)}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Paid:</Text>
              <Text style={styles.infoValue}>{referral.reward_paid ? "Yes" : "Pending"}</Text>
            </View>
          </>
        )}
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
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
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
    marginBottom: SIZES.xs,
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
})

