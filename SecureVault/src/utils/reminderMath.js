/**
 * Returns the number of days in a given month and year.
 */
const getDaysInMonth = (month, year) => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Calculates the next valid occurrence for a reminder, focusing on edge cases
 * like the 31st of the month and multi-month yearly repeats.
 */
export const calculateNextOccurrence = (baseDate, recurrence, days = [], months = [], originalDay = null) => {
  if (!baseDate) return null;
  
  const now = new Date();
  const start = new Date(baseDate);
  const targetDay = originalDay || start.getDate();
  const targetHour = start.getHours();
  const targetMinute = start.getMinutes();
  
  let next = new Date(start);

  // Helper to apply target time and handle month overflow
  const applyTargetDateTime = (date, m, y) => {
    const dLimit = getDaysInMonth(m, y);
    const d = Math.min(targetDay, dLimit);
    date.setFullYear(y);
    date.setMonth(m);
    date.setDate(d);
    date.setHours(targetHour, targetMinute, 0, 0);
  };

  // 1. Initial Logic: If the time is in the past, move forward
  if (next <= now) {
    if (recurrence === 'daily') {
      next.setDate(next.getDate() + 1);
    } 
    else if (recurrence === 'weekly' && days.length > 0) {
      // Find next selected day in the 7-day window
      let currentDay = next.getDay() + 1; // 1-7 (Sun-Sat)
      for (let i = 1; i <= 7; i++) {
        let checkDay = ((currentDay + i - 1) % 7) + 1;
        if (days.includes(checkDay)) {
          next.setDate(next.getDate() + i);
          break;
        }
      }
    } 
    else if (recurrence === 'monthly') {
      // Move to next month and clamp to max days
      let m = next.getMonth() + 1;
      let y = next.getFullYear();
      if (m > 11) { m = 0; y++; }
      applyTargetDateTime(next, m, y);
      
      // If still in the past (e.g., date was 31st, next is 28th but 28th is earlier 
      // today than 'now'), move one more month
      if (next <= now) {
        m++;
        if (m > 11) { m = 0; y++; }
        applyTargetDateTime(next, m, y);
      }
    } 
    else if (recurrence === 'yearly') {
      if (months.length > 0) {
        let currentMonth = next.getMonth();
        let currentYear = next.getFullYear();
        let found = false;
        
        // Search through the next 24 months to find the next valid month in the list
        for (let i = 1; i <= 24; i++) {
          let m = (currentMonth + i) % 12;
          let y = currentYear + Math.floor((currentMonth + i) / 12);
          
          if (months.includes(m)) {
            applyTargetDateTime(next, m, y);
            if (next > now) {
              found = true;
              break;
            }
          }
        }
        if (!found) next.setFullYear(next.getFullYear() + 1);
      } else {
        next.setFullYear(next.getFullYear() + 1);
      }
    }
  }

  return next;
};
