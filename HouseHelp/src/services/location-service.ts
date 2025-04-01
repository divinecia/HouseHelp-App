import * as Location from "expo-location"
import { supabase } from "../config/supabase"
import { LOCATION_TRACKING_INTERVAL } from "../config/constants"

type LocationType = {
  latitude: number
  longitude: number
  accuracy?: number
}

class LocationService {
  private workerId: string | null = null
  private trackingInterval: NodeJS.Timeout | null = null
  private lastReportedLocation: LocationType | null = null

  async initialize(workerId: string): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== "granted") {
        console.error("Location permission denied")
        return false
      }

      this.workerId = workerId
      return true
    } catch (error) {
      console.error("Error initializing location service:", error)
      return false
    }
  }

  async startTracking(): Promise<boolean> {
    if (!this.workerId) {
      console.error("Worker ID not set")
      return false
    }

    try {
      // Request background location permissions if needed
      const { status } = await Location.requestBackgroundPermissionsAsync()

      if (status !== "granted") {
        console.warn("Background location permission denied")
        // Fall back to foreground tracking only
      }

      // Start location tracking
      this.trackingInterval = setInterval(this.reportLocation.bind(this), LOCATION_TRACKING_INTERVAL)

      return true
    } catch (error) {
      console.error("Error starting location tracking:", error)
      return false
    }
  }

  stopTracking(): void {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval)
      this.trackingInterval = null
    }
  }

  private async reportLocation(): Promise<void> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      const { latitude, longitude, accuracy } = location.coords

      // Only report if location has changed significantly
      if (
        !this.lastReportedLocation ||
        this.isSignificantChange({ latitude, longitude, accuracy }, this.lastReportedLocation)
      ) {
        await this.updateLocationInDatabase(latitude, longitude)
        this.lastReportedLocation = { latitude, longitude, accuracy }
      }
    } catch (error) {
      console.error("Error reporting location:", error)
    }
  }

  private isSignificantChange(newLocation: LocationType, oldLocation: LocationType): boolean {
    // Calculate distance between points using Haversine formula
    const distance = this.calculateDistance(
      newLocation.latitude,
      newLocation.longitude,
      oldLocation.latitude,
      oldLocation.longitude,
    )

    // Consider it significant if moved more than 10 meters
    return distance > 10
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3 // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  private async updateLocationInDatabase(latitude: number, longitude: number): Promise<void> {
    try {
      const { error } = await supabase.rpc("update_worker_location", {
        worker_id_param: this.workerId,
        lat: latitude,
        lng: longitude,
      })

      if (error) throw error
    } catch (error) {
      console.error("Error updating location in database:", error)
    }
  }

  async checkGeofence(latitude: number, longitude: number): Promise<{ inZone: boolean; zoneName?: string }> {
    try {
      const { data, error } = await supabase.rpc("is_within_geofence", {
        lat: latitude,
        lng: longitude,
      })

      if (error) throw error

      if (data && data.length > 0) {
        return { inZone: true, zoneName: data[0].zone_name }
      }

      return { inZone: false }
    } catch (error) {
      console.error("Error checking geofence:", error)
      return { inZone: false }
    }
  }
}

export const locationService = new LocationService()

