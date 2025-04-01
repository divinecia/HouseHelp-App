import { supabase } from "../config/supabase"
import * as FileSystem from "expo-file-system"
import { decode } from "base64-arraybuffer"

export type VerificationType = {
  id: string
  name: string
  description: string
  is_required: boolean
  is_active: boolean
}

export type UserVerification = {
  id: string
  user_id: string
  verification_type_id: string
  verification_type_name?: string
  status: "pending" | "approved" | "rejected" | "expired"
  verified_at?: string
  expires_at?: string
  verification_data?: any
  rejection_reason?: string
  created_at: string
  updated_at: string
  documents?: VerificationDocument[]
}

export type VerificationDocument = {
  id: string
  verification_id: string
  document_type: string
  document_url: string
  is_verified: boolean
  verification_notes?: string
  created_at: string
  updated_at: string
}

export type BackgroundCheckRequest = {
  id: string
  user_id: string
  status: "pending" | "processing" | "completed" | "failed"
  provider?: string
  provider_reference_id?: string
  check_type: "basic" | "standard" | "comprehensive"
  result?: any
  created_at: string
  updated_at: string
}

class VerificationService {
  async getVerificationTypes(): Promise<VerificationType[]> {
    try {
      const { data, error } = await supabase.from("verification_types").select("*").eq("is_active", true).order("name")

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching verification types:", error)
      return []
    }
  }

  async getUserVerifications(userId: string): Promise<UserVerification[]> {
    try {
      const { data, error } = await supabase
        .from("user_verifications")
        .select(`
          *,
          verification_type:verification_type_id (name)
        `)
        .eq("user_id", userId)

      if (error) throw error

      const verifications = (data || []).map((v) => ({
        ...v,
        verification_type_name: v.verification_type?.name,
      }))

      // Fetch documents for each verification
      for (const verification of verifications) {
        const { data: documents, error: docError } = await supabase
          .from("verification_documents")
          .select("*")
          .eq("verification_id", verification.id)

        if (docError) throw docError

        verification.documents = documents || []
      }

      return verifications
    } catch (error) {
      console.error("Error fetching user verifications:", error)
      return []
    }
  }

  async requestVerification(
    userId: string,
    verificationTypeId: string,
    verificationData?: any,
  ): Promise<{ success: boolean; verificationId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("request_verification", {
        user_id_param: userId,
        verification_type_id_param: verificationTypeId,
        verification_data_param: verificationData || null,
      })

      if (error) throw error

      return {
        success: true,
        verificationId: data,
      }
    } catch (error) {
      console.error("Error requesting verification:", error)
      return {
        success: false,
        error: "Failed to request verification",
      }
    }
  }

  async uploadVerificationDocument(
    verificationId: string,
    documentType: string,
    uri: string,
    notes?: string,
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
      const fileName = `${verificationId}_${Date.now()}.${fileExtension}`
      const filePath = `verification_documents/${fileName}`

      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, decode(base64), {
        contentType: `image/${fileExtension}`,
      })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath)

      if (!urlData.publicUrl) {
        throw new Error("Failed to get public URL")
      }

      // Add document to database
      const { data, error } = await supabase.rpc("add_verification_document", {
        verification_id_param: verificationId,
        document_type_param: documentType,
        document_url_param: urlData.publicUrl,
        verification_notes_param: notes || null,
      })

      if (error) throw error

      return {
        success: true,
        documentId: data,
      }
    } catch (error) {
      console.error("Error uploading verification document:", error)
      return {
        success: false,
        error: "Failed to upload document",
      }
    }
  }

  async requestBackgroundCheck(
    userId: string,
    checkType: "basic" | "standard" | "comprehensive",
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("request_background_check", {
        user_id_param: userId,
        check_type_param: checkType,
      })

      if (error) throw error

      return {
        success: true,
        requestId: data,
      }
    } catch (error) {
      console.error("Error requesting background check:", error)
      return {
        success: false,
        error: "Failed to request background check",
      }
    }
  }

  async getBackgroundCheckRequests(userId: string): Promise<BackgroundCheckRequest[]> {
    try {
      const { data, error } = await supabase
        .from("background_check_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching background check requests:", error)
      return []
    }
  }

  async getBackgroundCheckStatus(requestId: string): Promise<BackgroundCheckRequest | null> {
    try {
      const { data, error } = await supabase.from("background_check_requests").select("*").eq("id", requestId).single()

      if (error) throw error

      return data
    } catch (error) {
      console.error("Error fetching background check status:", error)
      return null
    }
  }
}

export const verificationService = new VerificationService()

