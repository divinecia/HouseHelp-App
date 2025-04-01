"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch, ActivityIndicator } from "react-native"
import { Feather } from "@expo/vector-icons"
import * as Calendar from "expo-calendar"
import * as Linking from "expo-linking"
import { COLORS, SIZES } from "../../config/theme"
import { Button } from "../UI/button"
import { supabase } from "../../config/supabase"
import { useAuth } from "../../contexts/auth-context"

interface CalendarIntegrationProps {
  onSync?: () => void
}

export const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({ onSync }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [calendars, setCalendars] = useState<Calendar.Calendar[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null)
  const [autoSync, setAutoSync] = useState(false)

  useEffect(() => {
    if (user) {
      getCalendarPermission()
      getUserCalendarSettings()
    }
  }, [user])

  const getCalendarPermission = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync()

      if (status === "granted") {
        fetchCalendars()
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error("Error requesting calendar permission:", error)
      setLoading(false)
    }
  }

  const fetchCalendars = async () => {
    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
      const writableCalendars = calendars.filter((calendar) => calendar.allowsModifications)
      setCalendars(writableCalendars)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching calendars:", error)
      setLoading(false)
    }
  }

  const getUserCalendarSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("user_calendar_settings")
        .select("calendar_id, auto_sync")
        .eq("user_id", user.id)
        .single()

      if (error && error.code !== "PGRST116") throw error

      if (data) {
        setSelectedCalendarId(data.calendar_id)
        setAutoSync(data.auto_sync)
      }
    } catch (error) {
      console.error("Error fetching calendar settings:", error)
    }
  }

  const saveCalendarSettings = async (calendarId: string, autoSync: boolean) => {
    try {
      const { error } = await supabase.from("user_calendar_settings").upsert({
        user_id: user.id,
        calendar_id: calendarId,
        auto_sync: autoSync,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      setSelectedCalendarId(calendarId)
      setAutoSync(autoSync)
    } catch (error) {
      console.error("Error saving calendar settings:", error)
      Alert.alert("Error", "Failed to save calendar settings")
    }
  }

  const handleSelectCalendar = (calendarId: string) => {
    saveCalendarSettings(calendarId, autoSync)
  }

  const handleToggleAutoSync = (value: boolean) => {
    if (selectedCalendarId) {
      saveCalendarSettings(selectedCalendarId, value)
    } else if (value && calendars.length > 0) {
      // If enabling auto-sync but no calendar selected, select the first one
      saveCalendarSettings(calendars[0].id, value)
    } else {
      setAutoSync(value)
    }
  }

  const syncBookingsToCalendar = async () => {
    if (!selectedCalendarId) {
      Alert.alert("No Calendar Selected", "Please select a calendar first")
      return
    }

    setSyncing(true)
    try {
      // Fetch upcoming bookings
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })

      if (error) throw error

      if (!bookings || bookings.length === 0) {
        Alert.alert("No Bookings", "You don't have any upcoming bookings to sync")
        setSyncing(false)
        return
      }

      // Create calendar events
      for (const booking of bookings) {
        // Check if event already exists
        const { data: existingEvents, error: checkError } = await supabase
          .from("calendar_events")
          .select("calendar_event_id")
          .eq("booking_id", booking.id)
          .eq("user_id", user.id)
          .single()

        if (checkError && checkError.code !== "PGRST116") throw checkError

        let eventId

        if (existingEvents?.calendar_event_id) {
          // Update existing event
          eventId = existingEvents.calendar_event_id
          await Calendar.updateEventAsync(eventId, {
            title: `HouseHelp: ${booking.services[0]}`,
            startDate: new Date(booking.start_time),
            endDate: new Date(booking.end_time),
            notes: `Booking ID: ${booking.id}`,
            alarms: [{ relativeOffset: -60 }], // 1 hour before
          })
        } else {
          // Create new event
          eventId = await Calendar.createEventAsync(selectedCalendarId, {
            title: `HouseHelp: ${booking.services[0]}`,
            startDate: new Date(booking.start_time),
            endDate: new Date(booking.end_time),
            notes: `Booking ID: ${booking.id}`,
            alarms: [{ relativeOffset: -60 }], // 1 hour before
          })

          // Save reference to created event
          await supabase.from("calendar_events").insert({
            user_id: user.id,
            booking_id: booking.id,
            calendar_id: selectedCalendarId,
            calendar_event_id: eventId,
            synced_at: new Date().toISOString(),
          })
        }
      }

      Alert.alert("Success", "Your bookings have been synced to your calendar")
      onSync?.()
    } catch (error) {
      console.error("Error syncing bookings to calendar:", error)
      Alert.alert("Error", "Failed to sync bookings to calendar")
    } finally {
      setSyncing(false)
    }
  }

  const openCalendarSettings = () => {
    Linking.openSettings()
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading calendars...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar Integration</Text>
        <Switch
          value={autoSync}
          onValueChange={handleToggleAutoSync}
          trackColor={{ false: COLORS.grayDark, true: COLORS.primary }}
          thumbColor={COLORS.pureWhite}
        />
      </View>

      <Text style={styles.description}>
        Sync your bookings with your preferred calendar app to keep track of your schedule.
      </Text>

      {calendars.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Select Calendar</Text>
          <View style={styles.calendarList}>
            {calendars.map((calendar) => (
              <TouchableOpacity
                key={calendar.id}
                style={[styles.calendarItem, selectedCalendarId === calendar.id && styles.selectedCalendarItem]}
                onPress={() => handleSelectCalendar(calendar.id)}
              >
                <View style={[styles.calendarColor, { backgroundColor: calendar.color || COLORS.primary }]} />
                <Text style={[styles.calendarName, selectedCalendarId === calendar.id && styles.selectedCalendarName]}>
                  {calendar.title}
                </Text>
                {selectedCalendarId === calendar.id && <Feather name="check" size={18} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title={syncing ? "Syncing..." : "Sync Bookings Now"}
            onPress={syncBookingsToCalendar}
            loading={syncing}
            disabled={!selectedCalendarId || syncing}
            style={styles.syncButton}
          />

          <View style={styles.infoContainer}>
            <Feather name="info" size={16} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              {autoSync
                ? "Auto-sync is enabled. Your bookings will automatically sync to your calendar."
                : "Auto-sync is disabled. You'll need to manually sync your bookings."}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.noCalendarContainer}>
          <Feather name="calendar" size={48} color={COLORS.grayDark} />
          <Text style={styles.noCalendarText}>No calendars found or calendar access denied</Text>
          <Button
            title="Open Settings"
            onPress={openCalendarSettings}
            variant="outline"
            style={styles.settingsButton}
          />
        </View>
      )}
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
  loadingContainer: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SIZES.md,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: SIZES.xs,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  description: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  calendarList: {
    marginBottom: SIZES.md,
  },
  calendarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectedCalendarItem: {
    backgroundColor: `${COLORS.primary}10`,
  },
  calendarColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: SIZES.sm,
  },
  calendarName: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  selectedCalendarName: {
    fontWeight: "500",
  },
  syncButton: {
    marginBottom: SIZES.sm,
  },
  infoContainer: {
    flexDirection: "row",
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: SIZES.sm,
    padding: SIZES.sm,
  },
  infoIcon: {
    marginRight: SIZES.xs,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  noCalendarContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SIZES.lg,
  },
  noCalendarText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
    marginVertical: SIZES.md,
  },
  settingsButton: {
    minWidth: 150,
  },
})

