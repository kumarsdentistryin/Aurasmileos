import { describe, expect, it } from 'vitest';
import {
  buildChairDayGrid,
  parseTimeToMinutes,
  type CalendarAppointment,
} from '../dayCalendar';

const sample: CalendarAppointment[] = [
  {
    id: '1',
    patientName: 'Rajesh',
    scheduledTime: '10:30 AM',
    chiefComplaint: 'RCT #16',
    assignedDoctor: 'Dr. Vikram Rao, MDS',
    chairLabel: 'Chair 1',
    status: 'IN_CHAIR',
  },
  {
    id: '2',
    patientName: 'Priya',
    scheduledTime: '11:30 AM',
    chiefComplaint: 'Crown trial',
    assignedDoctor: 'Dr. Ananya Iyer, BDS',
    chairLabel: 'Chair 2',
    status: 'WAITING_IN_LOBBY',
  },
  {
    id: '3',
    patientName: 'Sunita',
    scheduledTime: '02:30 PM',
    chiefComplaint: 'Implant consult',
    assignedDoctor: 'Dr. Priya Sharma, MDS',
    chairLabel: 'Chair 1',
    status: 'CONFIRMED',
  },
];

describe('dayCalendar', () => {
  it('parses 12h clinic times', () => {
    expect(parseTimeToMinutes('10:30 AM')).toBe(10 * 60 + 30);
    expect(parseTimeToMinutes('02:30 PM')).toBe(14 * 60 + 30);
    expect(parseTimeToMinutes('Now')).toBeNull();
  });

  it('builds chair lanes with doctor+patient sharing chairs across day', () => {
    const grid = buildChairDayGrid(sample, ['Chair 1', 'Chair 2', 'Chair 3']);
    expect(grid.chairs).toEqual(['Chair 1', 'Chair 2', 'Chair 3']);
    expect(grid.lanes['Chair 1']).toHaveLength(2);
    expect(grid.lanes['Chair 1'][0].assignedDoctor).toContain('Vikram');
    expect(grid.lanes['Chair 1'][1].assignedDoctor).toContain('Priya');
    expect(grid.lanes['Chair 2']).toHaveLength(1);
    expect(grid.lanes['Chair 3']).toHaveLength(0);
    expect(grid.doctorCount).toBe(3);
  });
});
