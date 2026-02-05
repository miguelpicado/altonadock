/**
 * Date Utilities - Universal date normalization for the app
 * Handles Firestore Timestamps, Date objects, strings, and edge cases
 */

/**
 * Normalize any date input to a valid Date object
 * Handles multiple formats safely
 * @param {*} fecha - Input date in any format
 * @returns {Date} A valid Date object
 */
export function normalizeDate(fecha) {
    // If null or undefined, return current date
    if (!fecha) {
        return new Date();
    }

    // If it's already a Date object
    if (fecha instanceof Date) {
        // Check if it's a valid date
        if (isNaN(fecha.getTime())) {
            console.warn('Invalid Date object provided, using current date');
            return new Date();
        }
        return fecha;
    }

    // If it's a Firestore Timestamp (has toDate method)
    if (fecha && typeof fecha.toDate === 'function') {
        try {
            return fecha.toDate();
        } catch (error) {
            console.error('Error converting Firestore Timestamp:', error);
            return new Date();
        }
    }

    // If it's a Firestore Timestamp-like object with seconds
    if (fecha && typeof fecha.seconds === 'number') {
        try {
            return new Date(fecha.seconds * 1000);
        } catch (error) {
            console.error('Error converting timestamp object:', error);
            return new Date();
        }
    }

    // If it's a string, try to parse it
    if (typeof fecha === 'string') {
        const parsed = new Date(fecha);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
        console.warn('Could not parse date string:', fecha);
        return new Date();
    }

    // If it's a number (timestamp in milliseconds)
    if (typeof fecha === 'number') {
        const parsed = new Date(fecha);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
        console.warn('Invalid timestamp number:', fecha);
        return new Date();
    }

    // Fallback: return current date
    console.warn('Unknown date format, using current date:', fecha);
    return new Date();
}

/**
 * Check if a date is valid
 * @param {*} fecha - Input date
 * @returns {boolean} True if valid
 */
export function isValidDate(fecha) {
    const normalized = normalizeDate(fecha);
    return normalized instanceof Date && !isNaN(normalized.getTime());
}

/**
 * Safe comparison of two dates
 * @param {*} date1 - First date
 * @param {*} date2 - Second date
 * @returns {number} -1, 0, or 1
 */
export function compareDates(date1, date2) {
    const d1 = normalizeDate(date1);
    const d2 = normalizeDate(date2);
    return d1.getTime() - d2.getTime();
}

/**
 * Get date string in local format (DD/MM/YYYY)
 * @param {*} fecha - Input date
 * @returns {string} Formatted date
 */
export function formatDateLocal(fecha) {
    const date = normalizeDate(fecha);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Check if two dates are the same day
 * @param {*} date1 - First date
 * @param {*} date2 - Second date
 * @returns {boolean} True if same day
 */
export function isSameDay(date1, date2) {
    const d1 = normalizeDate(date1);
    const d2 = normalizeDate(date2);
    return d1.toDateString() === d2.toDateString();
}

/**
 * Check if a date is today
 * @param {*} fecha - Input date
 * @returns {boolean} True if today
 */
export function isToday(fecha) {
    return isSameDay(fecha, new Date());
}
