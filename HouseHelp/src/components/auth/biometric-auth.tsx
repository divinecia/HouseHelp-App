"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native"
import { Feather } from "@expo/vector-icons"
import * as LocalAuthentication from "expo-local-authentication"
import { COLORS, SIZES } from "../../config/theme"
import { supabase } from "../../config/supabase"
import { useAuth } from "../../contexts/auth-context"

interface BiometricAuthProps {
  onSuccess?: () => void
  onCancel?: () => void
  promptMessage?: string
}

export const BiometricAuth: React.FC<BiometricAuthProps> = ({
  onSuccess,
  onCancel,
  promptMessage = "Authenticate to continue",
}) => {
  const { user } = useAuth()
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false)
  const [biometricType, setBiometricType] = useState<string>("")
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    checkBiometricAvailability()
    if (user) {
      checkBiometricEnabled()
    }
  }, [user])

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync()
      setIsBiometricAvailable(compatible)

      if (compatible) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync()

        // Determine biometric type
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType("Face ID")
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType("Fingerprint")
        } else {
          setBiometricType("Biometric")
        }
      }
    } catch (error) {
      console.error("Error checking biometric availability:", error)
    }
  }

  const checkBiometricEnabled = async () => {
    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("biometric_auth_enabled")
        .eq("user_id", user.id)
        .single()

      if (error && error.code !== "PGRST116") throw error

      setIsEnabled(data?.biometric_auth_enabled || false)
    } catch (error) {
      console.error("Error checking biometric settings:", error)
    }
  }

  const toggleBiometricAuth = async () => {
    if (!isBiometricAvailable) {
      Alert.alert("Not Available", "Biometric authentication is not available on this device.")
      return
    }

    if (isEnabled) {
      // Disable biometric auth
      try {
        const { error } = await supabase
          .from("user_settings")
          .update({ biometric_auth_enabled: false })
          .eq("user_id", user.id)

        if (error) throw error

        setIsEnabled(false)
        Alert.alert("Success", "Biometric authentication has been disabled.")
      } catch (error) {
        console.error("Error disabling biometric auth:", error)
        Alert.alert("Error", "Failed to disable biometric authentication.")
      }
    } else {
      // Enable biometric auth - first authenticate
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to enable biometric login",
          fallbackLabel: "Use passcode",
        })

        if (result.success) {
          // Save setting to database
          const { error } = await supabase.from("user_settings").upsert({
            user_id: user.id,
            biometric_auth_enabled: true,
          })

          if (error) throw error

          setIsEnabled(true)
          Alert.alert("Success", "Biometric authentication has been enabled.")
        }
      } catch (error) {
        console.error("Error enabling biometric auth:", error)
        Alert.alert("Error", "Failed to enable biometric authentication.")
      }
    }
  }

  const authenticate = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: "Use passcode",
      })

      if (result.success) {
        onSuccess?.()
      } else if (result.error === "user_cancel") {
        onCancel?.()
      }
    } catch (error) {
      console.error("Error during biometric authentication:", error)
      Alert.alert("Error", "Authentication failed. Please try again.")
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.biometricRow}>
        <View style={styles.biometricInfo}>
          <Text style={styles.biometricTitle}>{biometricType} Authentication</Text>
          <Text style={styles.biometricDescription}>
            {isEnabled
              ? `Use ${biometricType} to quickly and securely log in`
              : `Enable ${biometricType} for faster, more secure login`}
          </Text>
        </View>
        {isBiometricAvailable && (
          <TouchableOpacity style={styles.biometricButton} onPress={toggleBiometricAuth}>
            <Feather
              name={isEnabled ? "toggle-right" : "toggle-left"}
              size={28}
              color={isEnabled ? COLORS.primary : COLORS.grayDark}
            />
          </TouchableOpacity>
        )}
      </View>

      {isBiometricAvailable && isEnabled && (
        <TouchableOpacity style={styles.authenticateButton} onPress={authenticate}>
          <Feather
            name={biometricType === "Face ID" ? "user" : biometricType === "Fingerprint" ? "fingerprint" : "shield"}
            size={20}
            color={COLORS.pureWhite}
            style={styles.authenticateIcon}
          />
          <Text style={styles.authenticateText}>Authenticate with {biometricType}</Text>
        </TouchableOpacity>
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
  },
  biometricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  biometricInfo: {
    flex: 1,
    marginRight: SIZES.md,
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  biometricDescription: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  biometricButton: {
    padding: SIZES.xs,
  },
  authenticateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.sm,
    paddingVertical: SIZES.sm,
    marginTop: SIZES.md,
  },
  authenticateIcon: {
    marginRight: SIZES.xs,
  },
  authenticateText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.pureWhite,
  },
})

