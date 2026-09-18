import { describe, expect, it } from 'vitest';
import {
  collectDirtyPatients,
  doctorMatchKey,
  filterPatientsForViewer,
  filterQueueForViewer,
  fingerprintPatient,
  isAssignedToDoctor,
  isAssignedToMember,
  seedPatientFingerprints,
  viewerSeesFullRoster,
} from '../../lib/doctorScope';
import { Patient } from '../types';

function stubPatient(partial: Partial<Patient> & Pick<Patient, 'id' | 'assignedDoctorName'>): Patient {
  return {
    mrn: 'AS-1',
    fullName: 'Test',
    age: 30,
    gender: 'M',
    phoneNumber: '+919999999999',
    addressCity: 'Bengaluru',
    medicalAlerts: [],
    dentalChart: {},
    bloodGroup: 'Unknown',
    primaryChair: 'Chair 1',
    lastVisitDate: '2026-01-01',
    assignedMemberId: null,
    ...partial,
  };
}

describe('doctorScope', () => {
  it('normalizes doctor match keys', () => {
    expect(doctorMatchKey('Dr. Pedo, MDS (Pedo)')).toBe('dr. pedo');
  });

  it('matches assigned doctor by display name', () => {
    expect(isAssignedToDoctor('Dr. Pedo', 'Dr. Pedo, MDS')).toBe(true);
    expect(isAssignedToDoctor('Dr. Oral', 'Dr. Pedo')).toBe(false);
  });

  it('falls back to name match when member ids are missing', () => {
    const patients = [
      stubPatient({ id: '1', assignedDoctorName: 'Dr. Pedo', assignedMemberId: null }),
      stubPatient({ id: '2', assignedDoctorName: 'Dr. Oral', assignedMemberId: null }),
    ];
    const scoped = filterPatientsForViewer(patients, 'Dr. Pedo, MDS', 'DOCTOR', 'mem-pedo');
    expect(scoped.map((p) => p.id)).toEqual(['1']);
  });

  it('prefers member id over name when filtering patients', () => {
    const patients = [
      stubPatient({
        id: '1',
        assignedDoctorName: 'Dr. Pedo',
        assignedMemberId: 'mem-pedo',
      }),
      stubPatient({
        id: '2',
        assignedDoctorName: 'Dr. Pedo',
        assignedMemberId: 'mem-oral',
      }),
    ];

    const scoped = filterPatientsForViewer(patients, 'Dr. Pedo', 'DOCTOR', 'mem-pedo');
    expect(scoped.map((p) => p.id)).toEqual(['1']);
  });

  it('desk sees full roster', () => {
    const patients = [
      stubPatient({ id: '1', assignedDoctorName: 'A', assignedMemberId: 'a' }),
      stubPatient({ id: '2', assignedDoctorName: 'B', assignedMemberId: 'b' }),
    ];
    expect(filterPatientsForViewer(patients, 'A', 'FRONT_DESK', 'desk').length).toBe(2);
    expect(viewerSeesFullRoster('FRONT_DESK')).toBe(true);
    expect(viewerSeesFullRoster('DOCTOR')).toBe(false);
  });

  it('filters queue by assigned member id', () => {
    const queue = [
      { assignedDoctor: 'Dr. Pedo', assignedMemberId: 'mem-pedo' },
      { assignedDoctor: 'Dr. Oral', assignedMemberId: 'mem-oral' },
    ];
    expect(
      filterQueueForViewer(queue, 'Dr. Pedo', 'DOCTOR', 'mem-pedo').map((q) => q.assignedMemberId)
    ).toEqual(['mem-pedo']);
  });

  it('isAssignedToMember requires both ids', () => {
    expect(isAssignedToMember('a', 'a')).toBe(true);
    expect(isAssignedToMember('a', null)).toBe(false);
    expect(isAssignedToMember(null, 'a')).toBe(false);
  });

  it('recall-style rows respect member id scoping', () => {
    const upcoming = [
      {
        assignedDoctorName: 'Dr. Pedo',
        assignedMemberId: 'mem-pedo',
        nextAppointmentDate: '2026-10-01',
      },
      {
        assignedDoctorName: 'Dr. Pedo',
        assignedMemberId: 'mem-oral',
        nextAppointmentDate: '2026-10-02',
      },
    ];
    const scoped = filterPatientsForViewer(upcoming, 'Dr. Pedo', 'DOCTOR', 'mem-pedo');
    expect(scoped).toHaveLength(1);
    expect(scoped[0].assignedMemberId).toBe('mem-pedo');
  });

  it('collectDirtyPatients skips unchanged roster rows', () => {
    const a = stubPatient({ id: '1', assignedDoctorName: 'Dr. Pedo', assignedMemberId: 'm1' });
    const b = stubPatient({ id: '2', assignedDoctorName: 'Dr. Oral', assignedMemberId: 'm2' });
    const fingerprints = seedPatientFingerprints([a, b]);

    expect(collectDirtyPatients([a, b], fingerprints)).toEqual([]);

    const edited: Patient = {
      ...a,
      fullName: 'Edited Name',
    };
    const dirty = collectDirtyPatients([edited, b], fingerprints);
    expect(dirty.map((p) => p.id)).toEqual(['1']);
    expect(fingerprintPatient(edited)).not.toBe(fingerprints.get('1'));
  });
});
