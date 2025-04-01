"use client"

import type React from "react"
import { useState } from "react"
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import { Button } from "../UI/button"

interface ReviewFormProps {
  initialRating?: number
  initialComment?: string
  onSubmit: (rating: number, comment: string) => void
  onCancel?: () => void
  isResponse?: boolean
  isLoading?: boolean
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  initialRating = 0,
  initialComment = "",
  onSubmit,
  onCancel,
  isResponse = false,
  isLoading = false,
}) => {
  const [rating, setRating] = useState(initialRating)
  const [comment, setComment] = useState(initialComment)

  const handleStarPress = (selectedRating: number) => {
    if (!isResponse) {
      setRating(selectedRating)
    }
  }

  const handleSubmit = () => {
    if (!isResponse && rating === 0) {
      // Rating is required for reviews
      return
    }

    onSubmit(rating, comment)
  }

  return (
    <View style={styles.container}>
      {!isResponse && (
        <>
          <Text style={styles.label}>Rating</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => handleStarPress(star)} style={styles.starButton}>
                <Feather
                  name={star <= rating ? "star" : "star"}
                  size={32}
                  color={star <= rating ? COLORS.warning : COLORS.grayDark}
                  style={styles.star}
                />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>{isResponse ? "Your Response" : "Your Review"}</Text>
      <TextInput
        style={styles.input}
        value={comment}
        onChangeText={setComment}
        placeholder={isResponse ? "Write your response here..." : "Share your experience..."}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />

      <View style={styles.buttonContainer}>
        {onCancel && <Button title="Cancel" onPress={onCancel} variant="outline" style={styles.cancelButton} />}
        <Button
          title={isResponse ? "Submit Response" : "Submit Review"}
          onPress={handleSubmit}
          disabled={(!isResponse && rating === 0) || isLoading}
          loading={isLoading}
          style={styles.submitButton}
        />
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
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: SIZES.md,
  },
  starButton: {
    marginRight: SIZES.xs,
  },
  star: {
    marginRight: SIZES.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.sm,
    padding: SIZES.sm,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 120,
    marginBottom: SIZES.md,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cancelButton: {
    marginRight: SIZES.sm,
  },
  submitButton: {
    minWidth: 120,
  },
})

