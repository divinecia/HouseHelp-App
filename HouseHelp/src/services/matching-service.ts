import { supabase } from "../config/supabase"
import type { SearchFilters, WorkerProfile } from "../types/worker"
import { getDistance } from "geolib"

export type MatchingCriteria = {
  services: string[]
  location: {
    latitude: number
    longitude: number
    radius: number // in kilometers
  }
  availability?: {
    day: string
    startTime: string
    endTime: string
  }
  minRating?: number
  languages?: string[]
  maxHourlyRate?: number
  prioritizeExperience?: boolean
  prioritizeRating?: boolean
  prioritizePrice?: boolean
}

export type MatchResult = {
  worker: WorkerProfile
  compatibilityScore: number
  distance: number // in kilometers
}

class MatchingService {
  async findMatches(criteria: MatchingCriteria, limit = 10): Promise<MatchResult[]> {
    try {
      // Convert matching criteria to search filters
      const filters: SearchFilters = {
        services: criteria.services,
        location: criteria.location,
        availability: criteria.availability,
        minRating: criteria.minRating,
        languages: criteria.languages,
        maxHourlyRate: criteria.maxHourlyRate,
      }

      // Get workers matching the basic criteria
      const { workers } = await this.searchWorkers(filters)

      if (!workers || workers.length === 0) {
        return []
      }

      // Calculate compatibility score for each worker
      const results: MatchResult[] = workers.map((worker) => {
        const score = this.calculateCompatibilityScore(worker, criteria)
        const distance = this.calculateDistance(
          criteria.location.latitude,
          criteria.location.longitude,
          worker.location.latitude,
          worker.location.longitude,
        )

        return {
          worker,
          compatibilityScore: score,
          distance,
        }
      })

      // Sort by compatibility score (descending)
      results.sort((a, b) => b.compatibilityScore - a.compatibilityScore)

      // Return top matches
      return results.slice(0, limit)
    } catch (error) {
      console.error("Error finding matches:", error)
      return []
    }
  }

  private async searchWorkers(filters: SearchFilters): Promise<{ workers: WorkerProfile[]; total: number }> {
    try {
      let query = supabase.from("worker_profiles").select("*", { count: "exact" })

      // Filter by services
      if (filters.services && filters.services.length > 0) {
        query = query.containedBy("services", filters.services)
      }

      // Filter by minimum rating
      if (filters.minRating !== undefined) {
        query = query.gte("rating", filters.minRating)
      }

      // Filter by languages
      if (filters.languages && filters.languages.length > 0) {
        query = query.overlaps("languages", filters.languages)
      }

      // Filter by maximum hourly rate
      if (filters.maxHourlyRate !== undefined) {
        query = query.lte("hourly_rate", filters.maxHourlyRate)
      }

      // Location-based filtering using PostGIS
      if (filters.location) {
        const { latitude, longitude, radius } = filters.location

        // Using PostGIS ST_DWithin to find workers within the radius
        query = query.rpc("find_workers_within_distance", {
          lat: latitude,
          lng: longitude,
          distance_km: radius,
        })
      }

      // Availability filtering
      if (filters.availability) {
        const { day, startTime, endTime } = filters.availability

        query = query.rpc("find_workers_by_availability", {
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
        })
      }

      // Order by rating (highest first)
      query = query.order("rating", { ascending: false })

      const { data, error, count } = await query

      if (error) throw error

      return {
        workers: data as WorkerProfile[],
        total: count || 0,
      }
    } catch (error) {
      console.error("Error searching workers:", error)
      throw error
    }
  }

