"use client"

import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { FormInput } from "../../components/UI/form-input"
import { Button } from "../../components/UI/button"
import { SocialButton } from "../../components/UI/social-button"
import { useAuth } from "../../contexts/auth-context"

export const RegisterScreen = () => {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    fullName?: string
    email?: string
    phoneNumber?: string
    password?: string
    confirmPassword?: string
    terms?: string
  }>({})

  const navigation = useNavigation()
  const { signUp } = useAuth()

  const validateForm = () => {
    const newErrors: {
      fullName?: string
      email?: string
      phoneNumber?: string
      password?: string
      confirmPassword?: string
      terms?: string
    } = {}

    if (!fullName) {
      newErrors.fullName = "Full name is required"
    }

    if (!email) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid"
    }

    if (!phoneNumber) {
      newErrors.phoneNumber = "Phone number is required"
    } else if (!/^\+250\d{9}$/.test(phoneNumber)) {
      newErrors.phoneNumber = "Please enter a valid Rwandan phone number (+250XXXXXXXXX)"
    }

    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    } else if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      newErrors.password = "Password must contain both letters and numbers"
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    if (!agreeToTerms) {
      newErrors.terms = "You must agree to the terms and conditions"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleRegister = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const userData = {
        full_name: fullName,
        phone_number: phoneNumber,
      }

      const { error } = await signUp(email, password, userData)
      if (error) throw error

      Alert.alert("Registration Successful", "Please check your email for verification instructions.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ])
    } catch (error: any) {
      Alert.alert("Registration Failed", error.message || "An error occurred during registration")
    } finally {
      setLoading(false)
    }
  }

  const handleSocialSignUp = (provider: "google" | "apple" | "facebook") => {
    // Implement social sign up with Supabase
    Alert.alert("Coming Soon", `${provider} sign up will be available soon`)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </View>

        <View style={styles.form}>
          <FormInput
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="John Doe"
            autoCapitalize="words"
            error={errors.fullName}
          />

          <FormInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            error={errors.email}
          />

          <FormInput
            label="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+250XXXXXXXXX"
            keyboardType="phone-pad"
            error={errors.phoneNumber}
          />

          <FormInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry
            error={errors.password}
          />

          <FormInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry
            error={errors.confirmPassword}
          />

          <View style={styles.termsContainer}>
            <TouchableOpacity style={styles.checkbox} onPress={() => setAgreeToTerms(!agreeToTerms)}>
              <View style={[styles.checkboxInner, agreeToTerms && styles.checkboxChecked]} />
            </TouchableOpacity>
            <View style={styles.termsTextContainer}>
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
              {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}
            </View>
          </View>

          <Button title="Create Account" onPress={handleRegister} loading={loading} style={styles.registerButton} />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <SocialButton provider="google" onPress={() => handleSocialSignUp("google")} />
          <SocialButton provider="apple" onPress={() => handleSocialSignUp("apple")} />
          <SocialButton provider="facebook" onPress={() => handleSocialSignUp("facebook")} />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginTop: 40,
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
  },
  form: {
    width: "100%",
  },
  termsContainer: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "flex-start",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#007AFF",
    marginRight: 10,
    marginTop: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  checkboxChecked: {
    backgroundColor: "#007AFF",
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    fontSize: 14,
    color: "#666",
  },
  termsLink: {
    color: "#007AFF",
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 12,
    marginTop: 4,
  },
  registerButton: {
    marginTop: 8,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#666",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  loginText: {
    color: "#666",
  },
  loginLink: {
    color: "#007AFF",
    fontWeight: "500",
  },
})

