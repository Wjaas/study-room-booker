import test from 'node:test';
import assert from 'node:assert/strict';
import { overlaps, isAvailable, bookingError } from '../dist/logic.js';

const now = new Date('2026-10-25T09:00:00');
const rooms = [{ id: 'r1', capacity: 4 }, { id: 'r2', capacity: 8 }];
const existing = { id: 'b1', roomId: 'r1', title: 'Seminar', date: '2026-10-26', start: '10:00', end: '11:00', people: 3 };
const candidate = values => ({ roomId: 'r1', title: 'Study group', date: '2026-10-26', start: '11:00', end: '12:00', people: 2, ...values });

test('prevents overlapping bookings in the same room but allows adjacent and other-room bookings', () => {
  assert.equal(overlaps(existing, candidate({ start: '10:30' })), true);
  assert.equal(isAvailable([existing], 'r1', '2026-10-26', '10:30', '11:30'), false);
  assert.equal(isAvailable([existing], 'r1', '2026-10-26', '11:00', '12:00'), true);
  assert.equal(isAvailable([existing], 'r2', '2026-10-26', '10:30', '11:30'), true);
});

test('editing a booking excludes itself from conflict checks', () => {
  assert.equal(bookingError(existing, [existing], rooms, now, 'b1'), null);
  assert.match(bookingError(candidate({ start: '10:30' }), [existing], rooms, now), /already booked/);
});

test('validates capacity, duration, and future time', () => {
  assert.match(bookingError(candidate({ people: 5 }), [], rooms, now), /1–4 people/);
  assert.match(bookingError(candidate({ end: '11:15' }), [], rooms, now), /at least 30 minutes/);
  assert.match(bookingError(candidate({ date: '2026-10-24' }), [], rooms, now), /future/);
  assert.match(bookingError(candidate({ date: '2026-02-31' }), [], rooms, now), /real calendar date/);
  assert.match(bookingError(candidate({ start: '10:15' }), [], rooms, now), /half-hour/);
});
