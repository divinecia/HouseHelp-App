"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Modal, Alert } from "react-native"
import { useRoute } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { ReviewCard } from "../../components/reviews/review-card"
import { ReviewForm } from "../../components/reviews/review-form"
import { reviewService, type Review, type ReviewResponse, type UserRating } from "../../services/review-service"
import { useAuth } from "../../contexts/auth-context"
import { COLORS, SIZES } from "../../config/theme"
import { RatingStars } from "../../components/UI/rating-stars"

export const ReviewsScreen = () => {
  const route = useRoute()
  const { userId, isWorker } = route.params as {
    userId: string
    isWorker: boolean
  }
  const { user } = useAuth()

  const [reviews, setReviews] = useState<Review[]>([])
  const [responses, setResponses] = useState<Record<string, ReviewResponse>>({})
  const [userRating, setUserRating] = useState<UserRating>({
    average_rating: 0,
    total_reviews: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [responseModalVisible, setResponseModalVisible] = useState(false)
  const [reportModalVisible, setReportModalVisible] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchReviews()
    fetchUserRating()
  }, [userId])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const reviewsData = await reviewService.getUserReviews(userId, isWorker)
      setReviews(reviewsData)

      if (reviewsData.length > 0) {
        const reviewIds = reviewsData.map((review) => review.id)
        const responsesData = await reviewService.getReviewResponses(reviewIds)
        setResponses(responsesData)
      }
    } catch (error) {
      console.error("Error fetching reviews:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchUserRating = async () => {
    try {
      const rating = await reviewService.getUserRating(userId)
      setUserRating(rating)
    } catch (error) {
      console.error("Error fetching user rating:", error)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchReviews()
    fetchUserRating()
  }

  const handleRespond = (review: Review) => {
    setSelectedReview(review)
    setResponseModalVisible(true)
  }

  const handleReport = (review: Review) => {
    setSelectedReview(review)
    setReportReason("")
    setReportModalVisible(true)
  }

  const submitResponse = async (rating: number, response: string) => {
    if (!user || !selectedReview) return

    setSubmitting(true)
    try {
      const result = await reviewService.respondToReview(selectedReview.id, user.id, response)

      if (result.success) {
        // Update local state
        const updatedResponses = {
          ...responses,
          [selectedReview.id]: {
            id: "temp-id", // Will be replaced on refresh
            review_id: selectedReview.id,
            responder_id: user.id,
            response,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            responder_name: user.user_metadata?.full_name || "You",
          },
        }

        setResponses(updatedResponses)
        setResponseModalVisible(false)
        setSelectedReview(null)
      } else {
        Alert.alert("Error", result.error || "Failed to submit response")
      }
    } catch (error) {
      console.error("Error submitting response:", error)
      Alert.alert("Error", "Failed to submit response")
    } finally {
      setSubmitting(false)
    }
  }

  const submitReport = async () => {
    if (!user || !selectedReview || !reportReason.trim()) {
      Alert.alert("Error", "Please provide a reason for reporting")
      return
    }

    setSubmitting(true)
    try {
      const result = await reviewService.reportReview(selectedReview.id, user.id, reportReason)

      if (result.success) {
        Alert.alert("Report Submitted", "Thank you for your report. We will review it shortly.")
        setReportModalVisible(false)
        setSelectedReview(null)
      } else {
        Alert.alert("Error", result.error || "Failed to submit report")
      }
    } catch (error) {
      console.error("Error submitting report:", error)
      Alert.alert("Error", "Failed to submit report")
    } finally {
      setSubmitting(false)
    }
  }

  const renderEmptyState = () => {
    if (loading) return null

    return (
      <View style={styles.emptyContainer}>
        <Feather name="message-square" size={64} color={COLORS.grayDark} />
        <Text style={styles.emptyTitle}>No Reviews Yet</Text>
        <Text style={styles.emptyText}>
          {isWorker ? "This worker has not received any reviews yet" : "This user has not received any reviews yet"}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingValue}>{userRating.average_rating.toFixed(1)}</Text>
          <RatingStars rating={userRating.average_rating} size={24} />
          <Text style={styles.reviewCount}>
            {userRating.total_reviews} review
            {userRating.total_reviews !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReviewCard
            review={item}
            response={responses[item.id]}
            canRespond={user?.id === userId}
            canReport={user?.id !== item.reviewer_id}
            onRespond={handleRespond}
            onReport={handleReport}
          />
        )}
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

      {/* Response Modal */}
      <Modal
        visible={responseModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setResponseModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {responses[selectedReview?.id || ""] ? "Edit Your Response" : "Respond to Review"}
              </Text>
              <TouchableOpacity onPress={() => setResponseModalVisible(false)} disabled={submitting}>
                <Feather name="x" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ReviewForm
              initialComment={responses[selectedReview?.id || ""]?.response || ""}
              onSubmit={submitResponse}
              isResponse={true}
              isLoading={submitting}
            />
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Review</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)} disabled={submitting}>
                <Feather name="x" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.reportLabel}>Please provide a reason for reporting this review:</Text>
            <View style={styles.reportOptions}>
              {["Inappropriate content", "False information", "Spam", "Harassment", "Other"].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reportOption, reportReason === reason && styles.selectedReportOption]}
                  onPress={() => setReportReason(reason)}
                >
                  <Text style={[styles.reportOptionText, reportReason === reason && styles.selectedReportOptionText]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.reportActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setReportModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, (!reportReason.trim() || submitting) && styles.disabledButton]}
                onPress={submitReport}
                disabled={!reportReason.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.pureWhite} />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SIZES.md,
    alignItems: "center",
  },
  ratingContainer: {
    alignItems: "center",
  },
  ratingValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: COLORS.pureWhite,
    marginBottom: SIZES.xs,
  },
  reviewCount: {
    fontSize: 14,
    color: COLORS.pureWhite,
    marginTop: SIZES.xs,
  },
  listContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
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
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.lg,
    borderTopRightRadius: SIZES.lg,
    padding: SIZES.md,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  reportLabel: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  reportOptions: {
    marginBottom: SIZES.md,
  },
  reportOption: {
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.sm,
    marginBottom: SIZES.xs,
  },
  selectedReportOption: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  reportOptionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  selectedReportOptionText: {
    color: COLORS.pureWhite,
  },
  reportActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: SIZES.md,
  },
  cancelButton: {
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    marginRight: SIZES.md,
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    borderRadius: SIZES.sm,
  },
  disabledButton: {
    backgroundColor: COLORS.grayDark,
  },
  submitButtonText: {
    fontSize: 16,
    color: COLORS.pureWhite,
    fontWeight: "500",
  },
})

