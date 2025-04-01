import type React from "react"
import { View, Text, StyleSheet } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { PerformanceMetric } from "../../services/analytics-service"

interface MetricCardProps {
  metric: PerformanceMetric
  formatValue?: (value: number) => string
}

export const MetricCard: React.FC<MetricCardProps> = ({ metric, formatValue = (value) => value.toFixed(2) }) => {
  const getIcon = () => {
    switch (metric.metric_name) {
      case "Total Bookings":
        return "calendar"
      case "Total Earnings":
      case "Total Spent":
        return "dollar-sign"
      case "Average Rating":
        return "star"
      case "Hours Worked":
        return "clock"
      case "Average Booking Amount":
        return "credit-card"
      case "Unique Workers Hired":
        return "users"
      default:
        return "bar-chart-2"
    }
  }

  const getChangeColor = () => {
    if (metric.change_percentage === null) return COLORS.textLight

    // For some metrics, higher is better
    const isHigherBetter = !["Total Spent"].includes(metric.metric_name)

    if (isHigherBetter) {
      return metric.change_percentage >= 0 ? COLORS.success : COLORS.error
    } else {
      return metric.change_percentage <= 0 ? COLORS.success : COLORS.error
    }
  }

  const getChangeIcon = () => {
    if (metric.change_percentage === null) return "minus"

    // For some metrics, higher is better
    const isHigherBetter = !["Total Spent"].includes(metric.metric_name)

    if (isHigherBetter) {
      return metric.change_percentage >= 0 ? "arrow-up" : "arrow-down"
    } else {
      return metric.change_percentage <= 0 ? "arrow-down" : "arrow-up"
    }
  }

  const formatMetricValue = () => {
    if (
      metric.metric_name === "Total Earnings" ||
      metric.metric_name === "Total Spent" ||
      metric.metric_name === "Average Booking Amount"
    ) {
      return `$${formatValue(metric.metric_value)}`
    } else if (metric.metric_name === "Average Rating") {
      return formatValue(metric.metric_value)
    } else {
      return Math.round(metric.metric_value).toString()
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Feather name={getIcon()} size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>{metric.metric_name}</Text>
      </View>

      <Text style={styles.value}>{formatMetricValue()}</Text>

      {metric.comparison_value !== null && (
        <View style={styles.changeContainer}>
          <Feather name={getChangeIcon()} size={14} color={getChangeColor()} style={styles.changeIcon} />
          <Text style={[styles.changeText, { color: getChangeColor() }]}>
            {metric.change_percentage !== null ? `${Math.abs(metric.change_percentage).toFixed(1)}%` : "N/A"}
          </Text>
          <Text style={styles.periodText}>vs. previous period</Text>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flex: 1,
    minWidth: "45%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.xs,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.xs,
  },
  title: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
  },
  value: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeIcon: {
    marginRight: 2,
  },
  changeText: {
    fontSize: 12,
    fontWeight: "500",
    marginRight: 4,
  },
  periodText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
})

