import { supabase } from "../config/supabase"
import type { SearchFilters, WorkerProfile } from "../types/worker"

export const searchWorkers = async (
  filters: SearchFilters,
  page = 1,
  pageSize = 10,
): Promise<{ workers: WorkerProfile[]; total: number }> => {
  try {
    let query = supabase.from("worker_profiles").select("*", { count: "exact" })

    // Filter by services
    if (filters.services && filters.services.length > 0) {
      query = query.containedBy("services", filters.services)
    }

    // Filter by minimum experience
    if (filters.minExperience !== undefined) {
      query = query.gte("experience_years", filters.minExperience)
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

    // Filter by verification status
    if (filters.verified !== undefined) {
      query = query.eq("verified", filters.verified)
    }

    // Location-based filtering using PostGIS
    if (filters.location) {
      const { latitude, longitude, radius } = filters.location

      // Using PostGIS ST_DWithin to find workers within the radius
      // Note: This requires a PostgreSQL function to be set up in Supabase
      query = query.rpc("find_workers_within_distance", {
        lat: latitude,
        lng: longitude,
        distance_km: radius,
      })
    }

    // Availability filtering
    if (filters.availability) {
      const { day, startTime, endTime } = filters.availability

      // This is a simplified approach - in a real app, you'd need a more complex query
      // or a PostgreSQL function to properly filter by availability
      query = query.rpc("find_workers_by_availability", {
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
      })
    }

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    query = query.range(from, to)

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

export const getWorkerById = async (id: string): Promise<WorkerProfile | null> => {
  try {
    const { data, error } = await supabase.from("worker_profiles").select("*").eq("id", id).single()

    if (error) throw error

    return data as WorkerProfile
  } catch (error) {
    console.error("Error getting worker:", error)
    return null
  }
}

export const getRecommendedWorkers = async (userId: string, limit = 5): Promise<WorkerProfile[]> => {
  try {
    // This would ideally call a PostgreSQL function that implements your recommendation algorithm
    const { data, error } = await supabase.rpc("get_recommended_workers", {
      user_id: userId,
      limit_count: limit,
    })

    if (error) throw error

    return data as WorkerProfile[]
  } catch (error) {
    console.error("Error getting recommended workers:", error)
    return []
  }
}

