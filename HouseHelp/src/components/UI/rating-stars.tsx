import type React from "react"
import { View, StyleSheet } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS } from "../../config/theme"

interface RatingStarsProps {
  rating: number
  size?: number
  color?: string
  style?: any
}

export const RatingStars: React.FC<RatingStarsProps> = ({ rating, size = 16, color = COLORS.warning, style }) => {
  const renderStars = () => {
    const stars = []
    const fullStars = Math.floor(rating)
    const halfStar = rating % 1 >= 0.5

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Feather key={`star-${i}`} name="star" size={size} color={color} style={styles.star} />)
    }

    // Half star
    if (halfStar) {
      stars.push(
        <View key="half-star" style={styles.halfStarContainer}>
          <Feather name="star" size={size} color={COLORS.grayDark} style={[styles.star, styles.emptyStar]} />
          <View style={styles.halfStarOverlay}>
            <Feather name="star" size={size} color={color} style={styles.star} />
          </View>
        </View>,
      )
    }

    // Empty stars
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Feather key={`empty-star-${i}`} name="star" size={size} color={COLORS.grayDark} style={styles.star} />,
      )
    }

    return stars
  }

  return <View style={[styles.container, style]}>{renderStars()}</View>
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  star: {
    marginRight: 2,
  },
  emptyStar: {
    position: "absolute",
  },
  halfStarContainer: {
    position: "relative",
  },
  halfStarOverlay: {
    position: "absolute",
    width: "50%",
    overflow: "hidden",
  },
})

