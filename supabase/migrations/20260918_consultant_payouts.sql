CREATE TABLE IF NOT EXISTS consultant_payouts (
  id TEXT PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  consultant_member_id TEXT NOT NULL,
  consultant_name TEXT NOT NULL,
  patient_id TEXT,
  patient_name TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  procedure_date DATE NOT NULL,
  gross_fee_paise BIGINT NOT NULL,
  consultant_share_percentage INTEGER NOT NULL DEFAULT 60,
  gross_payout_paise BIGINT NOT NULL,
  tds_withholding_paise BIGINT NOT NULL,
  net_payable_paise BIGINT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  utr_number TEXT,
  settled_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consultant_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic owner can manage payouts" ON consultant_payouts
  FOR ALL USING (clinic_id IN (
    SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid() AND role = 'OWNER'
  ));
