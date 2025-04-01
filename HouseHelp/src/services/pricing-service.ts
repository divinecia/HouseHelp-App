import { supabase } from "../config/supabase"

export type ServicePackage = {
  id: string
  name: string
  description: string
  is_active: boolean
}

export type ServicePricing = {
  service_type: string
  package_id: string
  package_name: string
  price_hourly: number
  price_daily: number | null
  price_weekly: number | null
  price_monthly: number | null
  min_hours: number
  discount_percentage: number
}

export type WorkerPricing = {
  service_type: string
  price_hourly: number
  price_daily: number | null
  price_weekly: number | null
  price_monthly: number | null
  is_custom: boolean
}

export type SubscriptionPlan = {
  id: string
  name: string
  description: string
  price_monthly: number
  price_yearly: number | null
  features: string[]
  is_active: boolean
}

export type UserSubscription = {
  id: string
  user_id: string
  plan_id: string
  plan_name: string
  status: "active" | "canceled" | "expired" | "trial"
  start_date: string
  end_date: string | null
  is_auto_renew: boolean
}

export type DiscountValidation = {
  is_valid: boolean
  discount_type: "percentage" | "fixed" | null
  discount_value: number | null
  error_message: string | null
}

class PricingService {
  async getServicePackages(): Promise<ServicePackage[]> {
    try {
      const { data, error } = await supabase.from("service_packages").select("*").eq("is_active", true).order("name")

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching service packages:", error)
      return []
    }
  }

  async getServicePricing(serviceType: string, packageId?: string): Promise<ServicePricing[]> {
    try {
      const { data, error } = await supabase.rpc("get_service_pricing", {
        service_type_param: serviceType,
        package_id_param: packageId || null,
      })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching service pricing:", error)
      return []
    }
  }

  async getWorkerPricing(workerId: string, serviceType?: string): Promise<WorkerPricing[]> {
    try {
      const { data, error } = await supabase.rpc("get_worker_pricing", {
        worker_id_param: workerId,
        service_type_param: serviceType || null,
      })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching worker pricing:", error)
      return []
    }
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly")

      if (error) throw error

      return data.map((plan) => ({
        ...plan,
        features: plan.features ? plan.features : [],
      }))
    } catch (error) {
      console.error("Error fetching subscription plans:", error)
      return []
    }
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select(`
          id,
          user_id,
          plan_id,
          subscription_plans(name),
          status,
          start_date,
          end_date,
          is_auto_renew
        `)
        .eq("user_id", userId)
        .single()

      if (error && error.code !== "PGRST116") throw error // PGRST116 is "no rows returned"

      if (!data) return null

      return {
        id: data.id,
        user_id: data.user_id,
        plan_id: data.plan_id,
        plan_name: data.subscription_plans.name,
        status: data.status,
        start_date: data.start_date,
        end_date: data.end_date,
        is_auto_renew: data.is_auto_renew,
      }
    } catch (error) {
      console.error("Error fetching user subscription:", error)
      return null
    }
  }

  async validateDiscountCode(code: string, orderValue: number): Promise<DiscountValidation> {
    try {
      const { data, error } = await supabase.rpc("validate_discount_code", {
        code_param: code,
        order_value_param: orderValue,
      })

      if (error) throw error

      if (data && data.length > 0) {
        return {
          is_valid: data[0].is_valid,
          discount_type: data[0].discount_type,
          discount_value: data[0].discount_value,
          error_message: data[0].error_message,
        }
      }

      return {
        is_valid: false,
        discount_type: null,
        discount_value: null,
        error_message: "Invalid discount code",
      }
    } catch (error) {
      console.error("Error validating discount code:", error)
      return {
        is_valid: false,
        discount_type: null,
        discount_value: null,
        error_message: "Error validating discount code",
      }
    }
  }

  calculateDiscountedPrice(originalPrice: number, discountType: "percentage" | "fixed", discountValue: number): number {
    if (discountType === "percentage") {
      return originalPrice * (1 - discountValue / 100)
    } else {
      return Math.max(0, originalPrice - discountValue)
    }
  }

  calculateTotalPrice(hourlyRate: number, hours: number, days = 0, discountPercentage = 0): number {
    const totalHours = hours + days * 8 // Assuming 8 hours per day
    let subtotal = hourlyRate * totalHours

    if (discountPercentage > 0) {
      subtotal = subtotal * (1 - discountPercentage / 100)
    }

    return subtotal
  }
}

export const pricingService = new PricingService()

