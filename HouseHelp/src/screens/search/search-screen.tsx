"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from "react-native"
import { Feather } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { SearchFiltersComponent } from "../../components/search/search-filters"
import { WorkerCard } from "../../components/search/worker-card"
import { searchWorkers } from "../../services/worker-service"
import type { SearchFilters, WorkerProfile } from "../../types/worker"
import { COLORS, SIZES } from "../../config/theme"
import { useLocation } from "../../hooks/use-location"

export const SearchScreen = () => {
  const navigation = useNavigation()
  const { currentLocation, getLocationPermission } = useLocation()

  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<SearchFilters>({
    services: [],
  })
  const [workers, setWorkers] = useState<WorkerProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [totalWorkers, setTotalWorkers] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    getLocationPermission()
    fetchWorkers()
  }, [])

  useEffect(() => {
    // Reset and fetch when filters change
    setPage(1)
    setWorkers([])
    setHasMore(true)
    fetchWorkers(true)
  }, [filters])

  const fetchWorkers = async (reset = false) => {
    if (loading || (!hasMore && !reset)) return

    const currentPage = reset ? 1 : page

    setLoading(true)
    try {
      // Add location to filters if available
      const searchFilters = { ...filters }
      if (currentLocation) {
        searchFilters.location = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          radius: 20, // Default radius in km
        }
      }

      const { workers: newWorkers, total } = await searchWorkers(searchFilters, currentPage)

      if (reset) {
        setWorkers(newWorkers)
      } else {
        setWorkers((prev) => [...prev, ...newWorkers])
      }

      setTotalWorkers(total)
      setHasMore(currentPage * 10 < total)
      setPage(reset ? 2 : currentPage + 1)
    } catch (error) {
      console.error("Error fetching workers:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchWorkers(true)
  }

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchWorkers()
    }
  }

  const handleWorkerPress = (worker: WorkerProfile) => {
    navigation.navigate("WorkerDetail", { workerId: worker.id })
  }

  const calculateDistance = (workerLocation: any) => {
    if (!currentLocation || !workerLocation) return undefined

    // Haversine formula to calculate distance between two points
    const toRad = (value: number) => (value * Math.PI) / 180
    const R = 6371 // Earth radius in km

    const dLat = toRad(workerLocation.latitude - currentLocation.latitude)
    const dLon = toRad(workerLocation.longitude - currentLocation.longitude)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(currentLocation.latitude)) *
        Math.cos(toRad(workerLocation.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    return distance
  }

  const renderFooter = () => {
    if (!loading) return null

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    )
  }

  const renderEmptyState = () => {
    if (loading && page === 1) return null

    return (
      <View style={styles.emptyContainer}>
        <Feather name="search" size={64} color={COLORS.grayDark} />
        <Text style={styles.emptyTitle}>No workers found</Text>
        <Text style={styles.emptyText}>Try adjusting your filters or search criteria</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for workers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => fetchWorkers(true)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("")
                fetchWorkers(true)
              }}
            >
              <Feather name="x" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <SearchFiltersComponent filters={filters} onFiltersChange={setFilters} />

      <FlatList
        data={workers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkerCard worker={item} onPress={handleWorkerPress} distance={calculateDistance(item.location)} />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.md,
    paddingHorizontal: SIZES.md,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    paddingHorizontal: SIZES.md,
    height: 50,
  },
  searchIcon: {
    marginRight: SIZES.xs,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  listContent: {
    padding: SIZES.md,
    paddingTop: 0,
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: SIZES.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SIZES.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: SIZES.md,
    marginBottom: SIZES.xs,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
  },
})

