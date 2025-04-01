"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { NotificationItem } from "../../components/notifications/notification-item"
import { notificationService, type Notification } from "../../services/notification-service"
import { useAuth } from "../../contexts/auth-context"
import { COLORS, SIZES } from "../../config/theme"

export const NotificationsScreen = () => {
  const navigation = useNavigation()
  const { user } = useAuth()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user])

  const fetchNotifications = async () => {
    if (!user) return

    setLoading(true)
    try {
      const data = await notificationService.getNotifications(user.id)
      setNotifications(data)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchNotifications()
  }

  const handleNotificationPress = async (notification: Notification) => {
    if (!user) return

    // Mark as read if not already
    if (!notification.is_read) {
      try {
        await notificationService.markAsRead(user.id, [notification.id])

        // Update local state
        setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)))
      } catch (error) {
        console.error("Error marking notification as read:", error)
      }
    }

    // Navigate based on notification type and data
    switch (notification.type) {
      case "booking":
        if (notification.data?.booking_id) {
          navigation.navigate("BookingDetails", {
            bookingId: notification.data.booking_id,
          })
        }
        break
      case "message":
        if (notification.data?.conversation_id) {
          navigation.navigate("ChatScreen", {
            conversationId: notification.data.conversation_id,
            userId: notification.data.sender_id,
          })
        }
        break
      case "payment":
        if (notification.data?.transaction_id) {
          navigation.navigate("TransactionDetails", {
            transactionId: notification.data.transaction_id,
          })
        }
        break
      case "review":
        if (notification.data?.review_id) {
          navigation.navigate("ReviewDetails", {
            reviewId: notification.data.review_id,
          })
        }
        break
      default:
        // Just display the notification
        break
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return

    try {
      await notificationService.markAsRead(user.id)

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))

      Alert.alert("Success", "All notifications marked as read")
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      Alert.alert("Error", "Failed to mark notifications as read")
    }
  }

  const renderEmptyState = () => {
    if (loading) return null

    return (
      <View style={styles.emptyContainer}>
        <Feather name="bell" size={64} color={COLORS.grayDark} />
        <Text style={styles.emptyTitle}>No Notifications</Text>
        <Text style={styles.emptyText}>You don't have any notifications yet</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {notifications.length > 0 && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
            <Feather name="check-circle" size={16} color={COLORS.primary} />
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem notification={item} onPress={handleNotificationPress} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  markAllText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: SIZES.xs,
  },
  listContent: {
    flexGrow: 1,
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

