"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext } from "react"
import { languageService, type Language } from "../services/language-service"
import { useAuth } from "./auth-context"

type LanguageContextType = {
  currentLanguage: string
  languages: Language[]
  isLoading: boolean
  t: (key: string, namespace?: string, params?: Record<string, string>) => string
  changeLanguage: (code: string) => Promise<boolean>
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [currentLanguage, setCurrentLanguage] = useState<string>("en")
  const [languages, setLanguages] = useState<Language[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    initializeLanguage()
  }, [])

  const initializeLanguage = async () => {
    setIsLoading(true)
    try {
      await languageService.initialize()
      setCurrentLanguage(languageService.getCurrentLanguage())

      const availableLanguages = await languageService.getAvailableLanguages()
      setLanguages(availableLanguages)
    } catch (error) {
      console.error("Error initializing language context:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const changeLanguage = async (code: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const success = await languageService.setLanguage(code, user?.id)

      if (success) {
        setCurrentLanguage(code)
      }

      return success
    } catch (error) {
      console.error("Error changing language:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const t = (key: string, namespace = "common", params?: Record<string, string>): string => {
    return languageService.translate(key, namespace, params)
  }

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        languages,
        isLoading,
        t,
        changeLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

