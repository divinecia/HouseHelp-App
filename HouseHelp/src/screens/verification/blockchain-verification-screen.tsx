"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import { useAuth } from "../../contexts/auth-context"
import {
  blockchainVerificationService,
  type VerificationCredential,
} from "../../services/blockchain-verification-service"
import { backgroundCheckService, type BackgroundCheck } from "../../services/background-check-service"
import { BlockchainCredentialCard } from "../../components/verification/blockchain-credential-card"
import { ImmutableBackgroundCheckCard } from "../../components/verification/immutable-background-check-card"

export const BlockchainVerificationScreen = () => {
  const navigation = useNavigation()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [credentials, setCredentials] = useState<VerificationCredential[]>([])
  const [backgroundChecks, setBackgroundChecks] = useState<BackgroundCheck[]>([])
  const [requestingCheck, setRequestingCheck] = useState(false)

  useEffect(() => {
    if (user) {
      fetchUserCredentials()
      fetchUserBackgroundChecks()
    }
  }, [user])

  const fetchUserCredentials = async () => {
    try {
      const { credentials, error } = await blockchainVerificationService.getUserCredentials(user.id)

      if (error) throw error

      setCredentials(credentials)
    } catch (error) {
      console.error("Error fetching user credentials:", error)
      Alert.alert("Error", "Failed to load blockchain credentials")
    } finally {
      setLoading(false)
    }
  }

  const fetchUserBackgroundChecks = async () => {
    try {
      const { checks, error } = await backgroundCheckService.getUserBackgroundChecks(user.id)

      if (error) throw error

      setBackgroundChecks(checks)
    } catch (error) {
      console.error("Error fetching background checks:", error)
    }
  }

  const handleRequestBackgroundCheck = async (checkType: string) => {
    setRequestingCheck(true)
    try {
      const { success, checkId, error } = await backgroundCheckService.requestBackgroundCheck(user.id, checkType as any)

      if (!success) throw new Error(error)

      Alert.alert(
        "Background Check Requested",
        "Your background check has been requested and will be processed. This may take some time to complete.",
      )

      // Refresh the list
      fetchUserBackgroundChecks()
    } catch (error) {
      console.error("Error requesting background check:", error)
      Alert.alert("Error", "Failed to request background check. Please try again.")
    } finally {
      setRequestingCheck(false)
    }
  }

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="shield" size={48} color={COLORS.grayDark} />
      <Text style={styles.emptyStateText}>No blockchain-verified credentials yet</Text>
      <Text style={styles.emptyStateSubtext}>Complete verification steps to get blockchain-protected credentials</Text>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading credentials...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blockchain Verification</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Feather name="shield" size={24} color={COLORS.primary} style={styles.infoIcon} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Immutable Verification</Text>
            <Text style={styles.infoText}>
              Your credentials are securely stored on the blockchain, making them tamper-proof and easily verifiable by
              third parties.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Background Checks</Text>

          {backgroundChecks.length > 0 ? (
            backgroundChecks.map((check) => (
              <ImmutableBackgroundCheckCard
                key={check.id}
                check={check}
                onVerify={(isValid) => {
                  if (isValid) {
                    Alert.alert("Verification Successful", "This background check is valid and blockchain-verified.")
                  }
                }}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Feather name="file-text" size={36} color={COLORS.grayDark} />
              <Text style={styles.emptyStateText}>No background checks yet</Text>
            </View>
          )}

          <View style={styles.checkOptionsContainer}>
            <Text style={styles.optionsTitle}>Request a Background Check</Text>
            <View style={styles.checkOptions}>
              <TouchableOpacity
                style={styles.checkOptionButton}
                onPress={() => handleRequestBackgroundCheck("identity")}
                disabled={requestingCheck}
              >
                <Feather name="user-check" size={24} color={COLORS.primary} />
                <Text style={styles.checkOptionText}>Identity</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkOptionButton}
                onPress={() => handleRequestBackgroundCheck("criminal")}
                disabled={requestingCheck}
              >
                <Feather name="shield" size={24} color={COLORS.primary} />
                <Text style={styles.checkOptionText}>Criminal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkOptionButton}
                onPress={() => handleRequestBackgroundCheck("employment")}
                disabled={requestingCheck}
              >
                <Feather name="briefcase" size={24} color={COLORS.primary} />
                <Text style={styles.checkOptionText}>Employment</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkOptionButton}
                onPress={() => handleRequestBackgroundCheck("comprehensive")}
                disabled={requestingCheck}
              >
                <Feather name="check-circle" size={24} color={COLORS.primary} />
                <Text style={styles.checkOptionText}>Comprehensive</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blockchain Credentials</Text>

          {credentials.length > 0
            ? credentials.map((credential) => (
                <BlockchainCredentialCard
                  key={credential.id}
                  credential={credential}
                  onVerify={(isValid) => {
                    if (isValid) {
                      Alert.alert("Verification Successful", "This credential is valid and blockchain-verified.")
                    }
                  }}
                />
              ))
            : renderEmptyState()}
        </View>

        <View style={styles.securityInfoCard}>
          <View style={styles.securityHeader}>
            <Feather name="lock" size={20} color={COLORS.text} />
            <Text style={styles.securityTitle}>How Blockchain Verification Works</Text>
          </View>
          <Text style={styles.securityText}>1. Your credentials are hashed and stored on a secure blockchain</Text>
          <Text style={styles.securityText}>2. Each credential has a unique transaction ID for verification</Text>
          <Text style={styles.securityText}>
            3. Third parties can verify your credentials without accessing your personal data
          </Text>
          <Text style={styles.securityText}>4. Once verified, credentials cannot be altered or tampered with</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: SIZES.md,
    fontSize: 16,
    color: COLORS.text,
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
  infoCard: {
    flexDirection: "row",
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.lg,
  },
  infoIcon: {
    marginRight: SIZES.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  section: {
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    padding: SIZES.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    marginTop: SIZES.sm,
    marginBottom: SIZES.xs,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
  },
  checkOptionsContainer: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginTop: SIZES.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  checkOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  checkOptionButton: {
    width: "48%",
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: SIZES.sm,
    padding: SIZES.sm,
    alignItems: "center",
    marginBottom: SIZES.sm,
  },
  checkOptionText: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: SIZES.xs,
  },
  securityInfoCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  securityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.sm,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginLeft: SIZES.xs,
  },
  securityText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
    paddingLeft: SIZES.md,
  },
})

