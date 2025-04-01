"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native"
import { useRoute, useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { COLORS, SIZES } from "../../config/theme"
import { Button } from "../../components/UI/button"
import { supabase } from "../../config/supabase"
import { useAuth } from "../../contexts/auth-context"
import { escrowService, type EscrowDispute, type DisputeReason } from "../../services/escrow-service"
import * as FileSystem from "expo-file-system"
import { decode } from "base64-arraybuffer"

export const DisputeResolutionScreen = () => {
  const route = useRoute()
  const navigation = useNavigation()
  const { user } = useAuth()
  const { escrowId, bookingId } = route.params as { escrowId: string; bookingId: string }

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [escrow, setEscrow] = useState<any>(null)
  const [booking, setBooking] = useState<any>(null)
  const [existingDispute, setExistingDispute] = useState<EscrowDispute | null>(null)
  const [reason, setReason] = useState<DisputeReason | "">("")
  const [description, setDescription] = useState("")
  const [evidenceImages, setEvidenceImages] = useState<string[]>([])
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])

  useEffect(() => {
    if (escrowId) {
      fetchEscrowDetails()
      fetchBookingDetails()
      checkExistingDispute()
    }
  }, [escrowId])

  const fetchEscrowDetails = async () => {
    try {
      const { escrow, error } = await escrowService.getEscrowDetails(escrowId)
      if (error) throw error
      setEscrow(escrow)
    } catch (error) {
      console.error("Error fetching escrow details:", error)
      Alert.alert("Error", "Failed to load escrow details")
    } finally {
      setLoading(false)
    }
  }

  const fetchBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          worker:worker_id (id, full_name, profile_image),
          household:user_id (id, full_name, profile_image)
        `)
        .eq("id", bookingId)
        .single()

      if (error) throw error
      setBooking(data)
    } catch (error) {
      console.error("Error fetching booking details:", error)
    }
  }

  const checkExistingDispute = async () => {
    try {
      const { data, error } = await supabase.from("escrow_disputes").select("*").eq("escrow_id", escrowId).single()

      if (error && error.code !== "PGRST116") throw error

      if (data) {
        setExistingDispute(data)
        setReason(data.reason)
        setDescription(data.description)

        // Get existing evidence
        if (data.evidence_urls && data.evidence_urls.length > 0) {
          setUploadedUrls(data.evidence_urls)
        }
      }
    } catch (error) {
      console.error("Error checking existing dispute:", error)
    }
  }

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setEvidenceImages([...evidenceImages, result.assets[0].uri])
      }
    } catch (error) {
      console.error("Error picking image:", error)
      Alert.alert("Error", "Failed to select image")
    }
  }

  const uploadEvidence = async (): Promise<string[]> => {
    if (evidenceImages.length === 0) return []

    const uploadedUrls: string[] = []

    for (const uri of evidenceImages) {
      try {
        // Generate a unique filename
        const filename = `dispute_${escrowId}_${Date.now()}_${uploadedUrls.length}.jpg`
        const filePath = `dispute_evidence/${filename}`

        // Convert image to base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        })

        // Upload to storage
        const { error: uploadError, data } = await supabase.storage.from("disputes").upload(filePath, decode(base64), {
          contentType: "image/jpeg",
        })

        if (uploadError) throw uploadError

        // Get public URL
        const { data: urlData } = supabase.storage.from("disputes").getPublicUrl(filePath)

        if (urlData.publicUrl) {
          uploadedUrls.push(urlData.publicUrl)
        }
      } catch (error) {
        console.error("Error uploading evidence:", error)
      }
    }

    return uploadedUrls
  }

  const handleSubmitDispute = async () => {
    if (!reason || !description) {
      Alert.alert("Error", "Please provide a reason and description for the dispute")
      return
    }

    setSubmitting(true)
    try {
      // Upload evidence images
      const newUploadedUrls = await uploadEvidence()
      const allUrls = [...uploadedUrls, ...newUploadedUrls]

      if (existingDispute) {
        // Add evidence to existing dispute
        const { success, error } = await escrowService.addDisputeEvidence(existingDispute.id, user.id, allUrls)

        if (!success) throw new Error(error)

        Alert.alert("Evidence Added", "Your additional evidence has been added to the dispute", [
          { text: "OK", onPress: () => navigation.goBack() },
        ])
      } else {
        // Create new dispute
        const { success, disputeId, error } = await escrowService.initiateDispute(
          escrowId,
          user.id,
          reason as DisputeReason,
          description,
          allUrls,
        )

        if (!success) throw new Error(error)

        Alert.alert("Dispute Submitted", "Your dispute has been submitted and will be reviewed by our team", [
          { text: "OK", onPress: () => navigation.goBack() },
        ])
      }
    } catch (error) {
      console.error("Error submitting dispute:", error)
      Alert.alert("Error", "Failed to submit dispute. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const renderDisputeStatus = () => {
    if (!existingDispute) return null

    let statusColor = COLORS.warning
    if (existingDispute.status === "resolved") {
      statusColor = COLORS.success
    } else if (existingDispute.status === "under_review") {
      statusColor = COLORS.primary
    }

    return (
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        <Text style={styles.statusText}>Status: {existingDispute.status.replace("_", " ").toUpperCase()}</Text>
      </View>
    )
  }

  const renderResolution = () => {
    if (!existingDispute || existingDispute.status !== "resolved") return null

    return (
      <View style={styles.resolutionContainer}>
        <Text style={styles.resolutionTitle}>Resolution</Text>
        <Text style={styles.resolutionText}>
          {existingDispute.resolution === "release"
            ? "Funds released to worker"
            : existingDispute.resolution === "refund"
              ? "Funds refunded to client"
              : "Partial funds released"}
        </Text>
        {existingDispute.resolution_notes && (
          <Text style={styles.resolutionNotes}>{existingDispute.resolution_notes}</Text>
        )}
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dispute details...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{existingDispute ? "Dispute Details" : "Report a Dispute"}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderDisputeStatus()}

        {booking && (
          <View style={styles.bookingCard}>
            <Text style={styles.bookingTitle}>Booking Details</Text>
            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabel}>Service:</Text>
              <Text style={styles.bookingValue}>
                {booking.services[0]?.charAt(0).toUpperCase() + booking.services[0]?.slice(1) || "Service"}
              </Text>
            </View>
            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabel}>Date:</Text>
              <Text style={styles.bookingValue}>{new Date(booking.start_time).toLocaleDateString()}</Text>
            </View>
            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabel}>Amount:</Text>
              <Text style={styles.bookingValue}>${escrow?.amount.toFixed(2) || booking.total_amount.toFixed(2)}</Text>
            </View>
            <View style={styles.partiesContainer}>
              <View style={styles.partyCard}>
                <Image
                  source={
                    booking.household?.profile_image
                      ? { uri: booking.household.profile_image }
                      : require("../../assets/default-avatar.png")
                  }
                  style={styles.partyImage}
                />
                <Text style={styles.partyName}>{booking.household?.full_name || "Client"}</Text>
                <Text style={styles.partyRole}>Client</Text>
              </View>
              <Feather name="arrow-right" size={20} color={COLORS.textLight} />
              <View style={styles.partyCard}>
                <Image
                  source={
                    booking.worker?.profile_image
                      ? { uri: booking.worker.profile_image }
                      : require("../../assets/default-avatar.png")
                  }
                  style={styles.partyImage}
                />
                <Text style={styles.partyName}>{booking.worker?.full_name || "Worker"}</Text>
                <Text style={styles.partyRole}>Worker</Text>
              </View>
            </View>
          </View>
        )}

        {renderResolution()}

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>{existingDispute ? "Dispute Information" : "Report a Problem"}</Text>

          <Text style={styles.label}>Reason for Dispute</Text>
          <View style={styles.reasonContainer}>
            {[
              { value: "service_not_completed", label: "Service Not Completed" },
              { value: "quality_issues", label: "Quality Issues" },
              { value: "worker_no_show", label: "Worker No-Show" },
              { value: "time_discrepancy", label: "Time Discrepancy" },
              { value: "other", label: "Other" },
            ].map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[styles.reasonItem, reason === item.value && styles.selectedReasonItem]}
                onPress={() => setReason(item.value as DisputeReason)}
                disabled={!!existingDispute}
              >
                <Text style={[styles.reasonText, reason === item.value && styles.selectedReasonText]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue in detail..."
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            editable={!existingDispute}
          />

          <Text style={styles.label}>Evidence</Text>
          <Text style={styles.evidenceDescription}>Upload photos or screenshots as evidence for your dispute</Text>

          <View style={styles.evidenceContainer}>
            {uploadedUrls.map((url, index) => (
              <View key={`uploaded-${index}`} style={styles.evidenceItem}>
                <Image source={{ uri: url }} style={styles.evidenceImage} />
              </View>
            ))}

            {evidenceImages.map((uri, index) => (
              <View key={`new-${index}`} style={styles.evidenceItem}>
                <Image source={{ uri }} style={styles.evidenceImage} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => {
                    const newImages = [...evidenceImages]
                    newImages.splice(index, 1)
                    setEvidenceImages(newImages)
                  }}
                >
                  <Feather name="x" size={16} color={COLORS.pureWhite} />
                </TouchableOpacity>
              </View>
            ))}

            {(existingDispute?.status !== "resolved" || !existingDispute) && (
              <TouchableOpacity style={styles.addEvidenceButton} onPress={pickImage}>
                <Feather name="plus" size={24} color={COLORS.primary} />
                <Text style={styles.addEvidenceText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {(existingDispute?.status !== "resolved" || !existingDispute) && (
          <Button
            title={existingDispute ? "Add Evidence" : "Submit Dispute"}
            onPress={handleSubmitDispute}
            loading={submitting}
            disabled={submitting || (!existingDispute && (!reason || !description))}
            style={styles.submitButton}
          />
        )}

        <View style={styles.infoCard}>
          <Feather name="info" size={20} color={COLORS.primary} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            Our team will review your dispute within 24-48 hours. Both parties will be contacted during the resolution
            process.
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
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
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
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SIZES.sm,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  bookingCard: {
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
  bookingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  bookingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.xs,
  },
  bookingLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  bookingValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  partiesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  partyCard: {
    alignItems: "center",
  },
  partyImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: SIZES.xs,
  },
  partyName: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  partyRole: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  resolutionContainer: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resolutionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  resolutionText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  resolutionNotes: {
    fontSize: 14,
    color: COLORS.textLight,
    fontStyle: "italic",
  },
  formSection: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  reasonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: SIZES.md,
  },
  reasonItem: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    margin: SIZES.xs,
  },
  selectedReasonItem: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  reasonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectedReasonText: {
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  descriptionInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.sm,
    padding: SIZES.sm,
    fontSize: 16,
    minHeight: 120,
    marginBottom: SIZES.md,
  },
  evidenceDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SIZES.sm,
  },
  evidenceContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: SIZES.sm,
  },
  evidenceItem: {
    width: 100,
    height: 100,
    borderRadius: SIZES.sm,
    margin: SIZES.xs,
    position: "relative",
  },
  evidenceImage: {
    width: "100%",
    height: "100%",
    borderRadius: SIZES.sm,
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: COLORS.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  addEvidenceButton: {
    width: 100,
    height: 100,
    borderRadius: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    margin: SIZES.xs,
  },
  addEvidenceText: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: SIZES.xs,
  },
  submitButton: {
    marginBottom: SIZES.md,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: SIZES.md,
    padding: SIZES.md,
  },
  infoIcon: {
    marginRight: SIZES.xs,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    lineHeight: 20,
  },
})

