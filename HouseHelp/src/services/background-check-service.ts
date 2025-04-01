import { supabase } from "../config/supabase"
import { blockchainVerificationService } from "./blockchain-verification-service"

export type BackgroundCheckStatus = "pending" | "in_progress" | "completed" | "failed" | "expired"

export type BackgroundCheckType = "identity" | "criminal" | "employment" | "education" | "reference" | "comprehensive"

export type BackgroundCheck = {
  id: string
  user_id: string
  check_type: BackgroundCheckType
  provider: string
  status: BackgroundCheckStatus
  result: "pass" | "fail" | "pending" | null
  report_url?: string
  credential_id?: string
  valid_until?: string
  created_at: string
  updated_at: string
  metadata: Record<string, any>
}

class BackgroundCheckService {
  // Request a new background check
  async requestBackgroundCheck(
    userId: string,
    checkType: BackgroundCheckType,
    provider = "default_provider",
    metadata: Record<string, any> = {},
  ): Promise<{ success: boolean; checkId?: string; error?: string }> {
    try {
      // Create background check record
      const { data, error } = await supabase
        .from("background_checks")
        .insert({
          user_id: userId,
          check_type: checkType,
          provider,
          status: "pending",
          result: "pending",
          metadata,
        })
        .select("id")
        .single()

      if (error) throw error

      // In a real implementation, we would initiate the background check with the provider
      // For now, we'll simulate starting the process
      await this.simulateBackgroundCheckProcess(data.id)

      return {
        success: true,
        checkId: data.id,
      }
    } catch (error) {
      console.error("Error requesting background check:", error)
      return {
        success: false,
        error: "Failed to request background check",
      }
    }
  }

  // Simulate the background check process
  private async simulateBackgroundCheckProcess(checkId: string): Promise<void> {
    // Update status to in_progress
    await supabase
      .from("background_checks")
      .update({
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", checkId)

    // In a real implementation, this would be handled by webhooks from the provider
    // For demo purposes, we'll simulate a completed check after a delay
    setTimeout(async () => {
      try {
        // Get the check details
        const { data, error } = await supabase.from("background_checks").select("*").eq("id", checkId).single()

        if (error) throw error

        // Simulate a 90% pass rate
        const passed = Math.random() < 0.9
        const result = passed ? "pass" : "fail"

        // Generate a fake report URL
        const reportUrl = `https://api.househelp.com/background-checks/${checkId}/report`

        // Update with results
        const { error: updateError } = await supabase
          .from("background_checks")
          .update({
            status: "completed",
            result,
            report_url: reportUrl,
            valid_until: this.getValidUntilDate(data.check_type),
            updated_at: new Date().toISOString(),
          })
          .eq("id", checkId)

        if (updateError) throw updateError

        // If passed, register on blockchain for immutability
        if (passed) {
          await this.registerOnBlockchain(data.user_id, checkId, data.check_type, reportUrl)
        }
      } catch (error) {
        console.error("Error in background check simulation:", error)

        // Update as failed if there was an error
        await supabase
          .from("background_checks")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", checkId)
      }
    }, 10000) // Simulate 10 second processing time
  }

  // Register the background check result on the blockchain
  private async registerOnBlockchain(
    userId: string,
    checkId: string,
    checkType: BackgroundCheckType,
    reportUrl: string,
  ): Promise<void> {
    try {
      const validUntil = this.getValidUntilDate(checkType)

      // Register on blockchain
      const { success, credentialId, error } = await blockchainVerificationService.registerCredential(
        userId,
        `background_check_${checkType}`,
        "HouseHelp Background Check Authority",
        validUntil,
        {
          checkId,
          checkType,
          reportUrl,
          timestamp: new Date().toISOString(),
        },
      )

      if (!success) throw new Error(error)

      // Update background check with credential ID
      await supabase
        .from("background_checks")
        .update({
          credential_id: credentialId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkId)
    } catch (error) {
      console.error("Error registering background check on blockchain:", error)
    }
  }

  // Calculate expiration date based on check type
  private getValidUntilDate(checkType: BackgroundCheckType): string {
    const now = new Date()
    let validMonths = 12 // Default to 1 year

    switch (checkType) {
      case "identity":
        validMonths = 24 // 2 years
        break
      case "criminal":
        validMonths = 12 // 1 year
        break
      case "employment":
        validMonths = 36 // 3 years
        break
      case "education":
        validMonths = 60 // 5 years
        break
      case "reference":
        validMonths = 24 // 2 years
        break
      case "comprehensive":
        validMonths = 12 // 1 year
        break
    }

    now.setMonth(now.getMonth() + validMonths)
    return now.toISOString()
  }

  // Get background check details
  async getBackgroundCheck(checkId: string): Promise<{ check: BackgroundCheck | null; error?: string }> {
    try {
      const { data, error } = await supabase.from("background_checks").select("*").eq("id", checkId).single()

      if (error) throw error

      return { check: data }
    } catch (error) {
      console.error("Error getting background check:", error)
      return {
        check: null,
        error: "Failed to get background check details",
      }
    }
  }

  // Get all background checks for a user
  async getUserBackgroundChecks(userId: string): Promise<{ checks: BackgroundCheck[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("background_checks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return { checks: data || [] }
    } catch (error) {
      console.error("Error getting user background checks:", error)
      return {
        checks: [],
        error: "Failed to get background checks",
      }
    }
  }

  // Verify a background check using the blockchain
  async verifyBackgroundCheck(checkId: string): Promise<{
    isValid: boolean
    check?: BackgroundCheck
    error?: string
  }> {
    try {
      // Get background check details
      const { check, error } = await this.getBackgroundCheck(checkId)

      if (error) throw error
      if (!check) throw new Error("Background check not found")

      // Check if it has a blockchain credential
      if (!check.credential_id) {
        return {
          isValid: false,
          check,
          error: "Background check not registered on blockchain",
        }
      }

      // Verify the credential on the blockchain
      const { isValid, error: verifyError } = await blockchainVerificationService.verifyCredential(check.credential_id)

      if (verifyError) throw new Error(verifyError)

      return {
        isValid,
        check,
      }
    } catch (error) {
      console.error("Error verifying background check:", error)
      return {
        isValid: false,
        error: "Failed to verify background check",
      }
    }
  }
}

export const backgroundCheckService = new BackgroundCheckService()

