import { supabase } from "../config/supabase"

export type ReferralCode = {
  id: string
  user_id: string
  code: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Referral = {
  id: string
  referrer_id: string
  referred_id: string
  referral_code: string
  status: "pending" | "completed" | "expired"
  completed_at?: string
  reward_amount?: number
  reward_paid: boolean
  created_at: string
  updated_at: string
  referred_user_name?: string
}

export type LoyaltyStatus = {
  points_balance: number
  lifetime_points: number
  tier: "bronze" | "silver" | "gold" | "platinum"
  next_tier?: string
  points_to_next_tier?: number
}

export type LoyaltyTransaction = {
  id: string
  user_id: string
  points: number
  transaction_type: "earn" | "redeem" | "expire" | "adjust"
  source: string
  reference_id?: string
  description?: string
  created_at: string
}

export type LoyaltyReward = {
  id: string
  name: string
  description?: string
  points_required: number
  reward_type: "discount" | "free_service" | "credit" | "gift"
  reward_value: any
  is_active: boolean
  min_tier?: "bronze" | "silver" | "gold" | "platinum"
  created_at: string
  updated_at: string
}

export type RedeemedReward = {
  id: string
  user_id: string
  reward_id: string
  reward_name?: string
  points_used: number
  status: "pending" | "active" | "used" | "expired" | "cancelled"
  code?: string
  expires_at?: string
  used_at?: string
  booking_id?: string
  created_at: string
  updated_at: string
}

class ReferralService {
  async getUserReferralCode(userId: string): Promise<ReferralCode | null> {
    try {
      // Check if user already has a referral code
      const { data, error } = await supabase.from("referral_codes").select("*").eq("user_id", userId).single()

      if (error && error.code !== "PGRST116") throw error

      if (data) {
        return data
      }

      // Generate new referral code
      const { data: newCode, error: genError } = await supabase.rpc("generate_referral_code", {
        user_id_param: userId,
      })

      if (genError) throw genError

      // Fetch the newly created code
      const { data: codeData, error: fetchError } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (fetchError) throw fetchError

      return codeData
    } catch (error) {
      console.error("Error getting user referral code:", error)
      return null
    }
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    try {
      const { data, error } = await supabase
        .from("referrals")
        .select(`
          *,
          referred:referred_id (id, full_name)
        `)
        .eq("referrer_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return (data || []).map((referral) => ({
        ...referral,
        referred_user_name: referral.referred?.full_name,
      }))
    } catch (error) {
      console.error("Error getting user referrals:", error)
      return []
    }
  }

  async applyReferralCode(userId: string, referralCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("apply_referral", {
        referred_id_param: userId,
        referral_code_param: referralCode,
      })

      if (error) throw error

      if (!data) {
        return {
          success: false,
          error: "Invalid referral code or you have already been referred",
        }
      }

      return { success: true }
    } catch (error) {
      console.error("Error applying referral code:", error)
      return {
        success: false,
        error: "Failed to apply referral code",
      }
    }
  }

  async getLoyaltyStatus(userId: string): Promise<LoyaltyStatus | null> {
    try {
      const { data, error } = await supabase.rpc("get_loyalty_status", {
        user_id_param: userId,
      })

      if (error) throw error

      if (!data || data.length === 0) {
        return null
      }

      return data[0]
    } catch (error) {
      console.error("Error getting loyalty status:", error)
      return null
    }
  }

  async getLoyaltyTransactions(userId: string): Promise<LoyaltyTransaction[]> {
    try {
      const { data, error } = await supabase
        .from("loyalty_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error getting loyalty transactions:", error)
      return []
    }
  }

  async getAvailableRewards(userId: string): Promise<LoyaltyReward[]> {
    try {
      // Get user's tier
      const status = await this.getLoyaltyStatus(userId)

      if (!status) {
        return []
      }

      // Get rewards available for user's tier
      const { data, error } = await supabase
        .from("loyalty_rewards")
        .select("*")
        .eq("is_active", true)
        .or(`min_tier.is.null,min_tier.eq.${status.tier}`)
        .order("points_required", { ascending: true })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error getting available rewards:", error)
      return []
    }
  }

  async redeemReward(
    userId: string,
    rewardId: string,
  ): Promise<{
    success: boolean
    message: string
    redemptionId?: string
    redemptionCode?: string
  }> {
    try {
      const { data, error } = await supabase.rpc("redeem_reward", {
        user_id_param: userId,
        reward_id_param: rewardId,
      })

      if (error) throw error

      if (!data || data.length === 0) {
        return {
          success: false,
          message: "Failed to redeem reward",
        }
      }

      return {
        success: data[0].success,
        message: data[0].message,
        redemptionId: data[0].redemption_id,
        redemptionCode: data[0].redemption_code,
      }
    } catch (error) {
      console.error("Error redeeming reward:", error)
      return {
        success: false,
        message: "Failed to redeem reward",
      }
    }
  }

  async getUserRedeemedRewards(userId: string): Promise<RedeemedReward[]> {
    try {
      const { data, error } = await supabase
        .from("redeemed_rewards")
        .select(`
          *,
          reward:reward_id (name)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return (data || []).map((redemption) => ({
        ...redemption,
        reward_name: redemption.reward?.name,
      }))
    } catch (error) {
      console.error("Error getting redeemed rewards:", error)
      return []
    }
  }
}

export const referralService = new ReferralService()