  private calculateCompatibilityScore(worker: WorkerProfile, criteria: MatchingCriteria): number {
    let score = 0
    const weights = {
      services: 30,
      distance: 20,
      rating: criteria.prioritizeRating ? 25 : 15,
      experience: criteria.prioritizeExperience ? 25 : 10,
      price: criteria.prioritizePrice ? 25 : 10,
      languages: 15,
    }

    // Service match score (exact matches get higher score)
    const serviceMatchCount = worker.services.filter((service) => criteria.services.includes(service)).length
    score += (serviceMatchCount / criteria.services.length) * weights.services

    // Distance score (closer is better)
    const distance = this.calculateDistance(
      criteria.location.latitude,
      criteria.location.longitude,
      worker.location.latitude,
      worker.location.longitude,
    )
    const distanceScore = Math.max(0, 1 - distance / criteria.location.radius)
    score += distanceScore * weights.distance

    // Rating score
    const ratingScore = worker.rating / 5
    score += ratingScore * weights.rating

    // Experience score
    const experienceScore = Math.min(1, worker.experience_years / 10) // Cap at 10 years
    score += experienceScore * weights.experience

    // Price score (lower is better)
    if (criteria.maxHourlyRate && criteria.maxHourlyRate > 0) {
      const priceScore = Math.max(0, 1 - worker.hourly_rate / criteria.maxHourlyRate)
      score += priceScore * weights.price
    }

    // Language match score
    if (criteria.languages && criteria.languages.length > 0) {
      const languageMatchCount = worker.languages.filter((language) => criteria.languages?.includes(language)).length
      const languageScore = languageMatchCount / criteria.languages.length
      score += languageScore * weights.languages
    }

    // Normalize to 0-100 scale
    return Math.min(100, score)
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Calculate distance in meters, then convert to kilometers
    const distanceInMeters = getDistance({ latitude: lat1, longitude: lon1 }, { latitude: lat2, longitude: lon2 })
    return distanceInMeters / 1000
  }

  async getRecommendedMatches(userId: string, limit = 5): Promise<MatchResult[]> {
    try {
      // Get user preferences from past bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("services, worker_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (bookingsError) throw bookingsError

      if (!bookings || bookings.length === 0) {
        // No booking history, return general recommendations
        return this.getTopRatedWorkers(limit)
      }

      // Extract preferred services and workers
      const serviceFrequency: Record<string, number> = {}
      const workerIds: string[] = []

      bookings.forEach((booking) => {
        // Count service frequency
        booking.services.forEach((service: string) => {
          serviceFrequency[service] = (serviceFrequency[service] || 0) + 1
        })

        // Add worker ID
        if (booking.worker_id && !workerIds.includes(booking.worker_id)) {
          workerIds.push(booking.worker_id)
        }
      })

      // Get top services
      const topServices = Object.entries(serviceFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([service]) => service)

      // Get user location
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("location")
        .eq("id", userId)
        .single()

      if (profileError) throw profileError

      // Create matching criteria based on user preferences
      const criteria: MatchingCriteria = {
        services: topServices,
        location: {
          latitude: profile.location?.latitude || 0,
          longitude: profile.location?.longitude || 0,
          radius: 20, // Default radius
        },
        minRating: 4.0, // Recommend highly rated workers
      }

      // Find matches based on criteria
      const matches = await this.findMatches(criteria, limit)

      // Prioritize new workers (not previously booked)
      const result = matches.sort((a, b) => {
        const aIsNew = !workerIds.includes(a.worker.id)
        const bIsNew = !workerIds.includes(b.worker.id)

        if (aIsNew && !bIsNew) return -1
        if (!aIsNew && bIsNew) return 1
        return b.compatibilityScore - a.compatibilityScore
      })

      return result
    } catch (error) {
      console.error("Error getting recommended matches:", error)
      return []
    }
  }

  private async getTopRatedWorkers(limit = 5): Promise<MatchResult[]> {
    try {
      const { data, error } = await supabase
        .from("worker_profiles")
        .select("*")
        .gte("rating", 4.0)
        .order("rating", { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []).map((worker) => ({
        worker,
        compatibilityScore: worker.rating * 20, // Convert 5-star rating to 100-point scale
        distance: 0, // Distance unknown
      }))
    } catch (error) {
      console.error("Error getting top rated workers:", error)
      return []
    }
  }
}

export const matchingService = new MatchingService()

