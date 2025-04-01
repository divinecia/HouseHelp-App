import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { Notification } from "../../services/notification-service"

interface NotificationItemProps {
  notification: Notification
  onPress: (notification: Notification) => void
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onPress }) => {
  const formatDate = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.round(diffMs / 60000)
    const diffHours = Math.round(diffMins / 60)
    const diffDays = Math.round(diffHours / 24)

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    }
  }

  const getIcon = () => {
    switch (notification.type) {
      case "booking":
        return "calendar"
      case "message":
        return "message-square"
      case "payment":
        return "credit-card"
      case "review":
        return "star"
      case "system":
      default:
        return "bell"
    }
  }

  const getIconColor = () => {
    switch (notification.type) {
      case "booking":
        return COLORS.primary
      case "message":
        return "#4CAF50"
      case "payment":
        return "#FF9800"
      case "review":
        return "#FFC107"
      case "system":
      default:
        return COLORS.primary
    }
  }

  return (
    <TouchableOpacity
      style={[styles.container, !notification.is_read && styles.unreadContainer]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}20` }]}>
        <Feather name={getIcon()} size={20} color={getIconColor()} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {notification.title}
        </Text>

        {notification.body && (
          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>
        )}

        <Text style={styles.time}>{formatDate(notification.created_at)}</Text>
      </View>

      {!notification.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: SIZES.md,
    backgroundColor: COLORS.pureWhite,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  unreadContainer: {
    backgroundColor: `${COLORS.primary}05`,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginLeft: SIZES.sm,
    alignSelf: "center",
  },
})

