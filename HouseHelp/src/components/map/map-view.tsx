"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from "react-native"
import MapView, { Marker, Circle, PROVIDER_GOOGLE, type Region } from "react-native-maps"
import * as Location from "expo-location"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { WorkerProfile } from "../../types/worker"

interface MapComponentProps {
  initialRegion?: Region
  workers?: WorkerProfile[]
  showCurrentLocation?: boolean
  onWorkerSelect?: (worker: WorkerProfile) => void
  onRegionChange?: (region: Region) => void
  searchRadius?: number // in meters
}

export const MapComponent: React.FC<MapComponentProps> = ({
  initialRegion,
  workers = [],
  showCurrentLocation = true,
  onWorkerSelect,
  onRegionChange,
  searchRadius = 5000, // 5km default
}) => {
  const mapRef = useRef<MapView>(null)
  const [region, setRegion] = useState<Region | undefined>(initialRegion)
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getLocationPermission()
  }, [])

  const getLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== "granted") {
        setError("Permission to access location was denied")
        setLoading(false)
        return
      }

      getCurrentLocation()
    } catch (error) {
      setError("Error getting location permission")
      setLoading(false)
      console.error("Error getting location permission:", error)
    }
  }

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      setCurrentLocation(location)

      if (!region) {
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }

        setRegion(newRegion)

        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion)
        }
      }

      setLoading(false)
    } catch (error) {
      setError("Error getting current location")
      setLoading(false)
      console.error("Error getting current location:", error)
    }
  }

  const handleRegionChange = (newRegion: Region) => {
    setRegion(newRegion)
    if (onRegionChange) {
      onRegionChange(newRegion)
    }
  }

  const centerOnCurrentLocation = () => {
    if (currentLocation && mapRef.current) {
      const newRegion = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }

      mapRef.current.animateToRegion(newRegion)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation={showCurrentLocation}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        showsBuildings={true}
        showsTraffic={false}
        showsIndoors={false}
      >
        {/* Search radius circle */}
        {region && searchRadius > 0 && (
          <Circle
            center={{
              latitude: region.latitude,
              longitude: region.longitude,
            }}
            radius={searchRadius}
            strokeWidth={1}
            strokeColor={COLORS.primary}
            fillColor={`${COLORS.primary}20`} // 20% opacity
          />
        )}

        {/* Worker markers */}
        {workers.map((worker) => (
          <Marker
            key={worker.id}
            coordinate={{
              latitude: worker.location.latitude,
              longitude: worker.location.longitude,
            }}
            title={worker.full_name}
            description={`${worker.services.join(", ")} - $${worker.hourly_rate}/hr`}
            onPress={() => onWorkerSelect && onWorkerSelect(worker)}
          >
            <View style={styles.markerContainer}>
              <View style={styles.marker}>
                <Feather name="user" size={16} color={COLORS.pureWhite} />
              </View>
              {worker.verified && (
                <View style={styles.verifiedBadge}>
                  <Feather name="check" size={8} color={COLORS.pureWhite} />
                </View>
              )}
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Current location button */}
      <TouchableOpacity style={styles.currentLocationButton} onPress={centerOnCurrentLocation}>
        <Feather name="navigation" size={24} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: SIZES.md,
    color: COLORS.text,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: SIZES.lg,
  },
  errorText: {
    marginTop: SIZES.md,
    color: COLORS.error,
    fontSize: 16,
    textAlign: "center",
  },
  currentLocationButton: {
    position: "absolute",
    bottom: SIZES.xl,
    right: SIZES.md,
    backgroundColor: COLORS.pureWhite,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerContainer: {
    position: "relative",
  },
  marker: {
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.pureWhite,
  },
  verifiedBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: COLORS.success,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.pureWhite,
  },
})

