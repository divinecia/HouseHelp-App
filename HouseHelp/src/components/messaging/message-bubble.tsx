import type React from "react"
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { Message } from "../../services/messaging-service"

interface MessageBubbleProps {
  message: Message
  isCurrentUser: boolean
  showAvatar?: boolean
  onLongPress?: (message: Message) => void
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  showAvatar = true,
  onLongPress,
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <TouchableOpacity
      style={[styles.container, isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer]}
      onLongPress={() => onLongPress && onLongPress(message)}
      activeOpacity={onLongPress ? 0.7 : 1}
    >
      {!isCurrentUser && showAvatar && (
        <Image
          source={message.sender_image ? { uri: message.sender_image } : require("../../assets/default-avatar.png")}
          style={styles.avatar}
        />
      )}

      <View style={[styles.bubble, isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble]}>
        <Text style={[styles.messageText, isCurrentUser ? styles.currentUserText : styles.otherUserText]}>
          {message.content}
        </Text>

        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, isCurrentUser ? styles.currentUserTimeText : styles.otherUserTimeText]}>
            {formatTime(message.created_at)}
          </Text>

          {isCurrentUser && (
            <Feather
              name={message.is_read ? "check-circle" : "check"}
              size={12}
              color={message.is_read ? COLORS.success : isCurrentUser ? COLORS.pureWhite : COLORS.textLight}
              style={styles.readIcon}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: SIZES.sm,
    paddingHorizontal: SIZES.md,
  },
  currentUserContainer: {
    justifyContent: "flex-end",
  },
  otherUserContainer: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: SIZES.xs,
  },
  bubble: {
    maxWidth: "80%",
    padding: SIZES.sm,
    borderRadius: SIZES.md,
  },
  currentUserBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 0,
  },
  otherUserBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
  },
  currentUserText: {
    color: COLORS.pureWhite,
  },
  otherUserText: {
    color: COLORS.text,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
  },
  currentUserTimeText: {
    color: `${COLORS.pureWhite}90`,
  },
  otherUserTimeText: {
    color: COLORS.textLight,
  },
  readIcon: {
    marginLeft: 4,
  },
})

