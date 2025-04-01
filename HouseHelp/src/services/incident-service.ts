import { supabase } from "../config/supabase"
import * as FileSystem from "expo-file-system"
import { decode } from "base64-arraybuffer"

export type IncidentCategory = {
  id: string
  name: string
  description?: string
  is_active: boolean
}

export type Incident = {
  id: string
  user_id: string
  booking_id?: string
  category_id: string
  category_name?: string
  title: string
  description: string
  status: "submitted" | "under_review" | "in_progress" | "resolved" | "closed"
  priority: "low" | "medium" | "high" | "critical"
  location?: any
  incident_date: string
  resolution_notes?: string
  resolved_at?: string
  created_at: string
  updated_at: string
  attachments?: IncidentAttachment[]
}

export type IncidentAttachment = {
  id: string
  incident_id: string
  file_url: string
  file_type: string
  file_name?: string
  created_at: string
}

export type SupportTicket = {
  id: string
  user_id: string
  subject: string
  description: string
  status: "open" | "in_progress" | "waiting_for_customer" | "resolved" | "closed"
  priority: "low" | "medium" | "high"
  assigned_to?: string
  resolved_at?: string
  created_at: string
  updated_at: string
  messages?: SupportTicketMessage[]
}

export type SupportTicketMessage = {
  id: string
  ticket_id: string
  user_id: string
  is_from_support: boolean
  message: string
  attachments?: any
  created_at: string
  user_name?: string
  user_avatar?: string
}

class IncidentService {
  async getIncidentCategories(): Promise<IncidentCategory[]> {
    try {
      const { data, error } = await supabase.from("incident_categories").select("*").eq("is_active", true).order("name")

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching incident categories:", error)
      return []
    }
  }

  async getUserIncidents(userId: string): Promise<Incident[]> {
    try {
      const { data, error } = await supabase
        .from("incidents")
        .select(`
          *,
          category:category_id (name)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      const incidents = (data || []).map((incident) => ({
        ...incident,
        category_name: incident.category?.name,
      }))

      // Fetch attachments for each incident
      for (const incident of incidents) {
        const { data: attachments, error: attachmentsError } = await supabase
          .from("incident_attachments")
          .select("*")
          .eq("incident_id", incident.id)

        if (attachmentsError) throw attachmentsError

        incident.attachments = attachments || []
      }

      return incidents
    } catch (error) {
      console.error("Error fetching user incidents:", error)
      return []
    }
  }

  async getIncidentDetails(incidentId: string): Promise<Incident | null> {
    try {
      const { data, error } = await supabase
        .from("incidents")
        .select(`
          *,
          category:category_id (name)
        `)
        .eq("id", incidentId)
        .single()

      if (error) throw error

      const incident = {
        ...data,
        category_name: data.category?.name,
      }

      // Fetch attachments
      const { data: attachments, error: attachmentsError } = await supabase
        .from("incident_attachments")
        .select("*")
        .eq("incident_id", incidentId)

      if (attachmentsError) throw attachmentsError

      incident.attachments = attachments || []

      return incident
    } catch (error) {
      console.error("Error fetching incident details:", error)
      return null
    }
  }

  async reportIncident(
    userId: string,
    bookingId: string | null,
    categoryId: string,
    title: string,
    description: string,
    priority: "low" | "medium" | "high" | "critical",
    location?: any,
    incidentDate?: Date,
  ): Promise<{ success: boolean; incidentId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("report_incident", {
        user_id_param: userId,
        booking_id_param: bookingId,
        category_id_param: categoryId,
        title_param: title,
        description_param: description,
        priority_param: priority,
        location_param: location || null,
        incident_date_param: incidentDate ? incidentDate.toISOString() : null,
      })

      if (error) throw error

      return {
        success: true,
        incidentId: data,
      }
    } catch (error) {
      console.error("Error reporting incident:", error)
      return {
        success: false,
        error: "Failed to report incident",
      }
    }
  }

  async uploadIncidentAttachment(
    incidentId: string,
    uri: string,
    fileType: string,
    fileName?: string,
  ): Promise<{ success: boolean; attachmentId?: string; error?: string }> {
    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri)
      if (!fileInfo.exists) {
        throw new Error("File does not exist")
      }

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      // Get file extension
      const fileExtension = uri.split(".").pop()?.toLowerCase() || "jpg"

      // Upload to Supabase Storage
      const storedFileName = `${incidentId}_${Date.now()}.${fileExtension}`
      const filePath = `incident_attachments/${storedFileName}`

      const { error: uploadError } = await supabase.storage.from("incidents").upload(filePath, decode(base64), {
        contentType: fileType,
      })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage.from("incidents").getPublicUrl(filePath)

      if (!urlData.publicUrl) {
        throw new Error("Failed to get public URL")
      }

      // Add attachment to database
      const { data, error } = await supabase.rpc("add_incident_attachment", {
        incident_id_param: incidentId,
        file_url_param: urlData.publicUrl,
        file_type_param: fileType,
        file_name_param: fileName || storedFileName,
      })

      if (error) throw error

      return {
        success: true,
        attachmentId: data,
      }
    } catch (error) {
      console.error("Error uploading incident attachment:", error)
      return {
        success: false,
        error: "Failed to upload attachment",
      }
    }
  }

  async getUserSupportTickets(userId: string): Promise<SupportTicket[]> {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching support tickets:", error)
      return []
    }
  }

  async getSupportTicketDetails(ticketId: string): Promise<SupportTicket | null> {
    try {
      const { data: ticket, error } = await supabase.from("support_tickets").select("*").eq("id", ticketId).single()

      if (error) throw error

      // Fetch messages
      const { data: messages, error: messagesError } = await supabase
        .from("support_ticket_messages")
        .select(`
          *,
          user:user_id (id, full_name, profile_image)
        `)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true })

      if (messagesError) throw messagesError

      const formattedMessages = messages.map((message) => ({
        ...message,
        user_name: message.user?.full_name,
        user_avatar: message.user?.profile_image,
      }))

      return {
        ...ticket,
        messages: formattedMessages,
      }
    } catch (error) {
      console.error("Error fetching support ticket details:", error)
      return null
    }
  }

  async createSupportTicket(
    userId: string,
    subject: string,
    description: string,
    priority: "low" | "medium" | "high" = "medium",
  ): Promise<{ success: boolean; ticketId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("create_support_ticket", {
        user_id_param: userId,
        subject_param: subject,
        description_param: description,
        priority_param: priority,
      })

      if (error) throw error

      return {
        success: true,
        ticketId: data,
      }
    } catch (error) {
      console.error("Error creating support ticket:", error)
      return {
        success: false,
        error: "Failed to create support ticket",
      }
    }
  }

  async addTicketMessage(
    ticketId: string,
    userId: string,
    message: string,
    attachments?: any,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("add_ticket_message", {
        ticket_id_param: ticketId,
        user_id_param: userId,
        message_param: message,
        attachments_param: attachments || null,
      })

      if (error) throw error

      return {
        success: true,
        messageId: data,
      }
    } catch (error) {
      console.error("Error adding ticket message:", error)
      return {
        success: false,
        error: "Failed to add message",
      }
    }
  }
}

export const incidentService = new IncidentService()

