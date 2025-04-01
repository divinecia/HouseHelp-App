import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { Incident } from "../../services/incident-service"

interface IncidentCardProps {
  incident: Incident
  onPress: (incident: Incident) => void
}

export const IncidentCard: React.FC<IncidentCardProps> = ({ incident, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusColor = () => {
    switch (incident.status) {
      case "resolved":
      case "closed":
        return COLORS.success
      case "under_review":
      case "in_progress":
        return COLORS.warning
      case "submitted":
        return COLORS.primary
      default:
        return COLORS.grayDark
    }
  }

  const getStatusText = () => {
    switch (incident.status) {
      case "submitted":
        return "Submitted"
      case "under_review":
        return "Under Review"
      case "in_progress":
        return "In Progress"
      case "resolved":
        return "Resolved"
      case "closed":
        return "Closed"
      default:
        return incident.status
    }
  }

  const getPriorityColor = () => {
    switch (incident.priority) {
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

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(incident)} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {incident.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>
        <View style={styles.categoryRow}>
          <Text style={styles.category}>{incident.category_name}</Text>
          <View style={styles.priorityContainer}>
            <View style={[styles.priorityDot, { backgroundColor: getPriorityColor() }]} />
            <Text style={styles.priorityText}>{incident.priority}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {incident.description}
      </Text>

      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <Feather name="calendar" size={14} color={COLORS.textLight} />
          <Text style={styles.dateText}>{formatDate(incident.incident_date)}</Text>
        </View>

        {incident.attachments && incident.attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            <Feather name="paperclip" size={14} color={COLORS.textLight} />
            <Text style={styles.attachmentsText}>
              {incident.attachments.length} attachment{incident.attachments.length !== 1 ? "s" : ""}
            </Text>
          </View>
        )}

        <Feather name="chevron-right" size={20} color={COLORS.textLight} />
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
    marginBottom: SIZES.sm,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
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
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  category: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  priorityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  priorityText: {
    fontSize: 12,
    color: COLORS.textLight,
    textTransform: "capitalize",
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  attachmentsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  attachmentsText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
})

