(function () {
    'use strict';

    var PROFILE_KEY = 'studentProfile';
    var LOG_KEY = 'attendanceLog';
    var USER_KEY = 'escanbaiUser';
    var ACCOUNTS_KEY = 'escanbaiAccounts';
    var MAX_LOG_ENTRIES = 100;

    var page = document.body.getAttribute('data-page');


    function $(id) { return document.getElementById(id); }

    function readJSON(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (err) {
            console.error('Could not read ' + key, err);
            return fallback;
        }
    }
    function writeJSON(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch (err) { console.error('Could not write ' + key, err); return false; }
    }

    if (page === 'index') {
        location.replace(readJSON(USER_KEY, null) ? 'dashboard.html' : 'login.html');
        return;
    }

    function setupNav() {
        var links = document.querySelectorAll('.app-nav a[data-nav]');
        if (!links.length) return;

        function highlight() {
            var onAttendance = location.hash === '#attendance-card';
            links.forEach(function (a) {
                var key = a.getAttribute('data-nav');
                var active =
                    (key === 'qr' && page === 'qr') ||
                    (key === 'attendance' && page === 'dashboard' && onAttendance) ||
                    (key === 'profile' && page === 'dashboard' && !onAttendance);
                a.classList.toggle('active', active);
            });
        }
        highlight();
        window.addEventListener('hashchange', highlight);

        var logout = $('logout-link');
        if (logout) {
            logout.addEventListener('click', function () {
                try { localStorage.removeItem(USER_KEY); } catch (err) { /* ignore */ }
            });
        }
    }

    function initLogin() {
        var tabs = document.querySelectorAll('.tab');
        var authForms = document.querySelectorAll('.auth-form');

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (t) { t.classList.remove('active'); });
                authForms.forEach(function (f) { f.hidden = true; });
                tab.classList.add('active');
                $(tab.getAttribute('data-target')).hidden = false;
            });
        });

        authForms.forEach(function (form) {
            form.addEventListener('submit', function (event) {
                event.preventDefault();

                var email = form.querySelector('input[type="email"]').value.trim();
                var nameInput = form.querySelector('input[type="text"]');
                var accounts = readJSON(ACCOUNTS_KEY, {});
                var key = email.toLowerCase();

                // Sign up saves the name; sign in looks it up, falling back to the email name
                var name = nameInput ? nameInput.value.trim() : (accounts[key] || email.split('@')[0]);
                if (nameInput) {
                    accounts[key] = name;
                    writeJSON(ACCOUNTS_KEY, accounts);
                }

                // Demo only: no real authentication; passwords are never stored.
                if (!writeJSON(USER_KEY, { email: email, name: name })) {
                    alert('Could not sign you in. Please allow local storage in your browser.');
                    return;
                }
                location.href = 'dashboard.html';
            });
        });
    }
    function renderGreeting() {
        // Stays empty until a user has logged in
        var user = readJSON(USER_KEY, null);
        var name = user ? (user.name || (user.email || '').split('@')[0]) : '';
        $('greeting-name').textContent = name || '';
    }

    function renderAttendanceLog() {
        var tbody = $('attendance-log');
        var log = readJSON(LOG_KEY, []);
        tbody.innerHTML = '';

        var total = Array.isArray(log) ? log.length : 0;
        $('history-count').textContent = total + (total === 1 ? ' record' : ' records');
        $('clear-history-btn').disabled = (total === 0);

        if (total === 0) {
            var emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-row';
            var emptyCell = document.createElement('td');
            emptyCell.colSpan = 4;
            emptyCell.textContent = 'No check-ins yet. Scan your QR ID to record attendance.';
            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);
            return;
        }

        log.slice().reverse().forEach(function (entry) {
            var row = document.createElement('tr');
            var d = document.createElement('td'); d.textContent = entry.date;
            var t = document.createElement('td'); t.textContent = entry.time;
            var ev = document.createElement('td'); ev.textContent = entry.event || '-';
            var s = document.createElement('td');
            var badge = document.createElement('span');
            badge.className = 'status-present';
            badge.textContent = entry.status;
            s.appendChild(badge);
            row.appendChild(d); row.appendChild(t); row.appendChild(ev); row.appendChild(s);
            tbody.appendChild(row);
        });
    }

    function initDashboard() {
        renderGreeting();
        renderAttendanceLog();

        var form = $('profile-form');
        var btn = $('profile-submit');

        window.addEventListener('pageshow', function () {
            form.reset();
            btn.textContent = 'Save & Generate QR Code';
            btn.disabled = false;
            renderGreeting();
            renderAttendanceLog();
        });

        form.addEventListener('submit', function (event) {
            event.preventDefault();

            var studentData = {
                name: $('fullName').value.trim(),
                studentNo: $('studentNo').value.trim(),
                course: $('course').value.trim(),
                yearLevel: $('yearLevel').value,
                section: $('section').value.trim(),
                events: $('events').value.trim()
            };

            if (!writeJSON(PROFILE_KEY, studentData)) {
                alert('Could not save your profile. Please allow local storage in your browser.');
                return;
            }

            btn.textContent = 'Generating QR ID...';
            btn.disabled = true;
            setTimeout(function () { location.href = 'qr-id.html'; }, 500);
        });

        $('clear-history-btn').addEventListener('click', function () {
            var log = readJSON(LOG_KEY, []);
            var total = Array.isArray(log) ? log.length : 0;
            if (total === 0) return;

            var ok = window.confirm('Clear all ' + total + ' attendance record' + (total === 1 ? '' : 's') + '? This cannot be undone.');
            if (!ok) return;

            try { localStorage.removeItem(LOG_KEY); }
            catch (err) { alert('Could not clear the history. Please allow local storage in your browser.'); return; }
            renderAttendanceLog();
        });
    }

    function renderQR() {
        var profile = readJSON(PROFILE_KEY, null);
        var img = $('live-qr');
        var scanBtn = $('scan-btn');

        if (!profile) {
            $('student-name-display').textContent = 'No profile yet';
            $('student-course-display').textContent = 'Fill out your details on the Profile page to get your QR ID.';
            $('student-event-display').textContent = '';
            $('qr-container').hidden = true;
            scanBtn.disabled = true;
            return;
        }

        $('qr-container').hidden = false;
        scanBtn.disabled = false;
        $('student-name-display').textContent = profile.name;
        $('student-course-display').textContent =
            [profile.course, profile.yearLevel, profile.section].filter(Boolean).join(' - ');
        $('student-event-display').textContent = profile.events ? 'Event: ' + profile.events : '';

        var qrString = encodeURIComponent(
            'ID:' + profile.studentNo + '|Name:' + profile.name + '|Year:' + (profile.yearLevel || '') +
            '|Sec:' + profile.section + '|Events:' + profile.events
        );
        img.alt = 'QR code for ' + profile.name;
        img.onerror = function () { img.alt = 'QR image failed to load. Check your internet connection.'; };
        img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + qrString + '&color=0B0F19&bgcolor=ffffff';
    }

    var feedbackTimer = null;
    function showScanFeedback(message, type) {
        var box = $('scan-feedback');
        box.textContent = message;
        box.className = 'scan-feedback ' + type;
        clearTimeout(feedbackTimer);
        feedbackTimer = setTimeout(function () {
            box.textContent = '';
            box.className = 'scan-feedback';
        }, 4000);
    }

    function initQR() {
        renderQR();

        $('scan-btn').addEventListener('click', function () {
            var profile = readJSON(PROFILE_KEY, null);
            if (!profile) {
                showScanFeedback('No QR ID found. Fill out your profile first.', 'error');
                return;
            }

            var now = new Date();
            var entry = {
                date: now.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
                time: now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                event: profile.events || '-',
                status: 'Present',
                timestamp: now.toISOString()
            };

            var log = readJSON(LOG_KEY, []);
            var updated = (Array.isArray(log) ? log : []).concat(entry).slice(-MAX_LOG_ENTRIES);

            if (!writeJSON(LOG_KEY, updated)) {
                showScanFeedback('Scan could not be saved. Check that local storage is enabled.', 'error');
                return;
            }
            showScanFeedback('Scanned successfully! Marked Present on ' + entry.date + ' at ' + entry.time + '.', 'success');
        });
    }

    setupNav();
    if (page === 'login') initLogin();
    if (page === 'dashboard') initDashboard();
    if (page === 'qr') initQR();
})();
