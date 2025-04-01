import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { PaymentMethod } from "../../services/payment-service"

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod
  onSelect?: () => void
  onDelete?: () => void
  onSetDefault?: () => void
  selected?: boolean
  showActions?: boolean
}

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  paymentMethod,
  onSelect,
  onDelete,
  onSetDefault,
  selected = false,
  showActions = true,
}) => {
  const getProviderIcon = () => {
    switch (paymentMethod.provider) {
      case "mtn":
        return "smartphone"
      case "airtel":
        return "smartphone"
      case "card":
        return "credit-card"
      case "bank":
        return "briefcase"
      default:
        return "dollar-sign"
    }
  }

  const getProviderName = () => {
    switch (paymentMethod.provider) {
      case "mtn":
        return "MTN Mobile Money"
      case "airtel":
        return "Airtel Money"
      case "card":
        return "Credit/Debit Card"
      case "bank":
        return "Bank Account"
      default:
        return "Unknown"
    }
  }

  const getProviderColor = () => {
    switch (paymentMethod.provider) {
      case "mtn":
        return "#FFCC00"
      case "airtel":
        return "#FF0000"
      case "card":
        return COLORS.primary
      case "bank":
        return "#008000"
      default:
        return COLORS.textLight
    }
  }

  const getPaymentDetails = () => {
    if (paymentMethod.provider === "mtn" || paymentMethod.provider === "airtel") {
      return paymentMethod.phone_number
    } else if (paymentMethod.provider === "card") {
      return `•••• ${paymentMethod.last_four || "****"}`
    } else {
      return "Account details"
    }
  }

  return (
    <TouchableOpacity
      style={[styles.container, selected && styles.selectedContainer, onSelect && styles.selectableContainer]}
      onPress={onSelect}
      activeOpacity={onSelect ? 0.7 : 1}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: `${getProviderColor()}20` }]}>
          <Feather name={getProviderIcon()} size={20} color={getProviderColor()} />
        </View>

        <View style={styles.details}>
          <View style={styles.headerRow}>
            <Text style={styles.providerName}>{getProviderName()}</Text>
            {paymentMethod.is_default && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>Default</Text>
              </View>
            )}
          </View>

          <Text style={styles.paymentDetails}>{getPaymentDetails()}</Text>

          {paymentMethod.provider === "card" && paymentMethod.expiry_month && paymentMethod.expiry_year && (
            <Text style={styles.expiryDate}>
              Expires {paymentMethod.expiry_month}/{paymentMethod.expiry_year}
            </Text>
          )}
        </View>
      </View>

      {selected && (
        <View style={styles.checkContainer}>
          <Feather name="check-circle" size={20} color={COLORS.primary} />
        </View>
      )}

      {showActions && !selected && (
        <View style={styles.actions}>
          {!paymentMethod.is_default && onSetDefault && (
            <TouchableOpacity style={styles.actionButton} onPress={onSetDefault}>
              <Feather name="star" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
              <Feather name="trash-2" size={16} color={COLORS.error} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedContainer: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  selectableContainer: {
    cursor: "pointer",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.md,
  },
  details: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  providerName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginRight: SIZES.xs,
  },
  defaultBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: SIZES.xs / 2,
  },
  defaultText: {
    color: COLORS.pureWhite,
    fontSize: 10,
    fontWeight: "600",
  },
  paymentDetails: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 2,
  },
  expiryDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  checkContainer: {
    marginLeft: SIZES.md,
  },
  actions: {
    flexDirection: "row",
    marginLeft: SIZES.md,
  },
  actionButton: {
    padding: SIZES.xs,
    marginLeft: SIZES.xs,
  },
})

