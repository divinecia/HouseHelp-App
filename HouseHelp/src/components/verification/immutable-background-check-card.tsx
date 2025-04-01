"use client"

import React from "react"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import { backgroundCheckService, type BackgroundCheck } from "../../services/background-check-service"

interface ImmutableBackgroundCheckCardProps {
  check: BackgroundCheck
  onVerify?: (isValid: boolean) => void
}

export const ImmutableBackgroundCheckCard: React.FC<ImmutableBackgroundCheckCardProps> = ({ check, onVerify }) => {
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean
    error?: string
  } | null>(null)

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"

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
      const { isValid, error } = await backgroundCheckService.verifyBackgroundCheck(check.id)

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

    if (check.status === "completed") {
      return check.result === "pass" ? COLORS.success : COLORS.error
    } else if (check.status === "expired") {
      return COLORS.warning
    } else if (check.status === "failed") {
      return COLORS.error
    } else {
      return COLORS.primary
    }
  }

  const getStatusIcon = () => {
    if (verificationResult) {
      return verificationResult.isValid ? "check-circle" : "x-circle"
    }

    if (check.status === "completed") {
      return check.result === "pass" ? "check-circle" : "x-circle"
    } else if (check.status === "expired") {
      return "alert-triangle"
    } else if (check.status === "failed") {
      return "x-circle"
    } else if (check.status === "in_progress") {
      return "loader"
    } else {
      return "clock"
    }
  }

  const getCheckTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")
  }

  const viewReport = () => {
    if (check.report_url) {
      Linking.openURL(check.report_url)
    }
  }

  const isVerifiable = check.status === "completed" && check.result === "pass" && check.credential_id !== undefined

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Feather name="file-text" size={18} color={COLORS.primary} style={styles.typeIcon} />
          <Text style={styles.typeText}>{getCheckTypeLabel(check.check_type)} Check</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Feather name={getStatusIcon()} size={12} color={COLORS.pureWhite} style={styles.statusIcon} />
          <Text style={styles.statusText}>
            {verificationResult
              ? verificationResult.isValid
                ? "Verified"
                : "Invalid"
              : check.status === "completed"
                ? check.result === "pass"
                  ? "Passed"
                  : "Failed"
                : check.status.charAt(0).toUpperCase() + check.status.slice(1).replace("_", " ")}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Provider:</Text>
          <Text style={styles.value}>{check.provider}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Created:</Text>
          <Text style={styles.value}>{formatDate(check.created_at)}</Text>
        </View>
        {check.valid_until && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Valid Until:</Text>
            <Text style={styles.value}>{formatDate(check.valid_until)}</Text>
          </View>
        )}
        {check.credential_id && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Verified:</Text>
            <Text style={styles.value}>
              <Feather name="shield" size={14} color={COLORS.success} /> Blockchain Protected
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {check.report_url && (
          <TouchableOpacity style={styles.reportButton} onPress={viewReport}>
            <Feather name="file-text" size={14} color={COLORS.primary} />
            <Text style={styles.reportButtonText}>View Report</Text>
          </TouchableOpacity>
        )}
        {isVerifiable && (
          <TouchableOpacity style={styles.verifyButton} onPress={handleVerify} disabled={verifying}>
            {verifying ? (
              <ActivityIndicator size="small" color={COLORS.pureWhite} />
            ) : (
              <>
                <Feather name="shield" size={14} color={COLORS.pureWhite} />
                <Text style={styles.verifyButtonText}>Verify</Text>
              </>
            )}
          </TouchableOpacity>
        )}
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
    width: 80,
  },
  value: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  reportButtonText: {
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

