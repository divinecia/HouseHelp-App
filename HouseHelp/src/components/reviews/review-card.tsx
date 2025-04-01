"use client"

import React from "react"
import { useState } from "react"
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { Review, ReviewResponse } from "../../services/review-service"
import { RatingStars } from "../UI/rating-stars"

interface ReviewCardProps {
  review: Review
  response?: ReviewResponse
  canRespond?: boolean
  canReport?: boolean
  onRespond?: (review: Review) => void
  onReport?: (review: Review) => void
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  response,
  canRespond = false,
  canReport = false,
  onRespond,
  onReport,
}) => {
  const [expanded, setExpanded] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const toggleExpanded = () => {
    if (review.comment && review.comment.length > 150) {
      setExpanded(!expanded)
    }
  }

  const getCommentText = () => {
    if (!review.comment) return "No comment provided"

    if (review.comment.length <= 150 || expanded) {
      return review.comment
    }

    return `${review.comment.substring(0, 150)}...`
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image
            source={review.reviewer_image ? { uri: review.reviewer_image } : require("../../assets/default-avatar.png")}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.userName}>{review.reviewer_name || "Anonymous"}</Text>
            <Text style={styles.date}>{formatDate(review.created_at)}</Text>
          </View>
        </View>
        <RatingStars rating={review.rating} size={16} />
      </View>

      <TouchableOpacity
        style={styles.commentContainer}
        onPress={toggleExpanded}
        activeOpacity={review.comment && review.comment.length > 150 ? 0.7 : 1}
      >
        <Text style={styles.comment}>{getCommentText()}</Text>
        {review.comment && review.comment.length > 150 && (
          <Text style={styles.readMore}>{expanded ? "Show less" : "Read more"}</Text>
        )}
      </TouchableOpacity>

      {response && (
        <View style={styles.responseContainer}>
          <View style={styles.responseHeader}>
            <Feather name="corner-down-right" size={16} color={COLORS.primary} />
            <Text style={styles.responseTitle}>Response from {response.responder_name}</Text>
          </View>
          <Text style={styles.responseText}>{response.response}</Text>
          <Text style={styles.responseDate}>{formatDate(response.created_at)}</Text>
        </View>
      )}

      <View style={styles.actions}>
        {canRespond && !response && (
          <TouchableOpacity style={styles.actionButton} onPress={() => onRespond && onRespond(review)}>
            <Feather name="message-square" size={16} color={COLORS.primary} />
            <Text style={styles.actionText}>Respond</Text>
          </TouchableOpacity>
        )}

        {canRespond && response && (
          <TouchableOpacity style={styles.actionButton} onPress={() => onRespond && onRespond(review)}>
            <Feather name="edit-2" size={16} color={COLORS.primary} />
            <Text style={styles.actionText}>Edit Response</Text>
          </TouchableOpacity>
        )}

        {canReport && (
          <TouchableOpacity style={styles.actionButton} onPress={() => onReport && onReport(review)}>
            <Feather name="flag" size={16} color={COLORS.error} />
            <Text style={[styles.actionText, { color: COLORS.error }]}>Report</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SIZES.sm,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  date: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  commentContainer: {
    marginBottom: SIZES.md,
  },
  comment: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  readMore: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
    marginTop: SIZES.xs,
  },
  responseContainer: {
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: SIZES.sm,
    padding: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  responseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.xs,
  },
  responseTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.primary,
    marginLeft: SIZES.xs,
  },
  responseText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  responseDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: SIZES.xs,
    textAlign: "right",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: SIZES.md,
  },
  actionText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: SIZES.xs,
  },
})

