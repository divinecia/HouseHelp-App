import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity, Share } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { Certificate } from "../../services/training-service"

interface CertificateCardProps {
  certificate: Certificate
  courseName: string
  onPress: (certificate: Certificate) => void
}

export const CertificateCard: React.FC<CertificateCardProps> = ({ certificate, courseName, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return COLORS.success
      case "expired":
        return COLORS.warning
      case "revoked":
        return COLORS.error
      default:
        return COLORS.grayDark
    }
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my certificate for ${courseName}! Verify it at: ${certificate.verification_url}`,
        url: certificate.verification_url,
      })
    } catch (error) {
      console.error("Error sharing certificate:", error)
    }
  }

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(certificate)} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Feather name="award" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {courseName}
          </Text>
          <Text style={styles.issueDate}>Issued on {formatDate(certificate.issue_date)}</Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Certificate No:</Text>
          <Text style={styles.infoValue}>{certificate.certificate_number}</Text>
        </View>

        {certificate.expiry_date && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Valid Until:</Text>
            <Text style={styles.infoValue}>{formatDate(certificate.expiry_date)}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status:</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(certificate.status) }]} />
            <Text style={styles.statusText}>
              {certificate.status.charAt(0).toUpperCase() + certificate.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.button, styles.viewButton]} onPress={() => onPress(certificate)}>
          <Feather name="eye" size={16} color={COLORS.primary} />
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.shareButton]} onPress={handleShare}>
          <Feather name="share-2" size={16} color={COLORS.pureWhite} />
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
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
    marginBottom: SIZES.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.md,
  },
  titleContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  issueDate: {
    fontSize: 12,
    color: COLORS.textLight,
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
    color: COLORS.text,
    fontWeight: "500",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SIZES.xs,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    borderRadius: SIZES.sm,
    flex: 1,
  },
  viewButton: {
    backgroundColor: `${COLORS.primary}10`,
    marginRight: SIZES.xs,
  },
  viewButtonText: {
    color: COLORS.primary,
    fontWeight: "500",
    marginLeft: SIZES.xs,
  },
  shareButton: {
    backgroundColor: COLORS.primary,
    marginLeft: SIZES.xs,
  },
  shareButtonText: {
    color: COLORS.pureWhite,
    fontWeight: "500",
    marginLeft: SIZES.xs,
  },
})

