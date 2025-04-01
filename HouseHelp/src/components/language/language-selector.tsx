"use client"

import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import { useLanguage } from "../../contexts/language-context"
import type { Language } from "../../services/language-service"

interface LanguageSelectorProps {
  isVisible: boolean
  onClose: () => void
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ isVisible, onClose }) => {
  const { currentLanguage, languages, changeLanguage, t } = useLanguage()

  const handleSelectLanguage = async (code: string) => {
    const success = await changeLanguage(code)

    if (success) {
      onClose()
    }
  }

  const renderLanguageItem = ({ item }: { item: Language }) => {
    const isSelected = currentLanguage === item.code

    return (
      <TouchableOpacity
        style={[styles.languageItem, isSelected && styles.selectedLanguageItem]}
        onPress={() => handleSelectLanguage(item.code)}
        disabled={isSelected}
      >
        <View style={styles.languageInfo}>
          {item.flag_emoji && <Text style={styles.flagEmoji}>{item.flag_emoji}</Text>}
          <View>
            <Text style={styles.languageName}>{item.name}</Text>
            <Text style={styles.nativeName}>{item.native_name}</Text>
          </View>
        </View>

        {isSelected && <Feather name="check" size={20} color={COLORS.primary} />}
      </TouchableOpacity>
    )
  }

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("selectLanguage")}</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={languages}
            keyExtractor={(item) => item.code}
            renderItem={renderLanguageItem}
            contentContainerStyle={styles.languagesList}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  languagesList: {
    paddingHorizontal: SIZES.md,
  },
  languageItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectedLanguageItem: {
    backgroundColor: `${COLORS.primary}10`,
  },
  languageInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  flagEmoji: {
    fontSize: 24,
    marginRight: SIZES.sm,
  },
  languageName: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  nativeName: {
    fontSize: 14,
    color: COLORS.textLight,
  },
})

