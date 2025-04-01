"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import * as Location from "expo-location"
import { COLORS, SIZES } from "../../config/theme"
import { Button } from "../../components/UI/button"
import { supabase } from "../../config/supabase"
import { useAuth } from "../../contexts/auth-context"
import { WorkerCard } from "../../components/search/worker-card"
import type { ServiceType } from "../../types/worker"

export const EmergencyBookingScreen = () => {
  const navigation = useNavigation()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [searchingWorkers, setSearchingWorkers] = useState(false)
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null)
  const [emergencyDescription, setEmergencyDescription] = useState("")
  const [availableWorkers, setAvailableWorkers] = useState<any[]>([])

  useEffect(() => {
    getLocationPermission()
  }, [])

  const getLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== "granted") {
        Alert.alert("Location Required", "We need your location to find nearby help for your emergency.")
        setLoading(false)
        return
      }

      const location = await Location.getCurrentPositionAsync({})
      setLocation(location)
      setLoading(false)
    } catch (error) {
      console.error("Error getting location:", error)
      setLoading(false)
      Alert.alert("Error", "Failed to get your location. Please try again.")
    }
  }

  const serviceOptions: ServiceType[] = [
    "cleaning",
    "cooking",
    "childcare",
    "eldercare",
    "gardening",
    "driving",
    "security",
    "laundry",
    "petcare",
    "tutoring",
  ]

  const handleSelectService = (service: ServiceType) => {
    setSelectedService(service)
  }

  const findEmergencyWorkers = async () => {
    if (!location || !selectedService) {
      Alert.alert("Error", "Please select a service type")
      return
    }

    setSearchingWorkers(true)
    try {
      // Find workers who are available now, nearby, and accept emergency bookings
      const { data, error } = await supabase.rpc("find_emergency_workers", {
        service_type: selectedService,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        max_distance_km: 10, // Smaller radius for faster response
        limit_count: 5,
      })

      if (error) throw error

      setAvailableWorkers(data || [])

      if (data.length === 0) {
        Alert.alert(
          "No Workers Available",
          "We couldn't find any workers available for emergency service right now. Please try a different service or try again later.",
        )
      }
    } catch (error) {
      console.error("Error finding emergency workers:", error)
      Alert.alert("Error", "Failed to find available workers. Please try again.")
    } finally {
      setSearchingWorkers(false)
    }
  }

  const handleBookWorker = async (workerId: string) => {
    if (!location || !selectedService) return

    try {
      // Calculate emergency booking details
      const startTime = new Date()
      const endTime = new Date(startTime)
      endTime.setHours(endTime.getHours() + 2) // Default 2 hour booking for emergencies

      // Get worker's hourly rate
      const { data: worker, error: workerError } = await supabase
        .from("worker_profiles")
        .select("hourly_rate")
        .eq("id", workerId)
        .single()

      if (workerError) throw workerError

      // Emergency bookings have a premium rate (1.5x)
      const emergencyRate = worker.hourly_rate * 1.5
      const totalAmount = emergencyRate * 2 // 2 hours

      // Create emergency booking
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          worker_id: workerId,
          services: [selectedService],
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: "pending",
          total_amount: totalAmount,
          is_emergency: true,
          emergency_description: emergencyDescription,
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        })
        .select("id")
        .single()

      if (error) throw error

      // Send emergency notification to worker
      await supabase.from("notifications").insert({
        user_id: workerId,
        type: "emergency_booking",
        title: "Emergency Booking Request",
        body: `You have an emergency ${selectedService} request. Please respond ASAP.`,
        data: { booking_id: data.id },
        is_read: false,
        priority: "high",
      })

      Alert.alert(
        "Emergency Request Sent",
        "Your emergency request has been sent. The worker will be notified immediately.",
        [
          {
            text: "View Booking",
            onPress: () => navigation.navigate("BookingDetails", { bookingId: data.id }),
          },
        ],
      )
    } catch (error) {
      console.error("Error creating emergency booking:", error)
      Alert.alert("Error", "Failed to create emergency booking. Please try again.")
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Booking</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.emergencyBanner}>
          <Feather name="alert-circle" size={24} color={COLORS.pureWhite} />
          <Text style={styles.emergencyText}>Emergency bookings are prioritized and may have higher rates</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>What do you need help with?</Text>
          <View style={styles.servicesContainer}>
            {serviceOptions.map((service) => (
              <TouchableOpacity
                key={service}
                style={[styles.serviceItem, selectedService === service && styles.selectedServiceItem]}
                onPress={() => handleSelectService(service)}
              >
                <Text style={[styles.serviceText, selectedService === service && styles.selectedServiceText]}>
                  {service.charAt(0).toUpperCase() + service.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title={searchingWorkers ? "Searching..." : "Find Emergency Help"}
            onPress={findEmergencyWorkers}
            loading={searchingWorkers}
            disabled={!selectedService || searchingWorkers}
            style={styles.findButton}
          />
        </View>

        {availableWorkers.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Available Workers</Text>
            <Text style={styles.resultsSubtitle}>These workers can help you immediately</Text>

            {availableWorkers.map((worker) => (
              <View key={worker.id} style={styles.workerContainer}>
                <WorkerCard worker={worker} onPress={() => {}} />
                <Button title="Book Now" onPress={() => handleBookWorker(worker.id)} style={styles.bookButton} />
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoCard}>
          <Feather name="info" size={20} color={COLORS.primary} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            Emergency bookings connect you with available workers as quickly as possible. For true emergencies requiring
            medical or police assistance, please call emergency services directly.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: SIZES.md,
    fontSize: 16,
    color: COLORS.text,
  },
  header: {
    backgroundColor: COLORS.error,
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
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  emergencyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.error,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.md,
  },
  emergencyText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: "500",
    marginLeft: SIZES.xs,
    flex: 1,
  },
  formSection: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  servicesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: SIZES.md,
  },
  serviceItem: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    margin: SIZES.xs,
  },
  selectedServiceItem: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  serviceText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectedServiceText: {
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  findButton: {
    backgroundColor: COLORS.error,
  },
  resultsSection: {
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
  resultsSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
  },
  workerContainer: {
    marginBottom: SIZES.md,
  },
  bookButton: {
    marginTop: SIZES.xs,
    backgroundColor: COLORS.error,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: SIZES.md,
    padding: SIZES.md,
  },
  infoIcon: {
    marginRight: SIZES.xs,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    lineHeight: 20,
  },
})

