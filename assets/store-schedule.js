(function () {
    'use strict';

    var TZ = 'America/New_York';
    var DAY_SCHEDULE = {
        0: [[12 * 60, 18 * 60]],
        1: [],
        2: [],
        3: [[12 * 60, 20 * 60]],
        4: [[12 * 60, 20 * 60]],
        5: [[12 * 60, 20 * 60]],
        6: [[10 * 60, 20 * 60]],
    };
    var CLOSED_DATE_OVERRIDES = {
        '2026-04-25': {
            event: 'Dominion Toy Con',
        },
        '2026-06-13': {
            event: 'Maryland Toy Expo',
        },
        '2026-06-14': {
            event: 'Maryland Trading Card Expo',
        },
        '2026-11-07': {
            event: 'Maryland Toy Expo',
        },
        '2026-11-08': {
            event: 'Maryland Trading Card Expo',
        },
    };

    /** Default open window when `ranges` is omitted on an override date (noon–8pm Eastern). */
    var OPEN_OVERRIDE_DEFAULT_RANGES = [[12 * 60, 20 * 60]];
    /**
     * Eastern YYYY-MM-DD when usual weekly hours do not apply.
     * { description?: string, ranges?: [[openMin, closeMin], ...] }
     *
     * You can list many future dates here ahead of time. The home hours table and Visit
     * teaser only mention an entry when its date is the next occurrence of that weekday
     * on or after today Eastern (see overrideForUpcomingCalendarWeekday); after that
     * date passes, the UI moves on to the following week automatically. Open/closed logic
     * below still consults this map for any calendar day.
     */
    var OPEN_DATE_OVERRIDES = {
        '2026-05-04': {
            description: 'Star Wars Day',
        },
    };

    var WEEKDAY_TO_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

    function easternParts(date) {
        var dtf = new Intl.DateTimeFormat('en-US', {
            timeZone: TZ,
            weekday: 'short',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false,
        });
        var parts = dtf.formatToParts(date);
        var get = function (type) {
            for (var i = 0; i < parts.length; i++) {
                if (parts[i].type === type) return parts[i].value;
            }
        };
        var weekday = get('weekday');
        var hour = parseInt(get('hour'), 10);
        var minute = parseInt(get('minute'), 10);
        if (isNaN(hour)) hour = 0;
        if (isNaN(minute)) minute = 0;
        if (hour === 24) hour = 0;
        var day = WEEKDAY_TO_INDEX[weekday];
        var minutes = hour * 60 + minute;
        return { day: day, minutes: minutes };
    }

    function easternDateKey(date) {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: TZ,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(date);
    }

    function dateUtcNoonApproxForKey(isoDateKey) {
        var bits = isoDateKey.split('-').map(Number);
        return new Date(Date.UTC(bits[0], bits[1] - 1, bits[2], 17, 0, 0));
    }

    function advanceCalendarKey(isoKey, deltaDays) {
        var bits = isoKey.split('-').map(Number);
        var ref = new Date(Date.UTC(bits[0], bits[1] - 1, bits[2] + deltaDays, 17, 0, 0));
        return easternDateKey(ref);
    }

    function weekdayIndexForCalendarKey(isoDateKey) {
        return easternParts(dateUtcNoonApproxForKey(isoDateKey)).day;
    }

    /** Soonest eastern calendar date on or after easternStartKey whose weekday equals weekdayIdx. */
    function nextCalendarKeyWeekdayOnOrAfter(easternStartKey, weekdayIdx) {
        if (weekdayIdx === undefined) return null;
        for (var i = 0; i <= 370; i++) {
            var k = advanceCalendarKey(easternStartKey, i);
            if (weekdayIndexForCalendarKey(k) === weekdayIdx) return k;
        }
        return null;
    }

    function openDateOverride(date) {
        var entry = OPEN_DATE_OVERRIDES[easternDateKey(date)];
        if (!entry) return null;
        var rawRanges = entry.ranges;
        var ranges =
            Array.isArray(rawRanges) && rawRanges.length ? rawRanges : OPEN_OVERRIDE_DEFAULT_RANGES;
        var desc = entry.description;
        return {
            ranges: ranges,
            description: typeof desc === 'string' ? desc.trim() : '',
        };
    }

    function overrideForUpcomingCalendarWeekday(now, weekdayIdx) {
        var startKey = easternDateKey(now);
        var nk = nextCalendarKeyWeekdayOnOrAfter(startKey, weekdayIdx);
        if (!nk || !OPEN_DATE_OVERRIDES[nk]) return null;
        if (CLOSED_DATE_OVERRIDES[nk]) return null;
        var ov = openDateOverride(dateUtcNoonApproxForKey(nk));
        if (!ov) return null;
        return { calendarKey: nk, ranges: ov.ranges, description: ov.description };
    }

    function formatScheduleMinutes12h(totalMin) {
        var h = Math.floor(totalMin / 60);
        var m = totalMin % 60;
        var h12 = h % 12;
        if (h12 === 0) h12 = 12;
        var period = h >= 12 ? 'pm' : 'am';
        if (m === 0) return h12 + period;
        var mm = m < 10 ? '0' + m : String(m);
        return h12 + ':' + mm + period;
    }

    function formatRangesLabel(ranges) {
        var parts = [];
        for (var r = 0; r < ranges.length; r++) {
            parts.push(
                formatScheduleMinutes12h(ranges[r][0]) + '–' + formatScheduleMinutes12h(ranges[r][1])
            );
        }
        return parts.join(', ');
    }

    function formatCalendarShort(isoDateKey) {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: TZ,
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        }).format(dateUtcNoonApproxForKey(isoDateKey));
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;')
            .replace(/\n/g, ' ');
    }

    function buildHoursNoteMarkup(info) {
        var descSuffix = info.description ? ' (' + escapeHtml(info.description) + ')' : '';
        return (
            '<br /><strong>' +
            escapeHtml(formatCalendarShort(info.calendarKey)) +
            ':</strong> ' +
            escapeHtml(formatRangesLabel(info.ranges)) +
            descSuffix
        );
    }

    function currentRangeEndMinutes(ep, ranges) {
        for (var r = 0; r < ranges.length; r++) {
            if (ep.minutes >= ranges[r][0] && ep.minutes < ranges[r][1]) return ranges[r][1];
        }
        return null;
    }

    function isOpen(date) {
        var ep = easternParts(date);
        if (ep.day === undefined) return false;
        var key = easternDateKey(date);
        if (CLOSED_DATE_OVERRIDES[key]) return false;
        var openOv = openDateOverride(date);
        var ranges = openOv ? openOv.ranges : DAY_SCHEDULE[ep.day] || [];
        for (var r = 0; r < ranges.length; r++) {
            if (ep.minutes >= ranges[r][0] && ep.minutes < ranges[r][1]) return true;
        }
        return false;
    }

    function closureOverride(date) {
        return CLOSED_DATE_OVERRIDES[easternDateKey(date)] || null;
    }

    function formatEasternTimeOnDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: TZ,
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
        }).format(date);
    }

    function formatNextOpenLine(from) {
        var todayKey = easternDateKey(from);
        var max = 7 * 24 * 60;
        for (var i = 1; i <= max; i++) {
            var probe = new Date(from.getTime() + i * 60 * 1000);
            if (!isOpen(probe)) continue;
            var dayKey = easternDateKey(probe);
            var timeStr = formatEasternTimeOnDate(probe);
            if (dayKey === todayKey) return 'Next open · ' + timeStr + ' today';
            var dayStr = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(
                probe
            );
            return 'Next open · ' + dayStr + ' ' + timeStr;
        }
        return '';
    }

    function updateStoreStatus() {
        var el = document.getElementById('store-status');
        var mainEl = document.getElementById('store-status-main');
        var hintEl = document.getElementById('store-status-hint');
        if (!el || !mainEl || !hintEl) return;

        var now = new Date();
        var open = isOpen(now);
        el.setAttribute('data-open', open ? 'true' : 'false');

        if (open) {
            mainEl.textContent = 'Open now';
            var openOv = openDateOverride(now);
            if (openOv && openOv.description) {
                var epOpen = easternParts(now);
                var until = currentRangeEndMinutes(epOpen, openOv.ranges);
                hintEl.textContent =
                    until != null
                        ? openOv.description + ' · Open until ' + formatScheduleMinutes12h(until)
                        : openOv.description;
            } else {
                hintEl.textContent = '';
            }
        } else {
            mainEl.textContent = 'Closed';
            var override = closureOverride(now);
            if (override && override.event) {
                hintEl.textContent = 'Closed for ' + override.event + ' today';
            } else {
                var openOvClosed = openDateOverride(now);
                var epClosed = easternParts(now);
                if (openOvClosed && openOvClosed.ranges.length) {
                    var ro = openOvClosed.ranges;
                    var beforeFirst = epClosed.minutes < ro[0][0];
                    if (beforeFirst) {
                        var line = 'Opens at ' + formatScheduleMinutes12h(ro[0][0]);
                        if (openOvClosed.description) line += ' — ' + openOvClosed.description;
                        hintEl.textContent = line;
                    } else {
                        hintEl.textContent = formatNextOpenLine(now) || 'See store hours below';
                    }
                } else {
                    hintEl.textContent = formatNextOpenLine(now) || 'See store hours below';
                }
            }
        }

        var label = mainEl.textContent + '. ';
        if (hintEl.textContent) label += hintEl.textContent + '. ';
        label += 'Hours use US Eastern time, Edgewater, Maryland.';
        el.setAttribute('aria-label', label);
    }

    function setNoteEl(id, innerHtml) {
        var span = document.getElementById(id);
        if (!span) return;
        if (!innerHtml) {
            span.innerHTML = '';
            span.hidden = true;
            return;
        }
        span.innerHTML = innerHtml;
        span.hidden = false;
    }

    function updateHoursTableOverrides() {
        var now = new Date();
        for (var wd = 0; wd <= 6; wd++) {
            setNoteEl('hours-note-wd-' + wd, '');
        }
        setNoteEl('hours-note-wd-345', '');

        for (var w = 0; w <= 6; w++) {
            var info = overrideForUpcomingCalendarWeekday(now, w);
            var elId = 'hours-note-wd-' + w;
            if (document.getElementById(elId)) {
                setNoteEl(elId, info ? buildHoursNoteMarkup(info) : '');
            }
        }

        var chunk = [];
        for (var j = 3; j <= 5; j++) {
            var inf = overrideForUpcomingCalendarWeekday(now, j);
            if (inf) chunk.push(buildHoursNoteMarkup(inf));
        }
        setNoteEl('hours-note-wd-345', chunk.join(''));
    }

    function updateVisitHoursTeaser() {
        var visitEl = document.getElementById('visit-hours-teaser');
        if (!visitEl) return;
        var prefix =
            '<a href="/#store-hours">Store hours</a> on the home page — regular weekly schedule as listed there.';
        var now = new Date();
        var lines = [];
        for (var wd = 0; wd <= 6; wd++) {
            var info = overrideForUpcomingCalendarWeekday(now, wd);
            if (!info) continue;
            var desc = info.description ? ' (' + escapeHtml(info.description) + ')' : '';
            lines.push(
                '<strong>' +
                    escapeHtml(formatCalendarShort(info.calendarKey)) +
                    ':</strong> open ' +
                    escapeHtml(formatRangesLabel(info.ranges)) +
                    desc +
                    '.'
            );
        }
        if (!lines.length) {
            visitEl.innerHTML = prefix + '.';
            return;
        }
        visitEl.innerHTML = prefix + ' Upcoming exceptions: ' + lines.join(' ');
    }

    function refreshScheduleUi() {
        updateStoreStatus();
        updateHoursTableOverrides();
        updateVisitHoursTeaser();
    }

    function bootstrap() {
        updateHoursTableOverrides();
        updateVisitHoursTeaser();
        if (document.getElementById('store-status')) {
            updateStoreStatus();
            setInterval(refreshScheduleUi, 60 * 1000);
            document.addEventListener('visibilitychange', function () {
                if (!document.hidden) refreshScheduleUi();
            });
        } else {
            setInterval(function () {
                updateHoursTableOverrides();
                updateVisitHoursTeaser();
            }, 60 * 1000);
            document.addEventListener('visibilitychange', function () {
                if (!document.hidden) {
                    updateHoursTableOverrides();
                    updateVisitHoursTeaser();
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})();
