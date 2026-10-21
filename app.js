document.addEventListener('DOMContentLoaded', () => {
    // ----- Sign in / Sign up tabs -----
    const tabs = document.querySelectorAll('.tab');
    const authForms = document.querySelectorAll('.auth-form');

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            tabs.forEach(t => t.classList.remove('active'));
            authForms.forEach(f => f.style.display = 'none');

            this.classList.add('active');
            const targetForm = document.getElementById(this.dataset.target);
            if (targetForm) targetForm.style.display = 'block';
        });
    });

    // ----- QR ID page -----
    if (document.getElementById('qr-container')) {
        generateStudentQR();
    }

    // ----- Dashboard page: refill the form with the saved profile -----
    if (document.getElementById('fullName')) {
        loadSavedProfile();
    }
});

function saveProfile(event) {
    event.preventDefault();

    const studentData = {
        name: document.getElementById('fullName').value.trim(),
        studentNo: document.getElementById('studentNo').value.trim(),
        course: document.getElementById('course').value.trim(),
        yearLevel: document.getElementById('yearLevel').value,
        section: document.getElementById('section').value.trim(),
        event: document.getElementById('event').value
    };

    localStorage.setItem('studentProfile', JSON.stringify(studentData));

    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "Generating QR ID...";
    submitBtn.disabled = true;

    setTimeout(() => {
        window.location.href = "qr-id.html";
    }, 500);
}

function loadSavedProfile() {
    const profileData = JSON.parse(localStorage.getItem('studentProfile'));
    if (!profileData) return;

    document.getElementById('fullName').value = profileData.name || '';
    document.getElementById('studentNo').value = profileData.studentNo || '';
    document.getElementById('course').value = profileData.course || '';
    document.getElementById('section').value = profileData.section || '';
    if (profileData.yearLevel) document.getElementById('yearLevel').value = profileData.yearLevel;
    if (profileData.event) document.getElementById('event').value = profileData.event;
}

function generateStudentQR() {
    const profileData = JSON.parse(localStorage.getItem('studentProfile'));

    if (!profileData) {
        document.getElementById('student-name-display').innerText = 'No profile yet';
        document.getElementById('student-course-display').innerText = 'Go to Edit Profile to create your QR ID.';
        return;
    }

    document.getElementById('student-name-display').innerText = profileData.name;
    document.getElementById('student-course-display').innerText = `${profileData.course} - ${profileData.section}`;

    const eventDisplay = document.getElementById('student-event-display');
    if (eventDisplay) eventDisplay.innerText = profileData.event;

    // The event is part of the text stored inside the QR code
    const qrString = encodeURIComponent(
        `ID:${profileData.studentNo}|Name:${profileData.name}|Sec:${profileData.section}|Event:${profileData.event}`
    );
    const qrImage = document.getElementById('live-qr');
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrString}&color=0B0F19&bgcolor=ffffff`;
}
