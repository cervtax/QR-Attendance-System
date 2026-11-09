/* EScanBai — dashboard.js: header, QRBai (create QR ID), ScanBai (Time In / Time Out), attendance log */
(function () {
    'use strict';
    var E = window.EScan, $ = E.$, K = E.K, me = E.session();
    if (!me) return;

    var MAX_LOG = 500, scanType = 'IN', stream = null, scanning = false, lastText = '', lastAt = 0;
    var fields = ['fullName', 'studentNo', 'course', 'yearLevel', 'section', 'events'];
    var cam = $('cam'), vf = $('viewfinder'), snap = $('snap'), toggle = $('cam-toggle');
    var ctx = snap.getContext('2d', { willReadFrequently: true });

    $('user-name').textContent = me.name;
    $('user-avatar').textContent = (me.name || '?').charAt(0).toUpperCase();
    $('logout-btn').addEventListener('click', function () {
        stopCam();
        try { localStorage.removeItem(K.session); } catch (err) { /* ignore */ }
        location.href = 'login.html';
    });

    var modes = document.querySelectorAll('.mode'), panels = document.querySelectorAll('.panel');
    modes.forEach(function (m) {
        m.addEventListener('click', function () {
            var target = m.getAttribute('data-panel');
            modes.forEach(function (x) {
                var on = x === m;
                x.classList.toggle('active', on);
                x.setAttribute('aria-selected', on);
            });
            panels.forEach(function (p) { p.hidden = p.id !== target; });
            if (target !== 'panel-scan') stopCam();
        });
    });

    function clean(v) { return String(v || '').replace(/\|/g, '/').trim(); }
    function getProfile() { return E.read(K.profiles, {})[me.email] || null; }
    function payload(p) { return ['EScanBai', p.studentNo, p.fullName, p.course, p.yearLevel, p.section, p.events].join('|'); }

    function showForm(p) {
        var v = p || { fullName: me.name };
        fields.forEach(function (f) { $(f).value = v[f] || ''; });
        $('qr-result').hidden = true;
        $('qr-form-card').hidden = false;
    }

    function showQR(p) {
        if (!window.QRCode) { E.toast('QR library failed to load. Check your internet connection.', 'error'); return; }
        var box = $('qr-canvas');
        box.innerHTML = '';
        new QRCode(box, { text: payload(p), width: 220, height: 220, colorDark: '#0B0F19', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
        $('qr-name').textContent = p.fullName;
        $('qr-meta').textContent = [p.studentNo, p.course, p.yearLevel, p.section].filter(Boolean).join(' · ');
        $('qr-event').textContent = p.events ? 'Event: ' + p.events : '';
        $('qr-form-card').hidden = true;
        $('qr-result').hidden = false;
    }

    $('profile-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var p = {};
        fields.forEach(function (f) { p[f] = clean($(f).value); });
        var all = E.read(K.profiles, {});
        all[me.email] = p;
        if (!E.write(K.profiles, all)) { E.toast('Could not save. Please allow local storage.', 'error'); return; }
        showQR(p);
        E.toast('QR ID generated.', 'success');
    });

    $('qr-edit').addEventListener('click', function () { showForm(getProfile()); });

    $('qr-download').addEventListener('click', function () {
        var src = $('qr-canvas').querySelector('canvas'), p = getProfile();
        if (!src || !p) return;
        var pad = 24, c = document.createElement('canvas');
        c.width = c.height = src.width + pad * 2;
        var x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, pad, pad);
        var a = document.createElement('a');
        a.href = c.toDataURL('image/png');
        a.download = 'EScanBai-' + (p.studentNo || 'QR') + '.png';
        a.click();
    });

    document.querySelectorAll('.seg-btn').forEach(function (b) {
        b.addEventListener('click', function () {
            scanType = b.getAttribute('data-type');
            document.querySelectorAll('.seg-btn').forEach(function (x) { x.classList.toggle('active', x === b); });
        });
    });

    function fmtTime(d) { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    function fmtDate(d) { return new Date(d).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }); }

    function startCam() {
        if (!window.jsQR) { E.toast('Scanner library failed to load. Check your internet connection.', 'error'); return; }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { E.toast('Camera needs HTTPS (or localhost) and a supported browser.', 'error'); return; }
        navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }).then(function (s) {
            stream = s; cam.srcObject = s;
            cam.play().catch(function () { /* autoplay handled by playsinline */ });
            vf.classList.add('live');
            toggle.textContent = 'Stop Scanner';
            scanning = true;
            requestAnimationFrame(tick);
        }).catch(function () { E.toast('Camera is blocked or not available. Use "Scan from Image" instead.', 'error'); });
    }

    function stopCam() {
        scanning = false;
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        stream = null; cam.srcObject = null;
        vf.classList.remove('live');
        toggle.textContent = 'Start Scanner';
    }

    function tick() {
        if (!scanning) return;
        if (cam.readyState >= 2 && cam.videoWidth) {
            var sc = Math.min(1, 640 / cam.videoWidth);
            snap.width = Math.round(cam.videoWidth * sc);
            snap.height = Math.round(cam.videoHeight * sc);
            ctx.drawImage(cam, 0, 0, snap.width, snap.height);
            var code = jsQR(ctx.getImageData(0, 0, snap.width, snap.height).data, snap.width, snap.height, { inversionAttempts: 'dontInvert' });
            if (code && code.data) handle(code.data);
        }
        requestAnimationFrame(tick);
    }

    toggle.addEventListener('click', function () { if (scanning) stopCam(); else startCam(); });

    $('img-input').addEventListener('change', function (e) {
        var file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        if (!window.jsQR) { E.toast('Scanner library failed to load. Check your internet connection.', 'error'); return; }
        var img = new Image();
        img.onload = function () {
            var sc = Math.min(1, 1000 / Math.max(img.width, img.height));
            snap.width = Math.round(img.width * sc); snap.height = Math.round(img.height * sc);
            ctx.drawImage(img, 0, 0, snap.width, snap.height);
            var code = jsQR(ctx.getImageData(0, 0, snap.width, snap.height).data, snap.width, snap.height);
            URL.revokeObjectURL(img.src);
            if (code && code.data) { lastText = ''; handle(code.data); }
            else E.toast('No QR code found in that image.', 'error');
        };
        img.src = URL.createObjectURL(file);
    });

    function handle(text) {
        var now = Date.now();
        if (text === lastText && now - lastAt < 3000) return;   // ignore the same code re-read within 3s
        lastText = text; lastAt = now;

        var parts = text.replace(/^\uFEFF/, '').split('|');
        if (parts[0] !== 'EScanBai' || parts.length < 7) { showResult(null, 'warn', 'Not a valid EScanBai QR code.'); return; }
        var s = { id: parts[1], name: parts[2], course: parts[3], year: parts[4], section: parts[5], event: parts.slice(6).join('|') };

        var log = E.read(K.log, []), today = new Date().toDateString();
        var mine = log.filter(function (r) { return r.id === s.id && r.event === s.event && new Date(r.ts).toDateString() === today; });
        var last = mine[mine.length - 1];

        if (scanType === 'IN' && last && last.type === 'IN') { showResult(s, 'warn', 'Already timed in at ' + fmtTime(last.ts) + '.'); return; }
        if (scanType === 'OUT' && !last) { showResult(s, 'warn', 'No Time In found for today.'); return; }
        if (scanType === 'OUT' && last.type === 'OUT') { showResult(s, 'warn', 'Already timed out at ' + fmtTime(last.ts) + '.'); return; }

        var rec = { id: s.id, name: s.name, course: s.course, year: s.year, section: s.section, event: s.event, type: scanType, ts: new Date().toISOString() };
        log.push(rec);
        if (!E.write(K.log, log.slice(-MAX_LOG))) { showResult(s, 'warn', 'Could not save. Please allow local storage.'); return; }

        showResult(s, '', (scanType === 'IN' ? 'Time In' : 'Time Out') + ' recorded.', rec);
        renderLog();
        if (navigator.vibrate) navigator.vibrate(120);
    }


    function showResult(s, cls, msg, rec) {
        var box = $('scan-result'), badge = $('r-type'), when = (rec && rec.ts) || new Date();
        box.hidden = false;
        box.className = 'result' + (cls ? ' ' + cls : '');
        $('r-name').textContent = s ? s.name : 'Unrecognized code';
        $('r-id').textContent = s ? s.id : '-';
        $('r-course').textContent = s ? ([s.course, s.year, s.section].filter(Boolean).join(' · ') || '-') : '-';
        $('r-event').textContent = (s && s.event) || '-';
        $('r-time').textContent = fmtDate(when) + ' · ' + fmtTime(when);
        $('r-status').textContent = msg;
        badge.textContent = scanType === 'IN' ? 'TIME IN' : 'TIME OUT';
        badge.className = 'badge ' + scanType.toLowerCase();
        box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';   // replay entrance
        E.toast(msg, cls ? 'error' : 'success');
    }

    function cell(tr, text, sub) {
        var td = document.createElement('td');
        td.textContent = text;
        if (sub) { var sm = document.createElement('small'); sm.textContent = sub; td.appendChild(sm); }
        tr.appendChild(td);
    }

    function renderLog() {
        var body = $('log-body'), log = E.read(K.log, []);
        body.innerHTML = '';
        $('log-count').textContent = log.length + (log.length === 1 ? ' record' : ' records');
        $('log-clear').disabled = !log.length;

        if (!log.length) {
            var tr = document.createElement('tr'), td = document.createElement('td');
            tr.className = 'empty'; td.colSpan = 4;
            td.textContent = 'No scans yet. Open ScanBai to record Time In and Time Out.';
            tr.appendChild(td); body.appendChild(tr);
            return;
        }
        log.slice(-100).reverse().forEach(function (r) {
            var row = document.createElement('tr'), t = document.createElement('td'), b = document.createElement('span');
            cell(row, r.name, r.id);
            cell(row, r.event || '-');
            b.className = 'badge ' + (r.type === 'IN' ? 'in' : 'out');
            b.textContent = r.type === 'IN' ? 'IN' : 'OUT';
            t.appendChild(b); row.appendChild(t);
            cell(row, fmtTime(r.ts), fmtDate(r.ts));
            body.appendChild(row);
        });
    }

    $('log-clear').addEventListener('click', function () {
        if (!window.confirm('Clear all attendance records? This cannot be undone.')) return;
        try { localStorage.removeItem(K.log); } catch (err) { /* ignore */ }
        renderLog();
    });

    var saved = getProfile();
    if (saved) showQR(saved); else showForm(null);
    renderLog();
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopCam(); });
})();
