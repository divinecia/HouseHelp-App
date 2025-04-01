import { supabase } from "../config/supabase"

export type Course = {
  id: string
  title: string
  description: string
  thumbnail_url: string
  duration_minutes: number
  difficulty_level: "beginner" | "intermediate" | "advanced"
  is_featured: boolean
  created_at: string
}

export type CourseModule = {
  id: string
  course_id: string
  title: string
  description: string
  order_index: number
}

export type CourseLesson = {
  id: string
  module_id: string
  title: string
  description: string
  content_type: "video" | "text" | "quiz"
  content_url?: string
  content_text?: string
  duration_minutes: number
  order_index: number
}

export type UserCourseProgress = {
  course_id: string
  progress_percentage: number
  started_at: string
  completed_at?: string
  last_accessed_lesson_id?: string
}

export type Certificate = {
  id: string
  user_id: string
  course_id: string
  certificate_number: string
  issue_date: string
  expiry_date?: string
  status: "active" | "expired" | "revoked"
  verification_url: string
}

class TrainingService {
  async getAvailableCourses(): Promise<Course[]> {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching courses:", error)
      return []
    }
  }

  async getFeaturedCourses(): Promise<Course[]> {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .eq("is_featured", true)
        .order("created_at", { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching featured courses:", error)
      return []
    }
  }

  async getCourseDetails(courseId: string): Promise<{
    course: Course | null
    modules: CourseModule[]
  }> {
    try {
      // Get course details
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single()

      if (courseError) throw courseError

      // Get course modules
      const { data: modules, error: modulesError } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true })

      if (modulesError) throw modulesError

      return {
        course,
        modules: modules || [],
      }
    } catch (error) {
      console.error("Error fetching course details:", error)
      return {
        course: null,
        modules: [],
      }
    }
  }

  async getModuleLessons(moduleId: string): Promise<CourseLesson[]> {
    try {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: true })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching module lessons:", error)
      return []
    }
  }

  async getLessonDetails(lessonId: string): Promise<CourseLesson | null> {
    try {
      const { data, error } = await supabase.from("course_lessons").select("*").eq("id", lessonId).single()

      if (error) throw error

      return data
    } catch (error) {
      console.error("Error fetching lesson details:", error)
      return null
    }
  }

  async getUserCourseProgress(userId: string, courseId: string): Promise<UserCourseProgress | null> {
    try {
      const { data, error } = await supabase
        .from("user_course_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .single()

      if (error && error.code !== "PGRST116") throw error // PGRST116 is "no rows returned"

      return data
    } catch (error) {
      console.error("Error fetching user course progress:", error)
      return null
    }
  }

  async startCourse(userId: string, courseId: string): Promise<boolean> {
    try {
      // Check if progress already exists
      const existingProgress = await this.getUserCourseProgress(userId, courseId)

      if (existingProgress) {
        return true // Already started
      }

      // Create new progress record
      const { error } = await supabase.from("user_course_progress").insert({
        user_id: userId,
        course_id: courseId,
        progress_percentage: 0,
      })

      if (error) throw error

      return true
    } catch (error) {
      console.error("Error starting course:", error)
      return false
    }
  }

  async updateLessonProgress(
    userId: string,
    lessonId: string,
    status: "not_started" | "in_progress" | "completed",
    progressPercentage: number,
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from("user_lesson_progress").upsert({
        user_id: userId,
        lesson_id: lessonId,
        status,
        progress_percentage: progressPercentage,
        last_accessed_at: new Date().toISOString(),
      })

      if (error) throw error

      // Update overall course progress
      await this.updateOverallCourseProgress(userId, lessonId)

      return true
    } catch (error) {
      console.error("Error updating lesson progress:", error)
      return false
    }
  }

  private async updateOverallCourseProgress(userId: string, lessonId: string): Promise<void> {
    try {
      // Get the course ID from the lesson
      const { data: lesson, error: lessonError } = await supabase
        .from("course_lessons")
        .select("module_id")
        .eq("id", lessonId)
        .single()

      if (lessonError) throw lessonError

      const { data: module, error: moduleError } = await supabase
        .from("course_modules")
        .select("course_id")
        .eq("id", lesson.module_id)
        .single()

      if (moduleError) throw moduleError

      const courseId = module.course_id

      // Get all lessons for this course
      const { data: allModules, error: allModulesError } = await supabase
        .from("course_modules")
        .select("id")
        .eq("course_id", courseId)

      if (allModulesError) throw allModulesError

      const moduleIds = allModules.map((m) => m.id)

      const { data: allLessons, error: allLessonsError } = await supabase
        .from("course_lessons")
        .select("id")
        .in("module_id", moduleIds)

      if (allLessonsError) throw allLessonsError

      const totalLessons = allLessons.length

      // Get completed lessons
      const { data: completedLessons, error: completedError } = await supabase
        .from("user_lesson_progress")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "completed")
        .in(
          "lesson_id",
          allLessons.map((l) => l.id),
        )

      if (completedError) throw completedError

      const completedCount = completedLessons.length
      const progressPercentage = Math.round((completedCount / totalLessons) * 100)

      // Update course progress
      const { error: updateError } = await supabase
        .from("user_course_progress")
        .update({
          progress_percentage: progressPercentage,
          last_accessed_lesson_id: lessonId,
          completed_at: progressPercentage === 100 ? new Date().toISOString() : null,
        })
        .eq("user_id", userId)
        .eq("course_id", courseId)

      if (updateError) throw updateError
    } catch (error) {
      console.error("Error updating overall course progress:", error)
    }
  }

  async getUserCertificates(userId: string): Promise<Certificate[]> {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", userId)
        .order("issue_date", { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching user certificates:", error)
      return []
    }
  }

  async verifyCertificate(certificateNumber: string): Promise<{
    isValid: boolean
    userName?: string
    courseTitle?: string
    issueDate?: string
    expiryDate?: string
    status?: string
  }> {
    try {
      const { data, error } = await supabase.rpc("verify_certificate", {
        certificate_number_param: certificateNumber,
      })

      if (error) throw error

      if (data && data.length > 0) {
        return {
          isValid: data[0].is_valid,
          userName: data[0].user_name,
          courseTitle: data[0].course_title,
          issueDate: data[0].issue_date,
          expiryDate: data[0].expiry_date,
          status: data[0].status,
        }
      }

      return { isValid: false }
    } catch (error) {
      console.error("Error verifying certificate:", error)
      return { isValid: false }
    }
  }
}

export const trainingService = new TrainingService()

