"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import * as Location from "expo-location"
import { incidentService, type IncidentCategory } from "../../services/incident-service"
import { useAuth } from "../../contexts/auth-context"
import { COLORS, SIZES } from "../../config/theme"
import { Button } from "../../components/UI/button"

export const ReportIncidentScreen = () => {
  const navigation = useNavigation()
  const { user } = useAuth()

  const [categories, setCategories] = useState<IncidentCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium")
  const [attachments, setAttachments] = useState<{ uri: string; type: string; name?: string }[]>([])
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [useCurrentLocation, setUseCurrentLocation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchCategories()
    requestLocationPermission()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const data = await incidentService.getIncidentCategories()
      setCategories(data)

      if (data.length > 0) {
        setSelectedCategory(data[0].id)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setLoading(false)
    }
  }

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({})
        setLocation(location)
      }
    } catch (error) {
      console.error("Error requesting location permission:", error)
    }
  }

  const handleAddAttachment = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant permission to access your media library")
        return
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        const fileType =
          asset.uri.endsWith(".jpg") || asset.uri.endsWith(".jpeg")
            ? "image/jpeg"
            : asset.uri.endsWith(".png")
              ? "image/png"
              : "application/octet-stream"

        setAttachments([
          ...attachments,
          {
            uri: asset.uri,
            type: fileType,
            name: asset.fileName || `attachment-${Date.now()}`,
          },
        ])
      }
    } catch (error) {
      console.error("Error picking image:", error)
      Alert.alert("Error", "Failed to pick image")
    }
  }

  const handleRemoveAttachment = (index: number) => {
    const newAttachments = [...attachments]
    newAttachments.splice(index, 1)
    setAttachments(newAttachments)
  }

  const handleSubmit = async () => {
    if (!user) return

    if (!selectedCategory) {
      Alert.alert("Error", "Please select a category")
      return
    }

    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title")
      return
    }

    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description")
      return
    }

    setSubmitting(true)
    try {
      // Prepare location data if enabled
      const locationData =
        useCurrentLocation && location
          ? {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy,
            }
          : null

      // Report incident
      const result = await incidentService.reportIncident(
        user.id,
        null, // bookingId - could be passed as a prop if needed
        selectedCategory,
        title,
        description,
        priority,
        locationData,
        new Date(),
      )

      if (!result.success) {
        throw new Error(result.error || "Failed to report incident")
      }

      // Upload attachments
      if (attachments.length > 0 && result.incidentId) {
        for (const attachment of attachments) {
          await incidentService.uploadIncidentAttachment(
            result.incidentId,
            attachment.uri,
            attachment.type,
            attachment.name,
          )
        }
      }

      Alert.alert("Incident Reported", "Your incident has been reported successfully. We will review it shortly.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ])
    } catch (error) {
      console.error("Error reporting incident:", error)
      Alert.alert("Error", "Failed to report incident. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Report an Incident</Text>
      <Text style={styles.subtitle}>Please provide details about the incident you'd like to report</Text>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Incident Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryItem, selectedCategory === category.id && styles.selectedCategoryItem]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={[styles.categoryText, selectedCategory === category.id && styles.selectedCategoryText]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Incident Details</Text>

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Brief title of the incident"
          maxLength={100}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Detailed description of what happened"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityContainer}>
          {(["low", "medium", "high", "critical"] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.priorityItem,
                priority === p && styles.selectedPriorityItem,
                { backgroundColor: priority === p ? getPriorityColor(p) : COLORS.white },
              ]}
              onPress={() => setPriority(p)}
            >
              <Text style={[styles.priorityText, priority === p && styles.selectedPriorityText]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Attachments</Text>

        <View style={styles.attachmentsContainer}>
          {attachments.map((attachment, index) => (
            <View key={index} style={styles.attachmentItem}>
              <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} resizeMode="cover" />
              <TouchableOpacity style={styles.removeAttachmentButton} onPress={() => handleRemoveAttachment(index)}>
                <Feather name="x" size={16} color={COLORS.pureWhite} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addAttachmentButton} onPress={handleAddAttachment}>
            <Feather name="plus" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Location</Text>

        <TouchableOpacity style={styles.locationOption} onPress={() => setUseCurrentLocation(!useCurrentLocation)}>
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, useCurrentLocation && styles.checkboxChecked]}>
              {useCurrentLocation && <Feather name="check" size={16} color={COLORS.pureWhite} />}
            </View>
          </View>
          <Text style={styles.locationText}>Include my current location with this report</Text>
        </TouchableOpacity>

        {useCurrentLocation && location && (
          <View style={styles.currentLocationContainer}>
            <Feather name="map-pin" size={16} color={COLORS.primary} />
            <Text style={styles.currentLocationText}>
              Lat: {location.coords.latitude.toFixed(6)}, Lng: {location.coords.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>

      <Button
        title="Submit Report"
        onPress={handleSubmit}
        disabled={submitting}
        loading={submitting}
        style={styles.submitButton}
      />
    </ScrollView>
  )
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critical":
      return COLORS.error
    case "high":
      return "#FF9800" // Orange
    case "medium":
      return COLORS.warning
    case "low":
      return COLORS.success
    default:
      return COLORS.grayDark
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  contentContainer: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: SIZES.lg,
  },
  formSection: {
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  categoriesContainer: {
    paddingVertical: SIZES.xs,
  },
  categoryItem: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.sm,
    backgroundColor: COLORS.white,
  },
  selectedCategoryItem: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectedCategoryText: {
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  input: {
    backgroundColor: COLORS.pureWhite,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.sm,
    padding: SIZES.sm,
    fontSize: 16,
    marginBottom: SIZES.md,
  },
  textArea: {
    backgroundColor: COLORS.pureWhite,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.sm,
    padding: SIZES.sm,
    fontSize: 16,
    minHeight: 120,
    marginBottom: SIZES.md,
  },
  priorityContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.md,
  },
  priorityItem: {
    flex: 1,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.xs,
    alignItems: "center",
  },
  selectedPriorityItem: {
    borderColor: "transparent",
  },
  priorityText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectedPriorityText: {
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  attachmentsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  attachmentItem: {
    width: 80,
    height: 80,
    borderRadius: SIZES.sm,
    marginRight: SIZES.sm,
    marginBottom: SIZES.sm,
    position: "relative",
    overflow: "hidden",
  },
  attachmentImage: {
    width: "100%",
    height: "100%",
  },
  removeAttachmentButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  addAttachmentButton: {
    width: 80,
    height: 80,
    borderRadius: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.pureWhite,
  },
  locationOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.sm,
  },
  checkboxContainer: {
    marginRight: SIZES.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  locationText: {
    fontSize: 16,
    color: COLORS.text,
  },
  currentLocationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${COLORS.primary}10`,
    padding: SIZES.sm,
    borderRadius: SIZES.sm,
  },
  currentLocationText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: SIZES.xs,
  },
  submitButton: {
    marginTop: SIZES.md,
  },
})

