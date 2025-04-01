import { supabase } from "../config/supabase"

export type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  attachments?: any
  is_read: boolean
  created_at: string
  sender_name?: string
  sender_image?: string
}

export type Conversation = {
  id: string
  participants: string[]
  last_message_id?: string
  last_message_at?: string
  created_at: string
  updated_at: string
  other_user_id?: string
  other_user_name?: string
  other_user_image?: string
  last_message?: string
  unread_count?: number
}

export type UserPresence = {
  user_id: string
  status: "online" | "offline" | "away"
  last_seen_at: string
}

class MessagingService {
  private messageSubscription: any = null
  private presenceSubscription: any = null
  private currentUserId: string | null = null

  initialize(userId: string): void {
    this.currentUserId = userId
    this.updatePresence("online")
  }

  subscribeToMessages(conversationId: string, onNewMessage: (message: Message) => void): void {
    // Unsubscribe from any existing subscription
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe()
    }

    // Subscribe to messages table changes for this conversation
    this.messageSubscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as Message
          onNewMessage(message)
        },
      )
      .subscribe()
  }

  subscribeToPresence(userIds: string[], onPresenceChange: (presence: UserPresence) => void): void {
    // Unsubscribe from any existing subscription
    if (this.presenceSubscription) {
      this.presenceSubscription.unsubscribe()
    }

    if (userIds.length === 0) return

    // Create filter for multiple user IDs
    const filter = userIds.map((id) => `user_id=eq.${id}`).join(",")

    // Subscribe to presence table changes for these users
    this.presenceSubscription = supabase
      .channel("presence")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
          filter,
        },
        (payload) => {
          const presence = payload.new as UserPresence
          onPresenceChange(presence)
        },
      )
      .subscribe()
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      // Get all conversations where the user is a participant
      const { data: conversations, error } = await supabase
        .from("conversations")
        .select(`
          *,
          messages!messages_conversation_id_fkey (
            content,
            created_at,
            sender_id,
            is_read
          )
        `)
        .contains("participants", [userId])
        .order("updated_at", { ascending: false })

      if (error) throw error

      if (!conversations) return []

      // Process conversations to include other user details and unread count
      const processedConversations: Conversation[] = []

      for (const conv of conversations) {
        // Find the other user ID
        const otherUserId = conv.participants.find((id) => id !== userId)

        if (!otherUserId) continue

        // Get other user details
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("full_name, profile_image")
          .eq("id", otherUserId)
          .single()

        if (userError && userError.code !== "PGRST116") {
          console.error("Error fetching user data:", userError)
          continue
        }

        // Calculate unread count
        const unreadCount = conv.messages
          ? conv.messages.filter((msg) => msg.sender_id !== userId && !msg.is_read).length
          : 0

        // Get last message
        const lastMessage =
          conv.messages && conv.messages.length > 0
            ? conv.messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                .content
            : undefined

        processedConversations.push({
          ...conv,
          other_user_id: otherUserId,
          other_user_name: userData?.full_name || "Unknown User",
          other_user_image: userData?.profile_image,
          last_message: lastMessage,
          unread_count: unreadCount,
          messages: undefined, // Remove nested messages
        })
      }

      return processedConversations
    } catch (error) {
      console.error("Error fetching conversations:", error)
      return []
    }
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:sender_id (
            id,
            full_name,
            profile_image
          )
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (error) throw error

      // Mark messages as read
      if (this.currentUserId) {
        await this.markMessagesAsRead(this.currentUserId, conversationId)
      }

      return (data || []).map((message) => ({
        ...message,
        sender_name: message.sender?.full_name,
        sender_image: message.sender?.profile_image,
      }))
    } catch (error) {
      console.error("Error fetching messages:", error)
      return []
    }
  }

  async sendMessage(senderId: string, recipientId: string, content: string, attachments?: any): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc("send_message", {
        sender_id_param: senderId,
        recipient_id_param: recipientId,
        content_param: content,
        attachments_param: attachments || null,
      })

      if (error) throw error

      return data
    } catch (error) {
      console.error("Error sending message:", error)
      return null
    }
  }

  async markMessagesAsRead(userId: string, conversationId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc("mark_messages_read", {
        user_id_param: userId,
        conversation_id_param: conversationId,
      })

      if (error) throw error

      return true
    } catch (error) {
      console.error("Error marking messages as read:", error)
      return false
    }
  }

  async getOrCreateConversation(userId1: string, userId2: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc("get_or_create_conversation", {
        user_id_1: userId1,
        user_id_2: userId2,
      })

      if (error) throw error

      return data
    } catch (error) {
      console.error("Error getting or creating conversation:", error)
      return null
    }
  }

  async getUserPresence(userId: string): Promise<UserPresence | null> {
    try {
      const { data, error } = await supabase.from("user_presence").select("*").eq("user_id", userId).single()

      if (error && error.code !== "PGRST116") throw error

      return data
    } catch (error) {
      console.error("Error fetching user presence:", error)
      return null
    }
  }

  async updatePresence(status: "online" | "offline" | "away"): Promise<boolean> {
    if (!this.currentUserId) return false

    try {
      const { error } = await supabase.rpc("update_user_presence", {
        user_id_param: this.currentUserId,
        status_param: status,
      })

      if (error) throw error

      return true
    } catch (error) {
      console.error("Error updating presence:", error)
      return false
    }
  }

  cleanup(): void {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe()
      this.messageSubscription = null
    }

    if (this.presenceSubscription) {
      this.presenceSubscription.unsubscribe()
      this.presenceSubscription = null
    }

    // Set status to offline
    if (this.currentUserId) {
      this.updatePresence("offline")
    }
  }
}

export const messagingService = new MessagingService()

