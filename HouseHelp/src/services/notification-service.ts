import { supabase } from "../config/supabase"
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"
import Constants from "expo-constants"

export type Notification = {
  id: string
  user_id: string
  title: string
  body?: string
  type: "booking" | "message" | "payment" | "system" | "review"
  data?: any
  is_read: boolean
  created_at: string
}

class NotificationService {
  private subscription: any = null
  private pushToken: string | null = null

  async initialize(userId: string): Promise<void> {
    try {
      // Request permission for push notifications
      await this.registerForPushNotifications()

      // Subscribe to real-time notifications
      this.subscribeToNotifications(userId)
    } catch (error) {
      console.error("Error initializing notification service:", error)
    }
  }

  async registerForPushNotifications(): Promise<void> {
    try {
      if (!Constants.expoConfig?.extra?.eas?.projectId) {
        console.warn("EAS Project ID not available, skipping push notification setup")
        return
      }

      // Request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== "granted") {
        console.warn("Failed to get push token for push notification!")
        return
      }

      // Get push token
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig.extra.eas.projectId,
      })

      this.pushToken = token

      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      })

      // Platform-specific setup
      if (Platform.OS === "android") {
        Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        })
      }
    } catch (error) {
      console.error("Error setting up push notifications:", error)
    }
  }

  private subscribeToNotifications(userId: string): void {
    // Unsubscribe from any existing subscription
    if (this.subscription) {
      this.subscription.unsubscribe()
    }

    // Subscribe to notifications table changes for this user
    this.subscription = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as Notification
          this.handleNewNotification(notification)
        },
      )
      .subscribe()
  }

  private async handleNewNotification(notification: Notification): Promise<void> {
    try {
      // Show local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body || "",
          data: notification.data || {},
        },
        trigger: null, // Immediate notification
      })
    } catch (error) {
      console.error("Error handling new notification:", error)
    }
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching notifications:", error)
      return []
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false)

      if (error) throw error

      return count || 0
    } catch (error) {
      console.error("Error fetching unread count:", error)
      return 0
    }
  }

  async markAsRead(userId: string, notificationIds?: string[]): Promise<boolean> {
    try {
      const { error } = await supabase.rpc("mark_notifications_read", {
        user_id_param: userId,
        notification_ids: notificationIds || null,
      })

      if (error) throw error

      return true
    } catch (error) {
      console.error("Error marking notifications as read:", error)
      return false
    }
  }

  async createNotification(
    userId: string,
    title: string,
    body: string,
    type: "booking" | "message" | "payment" | "system" | "review",
    data?: any,
  ): Promise<string | null> {
    try {
      const { data: result, error } = await supabase.rpc("create_notification", {
        user_id_param: userId,
        title_param: title,
        body_param: body,
        type_param: type,
        data_param: data || null,
      })

      if (error) throw error

      return result
    } catch (error) {
      console.error("Error creating notification:", error)
      return null
    }
  }

  cleanup(): void {
    if (this.subscription) {
      this.subscription.unsubscribe()
      this.subscription = null
    }
  }
}

export const notificationService = new NotificationService()

