"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import { CourseCard } from "../../components/training/course-card"
import { trainingService, type Course } from "../../services/training-service"
import { useAuth } from "../../contexts/auth-context"
import { COLORS, SIZES } from "../../config/theme"

export const CoursesScreen = () => {
  const navigation = useNavigation()
  const { user } = useAuth()

  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([])
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [userProgress, setUserProgress] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const featured = await trainingService.getFeaturedCourses()
      const all = await trainingService.getAvailableCourses()

      setFeaturedCourses(featured)
      setAllCourses(all)

      if (user) {
        await fetchUserProgress(all)
      }
    } catch (error) {
      console.error("Error fetching courses:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchUserProgress = async (courses: Course[]) => {
    try {
      const progressMap: Record<string, number> = {}

      for (const course of courses) {
        const progress = await trainingService.getUserCourseProgress(user.id, course.id)
        if (progress) {
          progressMap[course.id] = progress.progress_percentage
        }
      }

      setUserProgress(progressMap)
    } catch (error) {
      console.error("Error fetching user progress:", error)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchCourses()
  }

  const handleCoursePress = (course: Course) => {
    navigation.navigate("CourseDetails", { courseId: course.id })
  }

  const renderFeaturedCourses = () => {
    if (featuredCourses.length === 0) {
      return null
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Courses</Text>
        <FlatList
          horizontal
          data={featuredCourses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.featuredCardContainer}>
              <CourseCard course={item} progress={userProgress[item.id]} onPress={handleCoursePress} />
            </View>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredList}
        />
      </View>
    )
  }

  const renderEmptyState = () => {
    if (loading) return null

    return (
      <View style={styles.emptyContainer}>
        <Feather name="book-open" size={64} color={COLORS.grayDark} />
        <Text style={styles.emptyTitle}>No courses available</Text>
        <Text style={styles.emptyText}>Check back later for new training courses</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={allCourses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <CourseCard course={item} progress={userProgress[item.id]} onPress={handleCoursePress} />
          </View>
        )}
        ListHeaderComponent={
          <>
            {renderFeaturedCourses()}
            {allCourses.length > 0 && <Text style={[styles.sectionTitle, styles.allCoursesTitle]}>All Courses</Text>}
          </>
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />

      {loading && (
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
  listContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xl,
  },
  section: {
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  allCoursesTitle: {
    marginTop: SIZES.xs,
  },
  featuredList: {
    paddingRight: SIZES.md,
  },
  featuredCardContainer: {
    width: 280,
    marginRight: SIZES.md,
  },
  cardContainer: {
    marginBottom: SIZES.md,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: `${COLORS.white}80`,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
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

