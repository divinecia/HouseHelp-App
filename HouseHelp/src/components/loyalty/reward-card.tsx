import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { LoyaltyReward } from "../../services/referral-service"

interface RewardCardProps {
  reward: LoyaltyReward
  userPoints: number
  onRedeem: (reward: LoyaltyReward) => void
}

export const RewardCard: React.FC<RewardCardProps> = ({ reward, userPoints, onRedeem }) => {
  const canRedeem = userPoints >= reward.points_required

  const getRewardIcon = () => {
    switch (reward.reward_type) {
      case "discount":
        return "percent"
      case "free_service":
        return "award"
      case "credit":
        return "credit-card"
      case "gift":
        return "gift"
      default:
        return "star"
    }
  }

  const getRewardValueText = () => {
    switch (reward.reward_type) {
      case "discount":
        return `${reward.reward_value.percentage}% off`
      case "free_service":
        return `Free ${reward.reward_value.service_type}`
      case "credit":
        return `$${reward.reward_value.amount} credit`
      case "gift":
        return reward.reward_value.description
      default:
        return ""
    }
  }

  const getTierBadgeColor = () => {
    switch (reward.min_tier) {
      case "bronze":
        return "#CD7F32"
      case "silver":
        return "#C0C0C0"
      case "gold":
        return "#FFD700"
      case "platinum":
        return "#E5E4E2"
      default:
        return COLORS.grayDark
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={[styles.iconContainer, { backgroundColor: `${COLORS.primary}10` }]}>
            <Feather name={getRewardIcon()} size={20} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.title}>{reward.name}</Text>
            <Text style={styles.subtitle}>{getRewardValueText()}</Text>
          </View>
        </View>

        {reward.min_tier && (
          <View style={[styles.tierBadge, { backgroundColor: getTierBadgeColor() }]}>
            <Text style={styles.tierText}>{reward.min_tier.charAt(0).toUpperCase() + reward.min_tier.slice(1)}</Text>
          </View>
        )}
      </View>

      {reward.description && <Text style={styles.description}>{reward.description}</Text>}

      <View style={styles.footer}>
        <View style={styles.pointsContainer}>
          <Feather name="star" size={16} color={COLORS.warning} />
          <Text style={styles.pointsText}>{reward.points_required} points</Text>
        </View>

        <TouchableOpacity
          style={[styles.redeemButton, !canRedeem && styles.disabledButton]}
          onPress={() => canRedeem && onRedeem(reward)}
          disabled={!canRedeem}
        >
          <Text style={[styles.redeemText, !canRedeem && styles.disabledText]}>
            {canRedeem ? "Redeem" : "Not Enough Points"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
    alignItems: "flex-start",
    marginBottom: SIZES.sm,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: SIZES.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  tierBadge: {
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: SIZES.xs,
  },
  tierText: {
    fontSize: 12,
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pointsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  pointsText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
    marginLeft: SIZES.xs,
  },
  redeemButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.sm,
  },
  disabledButton: {
    backgroundColor: COLORS.grayDark,
  },
  redeemText: {
    fontSize: 14,
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  disabledText: {
    color: COLORS.white,
  },
})

