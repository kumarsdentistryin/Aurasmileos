-- Lab slips, outstanding dues, consultant weekly schedule (finish live ops)

CREATE TABLE IF NOT EXISTS lab_orders (
  id TEXT PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id TEXT,
  patient_name TEXT NOT NULL,
  doctor_name TEXT NOT NULL DEFAULT '',
  lab_partner TEXT NOT NULL,
  tooth_id INTEGER NOT NULL,
  restoration_type TEXT NOT NULL,
  primary_shade TEXT NOT NULL DEFAULT 'A2',
  cervical_shade TEXT,
  incisal_translucency TEXT NOT NULL DEFAULT 'HIGH',
  status TEXT NOT NULL DEFAULT 'SENT_TO_LAB',
  order_date DATE NOT NULL,
  expected_delivery_date DATE NOT NULL,
  patient_appointment_date TEXT NOT NULL DEFAULT '',
  warranty_years INTEGER NOT NULL DEFAULT 5,
  warranty_card_number TEXT,
  lab_cost_paise BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lab_orders_clinic_idx ON lab_orders (clinic_id, order_date DESC);

CREATE TABLE IF NOT EXISTS patient_dues (
  id TEXT PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id TEXT,
  patient_name TEXT NOT NULL,
  phone TEXT,
  total_paise BIGINT NOT NULL,
  collected_paise BIGINT NOT NULL DEFAULT 0,
  balance_paise BIGINT NOT NULL,
  procedure_name TEXT NOT NULL,
  due_date DATE,
  payment_mode TEXT,
  settled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS patient_dues_clinic_idx ON patient_dues (clinic_id, settled, created_at DESC);

CREATE TABLE IF NOT EXISTS consultant_schedules (
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  days_of_week INTEGER[] NOT NULL DEFAULT '{}',
  start_time TEXT NOT NULL DEFAULT '10:00',
  end_time TEXT NOT NULL DEFAULT '14:00',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (clinic_id, member_id)
);

ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops select lab_orders" ON lab_orders
  FOR SELECT USING (clinic_id IN (SELECT public.user_clinic_ids()));
CREATE POLICY "ops insert lab_orders" ON lab_orders
  FOR INSERT WITH CHECK (public.clinic_member_sees_all(clinic_id));
CREATE POLICY "ops update lab_orders" ON lab_orders
  FOR UPDATE USING (public.clinic_member_sees_all(clinic_id));
CREATE POLICY "ops delete lab_orders" ON lab_orders
  FOR DELETE USING (public.is_clinic_owner(clinic_id));

CREATE POLICY "ops select patient_dues" ON patient_dues
  FOR SELECT USING (clinic_id IN (SELECT public.user_clinic_ids()));
CREATE POLICY "ops insert patient_dues" ON patient_dues
  FOR INSERT WITH CHECK (public.clinic_member_sees_all(clinic_id));
CREATE POLICY "ops update patient_dues" ON patient_dues
  FOR UPDATE USING (public.clinic_member_sees_all(clinic_id));
CREATE POLICY "ops delete patient_dues" ON patient_dues
  FOR DELETE USING (public.is_clinic_owner(clinic_id));

CREATE POLICY "ops select consultant_schedules" ON consultant_schedules
  FOR SELECT USING (clinic_id IN (SELECT public.user_clinic_ids()));
CREATE POLICY "ops upsert consultant_schedules" ON consultant_schedules
  FOR ALL USING (public.clinic_member_sees_all(clinic_id))
  WITH CHECK (public.clinic_member_sees_all(clinic_id));
