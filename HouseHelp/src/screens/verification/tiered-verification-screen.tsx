"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import { Button } from "../../components/UI/button"
import { supabase } from "../../config/supabase"
import { useAuth } from "../../contexts/auth-context"
import { verificationService } from "../../services/verification-service"

type VerificationTier = {
  id: string
  name: string
  description: string
  requirements: string[]
  benefits: string[]
  price: number
  isActive: boolean
}

export const TieredVerificationScreen = () => {
  const navigation = useNavigation()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [tiers, setTiers] = useState<VerificationTier[]>([])
  const [userTier, setUserTier] = useState<string | null>(null)
  const [processingTier, setProcessingTier] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchVerificationTiers()
      fetchUserVerificationStatus()
    }
  }, [user])

  const fetchVerificationTiers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("verification_tiers")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true })

      if (error) throw error

      setTiers(data || [])
    } catch (error) {
      console.error("Error fetching verification tiers:", error)
      Alert.alert("Error", "Failed to load verification tiers")
    } finally {
      setLoading(false)
    }
  }

  const fetchUserVerificationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("user_verification_tiers")
        .select("tier_id, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") throw error

      if (data) {
        if (data.status === "approved") {
          setUserTier(data.tier_id)
        } else if (data.status === "pending" || data.status === "processing") {
          setProcessingTier(data.tier_id)
        }
      }
    } catch (error) {
      console.error("Error fetching user verification status:", error)
    }
  }

  const handleRequestVerification = async (tierId: string) => {
    try {
      // Check if user has completed basic profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", user.id)
        .single()

      if (profileError) throw profileError

      if (!profile.full_name || !profile.email || !profile.phone) {
        Alert.alert(
          "Profile Incomplete",
          "Please complete your basic profile information before requesting verification.",
          [
            {
              text: "Go to Profile",
              onPress: () => navigation.navigate("Profile"),
            },
            { text: "Cancel", style: "cancel" },
          ],
        )
        return
      }

      // Request verification
      const { success, error } = await verificationService.requestTierVerification(user.id, tierId)

      if (!success) throw new Error(error)

      setProcessingTier(tierId)
      Alert.alert(
        "Verification Requested",
        "Your verification request has been submitted. You will be guided through the verification process.",
        [
          {
            text: "Continue",
            onPress: () => navigation.navigate("VerificationProcess", { tierId }),
          },
        ],
      )
    } catch (error) {
      console.error("Error requesting verification:", error)
      Alert.alert("Error", "Failed to request verification. Please try again.")
    }
  }

  const renderTierCard = (tier: VerificationTier) => {
    const isCurrentTier = userTier === tier.id
    const isProcessing = processingTier === tier.id
    const isDisabled = !!userTier || !!processingTier

    return (
      <View key={tier.id} style={[styles.tierCard, isCurrentTier && styles.currentTierCard]}>
        {isCurrentTier && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current</Text>
          </View>
        )}
        {isProcessing && (
          <View style={[styles.currentBadge, styles.processingBadge]}>
            <Text style={styles.currentBadgeText}>Processing</Text>
          </View>
        )}

        <Text style={styles.tierName}>{tier.name}</Text>
        <Text style={styles.tierDescription}>{tier.description}</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Requirements</Text>
        {tier.requirements.map((req, index) => (
          <View key={index} style={styles.listItem}>
            <Feather name="check" size={16} color={COLORS.success} style={styles.listIcon} />
            <Text style={styles.listText}>{req}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Benefits</Text>
        {tier.benefits.map((benefit, index) => (
          <View key={index} style={styles.listItem}>
            <Feather name="star" size={16} color={COLORS.primary} style={styles.listIcon} />
            <Text style={styles.listText}>{benefit}</Text>
          </View>
        ))}

        <View style={styles.tierFooter}>
          <Text style={styles.tierPrice}>{tier.price > 0 ? `$${tier.price.toFixed(2)}` : "Free"}</Text>
          <Button
            title={isCurrentTier ? "Verified" : isProcessing ? "Processing" : "Get Verified"}
            onPress={() => handleRequestVerification(tier.id)}
            disabled={isCurrentTier || isProcessing || isDisabled}
            style={styles.tierButton}
          />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification Levels</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.introText}>
          Enhance your profile's credibility with our tiered verification system. Higher verification levels increase
          trust and visibility.
        </Text>

        {tiers.map(renderTierCard)}

        <View style={styles.infoCard}>
          <Feather name="info" size={24} color={COLORS.primary} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            All verification data is securely stored and encrypted. Your privacy is our priority.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.lg,
    paddingHorizontal: SIZES.md,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: SIZES.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.white,
  },
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  introText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SIZES.lg,
  },
  tierCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  currentTierCard: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  currentBadge: {
    position: "absolute",
    top: -10,
    right: SIZES.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.xs,
  },
  processingBadge: {
    backgroundColor: COLORS.warning,
  },
  currentBadgeText: {
    color: COLORS.pureWhite,
    fontSize: 12,
    fontWeight: "600",
  },
  tierName: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  tierDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.xs,
    marginTop: SIZES.sm,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SIZES.xs,
  },
  listIcon: {
    marginRight: SIZES.xs,
    marginTop: 2,
  },
  listText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  tierFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SIZES.md,
  },
  tierPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  tierButton: {
    minWidth: 120,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginTop: SIZES.md,
  },
  infoIcon: {
    marginRight: SIZES.sm,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
})

