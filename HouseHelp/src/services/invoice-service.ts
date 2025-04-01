import { supabase } from "../config/supabase"
import * as FileSystem from "expo-file-system"

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled"

export type Invoice = {
  id: string
  booking_id?: string
  user_id: string
  worker_id: string
  invoice_number: string
  amount: number
  currency: string
  tax_amount: number
  total_amount: number
  status: InvoiceStatus
  due_date: string
  paid_date?: string
  notes?: string
  items: InvoiceItem[]
  created_at: string
  updated_at: string
  pdf_url?: string
}

export type InvoiceItem = {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  tax_rate?: number
  tax_amount?: number
}

class InvoiceService {
  async generateInvoice(
    bookingId: string,
    workerId: string,
    userId: string,
    items: Array<{
      description: string
      quantity: number
      unitPrice: number
      taxRate?: number
    }>,
    notes?: string,
  ): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
    try {
      // Calculate amounts
      let subtotal = 0
      let totalTax = 0

      const formattedItems = items.map((item) => {
        const amount = item.quantity * item.unitPrice
        subtotal += amount

        const taxAmount = item.taxRate ? amount * (item.taxRate / 100) : 0
        totalTax += taxAmount

        return {
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          amount,
          tax_rate: item.taxRate || 0,
          tax_amount: taxAmount,
        }
      })

      const totalAmount = subtotal + totalTax

      // Generate invoice
      const { data, error } = await supabase.rpc("generate_invoice", {
        booking_id_param: bookingId,
        worker_id_param: workerId,
        user_id_param: userId,
        amount_param: subtotal,
        tax_amount_param: totalTax,
        total_amount_param: totalAmount,
        notes_param: notes || null,
        items_param: formattedItems,
      })

      if (error) throw error

      // Generate PDF
      await this.generateInvoicePDF(data)

      return {
        success: true,
        invoiceId: data,
      }
    } catch (error) {
      console.error("Error generating invoice:", error)
      return {
        success: false,
        error: "Failed to generate invoice",
      }
    }
  }

  private async generateInvoicePDF(invoiceId: string): Promise<void> {
    try {
      // Call PDF generation function on the server
      const { error } = await supabase.rpc("generate_invoice_pdf", {
        invoice_id_param: invoiceId,
      })

      if (error) throw error
    } catch (error) {
      console.error("Error generating invoice PDF:", error)
    }
  }

  async getInvoiceDetails(invoiceId: string): Promise<{ invoice: Invoice | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          items:invoice_items(*)
        `)
        .eq("id", invoiceId)
        .single()

      if (error) throw error

      return { invoice: data }
    } catch (error) {
      console.error("Error getting invoice details:", error)
      return {
        invoice: null,
        error: "Failed to get invoice details",
      }
    }
  }

  async getUserInvoices(userId: string, status?: InvoiceStatus): Promise<{ invoices: Invoice[]; error?: string }> {
    try {
      let query = supabase
        .from("invoices")
        .select(`
          *,
          items:invoice_items(*)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (status) {
        query = query.eq("status", status)
      }

      const { data, error } = await query

      if (error) throw error

      return { invoices: data || [] }
    } catch (error) {
      console.error("Error getting user invoices:", error)
      return {
        invoices: [],
        error: "Failed to get invoices",
      }
    }
  }

  async getWorkerInvoices(workerId: string, status?: InvoiceStatus): Promise<{ invoices: Invoice[]; error?: string }> {
    try {
      let query = supabase
        .from("invoices")
        .select(`
          *,
          items:invoice_items(*)
        `)
        .eq("worker_id", workerId)
        .order("created_at", { ascending: false })

      if (status) {
        query = query.eq("status", status)
      }

      const { data, error } = await query

      if (error) throw error

      return { invoices: data || [] }
    } catch (error) {
      console.error("Error getting worker invoices:", error)
      return {
        invoices: [],
        error: "Failed to get invoices",
      }
    }
  }

  async markInvoiceAsPaid(invoiceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("mark_invoice_paid", {
        invoice_id_param: invoiceId,
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error("Error marking invoice as paid:", error)
      return {
        success: false,
        error: "Failed to mark invoice as paid",
      }
    }
  }

  async downloadInvoicePDF(invoiceId: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Get invoice details to get PDF URL
      const { data: invoice, error } = await supabase
        .from("invoices")
        .select("pdf_url, invoice_number")
        .eq("id", invoiceId)
        .single()

      if (error) throw error

      if (!invoice.pdf_url) {
        throw new Error("Invoice PDF not available")
      }

      // Download PDF
      const fileUri = `${FileSystem.documentDirectory}invoice_${invoice.invoice_number}.pdf`

      const { uri } = await FileSystem.downloadAsync(invoice.pdf_url, fileUri)

      return {
        success: true,
        filePath: uri,
      }
    } catch (error) {
      console.error("Error downloading invoice PDF:", error)
      return {
        success: false,
        error: "Failed to download invoice PDF",
      }
    }
  }
}

export const invoiceService = new InvoiceService()

