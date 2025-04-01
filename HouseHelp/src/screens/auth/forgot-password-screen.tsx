"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { FormInput } from "../../components/UI/form-input"
import { Button } from "../../components/UI/button"
import { useAuth } from "../../contexts/auth-context"

export const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState("")

  const navigation = useNavigation()
  const { resetPassword } = useAuth()

  const validateEmail = () => {
    if (!email) {
      setError("Email is required")
      return false
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Email is invalid")
      return false
    }
    setError("")
    return true
  }

  const handleResetPassword = async () => {
    if (!validateEmail()) return

    setLoading(true)
    try {
      const { error } = await resetPassword(email)
      if (error) throw error

      setEmailSent(true)
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send reset password email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {emailSent
              ? "Check your email for a link to reset your password"
              : "Enter your email and we'll send you a link to reset your password"}
          </Text>
        </View>

        {!emailSent ? (
          <View style={styles.form}>
            <FormInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              error={error}
            />

            <Button
              title="Send Reset Link"
              onPress={handleResetPassword}
              loading={loading}
              style={styles.resetButton}
            />
          </View>
        ) : (
          <Button
            title="Back to Login"
            onPress={() => navigation.navigate("Login")}
            variant="outline"
            style={styles.backButton}
          />
        )}

        {!emailSent && (
          <TouchableOpacity style={styles.backToLogin} onPress={() => navigation.goBack()}>
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  header: {
    marginBottom: 30,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  resetButton: {
    marginTop: 16,
  },
  backButton: {
    marginTop: 20,
  },
  backToLogin: {
    marginTop: 20,
    alignItems: "center",
  },
  backToLoginText: {
    color: "#007AFF",
    fontSize: 16,
  },
})

