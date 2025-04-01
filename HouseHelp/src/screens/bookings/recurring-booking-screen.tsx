"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from "react-native"
import { useRoute, useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { COLORS, SIZES } from "../../config/theme"
import { Button } from "../../components/UI/button"
import { supabase } from "../../config/supabase"
import { useAuth } from "../../contexts/auth-context"

type RecurrencePattern = "weekly" | "biweekly" | "monthly" | "custom"

export const RecurringBookingScreen = () => {
  const route = useRoute()
  const navigation = useNavigation()
  const { user } = useAuth()

  const { workerId, serviceType, pricing } = route.params as {
    workerId: string
    serviceType: string
    pricing: any
  }

  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [startTime, setStartTime] = useState(new Date())
  const [showStartTimePicker, setShowStartTimePicker] = useState(false)
  const [duration, setDuration] = useState(2) // in hours
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>("weekly")
  const [occurrences, setOccurrences] = useState(4)
  const [selectedDays, setSelectedDays] = useState<number[]>([startDate.getDay()])

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) {
      setStartDate(selectedDate)
      // Update selected day of week
      setSelectedDays([selectedDate.getDay()])
    }
  }

  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(false)
    if (selectedTime) {
      setStartTime(selectedTime)
    }
  }

  const toggleDay = (day: number) => {
    if (recurrencePattern === "custom") {
      if (selectedDays.includes(day)) {
        setSelectedDays(selectedDays.filter((d) => d !== day))
      } else {
        setSelectedDays([...selectedDays, day])
      }
    }
  }

  const handleRecurrencePatternChange = (pattern: RecurrencePattern) => {
    setRecurrencePattern(pattern)

    // Reset selected days based on pattern
    if (pattern === "weekly") {
      setSelectedDays([startDate.getDay()])
    } else if (pattern === "biweekly") {
      setSelectedDays([startDate.getDay()])
    } else if (pattern === "monthly") {
      // For monthly, we keep the day of month
      setSelectedDays([startDate.getDate() % 7])
    } else if (pattern === "custom") {
      setSelectedDays([startDate.getDay()])
    }
  }

  const calculateBookingDates = (): Date[] => {
    const dates: Date[] = [new Date(startDate)]

    if (!recurrenceEnabled || occurrences <= 1) {
      return dates
    }

    const addDays = (date: Date, days: number) => {
      const result = new Date(date)
      result.setDate(result.getDate() + days)
      return result
    }

    if (recurrencePattern === "weekly") {
      for (let i = 1; i < occurrences; i++) {
        dates.push(addDays(dates[0], i * 7))
      }
    } else if (recurrencePattern === "biweekly") {
      for (let i = 1; i < occurrences; i++) {
        dates.push(addDays(dates[0], i * 14))
      }
    } else if (recurrencePattern === "monthly") {
      for (let i = 1; i < occurrences; i++) {
        const nextDate = new Date(dates[0])
        nextDate.setMonth(nextDate.getMonth() + i)
        dates.push(nextDate)
      }
    } else if (recurrencePattern === "custom" && selectedDays.length > 0) {
      let currentDate = new Date(dates[0])
      let count = 1

      while (count < occurrences) {
        currentDate = addDays(currentDate, 1)
        if (selectedDays.includes(currentDate.getDay())) {
          dates.push(new Date(currentDate))
          count++
        }
      }
    }

    return dates
  }

  const handleCreateBookings = async () => {
    if (!user) return

    const bookingDates = calculateBookingDates()

    if (bookingDates.length === 0) {
      Alert.alert("Error", "No valid booking dates")
      return
    }

    setLoading(true)
    try {
      const bookingPromises = bookingDates.map((date) => {
        // Combine date and time
        const startDateTime = new Date(date)
        startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0)

        // Calculate end time
        const endDateTime = new Date(startDateTime)
        endDateTime.setHours(endDateTime.getHours() + duration)

        // Calculate total amount
        const totalAmount = pricing.price_hourly * duration

        return supabase.from("bookings").insert({
          user_id: user.id,
          worker_id: workerId,
          services: [serviceType],
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: "pending",
          total_amount: totalAmount,
          is_recurring: recurrenceEnabled,
          recurrence_group: recurrenceEnabled ? new Date().getTime().toString() : null,
        })
      })

      await Promise.all(bookingPromises)

      Alert.alert(
        "Success",
        `${bookingDates.length} booking${bookingDates.length > 1 ? "s" : ""} created successfully`,
        [
          {
            text: "View Bookings",
            onPress: () => navigation.navigate("Bookings"),
          },
        ],
      )
    } catch (error) {
      console.error("Error creating bookings:", error)
      Alert.alert("Error", "Failed to create bookings. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getDayName = (day: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    return days[day]
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule Booking</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Booking Details</Text>

          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
            <Feather name="calendar" size={20} color={COLORS.primary} />
            <Text style={styles.dateText}>{formatDate(startDate)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          <Text style={styles.label}>Start Time</Text>
          <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowStartTimePicker(true)}>
            <Feather name="clock" size={20} color={COLORS.primary} />
            <Text style={styles.dateText}>{formatTime(startTime)}</Text>
          </TouchableOpacity>
          {showStartTimePicker && (
            <DateTimePicker value={startTime} mode="time" display="default" onChange={handleStartTimeChange} />
          )}

          <Text style={styles.label}>Duration</Text>
          <View style={styles.durationContainer}>
            {[1, 2, 3, 4, 8].map((hours) => (
              <TouchableOpacity
                key={hours}
                style={[styles.durationItem, duration === hours && styles.selectedDurationItem]}
                onPress={() => setDuration(hours)}
              >
                <Text style={[styles.durationText, duration === hours && styles.selectedDurationText]}>
                  {hours} {hours === 1 ? "hour" : "hours"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <View style={styles.recurrenceHeader}>
            <Text style={styles.sectionTitle}>Recurring Booking</Text>
            <Switch
              value={recurrenceEnabled}
              onValueChange={setRecurrenceEnabled}
              trackColor={{ false: COLORS.grayDark, true: COLORS.primary }}
              thumbColor={COLORS.pureWhite}
            />
          </View>

          {recurrenceEnabled && (
            <>
              <Text style={styles.description}>Set up a recurring schedule for this booking</Text>

              <Text style={styles.label}>Recurrence Pattern</Text>
              <View style={styles.patternContainer}>
                {(["weekly", "biweekly", "monthly", "custom"] as RecurrencePattern[]).map((pattern) => (
                  <TouchableOpacity
                    key={pattern}
                    style={[styles.patternItem, recurrencePattern === pattern && styles.selectedPatternItem]}
                    onPress={() => handleRecurrencePatternChange(pattern)}
                  >
                    <Text style={[styles.patternText, recurrencePattern === pattern && styles.selectedPatternText]}>
                      {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {recurrencePattern === "custom" && (
                <>
                  <Text style={styles.label}>Select Days</Text>
                  <View style={styles.daysContainer}>
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={[styles.dayItem, selectedDays.includes(day) && styles.selectedDayItem]}
                        onPress={() => toggleDay(day)}
                      >
                        <Text style={[styles.dayText, selectedDays.includes(day) && styles.selectedDayText]}>
                          {getDayName(day).substring(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.label}>Number of Occurrences</Text>
              <View style={styles.occurrencesContainer}>
                {[2, 4, 8, 12].map((count) => (
                  <TouchableOpacity
                    key={count}
                    style={[styles.occurrenceItem, occurrences === count && styles.selectedOccurrenceItem]}
                    onPress={() => setOccurrences(count)}
                  >
                    <Text style={[styles.occurrenceText, occurrences === count && styles.selectedOccurrenceText]}>
                      {count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Booking Summary</Text>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Service:</Text>
            <Text style={styles.summaryValue}>{serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Rate:</Text>
            <Text style={styles.summaryValue}>${pricing.price_hourly}/hr</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Duration:</Text>
            <Text style={styles.summaryValue}>
              {duration} {duration === 1 ? "hour" : "hours"}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Per Booking:</Text>
            <Text style={styles.summaryValue}>${(pricing.price_hourly * duration).toFixed(2)}</Text>
          </View>

          {recurrenceEnabled && (
            <>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Occurrences:</Text>
                <Text style={styles.summaryValue}>{occurrences}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryItem}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>${(pricing.price_hourly * duration * occurrences).toFixed(2)}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={recurrenceEnabled ? "Schedule Recurring Bookings" : "Schedule Booking"}
          onPress={handleCreateBookings}
          loading={loading}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    paddingBottom: SIZES.xxl,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.lg,
    paddingHorizontal: SIZES.md,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: SIZES.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.white,
  },
  formSection: {
    padding: SIZES.md,
    backgroundColor: COLORS.pureWhite,
    marginHorizontal: SIZES.md,
    marginTop: SIZES.md,
    borderRadius: SIZES.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: SIZES.xs,
    marginTop: SIZES.md,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    padding: SIZES.md,
  },
  dateText: {
    marginLeft: SIZES.xs,
    fontSize: 16,
    color: COLORS.text,
  },
  durationContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  durationItem: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.xs,
    marginBottom: SIZES.xs,
  },
  selectedDurationItem: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  durationText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectedDurationText: {
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  recurrenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  description: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
  },
  patternContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  patternItem: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.xs,
    marginBottom: SIZES.xs,
  },
  selectedPatternItem: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  patternText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectedPatternText: {
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  daysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.md,
  },
  dayItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedDayItem: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayText: {
    fontSize: 12,
    color: COLORS.text,
  },
  selectedDayText: {
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  occurrencesContainer: {
    flexDirection: "row",
  },
  occurrenceItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.xs,
  },
  selectedOccurrenceItem: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  occurrenceText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectedOccurrenceText: {
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  summarySection: {
    padding: SIZES.md,
    backgroundColor: COLORS.pureWhite,
    marginHorizontal: SIZES.md,
    marginTop: SIZES.md,
    borderRadius: SIZES.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.xs,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.md,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  footer: {
    padding: SIZES.md,
    backgroundColor: COLORS.pureWhite,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
})

