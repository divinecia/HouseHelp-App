"use client"

import type React from "react"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import {
  blockchainVerificationService,
  type VerificationCredential,
} from "../../services/blockchain-verification-service"

interface BlockchainCredentialCardProps {
  credential: VerificationCredential
  onVerify?: (isValid: boolean) => void
}

export const BlockchainCredentialCard: React.FC<BlockchainCredentialCardProps> = ({ credential, onVerify }) => {
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean
    error?: string
  } | null>(null)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const handleVerify = async () => {
    setVerifying(true)
    try {
      const { isValid, error } = await blockchainVerificationService.verifyCredential(credential.id)

      setVerificationResult({ isValid, error })
      onVerify?.(isValid)
    } catch (error) {
      setVerificationResult({
        isValid: false,
        error: "Verification failed",
      })
    } finally {
      setVerifying(false)
    }
  }

  const getStatusColor = () => {
    if (verificationResult) {
      return verificationResult.isValid ? COLORS.success : COLORS.error
    }

    return credential.verification_status === "verified"
      ? COLORS.success
      : credential.verification_status === "rejected"
        ? COLORS.error
        : COLORS.warning
  }

  const getStatusIcon = () => {
    if (verificationResult) {
      return verificationResult.isValid ? "check-circle" : "x-circle"
    }

    return credential.verification_status === "verified"
      ? "check-circle"
      : credential.verification_status === "rejected"
        ? "x-circle"
        : "clock"
  }

  const getCredentialTypeLabel = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const viewOnBlockchain = () => {
    if (credential.blockchain_tx_id) {
      // In a real app, this would link to a blockchain explorer
      Linking.openURL(`https://blockchain-explorer.example.com/tx/${credential.blockchain_tx_id}`)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Feather name="shield" size={18} color={COLORS.primary} style={styles.typeIcon} />
          <Text style={styles.typeText}>{getCredentialTypeLabel(credential.credential_type)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Feather name={getStatusIcon()} size={12} color={COLORS.pureWhite} style={styles.statusIcon} />
          <Text style={styles.statusText}>
            {verificationResult
              ? verificationResult.isValid
                ? "Verified"
                : "Invalid"
              : credential.verification_status.charAt(0).toUpperCase() + credential.verification_status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Issuer:</Text>
          <Text style={styles.value}>{credential.issuer}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Issued:</Text>
          <Text style={styles.value}>{formatDate(credential.issued_at)}</Text>
        </View>
        {credential.expiration_date && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Expires:</Text>
            <Text style={styles.value}>{formatDate(credential.expiration_date)}</Text>
          </View>
        )}
        {credential.blockchain_tx_id && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>TX ID:</Text>
            <Text style={styles.txIdValue} numberOfLines={1} ellipsizeMode="middle">
              {credential.blockchain_tx_id}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {credential.blockchain_tx_id && (
          <TouchableOpacity style={styles.blockchainButton} onPress={viewOnBlockchain}>
            <Feather name="external-link" size={14} color={COLORS.primary} />
            <Text style={styles.blockchainButtonText}>View on Blockchain</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.verifyButton} onPress={handleVerify} disabled={verifying}>
          {verifying ? (
            <ActivityIndicator size="small" color={COLORS.pureWhite} />
          ) : (
            <>
              <Feather name="check" size={14} color={COLORS.pureWhite} />
              <Text style={styles.verifyButtonText}>Verify Now</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {verificationResult && verificationResult.error && (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={14} color={COLORS.error} />
          <Text style={styles.errorText}>{verificationResult.error}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.sm,
  },
  typeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeIcon: {
    marginRight: SIZES.xs,
  },
  typeText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: SIZES.xs,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  content: {
    marginBottom: SIZES.sm,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: COLORS.textLight,
    width: 60,
  },
  value: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  txIdValue: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    fontFamily: "monospace",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  blockchainButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  blockchainButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 4,
  },
  verifyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.sm,
  },
  verifyButtonText: {
    fontSize: 14,
    color: COLORS.pureWhite,
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${COLORS.error}15`,
    padding: SIZES.xs,
    borderRadius: SIZES.xs,
    marginTop: SIZES.xs,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginLeft: 4,
  },
})

