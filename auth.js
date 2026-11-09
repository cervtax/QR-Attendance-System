
(function () {
    'use strict';
    var E = window.EScan, $ = E.$, msg = $('auth-message');
    var tabs = document.querySelectorAll('.tab'), forms = document.querySelectorAll('.auth-form');

    function say(text) { msg.textContent = text || ''; }
    function hex(bytes) {
        return Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    }


    function hash(pw, salt) {
        var text = salt + pw;
        if (!(window.crypto && crypto.subtle)) return Promise.resolve('b64:' + btoa(unescape(encodeURIComponent(text))));
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) { return hex(new Uint8Array(buf)); });
    }

    function start(user) {
        if (!E.write(E.K.session, { email: user.email, name: user.name })) {
            say('Could not sign you in. Please allow local storage in your browser.');
            return;
        }
        location.href = 'dashboard.html';
    }


    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            tabs.forEach(function (t) {
                var on = t === tab;
                t.classList.toggle('active', on);
                t.setAttribute('aria-selected', on);
            });
            forms.forEach(function (f) { f.hidden = f.id !== tab.getAttribute('data-target'); });
            say('');
        });
    });


    document.querySelectorAll('[data-toggle-pw]').forEach(function (box) {
        box.addEventListener('change', function () {
            box.closest('form').querySelectorAll('[data-pw]').forEach(function (i) { i.type = box.checked ? 'text' : 'password'; });
        });
    });

    $('signup-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var name = $('signup-name').value.trim();
        var email = $('signup-email').value.trim().toLowerCase();
        var pw = $('signup-password').value;
        var users = E.read(E.K.users, {});

        if (pw.length < 6) return say('Password must be at least 6 characters.');
        if (users[email]) return say('An account with that email already exists.');

        var salt = hex(crypto.getRandomValues(new Uint8Array(8)));
        hash(pw, salt).then(function (h) {
            users[email] = { name: name, email: email, salt: salt, hash: h };
            if (!E.write(E.K.users, users)) return say('Could not save your account. Please allow local storage.');
            start(users[email]);
        });
    });

    $('signin-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var email = $('signin-email').value.trim().toLowerCase();
        var user = E.read(E.K.users, {})[email];
        if (!user) return say('Incorrect email or password.');

        hash($('signin-password').value, user.salt).then(function (h) {
            if (h !== user.hash) return say('Incorrect email or password.');
            start(user);
        });
    });
})();
