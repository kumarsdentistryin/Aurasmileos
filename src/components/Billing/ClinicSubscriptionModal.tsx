import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  Info,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { ClinicEntitlement, ClinicPlan } from '../../lib/entitlements';
import { daysLeftInTrial } from '../../lib/entitlements';

interface ClinicSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicDbId?: string | null;
  clinicName: string;
  doctorName: string;
  clinicEmail?: string;
  clinicPhone?: string;
  entitlement: ClinicEntitlement;
  onPlanActivated: (newPlan: ClinicPlan, paymentRef: string) => void;
}

const SUBSCRIPTION_TIERS: {
  id: ClinicPlan;
  name: string;
  tagline: string;
  annualPricePaise: number;
  annualPriceInr: number;
  monthlyPriceInr: number;
  popular?: boolean;
  badge?: string;
  features: string[];
}[] = [
  {
    id: 'starter',
    name: 'Core Clinical OS',
    tagline: 'Full clinic workstation · all chairs',
    annualPricePaise: 499900,
    annualPriceInr: 4999,
    monthlyPriceInr: 499,
    features: [
      'Full operatory floor · All chairs included',
      'Unlimited staff & doctor logins',
      '32-Tooth FDI Vector Odontogram (Adult & Pedo)',
      'Case material auto-deduction (Rotary files, GP, LA)',
      'Visiting consultant 60/40 split + Sec 194J TDS',
      'GST & UPI billing with integer paise precision',
      'Digital consent forms & lifetime patient EMR',
      'Native zero-cost WhatsApp messaging (wa.me)',
      'Offline-first chairside failover (zero lag)',
    ],
  },
  {
    id: 'growth',
    name: 'Growth + WhatsApp & GMB',
    tagline: 'Recall automation & 5-star Google reviews',
    annualPricePaise: 899900,
    annualPriceInr: 8999,
    monthlyPriceInr: 899,
    popular: true,
    badge: 'Most Popular',
    features: [
      'Everything in Core Clinical OS',
      'Automated WhatsApp Recall & Follow-up queue',
      'Google My Business (GMB) 5-Star Review Booster',
      'Birthday & Festival patient re-engagement',
      'Treatment plan acceptance tracker & balance alerts',
      'Dental lab work order dispatch on WhatsApp',
      'Priority onboarding & WhatsApp care team',
    ],
  },
  {
    id: 'ai_voice',
    name: 'AI Voice Receptionist',
    tagline: '24/7 AI inbound front desk & outbound caller',
    annualPricePaise: 1499900,
    annualPriceInr: 14999,
    monthlyPriceInr: 1499,
    badge: 'Zero API Burn Protected',
    features: [
      'Everything in Growth + WhatsApp & GMB',
      '24/7 Inbound AI Call Answering & Booking',
      'Outbound automated appointment reminder calls',
      '100 free call minutes/month included',
      'Prepaid calling wallet (₹2.50/min) or Bring-Your-Own-SIP',
      'Speech-to-text dental clinical scribe',
      'Dedicated account manager',
    ],
  },
];

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export const ClinicSubscriptionModal: React.FC<ClinicSubscriptionModalProps> = ({
  isOpen,
  onClose,
  clinicName,
  doctorName,
  clinicEmail = 'doctor@aurasmile.clinic',
  clinicPhone = '9876543210',
  entitlement,
  onPlanActivated,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<ClinicPlan>('growth');
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<{
    planName: string;
    amountInr: number;
    paymentRef: string;
    date: string;
  } | null>(null);

  if (!isOpen) return null;

  const selectedTier =
    SUBSCRIPTION_TIERS.find((t) => t.id === selectedPlanId) || SUBSCRIPTION_TIERS[1];
  const amountInr =
    billingCycle === 'annual' ? selectedTier.annualPriceInr : selectedTier.monthlyPriceInr;
  const daysLeft = daysLeftInTrial(entitlement.trialEndsAt);

  const handleRazorpayPayment = () => {
    setIsProcessing(true);

    const loadRazorpayScript = () => {
      return new Promise((resolve) => {
        if (window.Razorpay) {
          resolve(true);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    loadRazorpayScript().then((loaded) => {
      if (!loaded) {
        setIsProcessing(false);
        alert('Could not load Razorpay SDK. Please check your internet connection.');
        return;
      }

      const keyId =
        (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || 'rzp_test_placeholder';

      const options = {
        key: keyId,
        amount: amountInr * 100, // in paise
        currency: 'INR',
        name: 'AuraSmile OS',
        description: `${selectedTier.name} (${billingCycle === 'annual' ? 'Annual' : 'Monthly'})`,
        prefill: {
          name: doctorName,
          email: clinicEmail,
          contact: clinicPhone,
        },
        theme: {
          color: '#0f766e',
        },
        handler: (response: { razorpay_payment_id: string }) => {
          setIsProcessing(false);
          const paymentRef = response.razorpay_payment_id || `RZP_${Date.now()}`;
          finalizeActivation(selectedTier.id, paymentRef, amountInr);
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      try {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err) {
        setIsProcessing(false);
        // Fallback for test mode without real API keys
        const mockRef = `RZP_DEMO_${Math.floor(100000 + Math.random() * 900000)}`;
        if (
          confirm(
            `Razorpay Test Sandbox: Simulate instant payment verification of ₹${amountInr.toLocaleString(
              'en-IN'
            )} for ${selectedTier.name}?`
          )
        ) {
          finalizeActivation(selectedTier.id, mockRef, amountInr);
        }
      }
    });
  };

  const finalizeActivation = (planId: ClinicPlan, paymentRef: string, amount: number) => {
    onPlanActivated(planId, paymentRef);
    setSuccessReceipt({
      planName: selectedTier.name,
      amountInr: amount,
      paymentRef,
      date: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Clinic Subscription & Plan Activation
              </h2>
              <p className="text-xs text-slate-500">
                {clinicName} · {doctorName} (Owner)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {successReceipt ? (
          /* Payment Success View */
          <div className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Subscription Successfully Activated!
            </h3>
            <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Your clinic is now upgraded to the <strong>{successReceipt.planName}</strong> plan.
              All corresponding clinical features and operatory chairs are active.
            </p>

            <div className="mt-6 mx-auto max-w-md rounded-xl border border-slate-200 bg-slate-50 p-4 text-left font-mono text-xs space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>Receipt Ref:</span>
                <span className="font-semibold text-slate-800">{successReceipt.paymentRef}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Plan:</span>
                <span className="font-semibold text-slate-800">{successReceipt.planName}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Amount Paid:</span>
                <span className="font-bold text-emerald-700">
                  ₹{successReceipt.amountInr.toLocaleString('en-IN')} (GST incl.)
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Activation Date:</span>
                <span className="font-semibold text-slate-800">{successReceipt.date}</span>
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="tactile-btn inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Print GST Receipt
              </button>
              <button
                type="button"
                onClick={onClose}
                className="tactile-btn inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-700"
              >
                Return to Clinic Workstation
              </button>
            </div>
          </div>
        ) : (
          /* Plan Selection & Payment View */
          <div className="p-6">
            {/* Trial Status Banner */}
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900">
              <div className="flex items-center gap-2.5">
                <Info className="h-5 w-5 shrink-0 text-amber-600" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold">
                    {entitlement.subscriptionStatus === 'active'
                      ? 'Plan Status: Active'
                      : daysLeft !== null
                      ? `Live Pilot: ${daysLeft} days remaining`
                      : 'Live Pilot Mode Active'}
                  </span>
                  <span className="text-amber-700 ml-1">
                    · Live AI Voice outbound calling is locked during trial to protect against unauthorized toll charges.
                  </span>
                </div>
              </div>

              {/* Annual / Monthly Toggle */}
              <div className="inline-flex shrink-0 items-center rounded-lg bg-amber-100/80 p-1 border border-amber-300">
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                    billingCycle === 'annual'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-amber-800 hover:text-amber-950'
                  }`}
                >
                  Annual (Save ~17%)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-amber-800 hover:text-amber-950'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* 3 Tier Selector */}
            <div className="grid gap-4 md:grid-cols-3">
              {SUBSCRIPTION_TIERS.map((tier) => {
                const isSelected = selectedPlanId === tier.id;
                const price =
                  billingCycle === 'annual' ? tier.annualPriceInr : tier.monthlyPriceInr;
                const period = billingCycle === 'annual' ? '/year' : '/month';

                return (
                  <div
                    key={tier.id}
                    onClick={() => setSelectedPlanId(tier.id)}
                    className={`relative flex flex-col rounded-xl border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-600/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    {tier.badge && (
                      <span
                        className={`absolute -top-2.5 left-4 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                          tier.popular
                            ? 'bg-teal-600 text-white'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {tier.badge}
                      </span>
                    )}

                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">{tier.name}</h4>
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => setSelectedPlanId(tier.id)}
                        className="h-4 w-4 text-teal-600"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{tier.tagline}</p>

                    <div className="mt-3">
                      <span className="font-display text-2xl font-extrabold text-slate-900">
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">{period}</span>
                    </div>

                    <ul className="mt-3.5 space-y-1.5 flex-1 border-t border-slate-100 pt-3">
                      {tier.features.slice(0, 5).map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-1.5 text-[11px] text-slate-700 leading-tight"
                        >
                          <Check className="h-3.5 w-3.5 shrink-0 text-teal-600 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Payment Mode Selection */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="border-b border-slate-200 pb-3 mb-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Payment Checkout (Razorpay)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Total: ₹{amountInr.toLocaleString('en-IN')} for {selectedTier.name} ({billingCycle})
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 border border-teal-200 px-2 py-0.5 text-[11px] font-bold text-teal-800">
                      <CreditCard className="h-3 w-3 text-teal-600" />
                      Razorpay Checkout
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      ⚡ Instant 2-Second Verification
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Pay securely via UPI (Google Pay, PhonePe, Paytm), NetBanking, Credit/Debit Cards or EMI.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    No manual UTR copy-pasting required. Your clinic plan & features activate automatically the second payment completes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRazorpayPayment}
                  disabled={isProcessing}
                  className="tactile-btn inline-flex items-center gap-2 rounded-xl bg-teal-600 px-7 py-3.5 text-xs font-bold text-white hover:bg-teal-700 shadow-md hover:shadow-lg shrink-0 disabled:opacity-50 transition-all"
                >
                  {isProcessing ? 'Connecting Gateway...' : `Pay ₹${amountInr.toLocaleString('en-IN')} via Razorpay`}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
