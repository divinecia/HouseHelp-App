import type React from "react"
import { View, Text, StyleSheet } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { Transaction } from "../../services/payment-service"

interface TransactionCardProps {
  transaction: Transaction
}

export const TransactionCard: React.FC<TransactionCardProps> = ({ transaction }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = () => {
    switch (transaction.status) {
      case "completed":
        return COLORS.success
      case "pending":
      case "processing":
        return COLORS.warning
      case "failed":
        return COLORS.error
      case "refunded":
        return COLORS.primary
      default:
        return COLORS.textLight
    }
  }

  const getStatusIcon = () => {
    switch (transaction.status) {
      case "completed":
        return "check-circle"
      case "pending":
        return "clock"
      case "processing":
        return "refresh-cw"
      case "failed":
        return "x-circle"
      case "refunded":
        return "rotate-ccw"
      default:
        return "help-circle"
    }
  }

  const getTypeIcon = () => {
    switch (transaction.payment_type) {
      case "booking":
        return "calendar"
      case "subscription":
        return "repeat"
      case "deposit":
        return "plus-circle"
      default:
        return "dollar-sign"
    }
  }

  const getTypeLabel = () => {
    switch (transaction.payment_type) {
      case "booking":
        return "Booking Payment"
      case "subscription":
        return "Subscription"
      case "deposit":
        return "Wallet Deposit"
      default:
        return "Payment"
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Feather name={getTypeIcon()} size={20} color={COLORS.primary} />
      </View>

      <View style={styles.details}>
        <View style={styles.headerRow}>
          <Text style={styles.typeLabel}>{getTypeLabel()}</Text>
          <Text
            style={[styles.amount, { color: transaction.payment_type === "deposit" ? COLORS.success : COLORS.text }]}
          >
            {transaction.payment_type === "deposit" ? "+" : "-"}
            {transaction.currency} {transaction.amount.toFixed(2)}
          </Text>
        </View>

        <Text style={styles.description} numberOfLines={1}>
          {transaction.description || "No description"}
        </Text>

        <View style={styles.footerRow}>
          <Text style={styles.date}>{formatDate(transaction.created_at)}</Text>
          <View style={styles.statusContainer}>
            <Feather name={getStatusIcon()} size={12} color={getStatusColor()} style={styles.statusIcon} />
            <Text style={[styles.status, { color: getStatusColor() }]}>
              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </Text>
          </View>
        </View>
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
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.md,
  },
  details: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  amount: {
    fontSize: 16,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIcon: {
    marginRight: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: "500",
  },
})

