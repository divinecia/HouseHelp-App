import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native"
import { Feather } from "@expo/vector-icons"
import { COLORS, SIZES } from "../../config/theme"
import type { Course } from "../../services/training-service"

interface CourseCardProps {
  course: Course
  progress?: number
  onPress: (course: Course) => void
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, progress, onPress }) => {
  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "beginner":
        return COLORS.success
      case "intermediate":
        return COLORS.warning
      case "advanced":
        return COLORS.error
      default:
        return COLORS.grayDark
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`
    }

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (remainingMinutes === 0) {
      return `${hours} hr`
    }

    return `${hours} hr ${remainingMinutes} min`
  }

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(course)} activeOpacity={0.7}>
      <Image
        source={{ uri: course.thumbnail_url || "/placeholder.svg?height=200&width=400" }}
        style={styles.thumbnail}
        resizeMode="cover"
      />

      {course.is_featured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {course.title}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {course.description}
        </Text>

        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Feather name="clock" size={14} color={COLORS.textLight} />
            <Text style={styles.metaText}>{formatDuration(course.duration_minutes)}</Text>
          </View>

          <View style={styles.metaItem}>
            <View style={[styles.difficultyDot, { backgroundColor: getDifficultyColor(course.difficulty_level) }]} />
            <Text style={styles.metaText}>
              {course.difficulty_level.charAt(0).toUpperCase() + course.difficulty_level.slice(1)}
            </Text>
          </View>
        </View>

        {progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    overflow: "hidden",
    marginBottom: SIZES.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: "100%",
    height: 160,
  },
  featuredBadge: {
    position: "absolute",
    top: SIZES.xs,
    right: SIZES.xs,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs / 2,
    borderRadius: SIZES.xs,
  },
  featuredText: {
    color: COLORS.pureWhite,
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    padding: SIZES.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  description: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
  },
  metaContainer: {
    flexDirection: "row",
    marginBottom: SIZES.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SIZES.md,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: SIZES.xs,
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.gray,
    borderRadius: 3,
    marginRight: SIZES.xs,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "500",
  },
})

