"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import { Button } from "../UI/button"
import { supabase } from "../../config/supabase"
import { useAuth } from "../../contexts/auth-context"
import * as Location from "expo-location"

interface SafetyCheckInProps {
  bookingId: string
  isWorker: boolean
}

export const SafetyCheckIn: React.FC<SafetyCheckInProps> = ({ bookingId, isWorker }) => {
  const { user } = useAuth()
  const [modalVisible, setModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkInStatus, setCheckInStatus] = useState<"pending" | "checked_in" | "completed">("pending")
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null)
  const [emergencyMode, setEmergencyMode] = useState(false)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (bookingId) {
      fetchCheckInStatus()
    }
  }, [bookingId])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (emergencyMode && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
    } else if (emergencyMode && countdown === 0) {
      triggerEmergencyAlert()
    }
    return () => clearTimeout(timer)
  }, [emergencyMode, countdown])

  const fetchCheckInStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("safety_check_ins")
        .select("*")
        .eq("booking_id", bookingId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") throw error

      if (data) {
        setCheckInStatus(data.status)
        setLastCheckIn(data.created_at)
      }
    } catch (error) {
      console.error("Error fetching check-in status:", error)
    }
  }

  const handleCheckIn = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== "granted") {
        Alert.alert(
          "Location Permission",
          "We need your location for safety check-in. Please enable location services.",
        )
        setLoading(false)
        return
      }

      const location = await Location.getCurrentPositionAsync({})

      // Record check-in
      const { error } = await supabase.from("safety_check_ins").insert({
        booking_id: bookingId,
        user_id: user.id,
        status: "checked_in",
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
        },
      })

      if (error) throw error

      setCheckInStatus("checked_in")
      setLastCheckIn(new Date().toISOString())

      // Close modal
      setModalVisible(false)

      // Show confirmation
      Alert.alert("Check-In Successful", "Your safety check-in has been recorded. Stay safe!")
    } catch (error) {
      console.error("Error during check-in:", error)
      Alert.alert("Error", "Failed to complete check-in. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteService = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Record final check-in
      const { error: checkInError } = await supabase.from("safety_check_ins").insert({
        booking_id: bookingId,
        user_id: user.id,
        status: "completed",
      })

      if (checkInError) throw checkInError

      // Update booking status if worker
      if (isWorker) {
        const { error: bookingError } = await supabase
          .from("bookings")
          .update({ status: "completed" })
          .eq("id", bookingId)

        if (bookingError) throw bookingError
      }

      setCheckInStatus("completed")
      setLastCheckIn(new Date().toISOString())

      // Close modal
      setModalVisible(false)

      // Show confirmation
      Alert.alert("Service Completed", "You have successfully completed this service. Thank you!")
    } catch (error) {
      console.error("Error completing service:", error)
      Alert.alert("Error", "Failed to complete service. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const triggerEmergencyAlert = async () => {
    if (!user) return

    try {
      // Get current location
      let location = null
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()

        if (status === "granted") {
          const locationData = await Location.getCurrentPositionAsync({})
          location = {
            latitude: locationData.coords.latitude,
            longitude: locationData.coords.longitude,
            accuracy: locationData.coords.accuracy,
          }
        }
      } catch (e) {
        console.error("Error getting location for emergency:", e)
      }

      // Record emergency alert
      const { error } = await supabase.from("safety_alerts").insert({
        booking_id: bookingId,
        user_id: user.id,
        alert_type: "emergency",
        location,
        status: "active",
      })

      if (error) throw error

      // Reset emergency mode
      setEmergencyMode(false)
      setCountdown(5)
      setModalVisible(false)

      // Show confirmation
      Alert.alert("Emergency Alert Sent", "Your emergency alert has been sent. Help is on the way.", [{ text: "OK" }])
    } catch (error) {
      console.error("Error sending emergency alert:", error)
      Alert.alert("Error", "Failed to send emergency alert. Please call emergency services directly.")

      // Reset emergency mode
      setEmergencyMode(false)
      setCountdown(5)
    }
  }

  const cancelEmergencyAlert = () => {
    setEmergencyMode(false)
    setCountdown(5)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <>
      <TouchableOpacity
        style={[
          styles.checkInButton,
          checkInStatus === "checked_in" && styles.checkedInButton,
          checkInStatus === "completed" && styles.completedButton,
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Feather
          name={
            checkInStatus === "pending" ? "shield" : checkInStatus === "checked_in" ? "check-circle" : "check-square"
          }
          size={20}
          color={COLORS.pureWhite}
          style={styles.checkInIcon}
        />
        <Text style={styles.checkInText}>
          {checkInStatus === "pending"
            ? "Safety Check-In"
            : checkInStatus === "checked_in"
              ? "Checked In"
              : "Completed"}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!emergencyMode) {
            setModalVisible(false)
          }
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {!emergencyMode ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Safety Check-In</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                    <Feather name="x" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.statusContainer}>
                    <View
                      style={[
                        styles.statusIndicator,
                        checkInStatus === "pending"
                          ? styles.pendingIndicator
                          : checkInStatus === "checked_in"
                            ? styles.checkedInIndicator
                            : styles.completedIndicator,
                      ]}
                    />
                    <Text style={styles.statusText}>
                      {checkInStatus === "pending"
                        ? "Not checked in"
                        : checkInStatus === "checked_in"
                          ? "Checked in"
                          : "Service completed"}
                    </Text>
                  </View>

                  {lastCheckIn && <Text style={styles.lastCheckInText}>Last check-in: {formatTime(lastCheckIn)}</Text>}

                  <View style={styles.infoContainer}>
                    <Feather name="info" size={20} color={COLORS.primary} style={styles.infoIcon} />
                    <Text style={styles.infoText}>
                      Regular check-ins help ensure your safety during service. Your location is only shared during
                      emergencies.
                    </Text>
                  </View>

                  <View style={styles.actionsContainer}>
                    {checkInStatus === "pending" && (
                      <Button
                        title="Check In Now"
                        onPress={handleCheckIn}
                        loading={loading}
                        style={styles.actionButton}
                      />
                    )}

                    {checkInStatus === "checked_in" && (
                      <Button
                        title="Complete Service"
                        onPress={handleCompleteService}
                        loading={loading}
                        style={styles.actionButton}
                      />
                    )}

                    <TouchableOpacity style={styles.emergencyButton} onPress={() => setEmergencyMode(true)}>
                      <Feather name="alert-triangle" size={20} color={COLORS.pureWhite} />
                      <Text style={styles.emergencyText}>Emergency</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emergencyContainer}>
                <View style={styles.emergencyHeader}>
                  <Feather name="alert-triangle" size={32} color={COLORS.error} />
                  <Text style={styles.emergencyTitle}>Emergency Alert</Text>
                </View>

                <Text style={styles.emergencyDescription}>
                  An emergency alert will be sent in {countdown} seconds. Emergency services and your emergency contacts
                  will be notified.
                </Text>

                <View style={styles.countdownContainer}>
                  <Text style={styles.countdownText}>{countdown}</Text>
                </View>

                <Button
                  title="Cancel"
                  onPress={cancelEmergencyAlert}
                  variant="outline"
                  style={styles.cancelEmergencyButton}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  checkInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.md,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
  },
  checkedInButton: {
    backgroundColor: COLORS.success,
  },
  completedButton: {
    backgroundColor: COLORS.grayDark,
  },
  checkInIcon: {
    marginRight: SIZES.xs,
  },
  checkInText: {
    color: COLORS.pureWhite,
    fontSize: 14,
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: COLORS.pureWhite,
    borderTopLeftRadius: SIZES.lg,
    borderTopRightRadius: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  closeButton: {
    padding: SIZES.xs,
  },
  modalBody: {
    padding: SIZES.md,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.md,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SIZES.xs,
  },
  pendingIndicator: {
    backgroundColor: COLORS.warning,
  },
  checkedInIndicator: {
    backgroundColor: COLORS.success,
  },
  completedIndicator: {
    backgroundColor: COLORS.grayDark,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  lastCheckInText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
  },
  infoContainer: {
    flexDirection: "row",
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: SIZES.sm,
    padding: SIZES.md,
    marginBottom: SIZES.lg,
  },
  infoIcon: {
    marginRight: SIZES.xs,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  actionsContainer: {
    gap: SIZES.md,
  },
  actionButton: {
    marginBottom: 0,
  },
  emergencyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.error,
    borderRadius: SIZES.md,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
  },
  emergencyText: {
    color: COLORS.pureWhite,
    fontSize: 16,
    fontWeight: "500",
    marginLeft: SIZES.xs,
  },
  emergencyContainer: {
    padding: SIZES.md,
    alignItems: "center",
  },
  emergencyHeader: {
    alignItems: "center",
    marginBottom: SIZES.md,
  },
  emergencyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.error,
    marginTop: SIZES.sm,
  },
  emergencyDescription: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SIZES.lg,
  },
  countdownContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SIZES.lg,
  },
  countdownText: {
    fontSize: 36,
    fontWeight: "bold",
    color: COLORS.pureWhite,
  },
  cancelEmergencyButton: {
    width: "100%",
  },
})

