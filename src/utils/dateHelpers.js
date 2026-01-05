// src/utils/dateHelpers.js

// 1. Convert ANY date input into a valid JS Date Object
export const safeDate = (dateInput) => {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string' && (dateInput.includes('T') || dateInput.includes('-'))) {
    return new Date(dateInput);
  }
  if (typeof dateInput === 'string' && dateInput.includes('/')) {
    const parts = dateInput.split('/');
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  return new Date(dateInput);
};

// 2. Format for Display (e.g., "26/12/2025")
export const formatDateForDisplay = (dateInput) => {
  const date = safeDate(dateInput);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// 3. Format time for Display (e.g., "10:30 PM")
export const formatTimeForDisplay = (dateInput) => {
    const date = safeDate(dateInput);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
    });
};

// 4. Check if date is Today
export const isToday = (dateInput) => {
    const d = safeDate(dateInput);
    const today = new Date();
    return isSameDay(d, today);
};

// 5. NEW: Check if two dates are the same day
export const isSameDay = (date1, date2) => {
    const d1 = safeDate(date1);
    const d2 = safeDate(date2);
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
};

// 6. NEW: Get Last 7 Days array for the selector
export const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d);
    }
    return days;
};

// 7. NEW: Format Day Label (e.g., "Mon 25")
export const formatDayLabel = (date) => {
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
};