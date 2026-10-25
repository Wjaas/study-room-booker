export const OPEN = '08:00';
export const CLOSE = '22:00';

export function overlaps(first, second) {
  return first.date === second.date && first.roomId === second.roomId && first.start < second.end && second.start < first.end;
}

export function isAvailable(bookings, roomId, date, start, end, exceptId = null) {
  const candidate = { roomId, date, start, end };
  return !bookings.some(booking => booking.id !== exceptId && overlaps(booking, candidate));
}

export function bookingError(candidate, bookings, rooms, now = new Date(), exceptId = null) {
  const room = rooms.find(item => item.id === candidate.roomId);
  if (!room) return 'Choose an existing room.';
  if (!candidate.title?.trim()) return 'Add a title for your booking.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate.date || '')) return 'Choose a date.';
  const [year, month, day] = candidate.date.split('-').map(Number);
  const validDate = new Date(year, month - 1, day);
  if (validDate.getFullYear() !== year || validDate.getMonth() !== month - 1 || validDate.getDate() !== day) return 'Choose a real calendar date.';
  const people = Number(candidate.people);
  if (!Number.isInteger(people) || people < 1 || people > room.capacity) return `Choose 1–${room.capacity} people for this room.`;
  if (!/^\d{2}:\d{2}$/.test(candidate.start || '') || !/^\d{2}:\d{2}$/.test(candidate.end || '')) return 'Choose a valid time.';
  if (candidate.start < OPEN || candidate.end > CLOSE || candidate.start >= candidate.end) return 'Choose a valid time between 08:00 and 22:00.';
  const [startHour, startMinute] = candidate.start.split(':').map(Number);
  const [endHour, endMinute] = candidate.end.split(':').map(Number);
  if (![startHour, startMinute, endHour, endMinute].every(Number.isInteger)) return 'Choose a valid time.';
  if ((endHour * 60 + endMinute) - (startHour * 60 + startMinute) < 30) return 'Bookings must be at least 30 minutes.';
  if (![startMinute, endMinute].every(minute => minute === 0 || minute === 30)) return 'Choose a valid half-hour time.';
  const startsAt = new Date(`${candidate.date}T${candidate.start}:00`);
  if (Number.isNaN(startsAt.getTime()) || startsAt < now) return 'Choose a future date and time.';
  if (!isAvailable(bookings, candidate.roomId, candidate.date, candidate.start, candidate.end, exceptId)) return 'This room is already booked at that time. Try another slot.';
  return null;
}

export function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
