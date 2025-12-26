// src/utils/dateHelpers.js

// 1. Convert ANY date input (Text "25/12/2025" or ISO "2025-12-25T...") into a valid JS Date Object
export const safeDate = (dateInput) => {
  if (!dateInput) return new Date();

  // If it's already a Date object
  if (dateInput instanceof Date) return dateInput;

  // If it's an ISO string (contains 'T' or '-') -> Standard JS parsing
  if (typeof dateInput === 'string' && (dateInput.includes('T') || dateInput.includes('-'))) {
    return new Date(dateInput);
  }

  // If it's legacy text format "DD/MM/YYYY" (from your old code)
  if (typeof dateInput === 'string' && dateInput.includes('/')) {
    const parts = dateInput.split('/');
    // Month is 0-indexed in JS (0=Jan), so we do parts[1] - 1
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

// 4. Helper to check if a date matches "Today" (regardless of format)
export const isToday = (dateInput) => {
    const d = safeDate(dateInput);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
};