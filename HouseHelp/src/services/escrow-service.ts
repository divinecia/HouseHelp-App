import { supabase } from "../config/supabase"

export type EscrowStatus = "pending" | "funded" | "released" | "refunded" | "disputed" | "resolved"

export type EscrowTransaction = {
  id: string
  booking_id: string
  user_id: string
  worker_id: string
  amount: number
  currency: string
  status: EscrowStatus
  funded_at?: string
  released_at?: string
  refunded_at?: string
  disputed_at?: string
  resolved_at?: string
  created_at: string
  updated_at: string
}

export type DisputeReason = "service_not_completed" | "quality_issues" | "worker_no_show" | "time_discrepancy" | "other"

export type EscrowDispute = {
  id: string
  escrow_id: string
  initiated_by: string
  reason: DisputeReason
  description: string
  evidence_urls?: string[]
  status: "open" | "under_review" | "resolved"
  resolution?: "release" | "refund" | "partial_release"
  resolution_amount?: number
  resolution_notes?: string
  created_at: string
  updated_at: string
  resolved_at?: string
}

class EscrowService {
  async createEscrow(
    bookingId: string,
    userId: string,
    workerId: string,
    amount: number,
    currency = "USD",
  ): Promise<{ success: boolean; escrowId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("create_escrow", {
        booking_id_param: bookingId,
        user_id_param: userId,
        worker_id_param: workerId,
        amount_param: amount,
        currency_param: currency,
      })

      if (error) throw error

      return {
        success: true,
        escrowId: data,
      }
    } catch (error) {
      console.error("Error creating escrow:", error)
      return {
        success: false,
        error: "Failed to create escrow",
      }
    }
  }

  async fundEscrow(escrowId: string, paymentMethodId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("fund_escrow", {
        escrow_id_param: escrowId,
        payment_method_id_param: paymentMethodId,
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error("Error funding escrow:", error)
      return {
        success: false,
        error: "Failed to fund escrow",
      }
    }
  }

  async releaseEscrow(escrowId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("release_escrow", {
        escrow_id_param: escrowId,
        user_id_param: userId,
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error("Error releasing escrow:", error)
      return {
        success: false,
        error: "Failed to release escrow",
      }
    }
  }

  async refundEscrow(escrowId: string, workerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("refund_escrow", {
        escrow_id_param: escrowId,
        worker_id_param: workerId,
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error("Error refunding escrow:", error)
      return {
        success: false,
        error: "Failed to refund escrow",
      }
    }
  }

  async getEscrowDetails(escrowId: string): Promise<{ escrow: EscrowTransaction | null; error?: string }> {
    try {
      const { data, error } = await supabase.from("escrow_transactions").select("*").eq("id", escrowId).single()

      if (error) throw error

      return { escrow: data }
    } catch (error) {
      console.error("Error getting escrow details:", error)
      return {
        escrow: null,
        error: "Failed to get escrow details",
      }
    }
  }

  async initiateDispute(
    escrowId: string,
    userId: string,
    reason: DisputeReason,
    description: string,
    evidenceUrls?: string[],
  ): Promise<{ success: boolean; disputeId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("initiate_escrow_dispute", {
        escrow_id_param: escrowId,
        user_id_param: userId,
        reason_param: reason,
        description_param: description,
        evidence_urls_param: evidenceUrls || [],
      })

      if (error) throw error

      return {
        success: true,
        disputeId: data,
      }
    } catch (error) {
      console.error("Error initiating dispute:", error)
      return {
        success: false,
        error: "Failed to initiate dispute",
      }
    }
  }

  async getDisputeDetails(disputeId: string): Promise<{ dispute: EscrowDispute | null; error?: string }> {
    try {
      const { data, error } = await supabase.from("escrow_disputes").select("*").eq("id", disputeId).single()

      if (error) throw error

      return { dispute: data }
    } catch (error) {
      console.error("Error getting dispute details:", error)
      return {
        dispute: null,
        error: "Failed to get dispute details",
      }
    }
  }

  async addDisputeEvidence(
    disputeId: string,
    userId: string,
    evidenceUrls: string[],
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("add_dispute_evidence", {
        dispute_id_param: disputeId,
        user_id_param: userId,
        evidence_urls_param: evidenceUrls,
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error("Error adding dispute evidence:", error)
      return {
        success: false,
        error: "Failed to add dispute evidence",
      }
    }
  }
}

export const escrowService = new EscrowService()

