-- AuraSmile OS — Equipment AMC + autoclave sterilization cycles (live Sterile tab)

CREATE TABLE IF NOT EXISTS clinic_equipment (
  id TEXT PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  serial_number TEXT NOT NULL DEFAULT '',
  operatory_room TEXT NOT NULL DEFAULT '',
  amc_vendor_name TEXT NOT NULL DEFAULT '',
  amc_vendor_phone TEXT NOT NULL DEFAULT '',
  amc_start_date DATE,
  amc_expiry_date DATE,
  last_service_date DATE,
  status TEXT NOT NULL DEFAULT 'OPERATIONAL',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clinic_equipment_clinic_idx ON clinic_equipment (clinic_id);

CREATE TABLE IF NOT EXISTS autoclave_sterilization_cycles (
  id TEXT PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  cycle_date DATE NOT NULL,
  cycle_time TEXT NOT NULL,
  autoclave_equipment_id TEXT REFERENCES clinic_equipment(id) ON DELETE SET NULL,
  temperature_celsius INTEGER NOT NULL,
  pressure_psi INTEGER NOT NULL,
  cycle_duration_minutes INTEGER NOT NULL,
  biological_spore_test_passed BOOLEAN NOT NULL DEFAULT false,
  chemical_class5_integrator_passed BOOLEAN NOT NULL DEFAULT false,
  operator_name TEXT NOT NULL DEFAULT '',
  pouches_processed_count INTEGER NOT NULL DEFAULT 0,
  pouch_expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS autoclave_cycles_clinic_idx
  ON autoclave_sterilization_cycles (clinic_id, cycle_date DESC);

ALTER TABLE clinic_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoclave_sterilization_cycles ENABLE ROW LEVEL SECURITY;

-- Owner + front desk can manage equipment & cycles (same as other clinic ops PHI)
CREATE POLICY "ops staff select equipment" ON clinic_equipment
  FOR SELECT USING (clinic_id IN (SELECT public.user_clinic_ids()));

CREATE POLICY "ops staff insert equipment" ON clinic_equipment
  FOR INSERT WITH CHECK (public.clinic_member_sees_all(clinic_id));

CREATE POLICY "ops staff update equipment" ON clinic_equipment
  FOR UPDATE USING (public.clinic_member_sees_all(clinic_id));

CREATE POLICY "ops staff delete equipment" ON clinic_equipment
  FOR DELETE USING (public.is_clinic_owner(clinic_id));

CREATE POLICY "ops staff select autoclave cycles" ON autoclave_sterilization_cycles
  FOR SELECT USING (clinic_id IN (SELECT public.user_clinic_ids()));

CREATE POLICY "ops staff insert autoclave cycles" ON autoclave_sterilization_cycles
  FOR INSERT WITH CHECK (public.clinic_member_sees_all(clinic_id));

CREATE POLICY "ops staff update autoclave cycles" ON autoclave_sterilization_cycles
  FOR UPDATE USING (public.clinic_member_sees_all(clinic_id));

CREATE POLICY "ops staff delete autoclave cycles" ON autoclave_sterilization_cycles
  FOR DELETE USING (public.is_clinic_owner(clinic_id));
