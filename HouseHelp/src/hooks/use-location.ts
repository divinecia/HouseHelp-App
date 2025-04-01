"use client"

import { useState } from "react"
import * as Location from "expo-location"

type LocationType = {
  latitude: number
  longitude: number
}

export const useLocation = () => {
  const [currentLocation, setCurrentLocation] = useState<LocationType | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const getLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied")
        return false
      }

      const location = await Location.getCurrentPositionAsync({})
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })

      return true
    } catch (error) {
      setErrorMsg("Error getting location")
      console.error("Error getting location:", error)
      return false
    }
  }

  const getAddressFromCoordinates = async (latitude: number, longitude: number) => {
    try {
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      })

      if (addressResponse && addressResponse.length > 0) {
        const address = addressResponse[0]
        return {
          street: address.street,
          city: address.city,
          region: address.region,
          country: address.country,
          postalCode: address.postalCode,
          formattedAddress: [address.street, address.city, address.region, address.country].filter(Boolean).join(", "),
        }
      }

      return null
    } catch (error) {
      console.error("Error getting address:", error)
      return null
    }
  }

  return {
    currentLocation,
    errorMsg,
    getLocationPermission,
    getAddressFromCoordinates,
  }
}

