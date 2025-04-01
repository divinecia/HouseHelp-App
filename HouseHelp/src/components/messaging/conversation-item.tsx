import type React from "react"
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native"
import { COLORS, SIZES } from "../../config/theme"
import type { Conversation } from "../../services/messaging-service"

interface ConversationItemProps {
  conversation: Conversation
  onPress: (conversation: Conversation) => void
}

export const ConversationItem: React.FC<ConversationItemProps> = ({ conversation, onPress }) => {
  const formatTime = (dateString?: string) => {
    if (!dateString) return ""

    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      // Today, show time
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    } else if (diffDays === 1) {
      // Yesterday
      return "Yesterday"
    } else if (diffDays < 7) {
      // This week, show day name
      return date.toLocaleDateString("en-US", { weekday: "short" })
    } else {
      // Older, show date
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    }
  }

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(conversation)} activeOpacity={0.7}>
      <View style={styles.avatarContainer}>
        <Image
          source={
            conversation.other_user_image
              ? { uri: conversation.other_user_image }
              : require("../../assets/default-avatar.png")
          }
          style={styles.avatar}
        />
        {conversation.unread_count && conversation.unread_count > 0 ? (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{conversation.unread_count > 99 ? "99+" : conversation.unread_count}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {conversation.other_user_name}
          </Text>
          <Text style={styles.time}>{formatTime(conversation.last_message_at)}</Text>
        </View>

        <Text style={styles.message} numberOfLines={1}>
          {conversation.last_message || "No messages yet"}
        </Text>
      </View>
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
  avatarContainer: {
    position: "relative",
    marginRight: SIZES.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  badgeContainer: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.pureWhite,
    fontSize: 10,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginRight: SIZES.xs,
  },
  time: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  message: {
    fontSize: 14,
    color: COLORS.textLight,
  },
})

