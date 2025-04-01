import { supabase } from "../config/supabase"

export type Review = {
  id: string
  booking_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment?: string
  is_worker_review: boolean
  status: "pending" | "published" | "rejected" | "flagged"
  created_at: string
  updated_at: string
  reviewer_name?: string
  reviewer_image?: string
}

export type ReviewResponse = {
  id: string
  review_id: string
  responder_id: string
  response: string
  created_at: string
  updated_at: string
  responder_name?: string
}

export type UserRating = {
  average_rating: number
  total_reviews: number
}

class ReviewService {
  async getUserReviews(userId: string, isWorkerReview: boolean): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          reviewer:reviewer_id(id, full_name, profile_image)
        `)
        .eq("reviewee_id", userId)
        .eq("is_worker_review", isWorkerReview)
        .eq("status", "published")
        .order("created_at", { ascending: false })

      if (error) throw error

      return (data || []).map((review) => ({
        ...review,
        reviewer_name: review.reviewer?.full_name,
        reviewer_image: review.reviewer?.profile_image,
      }))
    } catch (error) {
      console.error("Error fetching user reviews:", error)
      return []
    }
  }

  async getReviewResponses(reviewIds: string[]): Promise<Record<string, ReviewResponse>> {
    if (reviewIds.length === 0) return {}

    try {
      const { data, error } = await supabase
        .from("review_responses")
        .select(`
          *,
          responder:responder_id(id, full_name)
        `)
        .in("review_id", reviewIds)

      if (error) throw error

      const responseMap: Record<string, ReviewResponse> = {}

      data?.forEach((response) => {
        responseMap[response.review_id] = {
          ...response,
          responder_name: response.responder?.full_name,
        }
      })

      return responseMap
    } catch (error) {
      console.error("Error fetching review responses:", error)
      return {}
    }
  }

  async getUserRating(userId: string): Promise<UserRating> {
    try {
      const { data, error } = await supabase.rpc("get_user_rating", {
        user_id_param: userId,
      })

      if (error) throw error

      if (data) {
        return {
          average_rating: data.average_rating || 0,
          total_reviews: data.total_reviews || 0,
        }
      }

      return {
        average_rating: 0,
        total_reviews: 0,
      }
    } catch (error) {
      console.error("Error fetching user rating:", error)
      return {
        average_rating: 0,
        total_reviews: 0,
      }
    }
  }

  async canReviewBooking(bookingId: string, reviewerId: string, revieweeId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc("can_review_booking", {
        booking_id_param: bookingId,
        reviewer_id_param: reviewerId,
        reviewee_id_param: revieweeId,
      })

      if (error) throw error

      return data || false
    } catch (error) {
      console.error("Error checking if user can review booking:", error)
      return false
    }
  }

  async submitReview(
    bookingId: string,
    reviewerId: string,
    revieweeId: string,
    rating: number,
    comment: string,
    isWorkerReview: boolean,
  ): Promise<{ success: boolean; reviewId?: string; error?: string }> {
    try {
      // Check if user can review
      const canReview = await this.canReviewBooking(bookingId, reviewerId, revieweeId)

      if (!canReview) {
        return {
          success: false,
          error: "You cannot review this booking",
        }
      }

      // Submit review
      const { data, error } = await supabase
        .from("reviews")
        .insert({
          booking_id: bookingId,
          reviewer_id: reviewerId,
          reviewee_id: revieweeId,
          rating,
          comment,
          is_worker_review: isWorkerReview,
          status: "published", // Auto-publish for now, could be 'pending' for moderation
        })
        .select("id")
        .single()

      if (error) throw error

      return {
        success: true,
        reviewId: data.id,
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      return {
        success: false,
        error: "Failed to submit review",
      }
    }
  }

  async respondToReview(
    reviewId: string,
    responderId: string,
    response: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if review exists and user is the reviewee
      const { data: review, error: reviewError } = await supabase
        .from("reviews")
        .select("reviewee_id")
        .eq("id", reviewId)
        .single()

      if (reviewError) throw reviewError

      if (review.reviewee_id !== responderId) {
        return {
          success: false,
          error: "You cannot respond to this review",
        }
      }

      // Check if response already exists
      const { data: existingResponse, error: responseError } = await supabase
        .from("review_responses")
        .select("id")
        .eq("review_id", reviewId)
        .maybeSingle()

      if (responseError && responseError.code !== "PGRST116") throw responseError

      if (existingResponse) {
        // Update existing response
        const { error: updateError } = await supabase
          .from("review_responses")
          .update({
            response,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingResponse.id)

        if (updateError) throw updateError
      } else {
        // Create new response
        const { error: insertError } = await supabase.from("review_responses").insert({
          review_id: reviewId,
          responder_id: responderId,
          response,
        })

        if (insertError) throw insertError
      }

      return { success: true }
    } catch (error) {
      console.error("Error responding to review:", error)
      return {
        success: false,
        error: "Failed to respond to review",
      }
    }
  }

  async reportReview(
    reviewId: string,
    reporterId: string,
    reason: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from("review_reports").insert({
        review_id: reviewId,
        reporter_id: reporterId,
        reason,
        status: "pending",
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error("Error reporting review:", error)
      return {
        success: false,
        error: "Failed to report review",
      }
    }
  }
}

export const reviewService = new ReviewService()

