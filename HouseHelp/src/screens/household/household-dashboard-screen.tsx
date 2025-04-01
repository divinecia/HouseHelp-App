"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import { supabase } from "../../config/supabase"
import { useAuth } from "../../contexts/auth-context"
import { matchingService } from "../../services/matching-service"
import { WorkerCard } from "../../components/search/worker-card"

export const HouseholdDashboardScreen = () => {
  const navigation = useNavigation()
  const { user } = useAuth()

  const [profile, setProfile] = useState<any>(null)
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([])
  const [recommendedWorkers, setRecommendedWorkers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchProfile(), fetchUpcomingBookings(), fetchRecommendedWorkers()])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (error) throw error

      setProfile(data)
    } catch (error) {
      console.error("Error fetching profile:", error)
    }
  }

  const fetchUpcomingBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          worker:worker_id (id, full_name, profile_image, rating, services)
        `)
        .eq("user_id", user.id)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(3)

      if (error) throw error

      setUpcomingBookings(data || [])
    } catch (error) {
      console.error("Error fetching upcoming bookings:", error)
    }
  }

  const fetchRecommendedWorkers = async () => {
    try {
      const recommendations = await matchingService.getRecommendedMatches(user.id, 3)
      setRecommendedWorkers(recommendations)
    } catch (error) {
      console.error("Error fetching recommended workers:", error)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDashboardData()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleWorkerPress = (worker: any) => {
    navigation.navigate("WorkerDetail", { workerId: worker.id })
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeText}>
            Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </Text>
          <Text style={styles.welcomeSubtext}>Find trusted help for your home</Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate("Profile")}>
          <Image
            source={
              profile?.profile_image ? { uri: profile.profile_image } : require("../../assets/default-avatar.png")
            }
            style={styles.profileImage}
          />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation.navigate("SearchScreen")}>
          <View style={[styles.quickActionIcon, { backgroundColor: "#E3F2FD" }]}>
            <Feather name="search" size={24} color="#2196F3" />
          </View>
          <Text style={styles.quickActionText}>Find Help</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation.navigate("Bookings")}>
          <View style={[styles.quickActionIcon, { backgroundColor: "#E8F5E9" }]}>
            <Feather name="calendar" size={24} color="#4CAF50" />
          </View>
          <Text style={styles.quickActionText}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation.navigate("Messaging")}>
          <View style={[styles.quickActionIcon, { backgroundColor: "#FFF3E0" }]}>
            <Feather name="message-circle" size={24} color="#FF9800" />
          </View>
          <Text style={styles.quickActionText}>Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation.navigate("EmergencyBooking")}>
          <View style={[styles.quickActionIcon, { backgroundColor: "#FCE4EC" }]}>
            <Feather name="alert-circle" size={24} color="#E91E63" />
          </View>
          <Text style={styles.quickActionText}>Emergency</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Bookings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Bookings")}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {upcomingBookings.length > 0 ? (
          upcomingBookings.map((booking) => (
            <TouchableOpacity
              key={booking.id}
              style={styles.bookingCard}
              onPress={() => navigation.navigate("BookingDetails", { bookingId: booking.id })}
            >
              <View style={styles.bookingHeader}>
                <View style={styles.bookingWorker}>
                  <Image
                    source={
                      booking.worker?.profile_image
                        ? { uri: booking.worker.profile_image }
                        : require("../../assets/default-avatar.png")
                    }
                    style={styles.workerImage}
                  />
                  <View>
                    <Text style={styles.workerName}>{booking.worker?.full_name || "Worker"}</Text>
                    <Text style={styles.serviceType}>
                      {booking.services[0]?.charAt(0).toUpperCase() + booking.services[0]?.slice(1) || "Service"}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        booking.status === "confirmed"
                          ? COLORS.success
                          : booking.status === "pending"
                            ? COLORS.warning
                            : COLORS.primary,
                    },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.bookingDetails}>
                <View style={styles.bookingDetail}>
                  <Feather name="calendar" size={16} color={COLORS.textLight} />
                  <Text style={styles.bookingDetailText}>{formatDate(booking.start_time)}</Text>
                </View>
                <View style={styles.bookingDetail}>
                  <Feather name="clock" size={16} color={COLORS.textLight} />
                  <Text style={styles.bookingDetailText}>
                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={48} color={COLORS.grayDark} />
            <Text style={styles.emptyStateText}>No upcoming bookings</Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={() => navigation.navigate("SearchScreen")}>
              <Text style={styles.emptyStateButtonText}>Find Help Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Recommended Workers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended for You</Text>
          <TouchableOpacity onPress={() => navigation.navigate("MatchingScreen")}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {recommendedWorkers.length > 0 ? (
          recommendedWorkers.map((match) => (
            <View key={match.worker.id} style={styles.recommendedWorkerCard}>
              <View style={styles.matchScoreBadge}>
                <Text style={styles.matchScoreText}>{Math.round(match.compatibilityScore)}% Match</Text>
              </View>
              <WorkerCard
                worker={match.worker}
                onPress={() => handleWorkerPress(match.worker)}
                distance={match.distance}
              />
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Feather name="users" size={48} color={COLORS.grayDark} />
            <Text style={styles.emptyStateText}>No recommendations yet</Text>
          </View>
        )}
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
        </View>

        <View style={styles.activityCard}>
          <View style={styles.activityIconContainer}>
            <Feather name="star" size={20} color={COLORS.pureWhite} />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>
              Rate your recent booking with <Text style={styles.activityHighlight}>Maria L.</Text>
            </Text>
            <Text style={styles.activityTime}>2 days ago</Text>
          </View>
          <Feather name="chevron-right" size={20} color={COLORS.primary} />
        </View>

        <View style={styles.activityCard}>
          <View style={[styles.activityIconContainer, { backgroundColor: COLORS.success }]}>
            <Feather name="check" size={20} color={COLORS.pureWhite} />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>
              Booking completed with <Text style={styles.activityHighlight}>John D.</Text>
            </Text>
            <Text style={styles.activityTime}>5 days ago</Text>
          </View>
          <Feather name="chevron-right" size={20} color={COLORS.primary} />
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  contentContainer: {
    paddingBottom: SIZES.xxl,
  },
  welcomeSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.lg,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.pureWhite,
    marginBottom: SIZES.xs,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: COLORS.pureWhite,
    opacity: 0.9,
  },
  profileButton: {
    marginLeft: SIZES.md,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.pureWhite,
  },
  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: SIZES.md,
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    margin: SIZES.md,
    marginTop: -SIZES.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionButton: {
    alignItems: "center",
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SIZES.xs,
  },
  quickActionText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "500",
  },
  section: {
    marginHorizontal: SIZES.md,
    marginBottom: SIZES.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  bookingCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.sm,
  },
  bookingWorker: {
    flexDirection: "row",
    alignItems: "center",
  },
  workerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SIZES.sm,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  serviceType: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  statusBadge: {
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: SIZES.xs,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  bookingDetails: {
    marginTop: SIZES.xs,
  },
  bookingDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  bookingDetailText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: SIZES.xs,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: SIZES.lg,
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.sm,
  },
  emptyStateButtonText: {
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  recommendedWorkerCard: {
    position: "relative",
    marginBottom: SIZES.sm,
  },
  matchScoreBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: SIZES.xs,
    zIndex: 1,
  },
  matchScoreText: {
    fontSize: 12,
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.sm,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 2,
  },
  activityHighlight: {
    fontWeight: "500",
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
})

