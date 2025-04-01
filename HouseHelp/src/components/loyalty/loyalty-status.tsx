import type React from "react"
import { View, Text, StyleSheet } from "react-native"
import { COLORS, SIZES } from "../../config/theme"
import type { LoyaltyStatus } from "../../services/referral-service"

interface LoyaltyStatusProps {
  status: LoyaltyStatus
}

export const LoyaltyStatusComponent: React.FC<LoyaltyStatusProps> = ({ status }) => {
  const getTierColor = () => {
    switch (status.tier) {
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

  const getProgressPercentage = () => {
    if (!status.next_tier || !status.points_to_next_tier) {
      return 100
    }

    let totalPointsNeeded = 0

    switch (status.tier) {
      case "bronze":
        totalPointsNeeded = 1000
        break
      case "silver":
        totalPointsNeeded = 5000
        break
      case "gold":
        totalPointsNeeded = 10000
        break
      default:
        return 100
    }

    const pointsEarned = totalPointsNeeded - status.points_to_next_tier
    return Math.min(100, Math.max(0, (pointsEarned / totalPointsNeeded) * 100))
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pointsLabel}>Available Points</Text>
          <Text style={styles.pointsValue}>{status.points_balance}</Text>
        </View>

        <View style={[styles.tierBadge, { backgroundColor: getTierColor() }]}>
          <Text style={styles.tierText}>{status.tier.charAt(0).toUpperCase() + status.tier.slice(1)}</Text>
        </View>
      </View>

      <View style={styles.lifetimeContainer}>
        <Text style={styles.lifetimeLabel}>Lifetime Points</Text>
        <Text style={styles.lifetimeValue}>{status.lifetime_points}</Text>
      </View>

      {status.next_tier && status.points_to_next_tier !== undefined && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              Next Tier: {status.next_tier.charAt(0).toUpperCase() + status.next_tier.slice(1)}
            </Text>
            <Text style={styles.progressValue}>{status.points_to_next_tier} points needed</Text>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getProgressPercentage()}%` }]} />
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  \

