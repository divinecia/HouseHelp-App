"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native"
import { useRoute, useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { MessageBubble } from "../../components/messaging/message-bubble"
import { messagingService, type Message, type UserPresence } from "../../services/messaging-service"
import { useAuth } from "../../contexts/auth-context"
import { COLORS, SIZES } from "../../config/theme"
import { supabase } from "../../lib/supabase"

export const ChatScreen = () => {
  const route = useRoute()
  const navigation = useNavigation()
  const { conversationId, userId } = route.params as {
    conversationId?: string
    userId: string
  }
  const { user } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [otherUserName, setOtherUserName] = useState("")
  const [otherUserImage, setOtherUserImage] = useState<string | null>(null)
  const [otherUserPresence, setOtherUserPresence] = useState<UserPresence | null>(null)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null)

  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    if (user) {
      fetchUserDetails()
      if (currentConversationId) {
        fetchMessages()
      } else if (userId) {
        createConversation()
      }
    }

    return () => {
      // Cleanup subscriptions
      messagingService.cleanup()
    }
  }, [user, currentConversationId, userId])

  useEffect(() => {
    if (currentConversationId && user) {
      // Subscribe to new messages
      messagingService.subscribeToMessages(currentConversationId, handleNewMessage)

      // Subscribe to presence changes
      messagingService.subscribeToPresence([userId], handlePresenceChange)
    }
  }, [currentConversationId, user, userId])

  const fetchUserDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, profile_image")
        .eq("id", userId)
        .single()

      if (error) throw error

      setOtherUserName(data.full_name || "User")
      setOtherUserImage(data.profile_image)

      // Set navigation title
      navigation.setOptions({
        title: data.full_name || "Chat",
      })

      // Fetch presence
      const presence = await messagingService.getUserPresence(userId)
      if (presence) {
        setOtherUserPresence(presence)
      }
    } catch (error) {
      console.error("Error fetching user details:", error)
    }
  }

  const createConversation = async () => {
    if (!user || !userId) return

    try {
      const conversationId = await messagingService.getOrCreateConversation(user.id, userId)

      if (conversationId) {
        setCurrentConversationId(conversationId)
      } else {
        console.error("Failed to create conversation")
      }
    } catch (error) {
      console.error("Error creating conversation:", error)
    }
  }

  const fetchMessages = async () => {
    if (!currentConversationId) return

    setLoading(true)
    try {
      const data = await messagingService.getMessages(currentConversationId)
      setMessages(data)
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleNewMessage = (message: Message) => {
    // Add new message to state
    setMessages((prev) => [...prev, message])

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }

  const handlePresenceChange = (presence: UserPresence) => {
    setOtherUserPresence(presence)
  }

  const handleSendMessage = async () => {
    if (!user || !inputText.trim() || !userId) return

    setSending(true)
    try {
      await messagingService.sendMessage(user.id, userId, inputText.trim())

      // Clear input
      setInputText("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  const getPresenceStatus = () => {
    if (!otherUserPresence) return "Offline"

    switch (otherUserPresence.status) {
      case "online":
        return "Online"
      case "away":
        return "Away"
      case "offline":
        return "Offline"
      default:
        return "Offline"
    }
  }

  const getPresenceColor = () => {
    if (!otherUserPresence) return COLORS.grayDark

    switch (otherUserPresence.status) {
      case "online":
        return COLORS.success
      case "away":
        return COLORS.warning
      case "offline":
        return COLORS.grayDark
      default:
        return COLORS.grayDark
    }
  }

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <Image
          source={otherUserImage ? { uri: otherUserImage } : require("../../assets/default-avatar.png")}
          style={styles.headerAvatar}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{otherUserName}</Text>
          <View style={styles.presenceContainer}>
            <View style={[styles.presenceDot, { backgroundColor: getPresenceColor() }]} />
            <Text style={styles.presenceText}>{getPresenceStatus()}</Text>
          </View>
        </View>
      </View>
    )
  }

  const renderEmptyState = () => {
    if (loading) return null

    return (
      <View style={styles.emptyContainer}>
        <Feather name="message-circle" size={64} color={COLORS.grayDark} />
        <Text style={styles.emptyTitle}>No Messages Yet</Text>
        <Text style={styles.emptyText}>Start the conversation by sending a message</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {renderHeader()}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const isCurrentUser = item.sender_id === user?.id
          const showAvatar = index === 0 || messages[index - 1].sender_id !== item.sender_id

          return (
            <MessageBubble message={item} isCurrentUser={isCurrentUser} showAvatar={showAvatar && !isCurrentUser} />
          )
        }}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={renderEmptyState}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.disabledButton]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.pureWhite} />
          ) : (
            <Feather name="send" size={20} color={COLORS.pureWhite} />
          )}
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.pureWhite,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SIZES.sm,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  presenceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  presenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  presenceText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  messagesList: {
    flexGrow: 1,
    paddingVertical: SIZES.md,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.sm,
    backgroundColor: COLORS.pureWhite,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: SIZES.sm,
  },
  disabledButton: {
    backgroundColor: COLORS.grayDark,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: `${COLORS.white}80`,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: SIZES.md,
    marginBottom: SIZES.xs,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
  },
})

