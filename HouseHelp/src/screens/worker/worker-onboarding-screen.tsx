"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Switch } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import { Button } from "../../components/UI/button"
import { supabase } from "../../config/supabase"
import { useAuth } from "../../contexts/auth-context"
import type { ServiceType } from "../../types/worker"

export const WorkerOnboardingScreen = () => {
  const navigation = useNavigation()
  const { user } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1: Basic Info
  const [bio, setBio] = useState("")
  const [experienceYears, setExperienceYears] = useState("")
  const [hourlyRate, setHourlyRate] = useState("")

  // Step 2: Services
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([])

  // Step 3: Languages
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["English"])

  // Step 4: Availability
  const [availability, setAvailability] = useState<
    {
      day: string
      available: boolean
      startTime: string
      endTime: string
    }[]
  >([
    { day: "monday", available: true, startTime: "09:00", endTime: "17:00" },
    { day: "tuesday", available: true, startTime: "09:00", endTime: "17:00" },
    { day: "wednesday", available: true, startTime: "09:00", endTime: "17:00" },
    { day: "thursday", available: true, startTime: "09:00", endTime: "17:00" },
    { day: "friday", available: true, startTime: "09:00", endTime: "17:00" },
    { day: "saturday", available: false, startTime: "09:00", endTime: "17:00" },
    { day: "sunday", available: false, startTime: "09:00", endTime: "17:00" },
  ])

  const serviceOptions: { value: ServiceType; label: string }[] = [
    { value: "cleaning", label: "Cleaning" },
    { value: "cooking", label: "Cooking" },
    { value: "childcare", label: "Childcare" },
    { value: "eldercare", label: "Eldercare" },
    { value: "gardening", label: "Gardening" },
    { value: "driving", label: "Driving" },
    { value: "security", label: "Security" },
    { value: "laundry", label: "Laundry" },
    { value: "petcare", label: "Pet Care" },
    { value: "tutoring", label: "Tutoring" },
  ]

  const languageOptions = ["English", "Kinyarwanda", "French", "Swahili", "Arabic", "Chinese"]

  const toggleService = (service: ServiceType) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter((s) => s !== service))
    } else {
      setSelectedServices([...selectedServices, service])
    }
  }

  const toggleLanguage = (language: string) => {
    if (selectedLanguages.includes(language)) {
      if (language !== "English") {
        // Keep at least English
        setSelectedLanguages(selectedLanguages.filter((l) => l !== language))
      }
    } else {
      setSelectedLanguages([...selectedLanguages, language])
    }
  }

  const updateAvailability = (index: number, field: string, value: any) => {
    const updatedAvailability = [...availability]
    updatedAvailability[index] = {
      ...updatedAvailability[index],
      [field]: value,
    }
    setAvailability(updatedAvailability)
  }

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate step 1
      if (!bio.trim()) {
        Alert.alert("Error", "Please enter your bio")
        return
      }
      if (!experienceYears.trim() || isNaN(Number(experienceYears))) {
        Alert.alert("Error", "Please enter valid years of experience")
        return
      }
      if (!hourlyRate.trim() || isNaN(Number(hourlyRate))) {
        Alert.alert("Error", "Please enter valid hourly rate")
        return
      }
    } else if (currentStep === 2) {
      // Validate step 2
      if (selectedServices.length === 0) {
        Alert.alert("Error", "Please select at least one service")
        return
      }
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Format availability data
      const formattedAvailability = availability
        .filter((day) => day.available)
        .map((day) => ({
          day: day.day,
          startTime: day.startTime,
          endTime: day.endTime,
        }))

      // Update worker profile
      const { error } = await supabase
        .from("worker_profiles")
        .update({
          bio,
          experience_years: Number(experienceYears),
          hourly_rate: Number(hourlyRate),
          services: selectedServices,
          languages: selectedLanguages,
          availability: formattedAvailability,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)

      if (error) throw error

      // Navigate to worker dashboard
      navigation.reset({
        index: 0,
        routes: [{ name: "WorkerDashboard" }],
      })
    } catch (error) {
      console.error("Error updating worker profile:", error)
      Alert.alert("Error", "Failed to save your profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicator}>
        {[1, 2, 3, 4].map((step) => (
          <View
            key={step}
            style={[
              styles.stepDot,
              currentStep === step && styles.activeStepDot,
              currentStep > step && styles.completedStepDot,
            ]}
          >
            {currentStep > step ? (
              <Feather name="check" size={12} color={COLORS.pureWhite} />
            ) : (
              <Text style={[styles.stepNumber, currentStep === step && styles.activeStepNumber]}>{step}</Text>
            )}
          </View>
        ))}
        <View style={styles.stepLine} />
      </View>
    )
  }

  const renderStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Basic Information"
      case 2:
        return "Services Offered"
      case 3:
        return "Languages"
      case 4:
        return "Availability"
      default:
        return ""
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={styles.textArea}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself, your experience, and why clients should hire you"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <Text style={styles.label}>Years of Experience</Text>
            <TextInput
              style={styles.input}
              value={experienceYears}
              onChangeText={setExperienceYears}
              placeholder="e.g., 3"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Hourly Rate (USD)</Text>
            <TextInput
              style={styles.input}
              value={hourlyRate}
              onChangeText={setHourlyRate}
              placeholder="e.g., 15"
              keyboardType="numeric"
            />
          </View>
        )
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.description}>Select the services you offer. You can select multiple options.</Text>
            <View style={styles.servicesContainer}>
              {serviceOptions.map((service) => (
                <TouchableOpacity
                  key={service.value}
                  style={[styles.serviceItem, selectedServices.includes(service.value) && styles.selectedServiceItem]}
                  onPress={() => toggleService(service.value)}
                >
                  <Text
                    style={[styles.serviceText, selectedServices.includes(service.value) && styles.selectedServiceText]}
                  >
                    {service.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )
      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.description}>Select the languages you speak fluently.</Text>
            <View style={styles.languagesContainer}>
              {languageOptions.map((language) => (
                <TouchableOpacity
                  key={language}
                  style={[
                    styles.languageItem,
                    selectedLanguages.includes(language) && styles.selectedLanguageItem,
                    language === "English" && styles.disabledLanguageItem,
                  ]}
                  onPress={() => toggleLanguage(language)}
                  disabled={language === "English"} // English is required
                >
                  <Text
                    style={[styles.languageText, selectedLanguages.includes(language) && styles.selectedLanguageText]}
                  >
                    {language}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )
      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.description}>Set your weekly availability schedule.</Text>
            {availability.map((day, index) => (
              <View key={day.day} style={styles.availabilityItem}>
                <View style={styles.availabilityHeader}>
                  <Text style={styles.dayText}>{day.day.charAt(0).toUpperCase() + day.day.slice(1)}</Text>
                  <Switch
                    value={day.available}
                    onValueChange={(value) => updateAvailability(index, "available", value)}
                    trackColor={{ false: COLORS.grayDark, true: COLORS.primary }}
                    thumbColor={COLORS.pureWhite}
                  />
                </View>
                {day.available && (
                  <View style={styles.timeContainer}>
                    <View style={styles.timeInput}>
                      <Text style={styles.timeLabel}>From</Text>
                      <TextInput
                        style={styles.timeField}
                        value={day.startTime}
                        onChangeText={(value) => updateAvailability(index, "startTime", value)}
                        placeholder="09:00"
                      />
                    </View>
                    <View style={styles.timeInput}>
                      <Text style={styles.timeLabel}>To</Text>
                      <TextInput
                        style={styles.timeField}
                        value={day.endTime}
                        onChangeText={(value) => updateAvailability(index, "endTime", value)}
                        placeholder="17:00"
                      />
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )
      default:
        return null
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Set Up Your Profile</Text>
        <Text style={styles.subtitle}>Complete your profile to start receiving job requests</Text>
      </View>

      {renderStepIndicator()}

      <Text style={styles.stepTitle}>{renderStepTitle()}</Text>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 1 && <Button title="Back" onPress={handleBack} variant="outline" style={styles.backButton} />}
        <Button
          title={currentStep === 4 ? "Submit" : "Next"}
          onPress={handleNext}
          loading={loading}
          style={styles.nextButton}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    padding: SIZES.md,
    backgroundColor: COLORS.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.pureWhite,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.pureWhite,
    opacity: 0.9,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    position: "relative",
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  activeStepDot: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  completedStepDot: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.textLight,
  },
  activeStepNumber: {
    color: COLORS.primary,
  },
  stepLine: {
    position: "absolute",
    top: "50%",
    left: SIZES.xl + 12,
    right: SIZES.xl + 12,
    height: 2,
    backgroundColor: COLORS.border,
    zIndex: 0,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SIZES.md,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  stepContent: {
    marginBottom: SIZES.lg,
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
  description: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
  },
  servicesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  serviceItem: {
    backgroundColor: COLORS.pureWhite,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.md,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    margin: SIZES.xs,
  },
  selectedServiceItem: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  serviceText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectedServiceText: {
    color: COLORS.pureWhite,
  },
  languagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  languageItem: {
    backgroundColor: COLORS.pureWhite,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.md,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    margin: SIZES.xs,
  },
  selectedLanguageItem: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  disabledLanguageItem: {
    opacity: 0.7,
  },
  languageText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectedLanguageText: {
    color: COLORS.pureWhite,
  },
  availabilityItem: {
    backgroundColor: COLORS.pureWhite,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.sm,
    padding: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  availabilityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  timeContainer: {
    flexDirection: "row",
    marginTop: SIZES.sm,
  },
  timeInput: {
    flex: 1,
    marginRight: SIZES.sm,
  },
  timeLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  timeField: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    padding: SIZES.xs,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.pureWhite,
  },
  backButton: {
    flex: 1,
    marginRight: SIZES.xs,
  },
  nextButton: {
    flex: 2,
    marginLeft: SIZES.xs,
  },
})

