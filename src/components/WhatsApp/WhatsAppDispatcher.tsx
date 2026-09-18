import React, { useMemo, useState } from 'react';
import { Patient } from '../../domain/types';
import { Copy, Check, ExternalLink, MapPin } from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';

type DispatchType =
  | 'PATIENT_CONFIRM'
  | 'PATIENT_POST_OP'
  | 'PATIENT_RECALL'
  | 'DOCTOR_DISPATCH';

interface WhatsAppDispatcherProps {
  patient: Patient;
  clinicName?: string;
  defaultDoctorName?: string;
  clinicPhoneDisplay?: string;
  /** Full address used for Google Maps directions link */
  clinicMapsQuery?: string;
}

function buildMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function sixMonthRecallLabel(from = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 6);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export const WhatsAppDispatcher: React.FC<WhatsAppDispatcherProps> = ({
  patient,
  clinicName = 'AuraSmile Dental',
  defaultDoctorName = 'Dr. Vikram Rao, MDS (Endodontist)',
  clinicPhoneDisplay = '+91 80 2520 1234',
  clinicMapsQuery = 'AuraSmile Dental Care, Indiranagar, Bengaluru',
}) => {
  const [dispatchType, setDispatchType] = useState<DispatchType>('PATIENT_CONFIRM');
  const [doctorPhone, setDoctorPhone] = useState('+919845099887');
  const [doctorName, setDoctorName] = useState(defaultDoctorName);
  const [chairName, setChairName] = useState(patient.primaryChair);
  const [apptTime, setApptTime] = useState(patient.nextAppointmentDate || 'Today · 11:00 AM');
  const [procedureTitle, setProcedureTitle] = useState('Consultation / planned procedure');
  const [copied, setCopied] = useState(false);

  const mapsUrl = useMemo(() => buildMapsUrl(clinicMapsQuery), [clinicMapsQuery]);
  const recallDate = useMemo(() => sixMonthRecallLabel(), []);

  const generateMessage = (): string => {
    if (dispatchType === 'DOCTOR_DISPATCH') {
      return `*AURASMILE OS · CHAIRSIDE CLINICAL DISPATCH*
*Clinic:* ${clinicName}
*Doctor:* ${doctorName}
*Operatory:* ${chairName}
*Scheduled Time:* ${apptTime}

*Patient:* ${patient.fullName} (${patient.gender}, ${patient.age}y)
*MRN:* ${patient.mrn}
*Procedure:* ${procedureTitle}
*Clinical Alerts:* ${patient.medicalAlerts.map((a) => a.label).join(', ') || 'None'}

_Please confirm chair availability on WhatsApp._`;
    }

    if (dispatchType === 'PATIENT_CONFIRM') {
      return `*${clinicName} — Appointment Confirmation*

Namaste ${patient.fullName.split(' ')[0]} ji,

Your dental visit with *${doctorName}* is confirmed.

📅 *Date & Time:* ${apptTime}
🦷 *Chair / Operatory:* ${chairName}
🩺 *Procedure:* ${procedureTitle}

📍 *Directions to clinic (Google Maps):*
${mapsUrl}

*Before you arrive:*
1. Light meal 1 hour before (unless fasting advised).
2. Continue routine medicines with water unless told otherwise.
3. Bring prior X-rays / reports if any.

Need to reschedule? Reply on this WhatsApp.
Clinic desk: ${clinicPhoneDisplay}`;
    }

    if (dispatchType === 'PATIENT_RECALL') {
      return `*${clinicName} — 6-Month Routine Recall*

Namaste ${patient.fullName.split(' ')[0]} ji,

It is time for your *6-month routine dental check-up & cleaning*.

📌 Suggested recall window: *around ${recallDate}*
👨‍⚕️ Preferred doctor: ${doctorName}

Regular recall helps catch caries, gum issues, and crown/fit problems early.

Reply *YES* to book a slot, or call ${clinicPhoneDisplay}.

📍 Clinic directions:
${mapsUrl}`;
    }

    // Post-op care
    return `*${clinicName} — Post-Treatment Care*

Namaste ${patient.fullName.split(' ')[0]} ji,

After your treatment today (*${procedureTitle}*), please follow:

1. *Bite firmly on gauze* for 30–45 minutes. Swallow saliva — do not spit for *24 hours*.
2. *Soft, cold diet* for 24 hours. Avoid hot, spicy, crunchy foods.
3. *No straw, no vigorous rinsing, no smoking* for 24 hours (protects the clot).
4. Take prescribed medicines after food as on your Rx.
5. External ice pack on the cheek 15 min on / 15 min off if advised.

Excessive bleeding or severe pain? Call ${clinicPhoneDisplay} immediately.

Get well soon — ${clinicName}`;
  };

  const messageText = generateMessage();
  const recipientPhone =
    dispatchType === 'DOCTOR_DISPATCH' ? doctorPhone : patient.phoneNumber;
  const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

  const handleCopy = () => {
    void navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { id: DispatchType; label: string }[] = [
    { id: 'PATIENT_CONFIRM', label: 'Appt confirm' },
    { id: 'PATIENT_POST_OP', label: 'Post-care' },
    { id: 'PATIENT_RECALL', label: '6-mo recall' },
    { id: 'DOCTOR_DISPATCH', label: 'Doctor dispatch' },
  ];

  return (
    <div className="space-y-4">
      <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <WhatsAppIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 font-sans">WhatsApp dispatch</h2>
            <p className="text-xs text-slate-500">
              Confirmation · post-care · 6-month recall — ready wa.me templates
            </p>
          </div>
        </div>

        <div className="flex flex-wrap rounded-md border border-slate-300 p-0.5 bg-slate-100 text-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDispatchType(tab.id)}
              className={`px-2.5 py-1.5 rounded font-medium transition-all ${
                dispatchType === tab.id
                  ? 'bg-[var(--color-brand)] text-white shadow-xs'
                  : 'text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 surface-card p-4 space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Message variables
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Target phone</label>
              <input
                type="text"
                value={dispatchType === 'DOCTOR_DISPATCH' ? doctorPhone : patient.phoneNumber}
                onChange={(e) => {
                  if (dispatchType === 'DOCTOR_DISPATCH') setDoctorPhone(e.target.value);
                }}
                className="w-full p-2 font-mono rounded border border-slate-300 bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Doctor</label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full p-2 rounded border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Chair</label>
              <input
                type="text"
                value={chairName}
                onChange={(e) => setChairName(e.target.value)}
                className="w-full p-2 rounded border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Date & time</label>
              <input
                type="text"
                value={apptTime}
                onChange={(e) => setApptTime(e.target.value)}
                className="w-full p-2 rounded border border-slate-300 bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Procedure</label>
            <input
              type="text"
              value={procedureTitle}
              onChange={(e) => setProcedureTitle(e.target.value)}
              className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-800">Clinic maps link (auto)</div>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-brand)] break-all hover:underline"
                >
                  {mapsUrl}
                </a>
                <p className="mt-1 text-slate-500">{clinicMapsQuery}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 surface-card p-4 space-y-3">
          <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Preview
            </h3>
            <span className="text-[11px] font-mono text-slate-400">To: {recipientPhone}</span>
          </div>

          <div className="bg-[#EFEAE2] p-4 rounded-lg border border-slate-300 min-h-[240px] flex flex-col justify-between">
            <div className="bg-white p-3 rounded-lg shadow-xs max-w-lg text-xs whitespace-pre-wrap font-sans text-slate-800 leading-relaxed border-l-4 border-emerald-500">
              {messageText}
              <div className="text-[10px] text-slate-400 text-right mt-1 font-mono">
                Delivered ✓✓
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3">
              <button
                type="button"
                onClick={handleCopy}
                className="tactile-btn flex items-center space-x-1 text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-md shadow-xs font-medium"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="tactile-btn flex items-center space-x-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 font-bold px-4 py-1.5 rounded-md shadow-sm shadow-emerald-600/30"
              >
                <WhatsAppIcon className="w-3.5 h-3.5" />
                <span>Open WhatsApp</span>
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
