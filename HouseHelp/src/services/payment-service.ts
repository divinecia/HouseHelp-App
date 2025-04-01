import { supabase } from "../config/supabase"

export type PaymentMethod = {
  id: string
  user_id: string
  provider: "mtn" | "airtel" | "card" | "bank"
  is_default: boolean
  last_four?: string
  expiry_month?: number
  expiry_year?: number
  cardholder_name?: string
  phone_number?: string
  created_at: string
}

export type Transaction = {
  id: string
  user_id: string
  booking_id?: string
  payment_method_id?: string
  amount: number
  currency: string
  status: "pending" | "processing" | "completed" | "failed" | "refunded"
  provider_transaction_id?: string
  payment_type: "booking" | "subscription" | "deposit"
  description?: string
  created_at: string
}

export type PaymentSchedule = {
  id: string
  user_id: string
  booking_id?: string
  payment_method_id?: string
  amount: number
  currency: string
  frequency: "one_time" | "weekly" | "biweekly" | "monthly"
  next_payment_date: string
  end_date?: string
  status: "active" | "paused" | "completed" | "cancelled"
  description?: string
}

export type Wallet = {
  id: string
  user_id: string
  balance: number
  currency: string
}

export type WalletTransaction = {
  id: string
  wallet_id: string
  amount: number
  type: "deposit" | "withdrawal" | "payment" | "refund"
  status: "pending" | "completed" | "failed"
  reference_id?: string
  description?: string
  created_at: string
}

class PaymentService {
  async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching payment methods:", error)
      return []
    }
  }

  async addPaymentMethod(
    userId: string,
    provider: "mtn" | "airtel" | "card" | "bank",
    details: {
      last_four?: string
      expiry_month?: number
      expiry_year?: number
      cardholder_name?: string
      phone_number?: string
      token_id?: string
      set_default?: boolean
    },
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      // If setting as default, update existing methods
      if (details.set_default) {
        await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", userId)
      }

      // Add new payment method
      const { data, error } = await supabase
        .from("payment_methods")
        .insert({
          user_id: userId,
          provider,
          is_default: details.set_default || false,
          last_four: details.last_four,
          expiry_month: details.expiry_month,
          expiry_year: details.expiry_year,
          cardholder_name: details.cardholder_name,
          phone_number: details.phone_number,
          token_id: details.token_id,
        })
        .select("id")
        .single()

      if (error) throw error

      return { success: true, id: data.id }
    } catch (error) {
      console.error("Error adding payment method:", error)
      return {
        success: false,
        error: "Failed to add payment method",
      }
    }
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<boolean> {
    try {
      // First, set all to false
      await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", userId)

      // Then set the selected one to true
      const { error } = await supabase
        .from("payment_methods")
        .update({ is_default: true })
        .eq("id", paymentMethodId)
        .eq("user_id", userId)

      if (error) throw error

      return true
    } catch (error) {
      console.error("Error setting default payment method:", error)
      return false
    }
  }

  async removePaymentMethod(userId: string, paymentMethodId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("payment_methods").delete().eq("id", paymentMethodId).eq("user_id", userId)

      if (error) throw error

      return true
    } catch (error) {
      console.error("Error removing payment method:", error)
      return false
    }
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching transactions:", error)
      return []
    }
  }

  async getWalletBalance(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc("get_wallet_balance", {
        user_id_param: userId,
      })

      if (error) throw error

      return data || 0
    } catch (error) {
      console.error("Error fetching wallet balance:", error)
      return 0
    }
  }

  async getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
    try {
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", userId)
        .single()

      if (walletError && walletError.code !== "PGRST116") throw walletError

      if (!wallet) return []

      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching wallet transactions:", error)
      return []
    }
  }

  async processWalletPayment(
    userId: string,
    amount: number,
    description: string,
    referenceId: string,
  ): Promise<{ success: boolean; message: string; transactionId?: string }> {
    try {
      const { data, error } = await supabase.rpc("process_wallet_payment", {
        user_id_param: userId,
        amount_param: amount,
        description_param: description,
        reference_id_param: referenceId,
      })

      if (error) throw error

      return {
        success: data.success,
        message: data.message,
        transactionId: data.transaction_id,
      }
    } catch (error) {
      console.error("Error processing wallet payment:", error)
      return {
        success: false,
        message: "Failed to process payment",
      }
    }
  }

  async initiatePayment(
    userId: string,
    paymentMethodId: string,
    amount: number,
    bookingId: string,
    paymentType: "booking" | "subscription" | "deposit",
    description: string,
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Get payment method details
      const { data: paymentMethod, error: pmError } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("id", paymentMethodId)
        .eq("user_id", userId)
        .single()

      if (pmError) throw pmError

      // Create transaction record
      const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          booking_id: bookingId,
          payment_method_id: paymentMethodId,
          amount,
          currency: "RWF",
          status: "pending",
          payment_type: paymentType,
          description,
        })
        .select("id")
        .single()

      if (txError) throw txError

      // In a real implementation, you would call the payment gateway API here
      // For this example, we'll simulate a successful payment

      // Update transaction status
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: "completed",
          provider_transaction_id: `sim_${Date.now()}`,
          provider_response: { status: "success" },
        })
        .eq("id", transaction.id)

      if (updateError) throw updateError

      return { success: true, transactionId: transaction.id }
    } catch (error) {
      console.error("Error initiating payment:", error)
      return {
        success: false,
        error: "Failed to process payment",
      }
    }
  }
}

export const paymentService = new PaymentService()

