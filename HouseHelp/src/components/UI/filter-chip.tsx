import type React from "react"
import { TouchableOpacity, Text, StyleSheet, type ViewStyle } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"

interface FilterChipProps {
  label: string
  selected: boolean
  onPress: () => void
  style?: ViewStyle
}

export const FilterChip: React.FC<FilterChipProps> = ({ label, selected, onPress, style }) => {
  return (
    <TouchableOpacity
      style={[styles.container, selected ? styles.selectedContainer : styles.unselectedContainer, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, selected ? styles.selectedLabel : styles.unselectedLabel]}>{label}</Text>
      {selected && <Feather name="check" size={16} color={COLORS.white} style={styles.icon} />}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.md,
    marginRight: SIZES.xs,
    marginBottom: SIZES.xs,
  },
  selectedContainer: {
    backgroundColor: COLORS.primary,
  },
  unselectedContainer: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectedLabel: {
    color: COLORS.white,
  },
  unselectedLabel: {
    color: COLORS.text,
  },
  icon: {
    marginLeft: SIZES.xs,
  },
})

