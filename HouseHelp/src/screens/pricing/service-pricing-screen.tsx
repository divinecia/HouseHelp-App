"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Alert } from "react-native"
import { useRoute, useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { PricingCard } from "../../components/pricing/pricing-card"
import { pricingService, type ServicePricing, type DiscountValidation } from "../../services/pricing-service"
import { COLORS, SIZES } from "../../config/theme"
import { Button } from "../../components/UI/button"

export const ServicePricingScreen = () => {
  const route = useRoute()
  const navigation = useNavigation()
  const { serviceType, workerId } = route.params as {
    serviceType: string
    workerId?: string
  }

  const [loading, setLoading] = useState(true)
  const [pricingOptions, setPricingOptions] = useState<ServicePricing[]>([])
  const [selectedPricing, setSelectedPricing] = useState<ServicePricing | null>(null)
  const [hours, setHours] = useState(2)
  const [days, setDays] = useState(0)
  const [discountCode, setDiscountCode] = useState("")
  const [discountValidation, setDiscountValidation] = useState<DiscountValidation | null>(null)
  const [totalPrice, setTotalPrice] = useState(0)
  const [applyingDiscount, setApplyingDiscount] = useState(false)

  useEffect(() => {
    fetchPricingOptions()
  }, [serviceType, workerId])

  useEffect(() => {
    if (selectedPricing) {
      calculateTotal()
    }
  }, [selectedPricing, hours, days, discountValidation])

  const fetchPricingOptions = async () => {
    setLoading(true)
    try {
      let pricingData: ServicePricing[] = []

      if (workerId) {
        // Get worker-specific pricing
        const workerPricing = await pricingService.getWorkerPricing(workerId, serviceType)

        if (workerPricing.length > 0) {
          // Convert worker pricing to service pricing format
          pricingData = workerPricing.map((wp) => ({
            service_type: wp.service_type,
            package_id: "custom",
            package_name: wp.is_custom ? "Custom" : "Standard",
            price_hourly: wp.price_hourly,
            price_daily: wp.price_daily,
            price_weekly: wp.price_weekly,
            price_monthly: wp.price_monthly,
            min_hours: 1,
            discount_percentage: 0,
          }))
        }
      }

      if (pricingData.length === 0) {
        // Get standard pricing options
        pricingData = await pricingService.getServicePricing(serviceType)
      }

      setPricingOptions(pricingData)

      if (pricingData.length > 0) {
        // Select the first option by default
        setSelectedPricing(pricingData[0])
      }
    } catch (error) {
      console.error("Error fetching pricing options:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPricing = (pricing: ServicePricing) => {
    setSelectedPricing(pricing)
  }

  const handleHoursChange = (value: string) => {
    const numValue = Number.parseInt(value)
    if (!isNaN(numValue) && numValue >= 0) {
      setHours(numValue)
    } else if (value === "") {
      setHours(0)
    }
  }

  const handleDaysChange = (value: string) => {
    const numValue = Number.parseInt(value)
    if (!isNaN(numValue) && numValue >= 0) {
      setDays(numValue)
    } else if (value === "") {
      setDays(0)
    }
  }

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      Alert.alert("Error", "Please enter a discount code")
      return
    }

    if (!selectedPricing) return

    setApplyingDiscount(true)
    try {
      const subtotal = pricingService.calculateTotalPrice(
        selectedPricing.price_hourly,
        hours,
        days,
        selectedPricing.discount_percentage,
      )

      const validation = await pricingService.validateDiscountCode(discountCode, subtotal)

      setDiscountValidation(validation)

      if (!validation.is_valid) {
        Alert.alert("Invalid Discount", validation.error_message || "This discount code cannot be applied")
      }
    } catch (error) {
      console.error("Error applying discount:", error)
      Alert.alert("Error", "Failed to apply discount code")
    } finally {
      setApplyingDiscount(false)
    }
  }

  const calculateTotal = () => {
    if (!selectedPricing) return

    let subtotal = pricingService.calculateTotalPrice(
      selectedPricing.price_hourly,
      hours,
      days,
      selectedPricing.discount_percentage,
    )

    // Apply discount code if valid
    if (
      discountValidation &&
      discountValidation.is_valid &&
      discountValidation.discount_type &&
      discountValidation.discount_value
    ) {
      subtotal = pricingService.calculateDiscountedPrice(
        subtotal,
        discountValidation.discount_type,
        discountValidation.discount_value,
      )
    }

    setTotalPrice(subtotal)
  }

  const handleProceedToBooking = () => {
    if (!selectedPricing) return

    navigation.navigate("BookingForm", {
      serviceType,
      workerId,
      pricing: selectedPricing,
      hours,
      days,
      totalPrice,
      discountCode: discountValidation?.is_valid ? discountCode : undefined,
    })
  }

  const formatServiceType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading pricing options...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{formatServiceType(serviceType)} Service Pricing</Text>
          <Text style={styles.subtitle}>Choose a pricing package that suits your needs</Text>
        </View>

        {pricingOptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="alert-circle" size={48} color={COLORS.warning} />
            <Text style={styles.emptyTitle}>No pricing available</Text>
            <Text style={styles.emptyText}>Pricing for this service is currently unavailable</Text>
          </View>
        ) : (
          <>
            <View style={styles.pricingContainer}>
              {pricingOptions.map((pricing) => (
                <PricingCard
                  key={pricing.package_id}
                  pricing={pricing}
                  selected={selectedPricing?.package_id === pricing.package_id}
                  onSelect={handleSelectPricing}
                />
              ))}
            </View>

            <View style={styles.calculatorContainer}>
              <Text style={styles.sectionTitle}>Calculate Total</Text>

              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Hours</Text>
                  <TextInput
                    style={styles.input}
                    value={hours.toString()}
                    onChangeText={handleHoursChange}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Days</Text>
                  <TextInput
                    style={styles.input}
                    value={days.toString()}
                    onChangeText={handleDaysChange}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                </View>
              </View>

              <View style={styles.discountContainer}>
                <Text style={styles.inputLabel}>Discount Code</Text>
                <View style={styles.discountRow}>
                  <TextInput
                    style={styles.discountInput}
                    value={discountCode}
                    onChangeText={setDiscountCode}
                    placeholder="Enter code"
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={handleApplyDiscount}
                    disabled={applyingDiscount}
                  >
                    {applyingDiscount ? (
                      <ActivityIndicator size="small" color={COLORS.pureWhite} />
                    ) : (
                      <Text style={styles.applyButtonText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {discountValidation && (
                  <Text
                    style={[
                      styles.discountMessage,
                      {
                        color: discountValidation.is_valid ? COLORS.success : COLORS.error,
                      },
                    ]}
                  >
                    {discountValidation.is_valid
                      ? `Discount applied: ${
                          discountValidation.discount_type === "percentage"
                            ? `${discountValidation.discount_value}%`
                            : `$${discountValidation.discount_value}`
                        } off`
                      : discountValidation.error_message}
                  </Text>
                )}
              </View>

              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Service:</Text>
                  <Text style={styles.summaryValue}>{formatServiceType(serviceType)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Package:</Text>
                  <Text style={styles.summaryValue}>{selectedPricing?.package_name}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Rate:</Text>
                  <Text style={styles.summaryValue}>${selectedPricing?.price_hourly.toFixed(2)}/hr</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Duration:</Text>
                  <Text style={styles.summaryValue}>
                    {hours} hour{hours !== 1 ? "s" : ""}
                    {days > 0 ? ` + ${days} day${days !== 1 ? "s" : ""}` : ""}
                  </Text>
                </View>

                {selectedPricing?.discount_percentage > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Package Discount:</Text>
                    <Text style={styles.discountValue}>{selectedPricing.discount_percentage}% off</Text>
                  </View>
                )}

                {discountValidation?.is_valid && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Promo Discount:</Text>
                    <Text style={styles.discountValue}>
                      {discountValidation.discount_type === "percentage"
                        ? `${discountValidation.discount_value}% off`
                        : `$${discountValidation.discount_value} off`}
                    </Text>
                  </View>
                )}

                <View style={styles.divider} />

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>${totalPrice.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {selectedPricing && (
        <View style={styles.footer}>
          <Button title="Proceed to Booking" onPress={handleProceedToBooking} disabled={hours === 0 && days === 0} />
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
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: SIZES.md,
    color: COLORS.text,
    fontSize: 16,
  },
  header: {
    marginBottom: SIZES.lg,
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
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
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
  },
  pricingContainer: {
    marginBottom: SIZES.lg,
  },
  calculatorContainer: {
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
  inputRow: {
    flexDirection: "row",
    marginBottom: SIZES.md,
  },
  inputContainer: {
    flex: 1,
    marginRight: SIZES.md,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SIZES.xs,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontSize: 16,
  },
  discountContainer: {
    marginBottom: SIZES.md,
  },
  discountRow: {
    flexDirection: "row",
  },
  discountInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.xs,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontSize: 16,
    marginRight: SIZES.xs,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SIZES.md,
    borderRadius: SIZES.xs,
  },
  applyButtonText: {
    color: COLORS.pureWhite,
    fontWeight: "600",
  },
  discountMessage: {
    fontSize: 12,
    marginTop: SIZES.xs,
  },
  summaryContainer: {
    marginTop: SIZES.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.xs,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  discountValue: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.md,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  footer: {
    backgroundColor: COLORS.pureWhite,
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
})

