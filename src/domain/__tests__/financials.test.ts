import { describe, expect, it } from 'vitest';
import {
  calculateCaseProfitability,
  formatPaiseToInr,
  inrToPaise,
  paiseToInr,
  buildGstReceipt,
  buildUpiPayUrl,
  extractGstin,
  isCosmeticDentalProcedure,
} from '../financials';

describe('financial paise invariants', () => {
  it('converts INR to integer paise without float loss', () => {
    expect(inrToPaise(8500)).toBe(850000);
    expect(paiseToInr(850000)).toBe(8500);
  });

  it('formats INR for en-IN display', () => {
    expect(formatPaiseToInr(850000, false)).toContain('8,500');
  });

  it('splits visiting specialist case in integer paise', () => {
    const result = calculateCaseProfitability({
      procedureName: 'Molar RCT',
      grossFeePaise: 1000000,
      isVisitingSpecialist: true,
      consultantSharePercentage: 40,
      labFeePaise: 100000,
      materialsConsumableCostPaise: 50000,
      gstApplicablePercent: 0,
    });
    expect(result.doctorConsultantPayoutPaise).toBe(400000);
    expect(result.totalDirectCostPaise).toBe(550000);
    expect(result.netClinicContributionMarginPaise).toBe(450000);
  });

  it('rejects negative gross fee', () => {
    expect(() =>
      calculateCaseProfitability({
        procedureName: 'Test',
        grossFeePaise: -1,
        isVisitingSpecialist: false,
        consultantSharePercentage: 0,
        labFeePaise: 0,
        materialsConsumableCostPaise: 0,
        gstApplicablePercent: 0,
      })
    ).toThrow(/negative/i);
  });

  it('builds CGST/SGST receipt in integer paise', () => {
    const receipt = buildGstReceipt(100000, 18);
    expect(receipt.cgstPaise + receipt.sgstPaise).toBe(18000);
    expect(receipt.totalPaise).toBe(118000);
  });

  it('keeps healthcare receipts GST-exempt at 0%', () => {
    const receipt = buildGstReceipt(850000, 0);
    expect(receipt.cgstPaise).toBe(0);
    expect(receipt.sgstPaise).toBe(0);
    expect(receipt.totalPaise).toBe(850000);
  });

  it('extracts GSTIN and flags cosmetic procedures', () => {
    expect(extractGstin('Clinic Reg: KDC · GSTIN: 29AABCA1234D1Z5')).toBe('29AABCA1234D1Z5');
    expect(isCosmeticDentalProcedure('Clear Aligners')).toBe(true);
    expect(isCosmeticDentalProcedure('Molar RCT')).toBe(false);
  });

  it('builds UPI deep link with INR amount', () => {
    const url = buildUpiPayUrl({
      vpa: 'aurasmile@upi',
      payeeName: 'AuraSmile Dental',
      amountPaise: 850000,
      note: 'AS-BLR-0842',
    });
    expect(url).toContain('upi://pay?');
    expect(url).toContain('pa=aurasmile%40upi');
    expect(url).toContain('am=8500.00');
  });
});
