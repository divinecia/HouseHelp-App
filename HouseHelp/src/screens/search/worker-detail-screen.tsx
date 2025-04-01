"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from "react-native"
import { useRoute, useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { getWorkerById } from "../../services/worker-service"
import type { WorkerProfile, ServiceType } from "../../types/worker"
import { RatingStars } from "../../components/UI/rating-stars"
import { Button } from "../../components/UI/button"
import { COLORS, SIZES } from "../../config/theme"

export const WorkerDetailScreen = () => {
  const route = useRoute()
  const navigation = useNavigation()
  const { workerId } = route.params as { workerId: string }

  const [worker, setWorker] = useState<WorkerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState("about")

  useEffect(() => {
    fetchWorkerDetails()
  }, [workerId])

  const fetchWorkerDetails = async () => {
    setLoading(true)
    try {
      const workerData = await getWorkerById(workerId)
      setWorker(workerData)
    } catch (error) {
      console.error("Error fetching worker details:", error)
      Alert.alert("Error", "Failed to load worker details")
    } finally {
      setLoading(false)
    }
  }

  const getServiceIcon = (service: ServiceType) => {
    switch (service) {
      case "cleaning":
        return "trash-2"
      case "cooking":
        return "coffee"
      case "childcare":
        return "users"
      case "eldercare":
        return "heart"
      case "gardening":
        return "scissors"
      case "driving":
        return "truck"
      case "security":
        return "shield"
      case "laundry":
        return "wind"
      case "petcare":
        return "github" // Using as a placeholder for pet
      case "tutoring":
        return "book"
      default:
        return "briefcase"
    }
  }

  const handleBookNow = () => {
    navigation.navigate("BookingForm", { workerId: workerId })
  }

  const handleContact = () => {
    Alert.alert("Contact", "This feature is coming soon!")
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!worker) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Worker not found</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} style={styles.errorButton} />
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

          <View style={styles.profileImageContainer}>
            <Image
              source={worker.profile_image ? { uri: worker.profile_image } : require("../../assets/default-avatar.png")}
              style={styles.profileImage}
            />
            {worker.verified && (
              <View style={styles.verifiedBadge}>
                <Feather name="check" size={16} color={COLORS.white} />
              </View>
            )}
          </View>

          <Text style={styles.name}>{worker.full_name}</Text>

          <View style={styles.ratingContainer}>
            <RatingStars rating={worker.rating} size={20} />
            <Text style={styles.ratingText}>({worker.total_ratings} reviews)</Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>${worker.hourly_rate}/hr</Text>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === "about" && styles.activeTab]}
            onPress={() => setSelectedTab("about")}
          >
            <Text style={[styles.tabText, selectedTab === "about" && styles.activeTabText]}>About</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === "services" && styles.activeTab]}
            onPress={() => setSelectedTab("services")}
          >
            <Text style={[styles.tabText, selectedTab === "services" && styles.activeTabText]}>Services</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === "availability" && styles.activeTab]}
            onPress={() => setSelectedTab("availability")}
          >
            <Text style={[styles.tabText, selectedTab === "availability" && styles.activeTabText]}>Availability</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          {selectedTab === "about" && (
            <View>
              <Text style={styles.sectionTitle}>Bio</Text>
              <Text style={styles.bioText}>{worker.bio}</Text>

              <Text style={styles.sectionTitle}>Experience</Text>
              <View style={styles.infoRow}>
                <Feather name="briefcase" size={18} color={COLORS.primary} />
                <Text style={styles.infoText}>{worker.experience_years} years of experience</Text>
              </View>

              <Text style={styles.sectionTitle}>Languages</Text>
              <View style={styles.languagesContainer}>
                {worker.languages.map((language, index) => (
                  <View key={index} style={styles.languageItem}>
                    <Feather name="globe" size={16} color={COLORS.primary} />
                    <Text style={styles.languageText}>{language}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={18} color={COLORS.primary} />
                <Text style={styles.infoText}>
                  {worker.location.address}, {worker.location.city}
                </Text>
              </View>
            </View>
          )}

          {selectedTab === "services" && (
            <View>
              <Text style={styles.sectionTitle}>Services Offered</Text>
              <View style={styles.servicesContainer}>
                {worker.services.map((service, index) => (
                  <View key={index} style={styles.serviceItem}>
                    <Feather name={getServiceIcon(service)} size={20} color={COLORS.primary} />
                    <View style={styles.serviceDetails}>
                      <Text style={styles.serviceName}>{service.charAt(0).toUpperCase() + service.slice(1)}</Text>
                      <Text style={styles.serviceDescription}>Professional {service} services</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {selectedTab === "availability" && (
            <View>
              <Text style={styles.sectionTitle}>Weekly Schedule</Text>
              <View style={styles.scheduleContainer}>
                {worker.availability.map((slot, index) => (
                  <View key={index} style={styles.scheduleItem}>
                    <Text style={styles.dayText}>{slot.day.charAt(0).toUpperCase() + slot.day.slice(1)}</Text>
                    <Text style={styles.timeText}>
                      {slot.startTime} - {slot.endTime}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Contact" onPress={handleContact} variant="outline" style={styles.contactButton} />
        <Button title="Book Now" onPress={handleBookNow} style={styles.bookButton} />
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.lg,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.text,
    marginVertical: SIZES.md,
  },
  errorButton: {
    width: 200,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.xl,
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    top: SIZES.xl,
    left: SIZES.md,
    zIndex: 10,
  },
  profileImageContainer: {
    position: "relative",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.white,
    marginTop: SIZES.md,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SIZES.xs,
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.white,
    marginLeft: SIZES.xs,
  },
  priceContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.md,
    marginTop: SIZES.md,
  },
  price: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SIZES.md,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  contentContainer: {
    padding: SIZES.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: SIZES.md,
    marginBottom: SIZES.xs,
  },
  bioText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SIZES.xs,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: SIZES.xs,
  },
  languagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.xs,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    marginRight: SIZES.xs,
    marginBottom: SIZES.xs,
  },
  languageText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: SIZES.xs,
  },
  servicesContainer: {
    marginTop: SIZES.xs,
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.md,
  },
  serviceDetails: {
    marginLeft: SIZES.md,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  scheduleContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginTop: SIZES.xs,
  },
  scheduleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dayText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  timeText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  footer: {
    flexDirection: "row",
    padding: SIZES.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  contactButton: {
    flex: 1,
    marginRight: SIZES.xs,
  },
  bookButton: {
    flex: 2,
    marginLeft: SIZES.xs,
  },
})

