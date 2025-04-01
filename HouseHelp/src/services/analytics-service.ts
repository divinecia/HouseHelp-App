import { supabase } from "../config/supabase"

export type PerformanceMetric = {
  metric_name: string
  metric_value: number
  comparison_value: number | null
  change_percentage: number | null
}

export type ServiceMetric = {
  service_type: string
  total_bookings: number
  total_revenue: number
  average_booking_amount: number
  unique_customers: number
  unique_workers: number
  average_rating: number
}

export type BookingTrend = {
  date: string
  count: number
  amount: number
}

export type TimeDistribution = {
  day_of_week: number
  hour_of_day: number
  total_bookings: number
}

class AnalyticsService {
  async getWorkerPerformanceMetrics(workerId: string, startDate?: Date, endDate?: Date): Promise<PerformanceMetric[]> {
    try {
      const { data, error } = await supabase.rpc("get_worker_performance", {
        worker_id_param: workerId,
        start_date_param: startDate ? startDate.toISOString() : null,
        end_date_param: endDate ? endDate.toISOString() : null,
      })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching worker performance metrics:", error)
      return []
    }
  }

  async getHouseholdMetrics(userId: string, startDate?: Date, endDate?: Date): Promise<PerformanceMetric[]> {
    try {
      const { data, error } = await supabase.rpc("get_household_metrics", {
        user_id_param: userId,
        start_date_param: startDate ? startDate.toISOString() : null,
        end_date_param: endDate ? endDate.toISOString() : null,
      })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching household metrics:", error)
      return []
    }
  }

  async getServiceMetrics(serviceType?: string, startDate?: Date, endDate?: Date): Promise<ServiceMetric[]> {
    try {
      const { data, error } = await supabase.rpc("get_service_metrics", {
        service_type_param: serviceType || null,
        start_date_param: startDate ? startDate.toISOString() : null,
        end_date_param: endDate ? endDate.toISOString() : null,
      })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching service metrics:", error)
      return []
    }
  }

  async getBookingTrends(
    userId: string,
    isWorker: boolean,
    period: "week" | "month" | "year" = "month",
  ): Promise<BookingTrend[]> {
    try {
      // Determine date format based on period
      let dateFormat: string
      let interval: string

      switch (period) {
        case "week":
          dateFormat = "YYYY-MM-DD"
          interval = "1 day"
          break
        case "month":
          dateFormat = "YYYY-MM-DD"
          interval = "1 day"
          break
        case "year":
          dateFormat = "YYYY-MM"
          interval = "1 month"
          break
        default:
          dateFormat = "YYYY-MM-DD"
          interval = "1 day"
      }

      // Determine start date based on period
      let startDate: Date
      const now = new Date()

      switch (period) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case "year":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }

      // Query to get booking trends
      const { data, error } = await supabase.rpc("get_booking_trends", {
        user_id_param: userId,
        is_worker_param: isWorker,
        start_date_param: startDate.toISOString(),
        end_date_param: now.toISOString(),
        date_format_param: dateFormat,
        interval_param: interval,
      })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching booking trends:", error)
      return []
    }
  }

  async getTimeDistribution(userId?: string, isWorker?: boolean): Promise<TimeDistribution[]> {
    try {
      const { data, error } = await supabase.rpc("get_time_distribution", {
        user_id_param: userId || null,
        is_worker_param: isWorker !== undefined ? isWorker : null,
      })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching time distribution:", error)
      return []
    }
  }

  async getTopServices(userId: string, isWorker: boolean): Promise<{ service_type: string; count: number }[]> {
    try {
      const { data, error } = await supabase.rpc("get_top_services", {
        user_id_param: userId,
        is_worker_param: isWorker,
      })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching top services:", error)
      return []
    }
  }

  async getTopLocations(userId: string, isWorker: boolean): Promise<{ location: string; count: number }[]> {
    try {
      const { data, error } = await supabase.rpc("get_top_locations", {
        user_id_param: userId,
        is_worker_param: isWorker,
      })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching top locations:", error)
      return []
    }
  }
}

export const analyticsService = new AnalyticsService()

