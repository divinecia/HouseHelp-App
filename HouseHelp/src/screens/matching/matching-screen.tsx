"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { matchingService, type MatchResult } from "../../services/matching-service"
import { WorkerCard } from "../../components/search/worker-card"
import { Button } from "../../components/UI/button"
import { COLORS, SIZES } from "../../config/theme"
import { useAuth } from "../../contexts/auth-context"
import * as Location from "expo-location"

export const MatchingScreen = () => {
  const navigation = useNavigation()
  const { user } = useAuth()

  const [matches, setMatches] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null)
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false)

  useEffect(() => {
    getLocationPermission()
  }, [])

  const getLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== "granted") {
        setLocationPermissionDenied(true)
        setLoading(false)
        return
      }

      const location = await Location.getCurrentPositionAsync({})
      setCurrentLocation(location)
      findMatches(location)
    } catch (error) {
      console.error("Error getting location:", error)
      setLoading(false)
      Alert.alert("Error", "Failed to get your location. Please try again.")
    }
  }

  const findMatches = async (location: Location.LocationObject) => {
    if (!user) return

    setLoading(true)
    try {
      // Get recommended matches based on user preferences
      const recommendedMatches = await matchingService.getRecommendedMatches(user.id)

      if (recommendedMatches.length > 0) {
        setMatches(recommendedMatches)
      } else {
        // If no recommendations, find matches based on location
        const criteria = {
          services: ["cleaning", "cooking"], // Default services
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            radius: 20, // 20km radius
          },
          minRating: 4.0,
        }

        const locationMatches = await matchingService.findMatches(criteria)
        setMatches(locationMatches)
      }
    } catch (error) {
      console.error("Error finding matches:", error)
      Alert.alert("Error", "Failed to find matches. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleWorkerPress = (worker: any) => {
    navigation.navigate("WorkerDetail", { workerId: worker.id })
  }

  const handleAdvancedSearch = () => {
    navigation.navigate("SearchScreen")
  }

  const renderMatchItem = ({ item, index }: { item: MatchResult; index: number }) => {
    return (
      <View style={styles.matchItem}>
        {index < 3 && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>
              {index === 0 ? "Best Match" : index === 1 ? "Great Match" : "Good Match"}
            </Text>
          </View>
        )}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Match</Text>
          <Text style={styles.scoreValue}>{Math.round(item.compatibilityScore)}%</Text>
        </View>
        <WorkerCard worker={item.worker} onPress={() => handleWorkerPress(item.worker)} distance={item.distance} />
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding your perfect matches...</Text>
      </View>
    )
  }

  if (locationPermissionDenied) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="map-pin" size={64} color={COLORS.error} />
        <Text style={styles.errorTitle}>Location Access Required</Text>
        <Text style={styles.errorText}>We need access to your location to find the best matches near you.</Text>
        <Button title="Grant Permission" onPress={getLocationPermission} style={styles.permissionButton} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Matches</Text>
        <Text style={styles.subtitle}>
          We've found {matches.length} {matches.length === 1 ? "worker" : "workers"} that match your needs
        </Text>
      </View>

      {matches.length > 0 ? (
        <ScrollView contentContainerStyle={styles.matchesList}>
          {matches.map((match, index) => renderMatchItem({ item: match, index }))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Feather name="users" size={64} color={COLORS.grayDark} />
          <Text style={styles.emptyTitle}>No Matches Found</Text>
          <Text style={styles.emptyText}>
            We couldn't find any workers matching your criteria. Try adjusting your search preferences.
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Button title="Advanced Search" onPress={handleAdvancedSearch} variant="outline" />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    padding: SIZES.md,
    backgroundColor: COLORS.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.pureWhite,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.pureWhite,
    opacity: 0.9,
  },
  matchesList: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  matchItem: {
    position: "relative",
    marginBottom: SIZES.lg,
  },
  matchBadge: {
    position: "absolute",
    top: -10,
    right: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs / 2,
    borderRadius: SIZES.xs,
    zIndex: 1,
  },
  matchBadgeText: {
    color: COLORS.pureWhite,
    fontSize: 12,
    fontWeight: "600",
  },
  scoreContainer: {
    position: "absolute",
    top: 20,
    right: -10,
    backgroundColor: COLORS.pureWhite,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
    zIndex: 1,
  },
  scoreLabel: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.xl,
    backgroundColor: COLORS.white,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: SIZES.lg,
  },
  permissionButton: {
    width: "80%",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
  },
  footer: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.pureWhite,
  },
})

