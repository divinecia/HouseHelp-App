"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { VerificationCard } from "../../components/verification/verification-card"
import { BackgroundCheckCard } from "../../components/verification/background-check-card"
import {
  verificationService,
  type UserVerification,
  type VerificationType,
  type BackgroundCheckRequest,
} from "../../services/verification-service"
import { useAuth } from "../../contexts/auth-context"
import { COLORS, SIZES } from "../../config/theme"
import { Button } from "../../components/UI/button"

export const VerificationsScreen = () => {
  const navigation = useNavigation()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<"verifications" | "background">("verifications")
  const [verifications, setVerifications] = useState<UserVerification[]>([])
  const [backgroundChecks, setBackgroundChecks] = useState<BackgroundCheckRequest[]>([])
  const [verificationTypes, setVerificationTypes] = useState<VerificationType[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [types, userVerifications, backgroundChecks] = await Promise.all([
        verificationService.getVerificationTypes(),
        verificationService.getUserVerifications(user.id),
        verificationService.getBackgroundCheckRequests(user.id),
      ])

      setVerificationTypes(types)
      setVerifications(userVerifications)
      setBackgroundChecks(backgroundChecks)
    } catch (error) {
      console.error("Error fetching verification data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleVerificationPress = (verification: UserVerification) => {
    navigation.navigate("VerificationDetails", { verificationId: verification.id })
  }

  const handleBackgroundCheckPress = (check: BackgroundCheckRequest) => {
    navigation.navigate("BackgroundCheckDetails", { checkId: check.id })
  }

  const handleRequestVerification = () => {
    if (verificationTypes.length === 0) {
      Alert.alert("Error", "No verification types available")
      return
    }

    // Show verification type options
    Alert.alert(
      "Request Verification",
      "Select verification type:",
      verificationTypes.map((type) => ({
        text: type.name,
        onPress: () => initiateVerificationRequest(type.id),
      })),
      { cancelable: true },
    )
  }

  const initiateVerificationRequest = async (typeId: string) => {
    if (!user) return

    try {
      const result = await verificationService.requestVerification(user.id, typeId)

      if (result.success) {
        navigation.navigate("VerificationDetails", {
          verificationId: result.verificationId,
        })
      } else {
        Alert.alert("Error", result.error || "Failed to request verification")
      }
    } catch (error) {
      console.error("Error initiating verification request:", error)
      Alert.alert("Error", "Failed to request verification")
    }
  }

  const handleRequestBackgroundCheck = () => {
    // Show background check type options
    Alert.alert(
      "Request Background Check",
      "Select check type:",
      [
        {
          text: "Basic Check",
          onPress: () => initiateBackgroundCheck("basic"),
        },
        {
          text: "Standard Check",
          onPress: () => initiateBackgroundCheck("standard"),
        },
        {
          text: "Comprehensive Check",
          onPress: () => initiateBackgroundCheck("comprehensive"),
        },
      ],
      { cancelable: true },
    )
  }

  const initiateBackgroundCheck = async (checkType: "basic" | "standard" | "comprehensive") => {
    if (!user) return

    try {
      const result = await verificationService.requestBackgroundCheck(user.id, checkType)

      if (result.success) {
        Alert.alert(
          "Background Check Requested",
          "Your background check request has been submitted. You will be notified once it is processed.",
          [
            {
              text: "OK",
              onPress: () => {
                fetchData()
                setActiveTab("background")
              },
            },
          ],
        )
      } else {
        Alert.alert("Error", result.error || "Failed to request background check")
      }
    } catch (error) {
      console.error("Error initiating background check:", error)
      Alert.alert("Error", "Failed to request background check")
    }
  }

  const renderVerificationsTab = () => {
    if (verifications.length === 0 && !loading) {
      return (
        <View style={styles.emptyContainer}>
          <Feather name="shield" size={64} color={COLORS.grayDark} />
          <Text style={styles.emptyTitle}>No Verifications</Text>
          <Text style={styles.emptyText}>Request a verification to increase your profile trustworthiness</Text>
          <Button title="Request Verification" onPress={handleRequestVerification} style={styles.emptyButton} />
        </View>
      )
    }

    return (
      <FlatList
        data={verifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <VerificationCard verification={item} onPress={handleVerificationPress} />}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    )
  }

  const renderBackgroundChecksTab = () => {
    if (backgroundChecks.length === 0 && !loading) {
      return (
        <View style={styles.emptyContainer}>
          <Feather name="file-text" size={64} color={COLORS.grayDark} />
          <Text style={styles.emptyTitle}>No Background Checks</Text>
          <Text style={styles.emptyText}>Request a background check to verify your identity and history</Text>
          <Button title="Request Background Check" onPress={handleRequestBackgroundCheck} style={styles.emptyButton} />
        </View>
      )
    }

    return (
      <FlatList
        data={backgroundChecks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BackgroundCheckCard check={item} onPress={handleBackgroundCheckPress} />}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "verifications" && styles.activeTab]}
          onPress={() => setActiveTab("verifications")}
        >
          <Text style={[styles.tabText, activeTab === "verifications" && styles.activeTabText]}>Verifications</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "background" && styles.activeTab]}
          onPress={() => setActiveTab("background")}
        >
          <Text style={[styles.tabText, activeTab === "background" && styles.activeTabText]}>Background Checks</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === "verifications" ? renderVerificationsTab() : renderBackgroundChecksTab()}
      </View>

      <View style={styles.footer}>
        <Button
          title={activeTab === "verifications" ? "Request Verification" : "Request Background Check"}
          onPress={activeTab === "verifications" ? handleRequestVerification : handleRequestBackgroundCheck}
        />
      </View>

      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.pureWhite,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SIZES.md,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  footer: {
    backgroundColor: COLORS.pureWhite,
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: `${COLORS.white}80`,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: SIZES.md,
    marginBottom: SIZES.xs,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: SIZES.lg,
  },
  emptyButton: {
    width: "100%",
    maxWidth: 300,
  },
})

