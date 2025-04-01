import { supabase } from "../config/supabase"
import * as FileSystem from "expo-file-system"
import { decode } from "base64-arraybuffer"

export type BenefitType = {
  id: string
  name: string
  description?: string
  provider?: string
  provider_website?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type WorkerBenefit = {
  id: string
  worker_id: string
  benefit_type_id: string
  benefit_type_name?: string
  status: "pending" | "active" | "expired" | "cancelled"
  start_date?: string
  end_date?: string
  policy_number?: string
  coverage_details?: any
  monthly_premium?: number
  created_at: string
  updated_at: string
}

export type BenefitClaim = {
  id: string
  worker_benefit_id: string
  claim_date: string
  claim_amount: number
  description?: string
  status: "submitted" | "under_review" | "approved" | "rejected" | "paid"
  reference_number?: string
  rejection_reason?: string
  payment_date?: string
  created_at: string
  updated_at: string
  documents?: BenefitClaimDocument[]
}

export type BenefitClaimDocument = {
  id: string
  claim_id: string
  document_url: string
  document_type: string
  created_at: string
}

export type WelfareProgram = {
  id: string
  name: string
  description?: string
  eligibility_criteria?: string
  benefits?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type WelfareEnrollment = {
  id: string
  worker_id: string
  program_id: string
  program_name?: string
  status: "pending" | "approved" | "rejected" | "active" | "inactive"
  enrollment_date?: string
  expiry_date?: string
  created_at: string
  updated_at: string
}

class WelfareService {
  async getBenefitTypes(): Promise<BenefitType[]> {
    try {
      const { data, error } = await supabase.from("benefit_types").select("*").eq("is_active", true).order("name")

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching benefit types:", error)
      return []
    }
  }

  async getWorkerBenefits(workerId: string): Promise<WorkerBenefit[]> {
    try {
      const { data, error } = await supabase
        .from("worker_benefits")
        .select(`
          *,
          benefit_type:benefit_type_id (name)
        `)
        .eq("worker_id", workerId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return (data || []).map((benefit) => ({
        ...benefit,
        benefit_type_name: benefit.benefit_type?.name,
      }))
    } catch (error) {
      console.error("Error fetching worker benefits:", error)
      return []
    }
  }

  async getBenefitDetails(benefitId: string): Promise<WorkerBenefit | null> {
    try {
      const { data, error } = await supabase
        .from("worker_benefits")
        .select(`
          *,
          benefit_type:benefit_type_id (*)
        `)
        .eq("id", benefitId)
        .single()

      if (error) throw error

      return {
        ...data,
        benefit_type_name: data.benefit_type?.name,
      }
    } catch (error) {
      console.error("Error fetching benefit details:", error)
      return null
    }
  }

  async enrollInBenefit(
    workerId: string,
    benefitTypeId: string,
    startDate?: Date,
    endDate?: Date,
    monthlyPremium?: number,
  ): Promise<{ success: boolean; benefitId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("enroll_worker_benefit", {
        worker_id_param: workerId,
        benefit_type_id_param: benefitTypeId,
        start_date_param: startDate ? startDate.toISOString() : null,
        end_date_param: endDate ? endDate.toISOString() : null,
        monthly_premium_param: monthlyPremium || null,
      })

      if (error) throw error

      return {
        success: true,
        benefitId: data,
      }
    } catch (error) {
      console.error("Error enrolling in benefit:", error)
      return {
        success: false,
        error: "Failed to enroll in benefit",
      }
    }
  }

  async getBenefitClaims(workerId: string): Promise<BenefitClaim[]> {
    try {
      // First get worker benefits
      const { data: benefits, error: benefitsError } = await supabase
        .from("worker_benefits")
        .select("id")
        .eq("worker_id", workerId)

      if (benefitsError) throw benefitsError

      if (!benefits || benefits.length === 0) {
        return []
      }

      const benefitIds = benefits.map((b) => b.id)

      // Get claims for these benefits
      const { data: claims, error: claimsError } = await supabase
        .from("benefit_claims")
        .select("*")
        .in("worker_benefit_id", benefitIds)
        .order("created_at", { ascending: false })

      if (claimsError) throw claimsError

      // Get documents for each claim
      const result: BenefitClaim[] = []

      for (const claim of claims || []) {
        const { data: documents, error: documentsError } = await supabase
          .from("benefit_claim_documents")
          .select("*")
          .eq("claim_id", claim.id)

        if (documentsError) throw documentsError

        result.push({
          ...claim,
          documents: documents || [],
        })
      }

      return result
    } catch (error) {
      console.error("Error fetching benefit claims:", error)
      return []
    }
  }

  async getClaimDetails(claimId: string): Promise<BenefitClaim | null> {
    try {
      const { data: claim, error: claimError } = await supabase
        .from("benefit_claims")
        .select("*")
        .eq("id", claimId)
        .single()

      if (claimError) throw claimError

      // Get documents
      const { data: documents, error: documentsError } = await supabase
        .from("benefit_claim_documents")
        .select("*")
        .eq("claim_id", claimId)

      if (documentsError) throw documentsError

      return {
        ...claim,
        documents: documents || [],
      }
    } catch (error) {
      console.error("Error fetching claim details:", error)
      return null
    }
  }

  async submitBenefitClaim(
    workerBenefitId: string,
    claimAmount: number,
    description: string,
    claimDate?: Date,
  ): Promise<{ success: boolean; claimId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("submit_benefit_claim", {
        worker_benefit_id_param: workerBenefitId,
        claim_amount_param: claimAmount,
        description_param: description,
        claim_date_param: claimDate ? claimDate.toISOString() : null,
      })

      if (error) throw error

      return {
        success: true,
        claimId: data,
      }
    } catch (error) {
      console.error("Error submitting benefit claim:", error)
      return {
        success: false,
        error: "Failed to submit claim",
      }
    }
  }

  async uploadClaimDocument(
    claimId: string,
    uri: string,
    documentType: string,
  ): Promise<{ success: boolean; documentId?: string; error?: string }> {
    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri)
      if (!fileInfo.exists) {
        throw new Error("File does not exist")
      }

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      // Get file extension
      const fileExtension = uri.split(".").pop()?.toLowerCase() || "jpg"

      // Upload to Supabase Storage
      const fileName = `${claimId}_${Date.now()}.${fileExtension}`
      const filePath = `benefit_claims/${fileName}`

      const { error: uploadError } = await supabase.storage.from("benefits").upload(filePath, decode(base64), {
        contentType: `image/${fileExtension}`,
      })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage.from("benefits").getPublicUrl(filePath)

      if (!urlData.publicUrl) {
        throw new Error("Failed to get public URL")
      }

      // Add document to database
      const { data, error } = await supabase
        .from("benefit_claim_documents")
        .insert({
          claim_id: claimId,
          document_url: urlData.publicUrl,
          document_type: documentType,
        })
        .select("id")
        .single()

      if (error) throw error

      return {
        success: true,
        documentId: data.id,
      }
    } catch (error) {
      console.error("Error uploading claim document:", error)
      return {
        success: false,
        error: "Failed to upload document",
      }
    }
  }

  async getWelfarePrograms(): Promise<WelfareProgram[]> {
    try {
      const { data, error } = await supabase.from("welfare_programs").select("*").eq("is_active", true).order("name")

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching welfare programs:", error)
      return []
    }
  }

  async getWorkerEnrollments(workerId: string): Promise<WelfareEnrollment[]> {
    try {
      const { data, error } = await supabase
        .from("welfare_enrollments")
        .select(`
          *,
          program:program_id (name)
        `)
        .eq("worker_id", workerId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return (data || []).map((enrollment) => ({
        ...enrollment,
        program_name: enrollment.program?.name,
      }))
    } catch (error) {
      console.error("Error fetching worker enrollments:", error)
      return []
    }
  }

  async enrollInWelfareProgram(
    workerId: string,
    programId: string,
  ): Promise<{ success: boolean; enrollmentId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("enroll_welfare_program", {
        worker_id_param: workerId,
        program_id_param: programId,
      })

      if (error) throw error

      return {
        success: true,
        enrollmentId: data,
      }
    } catch (error) {
      console.error("Error enrolling in welfare program:", error)
      return {
        success: false,
        error: "Failed to enroll in program",
      }
    }
  }
}

export const welfareService = new WelfareService()

