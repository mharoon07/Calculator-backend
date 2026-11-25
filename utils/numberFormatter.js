/**
 * Smart number formatting utility
 * - Shows up to 3 decimal places for normal numbers
 * - Switches to scientific notation only when 4+ zeros after decimal
 * - For very large numbers (>= 1,000,000): uses scientific notation
 * 
 * @param {number} value - The number to format
 * @returns {number} - Formatted number (keeps as number for calculations)
 */
export const formatNumber = (value) => {
    if (value === 0 || !isFinite(value)) {
        return 0;
    }

    const absValue = Math.abs(value);

    // For very small numbers (less than 0.0001, which means 4+ zeros after decimal)
    // Use scientific notation
    if (absValue < 0.0001 && absValue > 0) {
        // Use exponential notation for very small numbers
        // Round to 2 significant figures
        return Number(value.toPrecision(2));
    }

    // For very large numbers (>= 1 million), use exponential
    if (absValue >= 1000000) {
        return Number(value.toPrecision(6));
    }

    // For normal range (0.0001 to 999,999), show up to 3 decimal places
    // This will show: 0.001, 0.010, 0.100, 1.000, etc.
    return Number(value.toFixed(3));
};

/**
 * Format number for display (returns string with proper formatting)
 * This is useful for frontend display
 */
export const formatNumberForDisplay = (value) => {
    if (value === 0 || !isFinite(value)) {
        return '0';
    }

    const absValue = Math.abs(value);

    // For very small numbers (4+ zeros after decimal)
    if (absValue < 0.0001 && absValue > 0) {
        return value.toExponential(2);
    }

    // For very large numbers
    if (absValue >= 1000000) {
        return value.toExponential(2);
    }

    // For normal range, show up to 3 decimal places
    return value.toFixed(3);
};
