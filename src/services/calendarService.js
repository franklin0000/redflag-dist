
/**
 * Calendar Service
 * Generates ICS files and Google Calendar links for Safe Dates.
 */

export const calendarService = {
    /**
     * Generate a Google Calendar Link
     * @param {Object} event 
     * @param {string} event.title
     * @param {string} event.location
     * @param {string} event.description
     * @param {Date} event.startTime
     * @param {Date} event.endTime
     */
    addToGoogleCalendar: (event) => {
        const start = formatGoogleDate(event.startTime);
        const end = formatGoogleDate(event.endTime);
        const details = encodeURIComponent(event.description || '');
        const location = encodeURIComponent(event.location || '');
        const title = encodeURIComponent(event.title || 'Safe Date');

        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
    },

    /**
     * Generate and download an ICS file
     * @param {Object} event (same structure as above)
     */
    downloadICS: (event) => {
        const start = formatICSDate(event.startTime);
        const end = formatICSDate(event.endTime);
        const now = formatICSDate(new Date());

        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//RedFlag App//Safe Date//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', 'safe_date.ics');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// Helper: Format date for Google Calendar (YYYYMMDDTHHmmSSZ)
function formatGoogleDate(date) {
    return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
}

// Helper: Format date for ICS (YYYYMMDDTHHmmSSZ)
function formatICSDate(date) {
    // Basic implementation, assumes UTC or handles local time conversion simply
    return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
}
