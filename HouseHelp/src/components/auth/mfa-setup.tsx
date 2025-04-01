"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import { Button } from "../UI/button"
import { supabase } from "../../config/supabase"
import { useAuth } from "../../contexts/auth-context"
import * as Clipboard from "expo-clipboard"

interface MFASetupProps {
  onComplete: () => void
  onCancel: () => void
}

export const MFASetup: React.FC<MFASetupProps> = ({ onComplete, onCancel }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [step, setStep] = useState<"setup" | "verify">("setup")

  useEffect(() => {
    if (user) {
      setupMFA()
    }
  }, [user])

  const setupMFA = async () => {
    setLoading(true)
    try {
      // Enroll new TOTP factor
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      })

      if (error) throw error

      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setStep("setup")
    } catch (error) {
      console.error("Error setting up MFA:", error)
      Alert.alert("Error", "Failed to set up MFA. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const verifyMFA = async () => {
    if (!factorId || !verificationCode.trim()) {
      Alert.alert("Error", "Please enter the verification code")
      return
    }

    setVerifying(true)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verificationCode,
      })

      if (error) throw error

      Alert.alert("Success", "MFA has been successfully set up", [{ text: "OK", onPress: onComplete }])
    } catch (error) {
      console.error("Error verifying MFA:", error)
      Alert.alert("Error", "Invalid verification code. Please try again.")
    } finally {
      setVerifying(false)
    }
  }

  const copyToClipboard = async () => {
    if (secret) {
      await Clipboard.setStringAsync(secret)
      Alert.alert("Copied", "Secret key copied to clipboard")
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Setting up MFA...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{step === "setup" ? "Set Up Two-Factor Authentication" : "Verify Your Code"}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
          <Feather name="x" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {step === "setup" ? (
        <>
          <Text style={styles.description}>
            Scan the QR code below with your authenticator app (like Google Authenticator or Authy) to set up two-factor
            authentication.
          </Text>

          {qrCode && (
            <View style={styles.qrContainer}>
              <Image source={{ uri: qrCode }} style={styles.qrCode} resizeMode="contain" />
            </View>
          )}

          {secret && (
            <View style={styles.secretContainer}>
              <Text style={styles.secretLabel}>Or enter this code manually:</Text>
              <View style={styles.secretRow}>
                <Text style={styles.secretText}>{secret}</Text>
                <TouchableOpacity onPress={copyToClipboard}>
                  <Feather name="copy" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Button title="Continue" onPress={() => setStep("verify")} style={styles.continueButton} />
        </>
      ) : (
        <>
          <Text style={styles.description}>
            Enter the 6-digit verification code from your authenticator app to complete the setup.
          </Text>

          <View style={styles.codeInputContainer}>
            <TextInput
              style={styles.codeInput}
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>

          <Button
            title="Verify"
            onPress={verifyMFA}
            loading={verifying}
            disabled={verificationCode.length !== 6 || verifying}
            style={styles.verifyButton}
          />

          <TouchableOpacity style={styles.backButton} onPress={() => setStep("setup")} disabled={verifying}>
            <Text style={styles.backButtonText}>Back to QR Code</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    width: "90%",
    maxWidth: 400,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  closeButton: {
    padding: SIZES.xs,
  },
  description: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
  },
  qrContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: SIZES.md,
    backgroundColor: COLORS.pureWhite,
    padding: SIZES.sm,
    borderRadius: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  secretContainer: {
    marginBottom: SIZES.md,
  },
  secretLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  secretRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    padding: SIZES.sm,
    borderRadius: SIZES.sm,
  },
  secretText: {
    fontSize: 16,
    fontFamily: "monospace",
    color: COLORS.text,
    letterSpacing: 1,
  },
  continueButton: {
    marginTop: SIZES.md,
  },
  codeInputContainer: {
    alignItems: "center",
    marginVertical: SIZES.lg,
  },
  codeInput: {
    fontSize: 24,
    fontFamily: "monospace",
    letterSpacing: 8,
    textAlign: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.sm,
    padding: SIZES.md,
    width: "80%",
  },
  verifyButton: {
    marginTop: SIZES.md,
  },
  backButton: {
    alignItems: "center",
    marginTop: SIZES.md,
    padding: SIZES.sm,
  },
  backButtonText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  loadingContainer: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    padding: SIZES.xl,
    alignItems: "center",
    justifyContent: "center",
    width: "90%",
    maxWidth: 400,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text,
    marginTop: SIZES.md,
  },
})

