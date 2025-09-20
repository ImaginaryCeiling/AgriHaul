export type UserRole = 'farmer' | 'carrier'

export type JobStatus = 'open' | 'accepted' | 'in_transit' | 'delivered' | 'paid' | 'cancelled'

export type EventType = 'job_posted' | 'job_accepted' | 'job_started' | 'job_delivered' | 'job_paid' | 'job_cancelled' | 'route_declared'

export interface Profile {
  id: string
  role: UserRole
  name: string
  phone?: string
  home_location?: {
    coordinates: [number, number]
  }
  equipment?: string[]
  crops?: string[]
  trust_score: number
  created_at: string
  updated_at: string
}

export interface JobFormData {
  crop: string
  equipment_needed: string[]
  pickup_address: string
  dropoff_address: string
  pickup_coordinates: [number, number]
  dropoff_coordinates: [number, number]
  load_size: number
  is_perishable: boolean
  payout_dollars: number
  notes?: string
}

export interface User {
  id: string
  email: string
  role: 'farmer' | 'carrier'
  name: string
  phone?: string
  equipment?: string[]
  crops?: string[]
  trust_score: number
  home_location?: {
    type: 'Point'
    coordinates: [number, number]
  }
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  farmer_id: string
  carrier_id?: string
  crop: string
  equipment_needed: string[]
  pickup_point: {
    type: 'Point'
    coordinates: [number, number]
  }
  dropoff_point: {
    type: 'Point'
    coordinates: [number, number]
  }
  pickup_address?: string
  dropoff_address?: string
  load_size: number
  status: 'open' | 'accepted' | 'in_transit' | 'delivered' | 'paid' | 'cancelled'
  is_perishable: boolean
  posted_at: string
  payout_cents: number
  notes?: string
  created_at: string
  updated_at: string
  farmer?: User
  carrier?: User
}

export interface JobSegment {
  id: string
  job_id: string
  carrier_id: string
  pickup_point: {
    coordinates: [number, number]
  }
  dropoff_point: {
    coordinates: [number, number]
  }
  pickup_address?: string
  dropoff_address?: string
  load_size: number
  sequence_order: number
  created_at: string
  job?: Job
  carrier?: Profile
}

export interface Event {
  id: string
  job_id?: string
  user_id?: string
  type: EventType
  meta: Record<string, unknown>
  created_at: string
}

export interface PodAsset {
  id: string
  job_id: string
  url: string
  file_name?: string
  file_size?: number
  mime_type?: string
  created_at: string
}

export interface Rating {
  id: string
  job_id: string
  rater_id: string
  ratee_id: string
  on_time?: number
  communication?: number
  accuracy?: number
  condition?: number
  compliance?: number
  resolution?: number
  comment?: string
  created_at: string
  rater?: Profile
  ratee?: Profile
}

export interface CarrierRoute {
  carrier_id: string
  current_location: {
    coordinates: [number, number]
  }
  route_polyline: {
    coordinates: number[][]
  }
  remaining_capacity: number
  declared_at: string
}

export interface MapMarker {
  id: string
  type: 'job' | 'carrier'
  position: [number, number]
  data: Job | Profile
}

export interface AuthUser {
  id: string
  email: string
}

export interface AuthContext {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, userData: {
    role: 'farmer' | 'carrier'
    name: string
    phone?: string
    equipment?: string[]
    crops?: string[]
  }) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<{ error?: string }>
}

export interface MapData {
  jobs: Job[]
  center: [number, number]
  zoom: number
}