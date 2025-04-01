"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { PaymentMethodCard } from "../../components/payment/payment-method-card"
import { paymentService, type PaymentMethod } from "../../services/payment-service"
import { useAuth } from "../../contexts/auth-context"
import { COLORS, SIZES } from "../../config/theme"
import { Button } from "../../components/UI/button"

export const PaymentMethodsScreen = () => {
  const navigation = useNavigation()
  const { user } = useAuth()

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user) {
      fetchPaymentMethods()
    }
  }, [user])

  const fetchPaymentMethods = async () => {
    if (!user) return

    setLoading(true)
    try {
      const methods = await paymentService.getUserPaymentMethods(user.id)
      setPaymentMethods(methods)
    } catch (error) {
      console.error("Error fetching payment methods:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchPaymentMethods()
  }

  const handleAddPaymentMethod = () => {
    navigation.navigate("AddPaymentMethod")
  }

  const handleSetDefault = async (paymentMethod: PaymentMethod) => {
    if (!user) return

    try {
      const success = await paymentService.setDefaultPaymentMethod(user.id, paymentMethod.id)

      if (success) {
        // Update the local state
        const updatedMethods = paymentMethods.map((method) => ({
          ...method,
          is_default: method.id === paymentMethod.id,
        }))

        setPaymentMethods(updatedMethods)
      } else {
        Alert.alert("Error", "Failed to set default payment method")
      }
    } catch (error) {
      console.error("Error setting default payment method:", error)
      Alert.alert("Error", "Failed to set default payment method")
    }
  }

  const handleDeletePaymentMethod = async (paymentMethod: PaymentMethod) => {
    if (!user) return

    Alert.alert("Delete Payment Method", "Are you sure you want to delete this payment method?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const success = await paymentService.removePaymentMethod(user.id, paymentMethod.id)

            if (success) {
              // Update the local state
              const updatedMethods = paymentMethods.filter((method) => method.id !== paymentMethod.id)

              setPaymentMethods(updatedMethods)
            } else {
              Alert.alert("Error", "Failed to delete payment method")
            }
          } catch (error) {
            console.error("Error deleting payment method:", error)
            Alert.alert("Error", "Failed to delete payment method")
          }
        },
      },
    ])
  }

  const renderEmptyState = () => {
    if (loading) return null

    return (
      <View style={styles.emptyContainer}>
        <Feather name="credit-card" size={64} color={COLORS.grayDark} />
        <Text style={styles.emptyTitle}>No Payment Methods</Text>
        <Text style={styles.emptyText}>Add a payment method to make bookings and payments easier</Text>
        <Button title="Add Payment Method" onPress={handleAddPaymentMethod} style={styles.addButton} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={paymentMethods}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PaymentMethodCard
            paymentMethod={item}
            onSetDefault={() => handleSetDefault(item)}
            onDelete={() => handleDeletePaymentMethod(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      {paymentMethods.length > 0 && (
        <View style={styles.footer}>
          <Button title="Add Payment Method" onPress={handleAddPaymentMethod} />
        </View>
      )}

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
  listContent: {
    padding: SIZES.md,
    flexGrow: 1,
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
  addButton: {
    width: "100%",
    maxWidth: 300,
  },
  footer: {
    backgroundColor: COLORS.pureWhite,
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
})

