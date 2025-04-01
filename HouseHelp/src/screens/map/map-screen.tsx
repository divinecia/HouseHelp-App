"use client"

import { useState, useEffect } from "react"
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Animated,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { MapComponent } from "../../components/map/map-view"
import { WorkerCard } from "../../components/search/worker-card"
import { FilterChip } from "../../components/UI/filter-chip"
import { supabase } from "../../config/supabase"
import type { WorkerProfile, ServiceType } from "../../types/worker"
import { COLORS, SIZES } from "../../config/theme"

const { width, height } = Dimensions.get("window")
const BOTTOM_SHEET_HEIGHT = height * 0.4
const SEARCH_RADIUS = 5000 // 5km in meters

export const MapScreen = () => {
  const navigation = useNavigation()
  const [loading, setLoading] = useState(true)
  const [workers, setWorkers] = useState<WorkerProfile[]>([])
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null)
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([])
  const [region, setRegion] = useState(null)
  const bottomSheetAnim = useState(new Animated.Value(0))[0]

  const serviceOptions: { value: ServiceType; label: string }[] = [
    { value: "cleaning", label: "Cleaning" },
    { value: "cooking", label: "Cooking" },
    { value: "childcare", label: "Childcare" },
    { value: "eldercare", label: "Eldercare" },
    { value: "gardening", label: "Gardening" },
    { value: "driving", label: "Driving" },
    { value: "security", label: "Security" },
    { value: "laundry", label: "Laundry" },
  ]

  useEffect(() => {
    if (region) {
      fetchNearbyWorkers()
    }
  }, [region, selectedServices])

  useEffect(() => {
    if (selectedWorker) {
      showWorkerDetails()
    } else {
      hideWorkerDetails()
    }
  }, [selectedWorker])

  const fetchNearbyWorkers = async () => {
    if (!region) return

    setLoading(true)
    try {
      let query = supabase.rpc("find_workers_within_radius", {
        lat: region.latitude,
        lng: region.longitude,
        radius_meters: SEARCH_RADIUS,
      })

      // Apply service filters if any are selected
      if (selectedServices.length > 0) {
        query = query.contains("services", selectedServices)
      }

      const { data, error } = await query

      if (error) throw error

      setWorkers(data || [])
    } catch (error) {
      console.error("Error fetching nearby workers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegionChange = (newRegion) => {
    setRegion(newRegion)
  }

  const handleWorkerSelect = (worker: WorkerProfile) => {
    setSelectedWorker(worker)
  }

  const handleWorkerCardPress = (worker: WorkerProfile) => {
    navigation.navigate("WorkerDetail", { workerId: worker.id })
  }

  const toggleService = (service: ServiceType) => {
    setSelectedServices((prev) => {
      if (prev.includes(service)) {
        return prev.filter((s) => s !== service)
      } else {
        return [...prev, service]
      }
    })
  }

  const showWorkerDetails = () => {
    Animated.spring(bottomSheetAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start()
  }

  const hideWorkerDetails = () => {
    Animated.spring(bottomSheetAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start()
  }

  const translateY = bottomSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BOTTOM_SHEET_HEIGHT, 0],
  })

  return (
    <View style={styles.container}>
      <MapComponent
        workers={workers}
        onWorkerSelect={handleWorkerSelect}
        onRegionChange={handleRegionChange}
        searchRadius={SEARCH_RADIUS}
      />

      {/* Service filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={serviceOptions}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <FilterChip
              label={item.label}
              selected={selectedServices.includes(item.value)}
              onPress={() => toggleService(item.value)}
              style={styles.filterChip}
            />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Finding workers...</Text>
        </View>
      )}

      {/* Worker details bottom sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        {selectedWorker && (
          <>
            <View style={styles.bottomSheetHeader}>
              <View style={styles.bottomSheetHandle} />
              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedWorker(null)}>
                <Feather name="x" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <WorkerCard
              worker={selectedWorker}
              onPress={handleWorkerCardPress}
              distance={selectedWorker.distance_meters ? selectedWorker.distance_meters / 1000 : undefined}
            />
          </>
        )}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  filtersContainer: {
    position: "absolute",
    top: SIZES.xl,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  filtersList: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
  },
  filterChip: {
    marginRight: SIZES.xs,
  },
  loadingContainer: {
    position: "absolute",
    top: SIZES.xl * 2 + 40, // Below filters
    alignSelf: "center",
    backgroundColor: COLORS.pureWhite,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.md,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingText: {
    marginLeft: SIZES.xs,
    color: COLORS.text,
    fontSize: 14,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: BOTTOM_SHEET_HEIGHT,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.lg,
    borderTopRightRadius: SIZES.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    padding: SIZES.md,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: SIZES.md,
    position: "relative",
  },
  bottomSheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: COLORS.grayDark,
    borderRadius: 3,
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: -SIZES.xs,
  },
})

