-- ============================================================
-- PEEPAL — Dietitian Practice Management SaaS
-- Migration: 00001_initial_schema.sql  (idempotent — safe to re-run)
-- ============================================================

-- ────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────
-- 1. UTILITY: updated_at trigger function
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────
-- 2. TABLE: dietitians
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dietitians (
  id                        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                     TEXT NOT NULL,
  full_name                 TEXT NOT NULL DEFAULT '',
  phone                     TEXT,
  date_of_birth             DATE,
  gender                    TEXT CHECK (gender IN ('male','female','prefer_not_to_say','other')),
  primary_practice_location TEXT,
  short_bio                 TEXT CHECK (char_length(short_bio) <= 300),
  photo_url                 TEXT,
  onboarding_step           INTEGER NOT NULL DEFAULT 0,
  onboarding_complete       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS dietitians_updated_at ON public.dietitians;
CREATE TRIGGER dietitians_updated_at
  BEFORE UPDATE ON public.dietitians
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────
-- 3. TABLE: dietitian_professional
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dietitian_professional (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dietitian_id            UUID NOT NULL UNIQUE REFERENCES public.dietitians(id) ON DELETE CASCADE,
  primary_qualification   TEXT,
  additional_certifications TEXT[] DEFAULT '{}',
  years_of_experience     TEXT CHECK (years_of_experience IN ('0-1','1-3','3-5','5-10','10+')),
  specializations         TEXT[] DEFAULT '{}',
  registration_number     TEXT,
  education               JSONB DEFAULT '[]'::jsonb,
  certificate_urls        TEXT[] DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS dietitian_professional_updated_at ON public.dietitian_professional;
CREATE TRIGGER dietitian_professional_updated_at
  BEFORE UPDATE ON public.dietitian_professional
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────
-- 4. TABLE: dietitian_practice
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dietitian_practice (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dietitian_id            UUID NOT NULL UNIQUE REFERENCES public.dietitians(id) ON DELETE CASCADE,
  practice_type           TEXT CHECK (practice_type IN ('online_only','clinic_only','both')),
  clinic_name             TEXT,
  practice_address        TEXT,
  city                    TEXT,
  state                   TEXT,
  pincode                 TEXT,
  online_consultation_fee NUMERIC(10,2) DEFAULT 0,
  clinic_consultation_fee NUMERIC(10,2) DEFAULT 0,
  consultation_duration   INTEGER DEFAULT 30 CHECK (consultation_duration IN (15,20,30,45,60)),
  languages               TEXT[] DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS dietitian_practice_updated_at ON public.dietitian_practice;
CREATE TRIGGER dietitian_practice_updated_at
  BEFORE UPDATE ON public.dietitian_practice
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────
-- 5. TABLE: dietitian_availability
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dietitian_availability (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dietitian_id    UUID NOT NULL REFERENCES public.dietitians(id) ON DELETE CASCADE,
  day_of_week     TEXT NOT NULL CHECK (day_of_week IN (
                    'monday','tuesday','wednesday','thursday',
                    'friday','saturday','sunday')),
  is_available    BOOLEAN NOT NULL DEFAULT FALSE,
  time_slots      JSONB NOT NULL DEFAULT '[]'::jsonb,
  slot_duration   INTEGER NOT NULL DEFAULT 30 CHECK (slot_duration IN (15,20,30,45,60)),
  buffer_time     INTEGER NOT NULL DEFAULT 0 CHECK (buffer_time IN (0,5,10,15)),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dietitian_id, day_of_week)
);

DROP TRIGGER IF EXISTS dietitian_availability_updated_at ON public.dietitian_availability;
CREATE TRIGGER dietitian_availability_updated_at
  BEFORE UPDATE ON public.dietitian_availability
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────
-- 6. TABLE: patients
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patients (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dietitian_id      UUID NOT NULL REFERENCES public.dietitians(id) ON DELETE CASCADE,
  patient_code      TEXT NOT NULL UNIQUE,
  full_name         TEXT NOT NULL,
  phone             TEXT NOT NULL,
  gender            TEXT CHECK (gender IN ('male','female','other')),
  date_of_birth     DATE,
  height_cm         NUMERIC(5,1),
  weight_kg         NUMERIC(5,1),
  activity_level    TEXT CHECK (activity_level IN ('sedentary','lightly_active','highly_active')),
  sleep_hours       NUMERIC(3,1),
  work_type         TEXT CHECK (work_type IN ('desk_job','field_work','other')),
  dietary_type      TEXT CHECK (dietary_type IN ('vegetarian','non_vegetarian','vegan','eggitarian')),
  medical_conditions TEXT[] DEFAULT '{}',
  food_allergies    TEXT[] DEFAULT '{}',
  primary_goal      TEXT CHECK (primary_goal IN ('weight_loss','muscle_gain','maintenance','condition_management')),
  last_visit_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS patients_updated_at ON public.patients;
CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_patients_dietitian ON public.patients(dietitian_id);
CREATE INDEX IF NOT EXISTS idx_patients_code ON public.patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(dietitian_id, full_name);

-- ────────────────────────────────────────────────
-- 7. TABLE: appointments
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dietitian_id      UUID NOT NULL REFERENCES public.dietitians(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  purpose           TEXT NOT NULL CHECK (purpose IN ('new_consultation','follow_up','review_with_report','custom')),
  custom_purpose    TEXT,
  mode              TEXT NOT NULL CHECK (mode IN ('walk_in','scheduled')),
  appointment_date  DATE NOT NULL,
  appointment_time  TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','in_progress','completed','cancelled')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS appointments_updated_at ON public.appointments;
CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_appointments_dietitian ON public.appointments(dietitian_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(dietitian_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);

-- Partial unique index prevents double-booking
DROP INDEX IF EXISTS idx_appointments_no_double_book;
CREATE UNIQUE INDEX idx_appointments_no_double_book
  ON public.appointments(dietitian_id, appointment_date, appointment_time)
  WHERE status != 'cancelled';

-- ────────────────────────────────────────────────
-- 8. TABLE: clinical_notes
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinical_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dietitian_id    UUID NOT NULL REFERENCES public.dietitians(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  document_type   TEXT NOT NULL CHECK (document_type IN ('quick_note','meal_plan','follow_up_recommendation','custom')),
  title           TEXT NOT NULL,
  content         JSONB NOT NULL DEFAULT '[]'::jsonb,
  version         INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS clinical_notes_updated_at ON public.clinical_notes;
CREATE TRIGGER clinical_notes_updated_at
  BEFORE UPDATE ON public.clinical_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_clinical_notes_dietitian ON public.clinical_notes(dietitian_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient ON public.clinical_notes(patient_id);

-- ────────────────────────────────────────────────
-- 9. TABLE: lab_reports
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lab_reports (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dietitian_id      UUID NOT NULL REFERENCES public.dietitians(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  report_type       TEXT CHECK (report_type IN ('blood_test','thyroid_panel','vitamin_panel','lipid_profile','other')),
  file_urls         TEXT[] DEFAULT '{}',
  upload_source     TEXT NOT NULL DEFAULT 'dietitian' CHECK (upload_source IN ('patient','dietitian')),
  upload_token      TEXT UNIQUE,
  token_expires_at  TIMESTAMPTZ,
  ai_summary        TEXT,
  ai_observations   JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS lab_reports_updated_at ON public.lab_reports;
CREATE TRIGGER lab_reports_updated_at
  BEFORE UPDATE ON public.lab_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_lab_reports_dietitian ON public.lab_reports(dietitian_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_patient ON public.lab_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_token ON public.lab_reports(upload_token) WHERE upload_token IS NOT NULL;

-- ────────────────────────────────────────────────
-- 10. TABLE: timeline_events
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dietitian_id    UUID NOT NULL REFERENCES public.dietitians(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL CHECK (event_type IN (
                    'appointment_created','appointment_completed',
                    'clinical_document_created','lab_report_uploaded',
                    'weight_updated','note_added')),
  event_data      JSONB DEFAULT '{}'::jsonb,
  reference_id    UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timeline_dietitian_patient ON public.timeline_events(dietitian_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_timeline_patient_date ON public.timeline_events(patient_id, created_at DESC);

-- ────────────────────────────────────────────────
-- 11. TABLE: documents
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dietitian_id    UUID NOT NULL REFERENCES public.dietitians(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  file_url        TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_type       TEXT,
  file_size_bytes BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_dietitian ON public.documents(dietitian_id);
CREATE INDEX IF NOT EXISTS idx_documents_patient ON public.documents(patient_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.dietitians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dietitian_professional ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dietitian_practice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dietitian_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ── dietitians ──────────────────────────────────
DROP POLICY IF EXISTS "dietitians_select_own" ON public.dietitians;
CREATE POLICY "dietitians_select_own" ON public.dietitians FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "dietitians_insert_own" ON public.dietitians;
CREATE POLICY "dietitians_insert_own" ON public.dietitians FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "dietitians_update_own" ON public.dietitians;
CREATE POLICY "dietitians_update_own" ON public.dietitians FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "dietitians_delete_own" ON public.dietitians;
CREATE POLICY "dietitians_delete_own" ON public.dietitians FOR DELETE USING (id = auth.uid());

-- ── dietitian_professional ──────────────────────
DROP POLICY IF EXISTS "prof_select_own" ON public.dietitian_professional;
CREATE POLICY "prof_select_own" ON public.dietitian_professional FOR SELECT USING (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "prof_insert_own" ON public.dietitian_professional;
CREATE POLICY "prof_insert_own" ON public.dietitian_professional FOR INSERT WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "prof_update_own" ON public.dietitian_professional;
CREATE POLICY "prof_update_own" ON public.dietitian_professional FOR UPDATE USING (dietitian_id = auth.uid()) WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "prof_delete_own" ON public.dietitian_professional;
CREATE POLICY "prof_delete_own" ON public.dietitian_professional FOR DELETE USING (dietitian_id = auth.uid());

-- ── dietitian_practice ──────────────────────────
DROP POLICY IF EXISTS "practice_select_own" ON public.dietitian_practice;
CREATE POLICY "practice_select_own" ON public.dietitian_practice FOR SELECT USING (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "practice_insert_own" ON public.dietitian_practice;
CREATE POLICY "practice_insert_own" ON public.dietitian_practice FOR INSERT WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "practice_update_own" ON public.dietitian_practice;
CREATE POLICY "practice_update_own" ON public.dietitian_practice FOR UPDATE USING (dietitian_id = auth.uid()) WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "practice_delete_own" ON public.dietitian_practice;
CREATE POLICY "practice_delete_own" ON public.dietitian_practice FOR DELETE USING (dietitian_id = auth.uid());

-- ── dietitian_availability ──────────────────────
DROP POLICY IF EXISTS "availability_select_own" ON public.dietitian_availability;
CREATE POLICY "availability_select_own" ON public.dietitian_availability FOR SELECT USING (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "availability_insert_own" ON public.dietitian_availability;
CREATE POLICY "availability_insert_own" ON public.dietitian_availability FOR INSERT WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "availability_update_own" ON public.dietitian_availability;
CREATE POLICY "availability_update_own" ON public.dietitian_availability FOR UPDATE USING (dietitian_id = auth.uid()) WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "availability_delete_own" ON public.dietitian_availability;
CREATE POLICY "availability_delete_own" ON public.dietitian_availability FOR DELETE USING (dietitian_id = auth.uid());

-- ── patients ────────────────────────────────────
DROP POLICY IF EXISTS "patients_select_own" ON public.patients;
CREATE POLICY "patients_select_own" ON public.patients FOR SELECT USING (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "patients_insert_own" ON public.patients;
CREATE POLICY "patients_insert_own" ON public.patients FOR INSERT WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "patients_update_own" ON public.patients;
CREATE POLICY "patients_update_own" ON public.patients FOR UPDATE USING (dietitian_id = auth.uid()) WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "patients_delete_own" ON public.patients;
CREATE POLICY "patients_delete_own" ON public.patients FOR DELETE USING (dietitian_id = auth.uid());

-- ── appointments ────────────────────────────────
DROP POLICY IF EXISTS "appointments_select_own" ON public.appointments;
CREATE POLICY "appointments_select_own" ON public.appointments FOR SELECT USING (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "appointments_insert_own" ON public.appointments;
CREATE POLICY "appointments_insert_own" ON public.appointments FOR INSERT WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "appointments_update_own" ON public.appointments;
CREATE POLICY "appointments_update_own" ON public.appointments FOR UPDATE USING (dietitian_id = auth.uid()) WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "appointments_delete_own" ON public.appointments;
CREATE POLICY "appointments_delete_own" ON public.appointments FOR DELETE USING (dietitian_id = auth.uid());

-- ── clinical_notes ──────────────────────────────
DROP POLICY IF EXISTS "notes_select_own" ON public.clinical_notes;
CREATE POLICY "notes_select_own" ON public.clinical_notes FOR SELECT USING (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "notes_insert_own" ON public.clinical_notes;
CREATE POLICY "notes_insert_own" ON public.clinical_notes FOR INSERT WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "notes_update_own" ON public.clinical_notes;
CREATE POLICY "notes_update_own" ON public.clinical_notes FOR UPDATE USING (dietitian_id = auth.uid()) WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "notes_delete_own" ON public.clinical_notes;
CREATE POLICY "notes_delete_own" ON public.clinical_notes FOR DELETE USING (dietitian_id = auth.uid());

-- ── lab_reports ─────────────────────────────────
DROP POLICY IF EXISTS "reports_select_own" ON public.lab_reports;
CREATE POLICY "reports_select_own" ON public.lab_reports FOR SELECT USING (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "reports_insert_own" ON public.lab_reports;
CREATE POLICY "reports_insert_own" ON public.lab_reports FOR INSERT WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "reports_update_own" ON public.lab_reports;
CREATE POLICY "reports_update_own" ON public.lab_reports FOR UPDATE USING (dietitian_id = auth.uid()) WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "reports_delete_own" ON public.lab_reports;
CREATE POLICY "reports_delete_own" ON public.lab_reports FOR DELETE USING (dietitian_id = auth.uid());

-- ── timeline_events ─────────────────────────────
DROP POLICY IF EXISTS "timeline_select_own" ON public.timeline_events;
CREATE POLICY "timeline_select_own" ON public.timeline_events FOR SELECT USING (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "timeline_insert_own" ON public.timeline_events;
CREATE POLICY "timeline_insert_own" ON public.timeline_events FOR INSERT WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "timeline_delete_own" ON public.timeline_events;
CREATE POLICY "timeline_delete_own" ON public.timeline_events FOR DELETE USING (dietitian_id = auth.uid());

-- ── documents ───────────────────────────────────
DROP POLICY IF EXISTS "documents_select_own" ON public.documents;
CREATE POLICY "documents_select_own" ON public.documents FOR SELECT USING (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "documents_insert_own" ON public.documents;
CREATE POLICY "documents_insert_own" ON public.documents FOR INSERT WITH CHECK (dietitian_id = auth.uid());

DROP POLICY IF EXISTS "documents_delete_own" ON public.documents;
CREATE POLICY "documents_delete_own" ON public.documents FOR DELETE USING (dietitian_id = auth.uid());

-- ============================================================
-- AUTH TRIGGER: Auto-create dietitians row on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.dietitians (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STORAGE BUCKETS (ON CONFLICT DO NOTHING = idempotent)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',      'avatars',      true,  5242880,  ARRAY['image/jpeg','image/png']),
  ('certificates', 'certificates', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png']),
  ('lab-reports',  'lab-reports',  false, 20971520, ARRAY['application/pdf','image/jpeg','image/png']),
  ('documents',    'documents',    false, 20971520, ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS: avatars ─────────────────────────
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── Storage RLS: certificates ────────────────────
DROP POLICY IF EXISTS "certificates_select_own" ON storage.objects;
CREATE POLICY "certificates_select_own" ON storage.objects FOR SELECT USING (bucket_id = 'certificates' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "certificates_insert_own" ON storage.objects;
CREATE POLICY "certificates_insert_own" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'certificates' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "certificates_delete_own" ON storage.objects;
CREATE POLICY "certificates_delete_own" ON storage.objects FOR DELETE USING (bucket_id = 'certificates' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── Storage RLS: lab-reports ─────────────────────
DROP POLICY IF EXISTS "lab_reports_select_own" ON storage.objects;
CREATE POLICY "lab_reports_select_own" ON storage.objects FOR SELECT USING (bucket_id = 'lab-reports' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "lab_reports_insert_own" ON storage.objects;
CREATE POLICY "lab_reports_insert_own" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lab-reports' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "lab_reports_delete_own" ON storage.objects;
CREATE POLICY "lab_reports_delete_own" ON storage.objects FOR DELETE USING (bucket_id = 'lab-reports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── Storage RLS: documents ───────────────────────
DROP POLICY IF EXISTS "documents_storage_select_own" ON storage.objects;
CREATE POLICY "documents_storage_select_own" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "documents_storage_insert_own" ON storage.objects;
CREATE POLICY "documents_storage_insert_own" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "documents_storage_delete_own" ON storage.objects;
CREATE POLICY "documents_storage_delete_own" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
