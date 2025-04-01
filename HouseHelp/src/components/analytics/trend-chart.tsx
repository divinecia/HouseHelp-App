import type React from "react"
import { View, Text, StyleSheet, Dimensions } from "react-native"
import { LineChart } from "react-native-chart-kit"
import { COLORS, SIZES } from "../../config/theme"
import type { BookingTrend } from "../../services/analytics-service"

interface TrendChartProps {
  data: BookingTrend[]
  title: string
  valueType: "count" | "amount"
  period: "week" | "month" | "year"
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, title, valueType, period }) => {
  const screenWidth = Dimensions.get("window").width - SIZES.md * 2

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)

    switch (period) {
      case "week":
        return date.toLocaleDateString("en-US", { weekday: "short" })
      case "month":
        return date.getDate().toString()
      case "year":
        return date.toLocaleDateString("en-US", { month: "short" })
      default:
        return date.getDate().toString()
    }
  }

  const getChartData = () => {
    const labels = data.map((item) => formatDate(item.date))
    const values = data.map((item) => (valueType === "count" ? item.count : item.amount))

    return {
      labels,
      datasets: [
        {
          data: values.length > 0 ? values : [0],
          color: (opacity = 1) => `rgba(65, 105, 225, ${opacity})`, // Royal blue
          strokeWidth: 2,
        },
      ],
    }
  }

  const chartConfig = {
    backgroundGradientFrom: COLORS.pureWhite,
    backgroundGradientTo: COLORS.pureWhite,
    decimalPlaces: valueType === "amount" ? 0 : 0,
    color: (opacity = 1) => `rgba(65, 105, 225, ${opacity})`, // Royal blue
    labelColor: () => COLORS.textLight,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: COLORS.primary,
    },
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {data.length > 0 ? (
        <LineChart
          data={getChartData()}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={false}
          withOuterLines={true}
          withVerticalLines={false}
          withHorizontalLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={true}
          yAxisSuffix={valueType === "amount" ? "$" : ""}
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available</Text>
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
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  chart: {
    marginVertical: SIZES.xs,
    borderRadius: SIZES.md,
  },
  noDataContainer: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
})

