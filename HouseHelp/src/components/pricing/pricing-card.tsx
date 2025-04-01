import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { ServicePricing } from "../../services/pricing-service"

interface PricingCardProps {
  pricing: ServicePricing
  selected?: boolean
  onSelect: (pricing: ServicePricing) => void
}

export const PricingCard: React.FC<PricingCardProps> = ({ pricing, selected = false, onSelect }) => {
  const formatPrice = (price: number | null) => {
    if (price === null) return "N/A"
    return `$${price.toFixed(2)}`
  }

  return (
    <TouchableOpacity
      style={[styles.container, selected && styles.selectedContainer]}
      onPress={() => onSelect(pricing)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={[styles.packageName, selected && styles.selectedText]}>{pricing.package_name}</Text>
        {pricing.discount_percentage > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{pricing.discount_percentage}% OFF</Text>
          </View>
        )}
      </View>

      <View style={styles.priceContainer}>
        <Text style={[styles.price, selected && styles.selectedText]}>{formatPrice(pricing.price_hourly)}</Text>
        <Text style={[styles.perHour, selected && styles.selectedText]}>/ hour</Text>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Feather name="clock" size={16} color={selected ? COLORS.pureWhite : COLORS.textLight} />
          <Text style={[styles.detailText, selected && styles.selectedText]}>
            Minimum {pricing.min_hours} hour{pricing.min_hours > 1 ? "s" : ""}
          </Text>
        </View>

        {pricing.price_daily && (
          <View style={styles.detailRow}>
            <Feather name="calendar" size={16} color={selected ? COLORS.pureWhite : COLORS.textLight} />
            <Text style={[styles.detailText, selected && styles.selectedText]}>
              Daily: {formatPrice(pricing.price_daily)}
            </Text>
          </View>
        )}

        {pricing.price_weekly && (
          <View style={styles.detailRow}>
            <Feather name="calendar" size={16} color={selected ? COLORS.pureWhite : COLORS.textLight} />
            <Text style={[styles.detailText, selected && styles.selectedText]}>
              Weekly: {formatPrice(pricing.price_weekly)}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.selectButton, selected && styles.selectedButton]}>
        <Text style={[styles.selectText, selected && styles.selectedButtonText]}>
          {selected ? "Selected" : "Select"}
        </Text>
        {selected && <Feather name="check" size={16} color={COLORS.pureWhite} style={styles.checkIcon} />}
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
  packageName: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  selectedText: {
    color: COLORS.pureWhite,
  },
  discountBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs / 2,
    borderRadius: SIZES.xs,
  },
  discountText: {
    color: COLORS.pureWhite,
    fontSize: 12,
    fontWeight: "600",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: SIZES.md,
  },
  price: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
  },
  perHour: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  detailsContainer: {
    marginBottom: SIZES.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.xs,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: SIZES.xs,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  selectedButton: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  selectText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  selectedButtonText: {
    color: COLORS.pureWhite,
  },
  checkIcon: {
    marginLeft: SIZES.xs,
  },
})

