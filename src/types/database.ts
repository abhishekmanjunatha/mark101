// Peepal Database Types — matches supabase/migrations/00001_initial_schema.sql
// Regenerate with: npx supabase gen types typescript --project-id twoesyyxaypygyajhdtd

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      dietitians: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          date_of_birth: string | null
          gender: 'male' | 'female' | 'prefer_not_to_say' | 'other' | null
          primary_practice_location: string | null
          short_bio: string | null
          photo_url: string | null
          onboarding_step: number
          onboarding_complete: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          phone?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | 'prefer_not_to_say' | 'other' | null
          primary_practice_location?: string | null
          short_bio?: string | null
          photo_url?: string | null
          onboarding_step?: number
          onboarding_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | 'prefer_not_to_say' | 'other' | null
          primary_practice_location?: string | null
          short_bio?: string | null
          photo_url?: string | null
          onboarding_step?: number
          onboarding_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      dietitian_professional: {
        Row: {
          id: string
          dietitian_id: string
          primary_qualification: string | null
          additional_certifications: string[]
          years_of_experience: '0-1' | '1-3' | '3-5' | '5-10' | '10+' | null
          specializations: string[]
          registration_number: string | null
          education: Json
          certificate_urls: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dietitian_id: string
          primary_qualification?: string | null
          additional_certifications?: string[]
          years_of_experience?: '0-1' | '1-3' | '3-5' | '5-10' | '10+' | null
          specializations?: string[]
          registration_number?: string | null
          education?: Json
          certificate_urls?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dietitian_id?: string
          primary_qualification?: string | null
          additional_certifications?: string[]
          years_of_experience?: '0-1' | '1-3' | '3-5' | '5-10' | '10+' | null
          specializations?: string[]
          registration_number?: string | null
          education?: Json
          certificate_urls?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      dietitian_practice: {
        Row: {
          id: string
          dietitian_id: string
          practice_type: 'online_only' | 'clinic_only' | 'both' | null
          clinic_name: string | null
          practice_address: string | null
          city: string | null
          state: string | null
          pincode: string | null
          online_consultation_fee: number
          clinic_consultation_fee: number
          consultation_duration: number
          languages: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dietitian_id: string
          practice_type?: 'online_only' | 'clinic_only' | 'both' | null
          clinic_name?: string | null
          practice_address?: string | null
          city?: string | null
          state?: string | null
          pincode?: string | null
          online_consultation_fee?: number
          clinic_consultation_fee?: number
          consultation_duration?: number
          languages?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dietitian_id?: string
          practice_type?: 'online_only' | 'clinic_only' | 'both' | null
          clinic_name?: string | null
          practice_address?: string | null
          city?: string | null
          state?: string | null
          pincode?: string | null
          online_consultation_fee?: number
          clinic_consultation_fee?: number
          consultation_duration?: number
          languages?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      dietitian_availability: {
        Row: {
          id: string
          dietitian_id: string
          day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
          is_available: boolean
          time_slots: Json
          slot_duration: number
          buffer_time: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dietitian_id: string
          day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
          is_available?: boolean
          time_slots?: Json
          slot_duration?: number
          buffer_time?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dietitian_id?: string
          day_of_week?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
          is_available?: boolean
          time_slots?: Json
          slot_duration?: number
          buffer_time?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          id: string
          dietitian_id: string
          patient_code: string
          full_name: string
          phone: string
          gender: 'male' | 'female' | 'other' | null
          date_of_birth: string | null
          height_cm: number | null
          weight_kg: number | null
          activity_level: 'sedentary' | 'lightly_active' | 'highly_active' | null
          sleep_hours: number | null
          work_type: 'desk_job' | 'field_work' | 'other' | null
          dietary_type: 'vegetarian' | 'non_vegetarian' | 'vegan' | 'eggitarian' | null
          medical_conditions: string[]
          food_allergies: string[]
          primary_goal: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'condition_management' | null
          last_visit_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dietitian_id: string
          patient_code: string
          full_name: string
          phone: string
          gender?: 'male' | 'female' | 'other' | null
          date_of_birth?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          activity_level?: 'sedentary' | 'lightly_active' | 'highly_active' | null
          sleep_hours?: number | null
          work_type?: 'desk_job' | 'field_work' | 'other' | null
          dietary_type?: 'vegetarian' | 'non_vegetarian' | 'vegan' | 'eggitarian' | null
          medical_conditions?: string[]
          food_allergies?: string[]
          primary_goal?: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'condition_management' | null
          last_visit_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dietitian_id?: string
          patient_code?: string
          full_name?: string
          phone?: string
          gender?: 'male' | 'female' | 'other' | null
          date_of_birth?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          activity_level?: 'sedentary' | 'lightly_active' | 'highly_active' | null
          sleep_hours?: number | null
          work_type?: 'desk_job' | 'field_work' | 'other' | null
          dietary_type?: 'vegetarian' | 'non_vegetarian' | 'vegan' | 'eggitarian' | null
          medical_conditions?: string[]
          food_allergies?: string[]
          primary_goal?: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'condition_management' | null
          last_visit_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          id: string
          dietitian_id: string
          patient_id: string
          purpose: 'new_consultation' | 'follow_up' | 'review_with_report' | 'custom'
          custom_purpose: string | null
          mode: 'walk_in' | 'scheduled'
          appointment_date: string
          appointment_time: string
          status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dietitian_id: string
          patient_id: string
          purpose: 'new_consultation' | 'follow_up' | 'review_with_report' | 'custom'
          custom_purpose?: string | null
          mode: 'walk_in' | 'scheduled'
          appointment_date: string
          appointment_time: string
          status?: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dietitian_id?: string
          patient_id?: string
          purpose?: 'new_consultation' | 'follow_up' | 'review_with_report' | 'custom'
          custom_purpose?: string | null
          mode?: 'walk_in' | 'scheduled'
          appointment_date?: string
          appointment_time?: string
          status?: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinical_notes: {
        Row: {
          id: string
          dietitian_id: string
          patient_id: string
          document_type: 'quick_note' | 'meal_plan' | 'follow_up_recommendation' | 'custom'
          title: string
          content: Json
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dietitian_id: string
          patient_id: string
          document_type: 'quick_note' | 'meal_plan' | 'follow_up_recommendation' | 'custom'
          title: string
          content?: Json
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dietitian_id?: string
          patient_id?: string
          document_type?: 'quick_note' | 'meal_plan' | 'follow_up_recommendation' | 'custom'
          title?: string
          content?: Json
          version?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      lab_reports: {
        Row: {
          id: string
          dietitian_id: string
          patient_id: string
          title: string
          report_type: 'blood_test' | 'thyroid_panel' | 'vitamin_panel' | 'lipid_profile' | 'other' | null
          file_urls: string[]
          upload_source: 'patient' | 'dietitian'
          upload_token: string | null
          token_expires_at: string | null
          ai_summary: string | null
          ai_observations: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dietitian_id: string
          patient_id: string
          title: string
          report_type?: 'blood_test' | 'thyroid_panel' | 'vitamin_panel' | 'lipid_profile' | 'other' | null
          file_urls?: string[]
          upload_source?: 'patient' | 'dietitian'
          upload_token?: string | null
          token_expires_at?: string | null
          ai_summary?: string | null
          ai_observations?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dietitian_id?: string
          patient_id?: string
          title?: string
          report_type?: 'blood_test' | 'thyroid_panel' | 'vitamin_panel' | 'lipid_profile' | 'other' | null
          file_urls?: string[]
          upload_source?: 'patient' | 'dietitian'
          upload_token?: string | null
          token_expires_at?: string | null
          ai_summary?: string | null
          ai_observations?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          id: string
          dietitian_id: string
          patient_id: string
          event_type: 'appointment_created' | 'appointment_completed' | 'clinical_document_created' | 'lab_report_uploaded' | 'weight_updated' | 'note_added'
          event_data: Json
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          dietitian_id: string
          patient_id: string
          event_type: 'appointment_created' | 'appointment_completed' | 'clinical_document_created' | 'lab_report_uploaded' | 'weight_updated' | 'note_added'
          event_data?: Json
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          dietitian_id?: string
          patient_id?: string
          event_type?: 'appointment_created' | 'appointment_completed' | 'clinical_document_created' | 'lab_report_uploaded' | 'weight_updated' | 'note_added'
          event_data?: Json
          reference_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          dietitian_id: string
          patient_id: string
          file_url: string
          file_name: string
          file_type: string | null
          file_size_bytes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          dietitian_id: string
          patient_id: string
          file_url: string
          file_name: string
          file_type?: string | null
          file_size_bytes?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          dietitian_id?: string
          patient_id?: string
          file_url?: string
          file_name?: string
          file_type?: string | null
          file_size_bytes?: number | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ── Convenience type helpers ────────────────────
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// ── Commonly-used row types ─────────────────────
export type Dietitian = Tables<'dietitians'>
export type DietitianProfessional = Tables<'dietitian_professional'>
export type DietitianPractice = Tables<'dietitian_practice'>
export type DietitianAvailability = Tables<'dietitian_availability'>
export type Patient = Tables<'patients'>
export type Appointment = Tables<'appointments'>
export type ClinicalNote = Tables<'clinical_notes'>
export type LabReport = Tables<'lab_reports'>
export type TimelineEvent = Tables<'timeline_events'>
export type Document = Tables<'documents'>

