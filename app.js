document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab');
    const authForms = document.querySelectorAll('.auth-form');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            authForms.forEach(f => f.style.display = 'none');
            
            this.classList.add('active');
            const targetForm = document.getElementById(this.dataset.target);
            if(targetForm) targetForm.style.display = 'block';
        });
    });

    const qrContainer = document.getElementById('qr-container');
    if (qrContainer) {
        generateStudentQR();
    }
});

function saveProfile(event) {
    event.preventDefault();
    
    const studentData = {
        name: document.getElementById('fullName').value,
        studentNo: document.getElementById('studentNo').value,
        course: document.getElementById('course').value,
        section: document.getElementById('section').value
    };

    localStorage.setItem('studentProfile', JSON.stringify(studentData));
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "Generating QR ID...";
    submitBtn.disabled = true;
    setTimeout(() => {
        window.location.href = "qr-id.html";
    }, 500);
}
function generateStudentQR() {
    const profileData = JSON.parse(localStorage.getItem('studentProfile'));
    
    if (profileData) {
        document.getElementById('student-name-display').innerText = profileData.name;
        document.getElementById('student-course-display').innerText = `${profileData.course} - ${profileData.section}`;
        
        const qrString = encodeURIComponent(`ID:${profileData.studentNo}|Name:${profileData.name}|Sec:${profileData.section}`);
        const qrImage = document.getElementById('live-qr');
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrString}&color=0B0F19&bgcolor=ffffff`;
    }
}
