"use client"

import { useState, useEffect } from "react"
import { View, ActivityIndicator } from "react-native"
import { createStackNavigator } from "@react-navigation/stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { Feather } from "@expo/vector-icons"
import { COLORS } from "../config/theme"
import { useAuth } from "../contexts/auth-context"
import { supabase } from "../config/supabase"

// Auth Screens
import { SplashScreen } from "../screens/auth/splash-screen"
import { LoginScreen } from "../screens/auth/login-screen"
import { RegisterScreen } from "../screens/auth/register-screen"
import { ForgotPasswordScreen } from "../screens/auth/forgot-password-screen"
import { RoleSelectionScreen } from "../screens/auth/role-selection-screen"

// Household Screens
import { HouseholdDashboardScreen } from "../screens/household/household-dashboard-screen"
import { SearchScreen } from "../screens/search/search-screen"
import { WorkerDetailScreen } from "../screens/search/worker-detail-screen"
import { BookingFormScreen } from "../screens/bookings/booking-form-screen"
import { RecurringBookingScreen } from "../screens/bookings/recurring-booking-screen"
import { MatchingScreen } from "../screens/matching/matching-screen"

// Worker Screens
import { WorkerOnboardingScreen } from "../screens/worker/worker-onboarding-screen"
import { WorkerDashboardScreen } from "../screens/worker/worker-dashboard-screen"

// Common Screens
import { NotificationsScreen } from "../screens/notifications/notifications-screen"
import { ChatScreen } from "../screens/messaging/chat-screen"
import { ProfileScreen } from "../screens/profile/profile-screen"
import { SettingsScreen } from "../screens/settings/settings-screen"

const Stack = createStackNavigator()
const Tab = createBottomTabNavigator()

const HouseholdTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName

          if (route.name === "Home") {
            iconName = "home"
          } else if (route.name === "Search") {
            iconName = "search"
          } else if (route.name === "Bookings") {
            iconName = "calendar"
          } else if (route.name === "Messages") {
            iconName = "message-circle"
          } else if (route.name === "Profile") {
            iconName = "user"
          }

          return <Feather name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.grayDark,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HouseholdDashboardScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

const WorkerTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName

          if (route.name === "Dashboard") {
            iconName = "home"
          } else if (route.name === "Schedule") {
            iconName = "calendar"
          } else if (route.name === "Messages") {
            iconName = "message-circle"
          } else if (route.name === "Earnings") {
            iconName = "dollar-sign"
          } else if (route.name === "Profile") {
            iconName = "user"
          }

          return <Feather name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.grayDark,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={WorkerDashboardScreen} />
      <Tab.Screen name="Schedule" component={WorkerScheduleScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Earnings" component={WorkerEarningsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

// Placeholder components for screens not yet implemented
const BookingsScreen = () => <View />
const MessagesScreen = () => <View />
const WorkerScheduleScreen = () => <View />
const WorkerEarningsScreen = () => <View />

export const RoleBasedNavigator = () => {
  const { user, isLoading } = useAuth()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserRole()
    } else {
      setRoleLoading(false)
    }
  }, [user])

  const fetchUserRole = async () => {
    try {
      // Get user role from metadata
      const role = user?.user_metadata?.role || null

      if (role) {
        setUserRole(role)
        setRoleLoading(false)
        return
      }

      // If no role in metadata, check if worker profile exists
      const { data: workerProfile, error: workerError } = await supabase
        .from("worker_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (workerProfile) {
        setUserRole("worker")
      } else {
        // Default to household if no worker profile
        setUserRole("household")
      }
    } catch (error) {
      console.error("Error fetching user role:", error)
      // Default to household on error
      setUserRole("household")
    } finally {
      setRoleLoading(false)
    }
  }

  if (isLoading || roleLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // Auth Stack
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : !userRole ? (
        // Role Selection
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      ) : userRole === "worker" && user.user_metadata?.onboarding_completed !== true ? (
        // Worker Onboarding
        <Stack.Screen name="WorkerOnboarding" component={WorkerOnboardingScreen} />
      ) : (
        // Main App Stacks based on role
        <>
          {userRole === "household" ? (
            <>
              <Stack.Screen name="HouseholdTabs" component={HouseholdTabs} />
              <Stack.Screen name="WorkerDetail" component={WorkerDetailScreen} />
              <Stack.Screen name="BookingForm" component={BookingFormScreen} />
              <Stack.Screen name="RecurringBooking" component={RecurringBookingScreen} />
              <Stack.Screen name="MatchingScreen" component={MatchingScreen} />
            </>
          ) : (
            <Stack.Screen name="WorkerTabs" component={WorkerTabs} />
          )}

          {/* Common screens for both roles */}
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      )}
    </Stack.Navigator>
  )
}

