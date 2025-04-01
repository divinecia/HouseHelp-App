"use client"

import React from "react"
import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from "react-native"
import { Feather } from "@expo/vector-icons"
import Slider from "@react-native-community/slider"
import { FilterChip } from "../UI/filter-chip"
import type { SearchFilters, ServiceType } from "../../types/worker"
import { COLORS, SIZES } from "../../config/theme"
import { Button } from "../UI/button"

interface SearchFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
}

export const SearchFiltersComponent: React.FC<SearchFiltersProps> = ({ filters, onFiltersChange }) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [tempFilters, setTempFilters] = useState<SearchFilters>(filters)

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
    const services = [...tempFilters.services]
    const index = services.indexOf(service)

    if (index === -1) {
      services.push(service)
    } else {
      services.splice(index, 1)
    }

    setTempFilters({ ...tempFilters, services })
  }

  const toggleLanguage = (language: string) => {
    const languages = [...(tempFilters.languages || [])]
    const index = languages.indexOf(language)

    if (index === -1) {
      languages.push(language)
    } else {
      languages.splice(index, 1)
    }

    setTempFilters({ ...tempFilters, languages })
  }

  const applyFilters = () => {
    onFiltersChange(tempFilters)
    setModalVisible(false)
  }

  const resetFilters = () => {
    const resetFilters: SearchFilters = {
      services: [],
      minExperience: undefined,
      minRating: undefined,
      languages: [],
      maxHourlyRate: undefined,
      verified: undefined,
    }
    setTempFilters(resetFilters)
    onFiltersChange(resetFilters)
    setModalVisible(false)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.services.length > 0) count++
    if (filters.minExperience !== undefined) count++
    if (filters.minRating !== undefined) count++
    if (filters.languages && filters.languages.length > 0) count++
    if (filters.maxHourlyRate !== undefined) count++
    if (filters.verified !== undefined) count++
    return count
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
        {serviceOptions.map((service) => (
          <FilterChip
            key={service.value}
            label={service.label}
            selected={filters.services.includes(service.value)}
            onPress={() => {
              const updatedFilters = { ...filters }
              const index = updatedFilters.services.indexOf(service.value)

              if (index === -1) {
                updatedFilters.services.push(service.value)
              } else {
                updatedFilters.services.splice(index, 1)
              }

              onFiltersChange(updatedFilters)
            }}
          />
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => {
          setTempFilters(filters)
          setModalVisible(true)
        }}
      >
        <Feather name="sliders" size={20} color={COLORS.primary} />
        {getActiveFiltersCount() > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Advanced Filters</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.sectionTitle}>Services</Text>
              <View style={styles.servicesContainer}>
                {serviceOptions.map((service) => (
                  <FilterChip
                    key={service.value}
                    label={service.label}
                    selected={tempFilters.services.includes(service.value)}
                    onPress={() => toggleService(service.value)}
                  />
                ))}
              </View>

              <Text style={styles.sectionTitle}>Experience</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderValue}>
                  {tempFilters.minExperience !== undefined ? `${tempFilters.minExperience}+ years` : "Any"}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={10}
                  step={1}
                  value={tempFilters.minExperience || 0}
                  onValueChange={(value) =>
                    setTempFilters({
                      ...tempFilters,
                      minExperience: value > 0 ? value : undefined,
                    })
                  }
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.primary}
                />
              </View>

              <Text style={styles.sectionTitle}>Rating</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderValue}>
                  {tempFilters.minRating !== undefined ? `${tempFilters.minRating}+ stars` : "Any"}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={5}
                  step={0.5}
                  value={tempFilters.minRating || 0}
                  onValueChange={(value) =>
                    setTempFilters({
                      ...tempFilters,
                      minRating: value > 0 ? value : undefined,
                    })
                  }
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.primary}
                />
              </View>

              <Text style={styles.sectionTitle}>Hourly Rate</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderValue}>
                  {tempFilters.maxHourlyRate !== undefined ? `Up to $${tempFilters.maxHourlyRate}/hr` : "Any"}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={50}
                  step={5}
                  value={tempFilters.maxHourlyRate || 50}
                  onValueChange={(value) =>
                    setTempFilters({
                      ...tempFilters,
                      maxHourlyRate: value < 50 ? value : undefined,
                    })
                  }
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.primary}
                />
              </View>

              <Text style={styles.sectionTitle}>Languages</Text>
              <View style={styles.servicesContainer}>
                {languageOptions.map((language) => (
                  <FilterChip
                    key={language}
                    label={language}
                    selected={tempFilters.languages ? tempFilters.languages.includes(language) : false}
                    onPress={() => toggleLanguage(language)}
                  />
                ))}
              </View>

              <Text style={styles.sectionTitle}>Other</Text>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() =>
                  setTempFilters({
                    ...tempFilters,
                    verified: tempFilters.verified === true ? undefined : true,
                  })
                }
              >
                <View style={[styles.checkbox, tempFilters.verified === true && styles.checkboxChecked]}>
                  {tempFilters.verified === true && <Feather name="check" size={16} color={COLORS.white} />}
                </View>
                <Text style={styles.checkboxLabel}>Verified workers only</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button title="Reset" onPress={resetFilters} variant="outline" style={styles.resetButton} />
              <Button title="Apply Filters" onPress={applyFilters} style={styles.applyButton} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.md,
  },
  chipContainer: {
    paddingVertical: SIZES.xs,
    paddingHorizontal: SIZES.md,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.lg,
    borderTopRightRadius: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.md,
    maxHeight: "80%",
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
  modalScrollView: {
    padding: SIZES.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: SIZES.md,
    marginBottom: SIZES.xs,
  },
  servicesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  sliderContainer: {
    marginBottom: SIZES.md,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderValue: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SIZES.xs,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SIZES.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.xs,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  resetButton: {
    flex: 1,
    marginRight: SIZES.xs,
  },
  applyButton: {
    flex: 2,
    marginLeft: SIZES.xs,
  },
})

