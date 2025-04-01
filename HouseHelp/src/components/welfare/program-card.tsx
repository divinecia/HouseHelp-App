import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { WelfareProgram, WelfareEnrollment } from "../../services/welfare-service"

interface ProgramCardProps {
  program: WelfareProgram
  enrollment?: WelfareEnrollment
  onPress: (program: WelfareProgram) => void
}

export const ProgramCard: React.FC<ProgramCardProps> = ({ program, enrollment, onPress }) => {
  const getStatusColor = () => {
    if (!enrollment) return "transparent"

    switch (enrollment.status) {
      case "active":
        return COLORS.success
      case "pending":
        return COLORS.warning
      case "approved":
        return COLORS.primary
      case "rejected":
        return COLORS.error
      case "inactive":
        return COLORS.grayDark
      default:
        return COLORS.grayDark
    }
  }

  const getStatusText = () => {
    if (!enrollment) return "Not Enrolled"

    switch (enrollment.status) {
      case "active":
        return "Active"
      case "pending":
        return "Pending"
      case "approved":
        return "Approved"
      case "rejected":
        return "Rejected"
      case "inactive":
        return "Inactive"
      default:
        return enrollment.status
    }
  }

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(program)} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.title}>{program.name}</Text>
        {enrollment ? (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        ) : (
          <View style={styles.enrollButton}>
            <Text style={styles.enrollText}>Enroll</Text>
          </View>
        )}
      </View>

      <Text style={styles.description} numberOfLines={3}>
        {program.description}
      </Text>

      {program.eligibility_criteria && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Eligibility</Text>
          <Text style={styles.sectionText} numberOfLines={2}>
            {program.eligibility_criteria}
          </Text>
        </View>
      )}

      {program.benefits && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Benefits</Text>
          <Text style={styles.sectionText} numberOfLines={2}>
            {program.benefits}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>View Details</Text>
        <Feather name="chevron-right" size={20} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginRight: SIZES.xs,
  },
  statusBadge: {
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: SIZES.xs,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  enrollButton: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.xs,
  },
  enrollText: {
    fontSize: 12,
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  section: {
    marginBottom: SIZES.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  sectionText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: SIZES.xs,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.primary,
    marginRight: SIZES.xs,
  },
})

