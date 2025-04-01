export type ServiceType =
  | "cleaning"
  | "cooking"
  | "childcare"
  | "eldercare"
  | "gardening"
  | "driving"
  | "security"
  | "laundry"
  | "petcare"
  | "tutoring"

export type Availability = {
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"
  startTime: string // format: "HH:MM"
  endTime: string // format: "HH:MM"
}

export type Location = {
  latitude: number
  longitude: number
  address: string
  city: string
  district: string
}

export type WorkerProfile = {
  id: string
  user_id: string
  full_name: string
  profile_image?: string
  services: ServiceType[]
  experience_years: number
  hourly_rate: number
  bio: string
  languages: string[]
  availability: Availability[]
  location: Location
  rating: number
  total_ratings: number
  verified: boolean
  created_at: string
}

export type SearchFilters = {
  services: ServiceType[]
  availability?: {
    day: string
    startTime: string
    endTime: string
  }
  location?: {
    latitude: number
    longitude: number
    radius: number // in kilometers
  }
  minExperience?: number
  minRating?: number
  languages?: string[]
  maxHourlyRate?: number
  verified?: boolean
}

