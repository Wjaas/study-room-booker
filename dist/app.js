import { isAvailable, bookingError, localDate } from './logic.js';

const KEY = 'common-room-v1';
const $ = id => document.getElementById(id);
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const defaults = [
  { id: 'room-1', name: 'The Green Room', location: 'Library · Floor 2', capacity: 4, amenities: ['Whiteboard', 'Quiet'] },
  { id: 'room-2', name: 'Project Lab', location: 'Building P · Floor 1', capacity: 8, amenities: ['Whiteboard', 'Screen'] },
  { id: 'room-3', name: 'The Nook', location: 'Library · Floor 3', capacity: 2, amenities: ['Quiet'] },
  { id: 'room-4', name: 'Open Studio', location: 'Building A · Floor 4', capacity: 6, amenities: ['Screen', 'Whiteboard'] },
  { id: 'room-5', name: 'Window Seat', location: 'Library · Floor 2', capacity: 2, amenities: ['Quiet', 'Screen'] },
  { id: 'room-6', name: 'The Commons', location: 'Student House · Floor 1', capacity: 10, amenities: ['Screen', 'Whiteboard'] }
];
function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    if (parsed && Array.isArray(parsed.rooms) && Array.isArray(parsed.bookings)) return parsed;
  } catch { /* Begin with sample rooms if stored data is unavailable. */ }
  return { rooms: structuredClone(defaults), bookings: [] };
}
const state = load();
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
let search = { date: localDate(tomorrow), start: '10:00', end: '11:30', capacity: 1, amenity: 'all' };
let bookingFilter = 'upcoming';
let editingBookingId = null;
let editingRoomId = null;
let toastTimeout = null;

