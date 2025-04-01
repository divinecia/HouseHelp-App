import { supabase } from "../config/supabase"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Localization from "expo-localization"

export type Language = {
  id: string
  code: string
  name: string
  native_name: string
  flag_emoji?: string
  is_active: boolean
  is_default: boolean
}

export type Translation = {
  namespace: string
  key: string
  value: string
}

class LanguageService {
  private currentLanguage = "en"
  private translations: Record<string, Record<string, string>> = {}
  private isInitialized = false

  async initialize(): Promise<void> {
    try {
      // Try to get language from storage
      const storedLanguage = await AsyncStorage.getItem("userLanguage")

      if (storedLanguage) {
        this.currentLanguage = storedLanguage
      } else {
        // Use device locale if available and supported
        const deviceLocale = Localization.locale.split("-")[0]
        const isSupported = await this.isLanguageSupported(deviceLocale)

        if (isSupported) {
          this.currentLanguage = deviceLocale
        }
        // Otherwise, keep default 'en'
      }

      // Load translations for current language
      await this.loadTranslations()

      this.isInitialized = true
    } catch (error) {
      console.error("Error initializing language service:", error)
      // Fallback to English
      this.currentLanguage = "en"
      await this.loadTranslations()
      this.isInitialized = true
    }
  }

  private async isLanguageSupported(code: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("languages")
        .select("code")
        .eq("code", code)
        .eq("is_active", true)
        .single()

      if (error) return false

      return !!data
    } catch (error) {
      return false
    }
  }

  async getAvailableLanguages(): Promise<Language[]> {
    try {
      const { data, error } = await supabase.from("languages").select("*").eq("is_active", true).order("name")

      if (error) throw error

      return data || []
    } catch (error) {
      console.error("Error fetching available languages:", error)
      return []
    }
  }

  async loadTranslations(): Promise<void> {
    try {
      const { data, error } = await supabase.rpc("get_translations", {
        language_code_param: this.currentLanguage,
      })

      if (error) throw error

      // Group translations by namespace
      const groupedTranslations: Record<string, Record<string, string>> = {}

      for (const translation of data || []) {
        if (!groupedTranslations[translation.namespace]) {
          groupedTranslations[translation.namespace] = {}
        }

        groupedTranslations[translation.namespace][translation.key] = translation.value
      }

      this.translations = groupedTranslations
    } catch (error) {
      console.error("Error loading translations:", error)
      // Load fallback translations from local JSON files
      await this.loadFallbackTranslations()
    }
  }

  private async loadFallbackTranslations(): Promise<void> {
    try {
      // Load from local JSON files
      const commonTranslations = require(`../translations/${this.currentLanguage}/common.json`)
      const formTranslations = require(`../translations/${this.currentLanguage}/forms.json`)

      this.translations = {
        common: commonTranslations,
        forms: formTranslations,
      }
    } catch (error) {
      console.error("Error loading fallback translations:", error)
      // Last resort - use English
      try {
        const commonTranslations = require("../translations/en/common.json")
        const formTranslations = require("../translations/en/forms.json")

        this.translations = {
          common: commonTranslations,
          forms: formTranslations,
        }
      } catch (e) {
        console.error("Failed to load any translations:", e)
        this.translations = {}
      }
    }
  }

  async setLanguage(code: string, userId?: string): Promise<boolean> {
    try {
      // Check if language is supported
      const isSupported = await this.isLanguageSupported(code)

      if (!isSupported) {
        throw new Error(`Language ${code} is not supported`)
      }

      // Update current language
      this.currentLanguage = code

      // Save to storage
      await AsyncStorage.setItem("userLanguage", code)

      // Load translations for new language
      await this.loadTranslations()

      // Update user preference in database if logged in
      if (userId) {
        await supabase.rpc("set_user_language", {
          user_id_param: userId,
          language_code_param: code,
        })
      }

      return true
    } catch (error) {
      console.error("Error setting language:", error)
      return false
    }
  }

  getCurrentLanguage(): string {
    return this.currentLanguage
  }

  translate(key: string, namespace = "common", params?: Record<string, string>): string {
    if (!this.isInitialized) {
      console.warn("Language service not initialized")
      return key
    }

    // Get translation from namespace
    const namespaceTranslations = this.translations[namespace] || {}
    let translation = namespaceTranslations[key]

    // Fallback to key if translation not found
    if (!translation) {
      return key
    }

    // Replace parameters if provided
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(`{{${paramKey}}}`, paramValue)
      })
    }

    return translation
  }
}

export const languageService = new LanguageService()

