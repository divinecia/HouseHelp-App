import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { SupportTicket } from "../../services/incident-service"

interface SupportTicketCardProps {
  ticket: SupportTicket
  onPress: (ticket: SupportTicket) => void
}

export const SupportTicketCard: React.FC<SupportTicketCardProps> = ({ ticket, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusColor = () => {
    switch (ticket.status) {
      case "resolved":
      case "closed":
        return COLORS.success
      case "in_progress":
        return COLORS.warning
      case "waiting_for_customer":
        return COLORS.primary
      case "open":
        return "#FF9800" // Orange
      default:
        return COLORS.grayDark
    }
  }

  const getStatusText = () => {
    switch (ticket.status) {
      case "open":
        return "Open"
      case "in_progress":
        return "In Progress"
      case "waiting_for_customer":
        return "Awaiting Your Response"
      case "resolved":
        return "Resolved"
      case "closed":
        return "Closed"
      default:
        return ticket.status
    }
  }

  const getPriorityColor = () => {
    switch (ticket.priority) {
      case "high":
        return COLORS.error
      case "medium":
        return COLORS.warning
      case "low":
        return COLORS.success
      default:
        return COLORS.grayDark
    }
  }

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(ticket)} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.subject} numberOfLines={1}>
          {ticket.subject}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {ticket.description}
      </Text>

      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <Feather name="calendar" size={14} color={COLORS.textLight} />
          <Text style={styles.dateText}>{formatDate(ticket.created_at)}</Text>
        </View>

        <View style={styles.priorityContainer}>
          <View style={[styles.priorityDot, { backgroundColor: getPriorityColor() }]} />
          <Text style={styles.priorityText}>
            {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority
          </Text>
        </View>

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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.sm,
  },
  subject: {
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
  },
})

