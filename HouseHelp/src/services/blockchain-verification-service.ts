import { supabase } from "../config/supabase"
import * as crypto from "expo-crypto"

export type VerificationCredential = {
  id: string
  user_id: string
  credential_type: string
  issuer: string
  issued_at: string
  expiration_date?: string
  credential_hash: string
  blockchain_tx_id?: string
  verification_status: "pending" | "verified" | "rejected"
  metadata: Record<string, any>
}

class BlockchainVerificationService {
  // Generate a unique hash for the credential
  private async generateCredentialHash(
    userId: string,
    credentialType: string,
    issuer: string,
    metadata: Record<string, any>,
  ): Promise<string> {
    const dataToHash = JSON.stringify({
      userId,
      credentialType,
      issuer,
      timestamp: Date.now(),
      metadata,
    })

    return await crypto.digestStringAsync(crypto.CryptoDigestAlgorithm.SHA256, dataToHash)
  }

  // Register a new credential on the blockchain
  async registerCredential(
    userId: string,
    credentialType: string,
    issuer: string,
    expirationDate?: string,
    metadata: Record<string, any> = {},
  ): Promise<{ success: boolean; credentialId?: string; error?: string }> {
    try {
      // Generate credential hash
      const credentialHash = await this.generateCredentialHash(userId, credentialType, issuer, metadata)

      // Store credential in database first
      const { data, error } = await supabase
        .from("verification_credentials")
        .insert({
          user_id: userId,
          credential_type: credentialType,
          issuer,
          issued_at: new Date().toISOString(),
          expiration_date: expirationDate,
          credential_hash: credentialHash,
          verification_status: "pending",
          metadata,
        })
        .select("id")
        .single()

      if (error) throw error

      // Submit to blockchain (simulated for now)
      const blockchainTxId = await this.submitToBlockchain(data.id, credentialHash)

      // Update with blockchain transaction ID
      const { error: updateError } = await supabase
        .from("verification_credentials")
        .update({
          blockchain_tx_id: blockchainTxId,
          verification_status: "verified",
        })
        .eq("id", data.id)

      if (updateError) throw updateError

      return {
        success: true,
        credentialId: data.id,
      }
    } catch (error) {
      console.error("Error registering credential:", error)
      return {
        success: false,
        error: "Failed to register credential",
      }
    }
  }

  // Simulate blockchain submission (in a real app, this would interact with a blockchain network)
  private async submitToBlockchain(credentialId: string, credentialHash: string): Promise<string> {
    // Simulate blockchain transaction delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Generate a fake transaction ID
    const txId = `tx_${crypto.getRandomBytes(16).join("")}`

    return txId
  }

  // Verify a credential against the blockchain
  async verifyCredential(credentialId: string): Promise<{
    isValid: boolean
    credential?: VerificationCredential
    error?: string
  }> {
    try {
      // Get credential from database
      const { data, error } = await supabase
        .from("verification_credentials")
        .select("*")
        .eq("id", credentialId)
        .single()

      if (error) throw error

      if (!data.blockchain_tx_id) {
        return {
          isValid: false,
          credential: data,
          error: "Credential not registered on blockchain",
        }
      }

      // Check if credential is expired
      if (data.expiration_date && new Date(data.expiration_date) < new Date()) {
        return {
          isValid: false,
          credential: data,
          error: "Credential has expired",
        }
      }

      // In a real implementation, we would verify against the blockchain
      // For now, we'll simulate a successful verification
      const isValid = data.verification_status === "verified"

      return {
        isValid,
        credential: data,
      }
    } catch (error) {
      console.error("Error verifying credential:", error)
      return {
        isValid: false,
        error: "Failed to verify credential",
      }
    }
  }

  // Get all credentials for a user
  async getUserCredentials(userId: string): Promise<{
    credentials: VerificationCredential[]
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from("verification_credentials")
        .select("*")
        .eq("user_id", userId)
        .order("issued_at", { ascending: false })

      if (error) throw error

      return {
        credentials: data || [],
      }
    } catch (error) {
      console.error("Error getting user credentials:", error)
      return {
        credentials: [],
        error: "Failed to get credentials",
      }
    }
  }

  // Revoke a credential
  async revokeCredential(credentialId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      // In a real implementation, we would register the revocation on the blockchain
      // For now, we'll just update the database
      const { error } = await supabase
        .from("verification_credentials")
        .update({
          verification_status: "rejected",
          metadata: supabase.sql`jsonb_set(metadata, '{revocation}', ${JSON.stringify({ reason: reason, timestamp: new Date().toISOString() })}::jsonb)`,
        })
        .eq("id", credentialId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error("Error revoking credential:", error)
      return {
        success: false,
        error: "Failed to revoke credential",
      }
    }
  }
}

export const blockchainVerificationService = new BlockchainVerificationService()

