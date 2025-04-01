"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import { Button } from "../../components/UI/button"
import { supabase } from "../../config/supabase"
import { useAuth } from "../../contexts/auth-context"

export const RoleSelectionScreen = () => {
  const navigation = useNavigation()
  const { user } = useAuth()
  const [selectedRole, setSelectedRole] = useState<"household" | "worker" | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRoleSelect = (role: "household" | "worker") => {
    setSelectedRole(role)
  }

  const handleContinue = async () => {
    if (!selectedRole || !user) return

    setLoading(true)
    try {
      // Update user metadata with role
      const { error } = await supabase.auth.updateUser({
        data: { role: selectedRole },
      })

      if (error) throw error

      // Create profile record based on role
      if (selectedRole === "worker") {
        // Create worker profile
        const { error: profileError } = await supabase.from("worker_profiles").upsert({
          id: user.id,
          user_id: user.id,
          full_name: user.user_metadata?.full_name || "",
          services: [],
          experience_years: 0,
          hourly_rate: 0,
          bio: "",
          languages: ["English"],
          availability: [],
          location: user.user_metadata?.location || null,
          rating: 0,
          total_ratings: 0,
          verified: false,
          created_at: new Date().toISOString(),
        })

        if (profileError) throw profileError

        // Navigate to worker onboarding
        navigation.reset({
          index: 0,
          routes: [{ name: "WorkerOnboarding" }],
        })
      } else {
        // Navigate to household dashboard
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        })
      }
    } catch (error) {
      console.error("Error setting user role:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Role</Text>
        <Text style={styles.subtitle}>
          Select how you want to use HouseHelp. You can change this later in settings.
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[styles.optionCard, selectedRole === "household" && styles.selectedCard]}
          onPress={() => handleRoleSelect("household")}
          activeOpacity={0.8}
        >
          <View style={styles.optionIconContainer}>
            <Feather name="home" size={32} color={selectedRole === "household" ? COLORS.primary : COLORS.text} />
          </View>
          <Text style={styles.optionTitle}>I need help</Text>
          <Text style={styles.optionDescription}>Find and hire trusted workers for your household needs</Text>
          {selectedRole === "household" && (
            <View style={styles.checkmark}>
              <Feather name="check-circle" size={24} color={COLORS.primary} />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionCard, selectedRole === "worker" && styles.selectedCard]}
          onPress={() => handleRoleSelect("worker")}
          activeOpacity={0.8}
        >
          <View style={styles.optionIconContainer}>
            <Feather name="briefcase" size={32} color={selectedRole === "worker" ? COLORS.primary : COLORS.text} />
          </View>
          <Text style={styles.optionTitle}>I provide services</Text>
          <Text style={styles.optionDescription}>Offer your skills and services to households in your area</Text>
          {selectedRole === "worker" && (
            <View style={styles.checkmark}>
              <Feather name="check-circle" size={24} color={COLORS.primary} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Button title="Continue" onPress={handleContinue} disabled={!selectedRole || loading} loading={loading} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: SIZES.md,
  },
  header: {
    marginTop: SIZES.xl,
    marginBottom: SIZES.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: "center",
    gap: SIZES.xl,
  },
  optionCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    padding: SIZES.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  optionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SIZES.md,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  checkmark: {
    position: "absolute",
    top: SIZES.md,
    right: SIZES.md,
  },
  footer: {
    marginTop: SIZES.xl,
  },
})

