import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { SubscriptionPlan } from "../../services/pricing-service"

interface SubscriptionPlanCardProps {
  plan: SubscriptionPlan
  selected?: boolean
  onSelect: (plan: SubscriptionPlan) => void
  billingCycle: "monthly" | "yearly"
}

export const SubscriptionPlanCard: React.FC<SubscriptionPlanCardProps> = ({
  plan,
  selected = false,
  onSelect,
  billingCycle,
}) => {
  const getPrice = () => {
    if (billingCycle === "yearly" && plan.price_yearly) {
      return plan.price_yearly
    }
    return plan.price_monthly
  }

  const getYearlySavings = () => {
    if (billingCycle === "yearly" && plan.price_yearly && plan.price_monthly) {
      const monthlyCost = plan.price_monthly * 12
      const yearlyCost = plan.price_yearly
      const savings = monthlyCost - yearlyCost
      const savingsPercentage = Math.round((savings / monthlyCost) * 100)
      return savingsPercentage
    }
    return 0
  }

  return (
    <TouchableOpacity
      style={[styles.container, selected && styles.selectedContainer]}
      onPress={() => onSelect(plan)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={[styles.planName, selected && styles.selectedText]}>{plan.name}</Text>
        {billingCycle === "yearly" && getYearlySavings() > 0 && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>Save {getYearlySavings()}%</Text>
          </View>
        )}
      </View>

      <View style={styles.priceContainer}>
        <Text style={[styles.price, selected && styles.selectedText]}>${getPrice().toFixed(2)}</Text>
        <Text style={[styles.billingCycle, selected && styles.selectedText]}>
          / {billingCycle === "monthly" ? "month" : "year"}
        </Text>
      </View>

      <Text style={[styles.description, selected && styles.selectedText]}>{plan.description}</Text>

      <View style={styles.featuresContainer}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Feather
              name="check"
              size={16}
              color={selected ? COLORS.pureWhite : COLORS.success}
              style={styles.featureIcon}
            />
            <Text style={[styles.featureText, selected && styles.selectedText]}>{feature}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.selectButton, selected && styles.selectedButton]}>
        <Text style={[styles.selectText, selected && styles.selectedButtonText]}>
          {selected ? "Selected" : "Select Plan"}
        </Text>
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
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedContainer: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.sm,
  },
  planName: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
  },
  selectedText: {
    color: COLORS.pureWhite,
  },
  savingsBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs / 2,
    borderRadius: SIZES.xs,
  },
  savingsText: {
    color: COLORS.pureWhite,
    fontSize: 12,
    fontWeight: "600",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: SIZES.sm,
  },
  price: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text,
  },
  billingCycle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
  },
  featuresContainer: {
    marginBottom: SIZES.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.xs,
  },
  featureIcon: {
    marginRight: SIZES.xs,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectButton: {
    backgroundColor: COLORS.white,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  selectedButton: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  selectText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },
  selectedButtonText: {
    color: COLORS.pureWhite,
  },
})

