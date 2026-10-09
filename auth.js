document.getElementById('register-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const nama = document.getElementById('reg-nama').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    if (password !== confirm) {
        Swal.fire({
            icon: 'warning',
            title: 'Password Tidak Cocok',
            text: 'Konfirmasi password harus sama dengan password yang dibuat.',
            confirmButtonColor: '#28a745'
        });
        return;
    }

    let registeredUsers = JSON.parse(localStorage.getItem('umkm_registered_users')) || [
        { username: 'admin', password: '123', nama: 'Admin UMKM' }
    ];

    const isExist = registeredUsers.some(u => u.username.toLowerCase() === username.toLowerCase());

    if (isExist) {
        Swal.fire({
            icon: 'error',
            title: 'Username Terpakai',
            text: 'Username tersebut sudah terdaftar, gunakan username lain!',
            confirmButtonColor: '#dc3545'
        });
        return;
    }

    registeredUsers.push({ nama, username, password });
    localStorage.setItem('umkm_registered_users', JSON.stringify(registeredUsers));

    Swal.fire({
        icon: 'success',
        title: 'Pendaftaran Berhasil!',
        text: 'Akun Anda telah tersimpan. Silakan login.',
        confirmButtonColor: '#28a745'
    }).then(() => {
        window.location.href = 'index.html';
    });
});