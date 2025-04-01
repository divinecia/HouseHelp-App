"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native"
import { useRoute, useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { getWorkerById } from "../../services/worker-service"
import type { WorkerProfile, ServiceType } from "../../types/worker"
import { Button } from "../../components/UI/button"
import { COLORS, SIZES } from "../../config/theme"

export const BookingFormScreen = () => {
  const route = useRoute()
  const navigation = useNavigation()
  const { workerId } = route.params as { workerId: string }

  const [worker, setWorker] = useState<WorkerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [startTime, setStartTime] = useState(new Date())
  const [showStartTimePicker, setShowStartTimePicker] = useState(false)
  const [duration, setDuration] = useState(2) // in hours
  const [totalPrice, setTotalPrice] = useState(0)

  useEffect(() => {
    fetchWorkerDetails()
  }, [workerId])

  useEffect(() => {
    if (worker && selectedService) {
      calculateTotalPrice()
    }
  }, [worker, selectedService, duration])

  const fetchWorkerDetails = async () => {
    setLoading(true)
    try {
      const workerData = await getWorkerById(workerId)
      setWorker(workerData)
      if (workerData && workerData.services.length > 0) {
        setSelectedService(workerData.services[0])
      }
    } catch (error) {
      console.error("Error fetching worker details:", error)
      Alert.alert("Error", "Failed to load worker details")
    } finally {
      setLoading(false)
    }
  }

  const calculateTotalPrice = () => {
    if (worker) {
      setTotalPrice(worker.hourly_rate * duration)
    }
  }

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) {
      setSelectedDate(selectedDate)
    }
  }

  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(false)
    if (selectedTime) {
      setStartTime(selectedTime)
    }
  }

  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration)
  }

  const handleSubmit = () => {
    // Here you would submit the booking to your API
    Alert.alert("Booking Confirmation", `Your booking with ${worker?.full_name} has been submitted for approval.`, [
      { text: "OK", onPress: () => navigation.navigate("Bookings") },
    ])
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

  if (loading || !worker) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Service</Text>
        </View>

        <View style={styles.workerInfo}>
          <Text style={styles.sectionTitle}>Service Provider</Text>
          <View style={styles.workerCard}>
            <View style={styles.workerHeader}>
              <View style={styles.workerNameContainer}>
                <Text style={styles.workerName}>{worker.full_name}</Text>
                {worker.verified && <Feather name="check-circle" size={16} color={COLORS.primary} />}
              </View>
              <Text style={styles.workerRate}>${worker.hourly_rate}/hr</Text>
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Service Details</Text>

          <Text style={styles.label}>Select Service</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesContainer}
          >
            {worker.services.map((service) => (
              <TouchableOpacity
                key={service}
                style={[styles.serviceItem, selectedService === service && styles.selectedServiceItem]}
                onPress={() => setSelectedService(service)}
              >
                <Text style={[styles.serviceText, selectedService === service && styles.selectedServiceText]}>
                  {service.charAt(0).toUpperCase() + service.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Select Date</Text>
          <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
            <Feather name="calendar" size={20} color={COLORS.primary} />
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
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
                onPress={() => handleDurationChange(hours)}
              >
                <Text style={[styles.durationText, duration === hours && styles.selectedDurationText]}>
                  {hours} {hours === 1 ? "hour" : "hours"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Booking Summary</Text>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Service:</Text>
            <Text style={styles.summaryValue}>
              {selectedService ? selectedService.charAt(0).toUpperCase() + selectedService.slice(1) : "Not selected"}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Date:</Text>
            <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Time:</Text>
            <Text style={styles.summaryValue}>{formatTime(startTime)}</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Duration:</Text>
            <Text style={styles.summaryValue}>
              {duration} {duration === 1 ? "hour" : "hours"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>${totalPrice.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Book Now" onPress={handleSubmit} style={styles.bookButton} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SIZES.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  workerInfo: {
    padding: SIZES.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  workerCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.md,
  },
  workerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  workerNameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  workerName: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: SIZES.xs,
  },
  workerRate: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  formSection: {
    padding: SIZES.md,
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.md,
    borderRadius: SIZES.md,
    marginBottom: SIZES.md,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: SIZES.xs,
    marginTop: SIZES.md,
  },
  servicesContainer: {
    flexDirection: "row",
    paddingVertical: SIZES.xs,
  },
  serviceItem: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.xs,
  },
  selectedServiceItem: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  serviceText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectedServiceText: {
    color: COLORS.white,
    fontWeight: "500",
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
    color: COLORS.white,
    fontWeight: "500",
  },
  summarySection: {
    padding: SIZES.md,
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.md,
    borderRadius: SIZES.md,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.xs,
  },
  summaryLabel: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  summaryValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.md,
  },
  totalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bookButton: {
    width: "100%",
  },
})

