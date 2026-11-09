/* EScanBai — common.js: storage helpers, toast, session guard (loaded on every page) */
(function (w) {
    'use strict';

    var K = { users: 'escanbai.users', session: 'escanbai.session', profiles: 'escanbai.profiles', log: 'escanbai.log' };

    function $(id) { return document.getElementById(id); }

    function read(key, fallback) {
        try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
        catch (err) { return fallback; }
    }
    function write(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch (err) { return false; }
    }

    function toast(message, type) {
        var root = $('toast-root');
        if (!root) return;
        var el = document.createElement('div');
        el.className = 'toast ' + (type || '');
        el.textContent = message;
        root.appendChild(el);
        setTimeout(function () {
            el.classList.add('out');
            setTimeout(function () { el.remove(); }, 300);
        }, 3000);
    }

    function session() { return read(K.session, null); }

    w.EScan = { K: K, $: $, read: read, write: write, toast: toast, session: session };

    // Page guard: send people to the right page based on sign-in state
    var page = document.body.getAttribute('data-page');
    var user = session();
    if (page === 'index') location.replace(user ? 'dashboard.html' : 'login.html');
    else if (page === 'dashboard' && !user) location.replace('login.html');
    else if (page === 'login' && user) location.replace('dashboard.html');
})(window);