function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { toast('Browser storage is unavailable; changes may not persist.'); } }
function el(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
function button(text, className, handler) { const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', handler); return node; }
function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('toast').classList.remove('show'), 3000); }
function roomById(id) { return state.rooms.find(room => room.id === id); }
function bookingById(id) { return state.bookings.find(booking => booking.id === id); }
function prettyDate(date) { return new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`)); }
function fillTimes(select, selected) { for (let minutes = 8 * 60; minutes <= 22 * 60; minutes += 30) { const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; const option = new Option(time, time); select.add(option); } select.value = selected; }

function renderRooms() {
  const grid = $('room-grid'); grid.replaceChildren();
  const rooms = state.rooms.filter(room => room.capacity >= search.capacity && (search.amenity === 'all' || room.amenities.includes(search.amenity)));
  $('result-count').textContent = `${rooms.length} room${rooms.length === 1 ? '' : 's'} found`;
  $('manage-count').textContent = `${state.rooms.length} ROOM${state.rooms.length === 1 ? '' : 'S'} IN YOUR SPACE`;
  if (!rooms.length) { grid.append(el('p', 'empty-state', 'No rooms match these filters. Try fewer people or another feature, or add a new room.')); return; }
  rooms.forEach((room, index) => {
    const free = search.start < search.end && isAvailable(state.bookings, room.id, search.date, search.start, search.end);
    const card = el('article', 'room-card');
    const visual = el('div', `room-visual tone-${index % 4}`); visual.append(el('span', 'room-number', `ROOM / ${String(index + 1).padStart(2, '0')}`), el('span', 'room-symbol', '✳'));
    const body = el('div', 'room-body'); body.append(el('span', `room-status${free ? '' : ' busy'}`, free ? 'Available for your time' : 'Booked for your time'), el('h3', '', room.name), el('p', 'room-location', room.location));
    const features = el('div', 'room-features'); room.amenities.forEach(item => features.append(el('span', '', item))); body.append(features);
    const foot = el('div', 'room-footer'); foot.append(el('span', 'capacity', `♙  Up to ${room.capacity} people`)); const book = button(free ? 'Book this room →' : 'Unavailable', '', () => openBooking(room.id)); book.disabled = !free; foot.append(book); body.append(foot);
    const admin = el('div', 'room-admin'); admin.append(button('Edit room', '', () => openRoom(room.id)), button('Delete room', '', () => deleteRoom(room.id))); body.append(admin); card.append(visual, body); grid.append(card);
  });
}
function renderBookings() {
  const list = $('booking-list'); list.replaceChildren();
  const now = new Date();
  const bookings = state.bookings.filter(booking => bookingFilter === 'all' || new Date(`${booking.date}T${booking.end}:00`) >= now).sort((a, b) => `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`));
  $('booking-total').textContent = `${state.bookings.length} booking${state.bookings.length === 1 ? '' : 's'} total`;
  if (!bookings.length) { list.append(el('p', 'empty-state', bookingFilter === 'upcoming' ? 'No upcoming bookings yet. Pick a room above and make one.' : 'No bookings yet. Pick a room above and make one.')); return; }
  for (const booking of bookings) {
    const room = roomById(booking.roomId);
    const row = el('article', 'booking-row'); const datebox = el('div', 'booking-datebox'); const date = new Date(`${booking.date}T12:00:00`); datebox.append(el('strong', '', String(date.getDate())), el('span', '', date.toLocaleString('en', { month: 'short' })));
    const details = el('div', 'booking-details'); details.append(el('h3', '', booking.title), el('p', '', `${room?.name || 'Removed room'} · ${prettyDate(booking.date)} · ${booking.start}–${booking.end} · ${booking.people} ${booking.people === 1 ? 'person' : 'people'}`));
    const actions = el('div', 'booking-actions'); actions.append(button('Edit', '', () => openBooking(null, booking.id)), button('Cancel booking', '', () => deleteBooking(booking.id)));
    row.append(datebox, details, actions); list.append(row);
  }
}
function render() { renderRooms(); renderBookings(); }
function openBooking(roomId = null, bookingId = null) {
  editingBookingId = bookingId; const booking = bookingId ? bookingById(bookingId) : null;
  $('booking-form').reset(); $('booking-error').hidden = true;
  $('booking-dialog-title').textContent = booking ? 'Edit booking' : 'Book a room'; $('booking-save').textContent = booking ? 'Save changes' : 'Save booking';
  const roomSelect = $('booking-room'); roomSelect.replaceChildren(); state.rooms.forEach(room => roomSelect.add(new Option(`${room.name} · ${room.capacity} seats`, room.id)));
  roomSelect.value = booking?.roomId || roomId || state.rooms[0]?.id || '';
  $('booking-title').value = booking?.title || '';
  $('booking-date').value = booking?.date || search.date;
  $('booking-people').value = booking?.people || 1;
  $('booking-start').value = booking?.start || search.start;
  $('booking-end').value = booking?.end || search.end;
  $('booking-dialog').showModal(); $('booking-title').focus();
}
function closeBooking() { $('booking-dialog').close(); editingBookingId = null; }
function saveBooking(event) {
  event.preventDefault();
  const candidate = { roomId: $('booking-room').value, title: $('booking-title').value.trim(), date: $('booking-date').value, people: Number($('booking-people').value), start: $('booking-start').value, end: $('booking-end').value };
  const error = bookingError(candidate, state.bookings, state.rooms, new Date(), editingBookingId);
  if (error) { $('booking-error').textContent = error; $('booking-error').hidden = false; return; }
  const wasEditing = Boolean(editingBookingId);
  if (wasEditing) Object.assign(bookingById(editingBookingId), candidate);
  else state.bookings.push({ id: makeId(), ...candidate, createdAt: Date.now() });
  save(); closeBooking(); render(); toast(wasEditing ? 'Booking updated.' : 'Room booked!'); $('bookings').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function deleteBooking(id) { const booking = bookingById(id); if (!booking || !confirm(`Cancel “${booking.title}”?`)) return; state.bookings = state.bookings.filter(item => item.id !== id); save(); render(); toast('Booking cancelled.'); }

function openRoom(id = null) {
  editingRoomId = id; const room = id ? roomById(id) : null;
  $('room-form').reset(); $('room-error').hidden = true;
  $('room-dialog-title').textContent = room ? 'Edit room' : 'Add a room'; $('room-save').textContent = room ? 'Save changes' : 'Save room';
  $('room-name').value = room?.name || ''; $('room-location').value = room?.location || ''; $('room-capacity').value = room?.capacity || 4;
  document.querySelectorAll('input[name="amenity"]').forEach(input => input.checked = Boolean(room?.amenities.includes(input.value)));
  $('room-dialog').showModal(); $('room-name').focus();
}
function closeRoom() { $('room-dialog').close(); editingRoomId = null; }
function saveRoom(event) {
  event.preventDefault();
  const name = $('room-name').value.trim(), location = $('room-location').value.trim(), capacity = Number($('room-capacity').value);
  const error = !name ? 'Add a room name.' : !location ? 'Add a location.' : !Number.isInteger(capacity) || capacity < 1 || capacity > 30 ? 'Capacity must be between 1 and 30.' : state.rooms.some(room => room.id !== editingRoomId && room.name.toLowerCase() === name.toLowerCase()) ? 'A room with that name already exists.' : null;
  if (error) { $('room-error').textContent = error; $('room-error').hidden = false; return; }
  const candidate = { name, location, capacity, amenities: [...document.querySelectorAll('input[name="amenity"]:checked')].map(input => input.value) };
  const wasEditing = Boolean(editingRoomId);
  if (wasEditing) Object.assign(roomById(editingRoomId), candidate);
  else state.rooms.push({ id: makeId(), ...candidate });
  save(); closeRoom(); render(); toast(wasEditing ? 'Room updated.' : 'Room added.');
}
function deleteRoom(id) {
  const room = roomById(id); if (!room) return;
  const count = state.bookings.filter(booking => booking.roomId === id).length;
  if (!confirm(`Delete “${room.name}”${count ? ` and its ${count} booking${count === 1 ? '' : 's'}` : ''}?`)) return;
  state.rooms = state.rooms.filter(item => item.id !== id); state.bookings = state.bookings.filter(item => item.roomId !== id); save(); render(); toast('Room deleted.');
}

fillTimes($('search-start'), search.start); fillTimes($('search-end'), search.end); fillTimes($('booking-start'), search.start); fillTimes($('booking-end'), search.end);
$('search-date').value = search.date; $('search-capacity').value = String(search.capacity);
$('search-button').addEventListener('click', () => {
  const start = $('search-start').value, end = $('search-end').value;
  if (!($('search-date').value && start < end)) { toast('Choose a date and an end time after the start time.'); return; }
  search = { ...search, date: $('search-date').value, start, end, capacity: Number($('search-capacity').value) }; renderRooms();
});
document.querySelectorAll('.filter').forEach(item => item.addEventListener('click', () => { search.amenity = item.dataset.amenity; document.querySelectorAll('.filter').forEach(button => button.classList.toggle('active', button === item)); renderRooms(); }));
document.querySelectorAll('.tab').forEach(item => item.addEventListener('click', () => { bookingFilter = item.dataset.bookingFilter; document.querySelectorAll('.tab').forEach(button => button.classList.toggle('active', button === item)); renderBookings(); }));
document.querySelectorAll('[data-close]').forEach(item => item.addEventListener('click', () => { const id = item.dataset.close; if (id === 'booking-dialog') closeBooking(); else closeRoom(); }));
$('booking-form').addEventListener('submit', saveBooking); $('room-form').addEventListener('submit', saveRoom); $('add-room').addEventListener('click', () => openRoom());
render();
