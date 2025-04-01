"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, Alert } from "react-native"
import { useRoute, useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { verificationService, type UserVerification } from "../../services/verification-service"
import { useAuth } from "../../contexts/auth-context"
import { COLORS, SIZES } from "../../config/theme"
import { Button } from "../../components/UI/button"

export const VerificationDetailsScreen = () => {
  const route = useRoute()
  const navigation = useNavigation()
  const { verificationId } = route.params as { verificationId: string }
  const { user } = useAuth()

  const [verification, setVerification] = useState<UserVerification | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchVerification()
    }
  }, [user, verificationId])

  const fetchVerification = async () => {
    setLoading(true)
    try {
      const verifications = await verificationService.getUserVerifications(user.id)
      const found = verifications.find((v) => v.id === verificationId)

      if (found) {
        setVerification(found)
      } else {
        Alert.alert("Error", "Verification not found")
        navigation.goBack()
      }
    } catch (error) {
      console.error("Error fetching verification:", error)
      Alert.alert("Error", "Failed to load verification details")
    } finally {
      setLoading(false)
    }
  }

  const handleAddDocument = async () => {
    if (!verification) return

    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (status !== "granted") {
      Alert.alert("Permission Required", "Please grant permission to access your media library")
      return
    }

    // Show document type options
    Alert.alert(
      "Select Document Type",
      "What type of document are you uploading?",
      [
        {
          text: "ID Card",
          onPress: () => pickImage("ID Card"),
        },
        {
          text: "Passport",
          onPress: () => pickImage("Passport"),
        },
        {
          text: "Driver License",
          onPress: () => pickImage("Driver License"),
        },
        {
          text: "Certificate",
          onPress: () => pickImage("Certificate"),
        },
        {
          text: "Other",
          onPress: () => pickImage("Other"),
        },
      ],
      { cancelable: true },
    )
  }

  const pickImage = async (documentType: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadDocument(result.assets[0].uri, documentType)
      }
    } catch (error) {
      console.error("Error picking image:", error)
      Alert.alert("Error", "Failed to pick image")
    }
  }

  const uploadDocument = async (uri: string, documentType: string) => {
    if (!verification) return

    setUploading(true)
    try {
      const result = await verificationService.uploadVerificationDocument(verification.id, documentType, uri)

      if (result.success) {
        Alert.alert("Success", "Document uploaded successfully")
        fetchVerification()
      } else {
        Alert.alert("Error", result.error || "Failed to upload document")
      }
    } catch (error) {
      console.error("Error uploading document:", error)
      Alert.alert("Error", "Failed to upload document")
    } finally {
      setUploading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"

    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusColor = () => {
    if (!verification) return COLORS.grayDark

    switch (verification.status) {
      case "approved":
        return COLORS.success
      case "pending":
        return COLORS.warning
      case "rejected":
        return COLORS.error
      case "expired":
        return COLORS.grayDark
      default:
        return COLORS.grayDark
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!verification) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Verification not found</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} style={styles.errorButton} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statusText}>
              {verification.status.charAt(0).toUpperCase() + verification.status.slice(1)}
            </Text>
          </View>

          <Text style={styles.title}>{verification.verification_type_name}</Text>

          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Requested:</Text>
              <Text style={styles.infoValue}>{formatDate(verification.created_at)}</Text>
            </View>

            {verification.verified_at && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Verified:</Text>
                <Text style={styles.infoValue}>{formatDate(verification.verified_at)}</Text>
              </View>
            )}

            {verification.expires_at && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Expires:</Text>
                <Text style={styles.infoValue}>{formatDate(verification.expires_at)}</Text>
              </View>
            )}
          </View>

          {verification.rejection_reason && (
            <View style={styles.rejectionContainer}>
              <Text style={styles.rejectionTitle}>Reason for Rejection</Text>
              <Text style={styles.rejectionText}>{verification.rejection_reason}</Text>
            </View>
          )}
        </View>

        <View style={styles.documentsSection}>
          <Text style={styles.sectionTitle}>Documents</Text>

          {verification.documents && verification.documents.length > 0 ? (
            <View style={styles.documentsList}>
              {verification.documents.map((doc) => (
                <View key={doc.id} style={styles.documentCard}>
                  <Image source={{ uri: doc.document_url }} style={styles.documentImage} resizeMode="cover" />
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentType}>{doc.document_type}</Text>
                    <Text style={styles.documentDate}>{formatDate(doc.created_at)}</Text>
                    {doc.is_verified && (
                      <View style={styles.verifiedBadge}>
                        <Feather name="check" size={12} color={COLORS.pureWhite} />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noDocumentsContainer}>
              <Feather name="file" size={48} color={COLORS.grayDark} />
              <Text style={styles.noDocumentsText}>No documents uploaded yet</Text>
            </View>
          )}

          {verification.status === "pending" && (
            <Button
              title="Add Document"
              onPress={handleAddDocument}
              disabled={uploading}
              loading={uploading}
              style={styles.addButton}
            />
          )}
        </View>

        {verification.status === "rejected" && (
          <View style={styles.actionSection}>
            <Text style={styles.actionText}>
              Your verification was rejected. You can resubmit with the correct documents.
            </Text>
            <Button title="Resubmit Verification" onPress={fetchVerification} style={styles.resubmitButton} />
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    padding: SIZES.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.lg,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.text,
    marginVertical: SIZES.md,
  },
  errorButton: {
    width: 200,
  },
  header: {
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
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.sm,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SIZES.xs,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  infoContainer: {
    marginBottom: SIZES.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.xs,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  rejectionContainer: {
    backgroundColor: `${COLORS.error}10`,
    padding: SIZES.md,
    borderRadius: SIZES.sm,
  },
  rejectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.error,
    marginBottom: SIZES.xs,
  },
  rejectionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  documentsSection: {
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
  documentsList: {
    marginBottom: SIZES.md,
  },
  documentCard: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.sm,
    overflow: "hidden",
    marginBottom: SIZES.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  documentImage: {
    width: 80,
    height: 80,
  },
  documentInfo: {
    flex: 1,
    padding: SIZES.sm,
    justifyContent: "center",
  },
  documentType: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.success,
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: SIZES.xs,
    alignSelf: "flex-start",
  },
  verifiedText: {
    fontSize: 10,
    color: COLORS.pureWhite,
    fontWeight: "600",
    marginLeft: 2,
  },
  noDocumentsContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: SIZES.xl,
  },
  noDocumentsText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: SIZES.sm,
  },
  addButton: {
    marginTop: SIZES.xs,
  },
  actionSection: {
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
  actionText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  resubmitButton: {
    backgroundColor: COLORS.primary,
  },
})

