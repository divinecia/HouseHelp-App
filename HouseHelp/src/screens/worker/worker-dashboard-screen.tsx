"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import { supabase } from "../../config/supabase"
import { useAuth } from "../../contexts/auth-context"
import { analyticsService, type PerformanceMetric } from "../../services/analytics-service"
import { MetricCard } from "../../components/analytics/metric-card"

export const WorkerDashboardScreen = () => {
  const navigation = useNavigation()
  const { user } = useAuth()

  const [profile, setProfile] = useState<any>(null)
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([])
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
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
      await Promise.all([fetchProfile(), fetchUpcomingBookings(), fetchPerformanceMetrics()])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase.from("worker_profiles").select("*").eq("user_id", user.id).single()

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
          household:user_id (id, full_name, profile_image)
        `)
        .eq("worker_id", user.id)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(5)

      if (error) throw error

      setUpcomingBookings(data || [])
    } catch (error) {
      console.error("Error fetching upcoming bookings:", error)
    }
  }

  const fetchPerformanceMetrics = async () => {
    try {
      const data = await analyticsService.getWorkerPerformanceMetrics(user.id)
      setMetrics(data)
    } catch (error) {
      console.error("Error fetching performance metrics:", error)
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Profile Summary */}
      {profile && (
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Image
              source={
                profile.profile_image ? { uri: profile.profile_image } : require("../../assets/default-avatar.png")
              }
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.full_name}</Text>
              <View style={styles.ratingContainer}>
                <Feather name="star" size={16} color="#FFC107" />
                <Text style={styles.ratingText}>
                  {profile.rating.toFixed(1)} ({profile.total_ratings})
                </Text>
              </View>
              <Text style={styles.hourlyRate}>${profile.hourly_rate}/hr</Text>
            </View>
          </View>

          <View style={styles.profileStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.experience_years}</Text>
              <Text style={styles.statLabel}>Years Exp.</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.services.length}</Text>
              <Text style={styles.statLabel}>Services</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.verified ? "Yes" : "No"}</Text>
              <Text style={styles.statLabel}>Verified</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate("EditProfile")}>
            <Feather name="edit" size={16} color={COLORS.primary} />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Performance Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Overview</Text>
        <View style={styles.metricsContainer}>
          {metrics.map((metric, index) => (
            <View key={index} style={styles.metricCardWrapper}>
              <MetricCard metric={metric} />
            </View>
          ))}
        </View>
      </View>

      {/* Upcoming Bookings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
          <TouchableOpacity onPress={() => navigation.navigate("WorkerBookings")}>
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
                <View style={styles.bookingClient}>
                  <Image
                    source={
                      booking.household?.profile_image
                        ? { uri: booking.household.profile_image }
                        : require("../../assets/default-avatar.png")
                    }
                    style={styles.clientImage}
                  />
                  <Text style={styles.clientName}>{booking.household?.full_name || "Client"}</Text>
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
                <View style={styles.bookingDetail}>
                  <Feather name="map-pin" size={16} color={COLORS.textLight} />
                  <Text style={styles.bookingDetailText} numberOfLines={1}>
                    {booking.location?.address || "Address not provided"}
                  </Text>
                </View>
              </View>

              <View style={styles.bookingFooter}>
                <Text style={styles.bookingPrice}>${booking.total_amount.toFixed(2)}</Text>
                <Feather name="chevron-right" size={20} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={48} color={COLORS.grayDark} />
            <Text style={styles.emptyStateText}>No upcoming bookings found</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("WorkerAvailability")}>
            <View style={[styles.actionIcon, { backgroundColor: "#E3F2FD" }]}>
              <Feather name="calendar" size={24} color="#2196F3" />
            </View>
            <Text style={styles.actionText}>Update Availability</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("WorkerServices")}>
            <View style={[styles.actionIcon, { backgroundColor: "#E8F5E9" }]}>
              <Feather name="briefcase" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.actionText}>Manage Services</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("WorkerEarnings")}>
            <View style={[styles.actionIcon, { backgroundColor: "#FFF3E0" }]}>
              <Feather name="dollar-sign" size={24} color="#FF9800" />
            </View>
            <Text style={styles.actionText}>View Earnings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("WorkerReviews")}>
            <View style={[styles.actionIcon, { backgroundColor: "#FCE4EC" }]}>
              <Feather name="star" size={24} color="#E91E63" />
            </View>
            <Text style={styles.actionText}>My Reviews</Text>
          </TouchableOpacity>
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
    padding: SIZES.md,
  },
  profileCard: {
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
  profileHeader: {
    flexDirection: "row",
    marginBottom: SIZES.md,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: SIZES.md,
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 4,
  },
  hourlyRate: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },
  profileStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SIZES.md,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  editProfileText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
    marginLeft: 4,
  },
  section: {
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
  metricsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  metricCardWrapper: {
    width: "48%",
    marginBottom: SIZES.sm,
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
  bookingClient: {
    flexDirection: "row",
    alignItems: "center",
  },
  clientImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: SIZES.xs,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
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
    marginBottom: SIZES.sm,
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
  bookingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.sm,
  },
  bookingPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: SIZES.xl,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: SIZES.sm,
  },
  actionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: "48%",
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SIZES.xs,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
    textAlign: "center",
  },
})

