"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"

interface Currency {
  code: string
  name: string
  symbol: string
}

interface CurrencySelectorProps {
  selectedCurrency: Currency
  onSelectCurrency: (currency: Currency) => void
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({ selectedCurrency, onSelectCurrency }) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredCurrencies, setFilteredCurrencies] = useState<Currency[]>([])

  const currencies: Currency[] = [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "RWF", name: "Rwandan Franc", symbol: "FRw" },
    { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
    { code: "UGX", name: "Ugandan Shilling", symbol: "USh" },
    { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh" },
    { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
    { code: "ZAR", name: "South African Rand", symbol: "R" },
    { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
    { code: "XOF", name: "West African CFA Franc", symbol: "CFA" },
    { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA" },
    { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
    { code: "INR", name: "Indian Rupee", symbol: "₹" },
    { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  ]

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCurrencies(currencies)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = currencies.filter(
        (currency) => currency.code.toLowerCase().includes(query) || currency.name.toLowerCase().includes(query),
      )
      setFilteredCurrencies(filtered)
    }
  }, [searchQuery])

  const handleSelectCurrency = (currency: Currency) => {
    onSelectCurrency(currency)
    setModalVisible(false)
    setSearchQuery("")
  }

  const renderCurrencyItem = ({ item }: { item: Currency }) => (
    <TouchableOpacity
      style={[styles.currencyItem, selectedCurrency.code === item.code && styles.selectedCurrencyItem]}
      onPress={() => handleSelectCurrency(item)}
    >
      <View style={styles.currencyInfo}>
        <Text style={styles.currencyCode}>{item.code}</Text>
        <Text style={styles.currencyName}>{item.name}</Text>
      </View>
      <Text style={styles.currencySymbol}>{item.symbol}</Text>
    </TouchableOpacity>
  )

  return (
    <>
      <TouchableOpacity style={styles.selectorButton} onPress={() => setModalVisible(true)}>
        <View style={styles.selectedCurrency}>
          <Text style={styles.selectedCurrencyCode}>{selectedCurrency.code}</Text>
          <Text style={styles.selectedCurrencySymbol}>{selectedCurrency.symbol}</Text>
        </View>
        <Feather name="chevron-down" size={20} color={COLORS.text} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Feather name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search currencies..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Feather name="x" size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              renderItem={renderCurrencyItem}
              contentContainerStyle={styles.currencyList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Feather name="dollar-sign" size={48} color={COLORS.grayDark} />
                  <Text style={styles.emptyText}>No currencies found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.pureWhite,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.sm,
    padding: SIZES.sm,
    height: 50,
  },
  selectedCurrency: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedCurrencyCode: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    marginRight: SIZES.xs,
  },
  selectedCurrencySymbol: {
    fontSize: 16,
    color: COLORS.textLight,
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
  closeButton: {
    padding: SIZES.xs,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.sm,
    margin: SIZES.md,
    paddingHorizontal: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: SIZES.xs,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  currencyList: {
    paddingHorizontal: SIZES.md,
  },
  currencyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectedCurrencyItem: {
    backgroundColor: `${COLORS.primary}10`,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 2,
  },
  currencyName: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "500",
    color: COLORS.primary,
    marginLeft: SIZES.md,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: SIZES.xl,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: SIZES.sm,
  },
})

