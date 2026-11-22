import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// --- KONFIGURASI FIREBASE PROJECT ---
const firebaseConfig = {
  apiKey: "AIzaSyA3x9grxeVu_a1_BFY_1EfEtwA-rGE7LFA",
  authDomain: "manajemen-operasional-umkm.firebaseapp.com",
  projectId: "manajemen-operasional-umkm",
  storageBucket: "manajemen-operasional-umkm.firebasestorage.app",
  messagingSenderId: "139605713066",
  appId: "1:139605713066:web:610a6cc1cb5ba1fd0fb0d3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- HELPER HASHING PASSWORD SHA-256 ---
async function hashPasswordSHA256(plainText) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isAlreadyHashed(str) {
  return typeof str === "string" && /^[a-f0-9]{64}$/i.test(str);
}

// --- CEK JIKA SUDAH LOGIN ---
if (sessionStorage.getItem("umkm_active_tenant")) {
  window.location.href = "dashboard.html";
}

// --- TOGGLE TAB LOGIN & REGISTER ---
window.switchAuthTab = function (tab) {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");

  if (tab === "login") {
    loginForm.style.display = "block";
    registerForm.style.display = "none";
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
  } else {
    loginForm.style.display = "none";
    registerForm.style.display = "block";
    tabLogin.classList.remove("active");
    tabRegister.classList.add("active");
  }
};

// --- TOGGLE INTIP PASSWORD ---
window.togglePasswordVisibility = function (inputId, iconSpan) {
  const input = document.getElementById(inputId);
  const icon = iconSpan.querySelector("i");
  if (!input || !icon) return;

  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    input.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
};

// --- PROSES LOGIN ---
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const usernameInput = document
      .getElementById("login-username")
      .value.trim()
      .toLowerCase();
    const passwordInput = document.getElementById("login-password").value;

    if (!usernameInput || !passwordInput) return;

    Swal.fire({
      title: "Memverifikasi Akun...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const tenantRef = doc(db, "umkm_tenants", usernameInput);
      const docSnap = await getDoc(tenantRef);

      if (!docSnap.exists()) {
        Swal.fire({
          icon: "error",
          title: "Akun Tidak Ditemukan",
          text: `Username "${usernameInput}" belum terdaftar. Silakan daftar akun baru terlebih dahulu.`,
          confirmButtonColor: "#ef4444",
        });
        return;
      }

      const data = docSnap.data();
      const storedPassword = data.account?.password || "";
      const hashedInput = await hashPasswordSHA256(passwordInput);

      // Cek kecocokan (mendukung hash SHA-256 maupun auto-upgrade password lama)
      const isMatchHash = storedPassword === hashedInput;
      const isMatchLegacyPlain =
        !isAlreadyHashed(storedPassword) && storedPassword === passwordInput;

      if (!isMatchHash && !isMatchLegacyPlain) {
        Swal.fire({
          icon: "error",
          title: "Password Salah",
          text: "Password yang Anda masukkan tidak sesuai.",
          confirmButtonColor: "#ef4444",
        });
        return;
      }

      // Auto-upgrade password lama ke SHA-256 secara diam-diam saat berhasil login
      if (isMatchLegacyPlain) {
        await updateDoc(tenantRef, {
          "account.password": hashedInput,
        });
      }

      sessionStorage.setItem("umkm_active_tenant", usernameInput);
      Swal.close();
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("Login error:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal Terhubung ke Server",
        text: error.message,
        confirmButtonColor: "#ef4444",
      });
    }
  });
}

// --- PROSES REGISTRASI UMKM BARU ---
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const storeName = document.getElementById("reg-store-name").value.trim();
    const ownerName = document.getElementById("reg-owner-name").value.trim();
    const phone = document.getElementById("reg-phone").value.trim();
    const addressInput = document.getElementById("reg-address")
      ? document.getElementById("reg-address").value.trim()
      : "";
    const username = document
      .getElementById("reg-username")
      .value.trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    const password = document.getElementById("reg-password").value;

    if (!storeName || !ownerName || !phone || !username || !password) return;

    Swal.fire({
      title: "Mendaftarkan Usaha...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const tenantRef = doc(db, "umkm_tenants", username);
      const docSnap = await getDoc(tenantRef);

      if (docSnap.exists()) {
        Swal.fire({
          icon: "warning",
          title: "Username Sudah Dipakai",
          text: `Username "${username}" sudah digunakan. Gunakan username lain.`,
          confirmButtonColor: "#f59e0b",
        });
        return;
      }

      const hashedPassword = await hashPasswordSHA256(password);

      await setDoc(tenantRef, {
        account: {
          storeName: storeName,
          ownerName: ownerName,
          phone: phone,
          address: addressInput || "Kota Medan",
          username: username,
          password: hashedPassword,
          logoData: "",
        },
        products: [],
        customers: [],
        orders: [],
        expenses: [],
      });

      sessionStorage.setItem("umkm_active_tenant", username);

      Swal.fire({
        icon: "success",
        title: "Pendaftaran Berhasil!",
        text: `Selamat datang, ${storeName}! Mengarahkan ke dashboard...`,
        timer: 1500,
        showConfirmButton: false,
      }).then(() => {
        window.location.href = "dashboard.html";
      });
    } catch (error) {
      console.error("Register error:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal Mendaftar",
        text: error.message,
        confirmButtonColor: "#ef4444",
      });
    }
  });
}

// --- FITUR LUPA PASSWORD (RESET PASSWORD TERENKRIPSI) ---
window.openForgotPasswordModal = async function () {
  const { value: formValues } = await Swal.fire({
    title: "Reset Password Akun",
    html:
      `<p style="font-size:13px; color:#64748b; margin-bottom:12px;">Masukkan Username dan No. HP/WA yang terdaftar untuk membuat password baru.</p>` +
      `<input id="fp-username" class="swal2-input" placeholder="Username Usaha" style="margin:6px auto; width:88%;">` +
      `<input id="fp-phone" class="swal2-input" placeholder="Nomor HP / WhatsApp Terdaftar" style="margin:6px auto; width:88%;">` +
      `<input id="fp-new-pass" type="password" class="swal2-input" placeholder="Password Baru" style="margin:6px auto; width:88%;">`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Reset Password",
    cancelButtonText: "Batal",
    confirmButtonColor: "#059669",
    preConfirm: () => {
      const uname = document
        .getElementById("fp-username")
        .value.trim()
        .toLowerCase();
      const phone = document.getElementById("fp-phone").value.trim();
      const newPass = document.getElementById("fp-new-pass").value;
      if (!uname || !phone || !newPass) {
        Swal.showValidationMessage(
          "Semua kolom (Username, No. HP, dan Password Baru) wajib diisi!",
        );
        return false;
      }
      return { uname, phone, newPass };
    },
  });

  if (!formValues) return;

  try {
    const tenantRef = doc(db, "umkm_tenants", formValues.uname);
    const docSnap = await getDoc(tenantRef);

    if (!docSnap.exists()) {
      Swal.fire({
        icon: "error",
        title: "Username Tidak Ditemukan",
        text: "Periksa kembali username usaha Anda.",
        confirmButtonColor: "#ef4444",
      });
      return;
    }

    const accountData = docSnap.data().account || {};
    const savedPhone = (accountData.phone || "").replace(/\D/g, "");
    const inputPhone = formValues.phone.replace(/\D/g, "");

    if (!savedPhone || savedPhone !== inputPhone) {
      Swal.fire({
        icon: "error",
        title: "Verifikasi Gagal",
        text: "Nomor HP/WhatsApp tidak cocok dengan data yang terdaftar.",
        confirmButtonColor: "#ef4444",
      });
      return;
    }

    const hashedNewPass = await hashPasswordSHA256(formValues.newPass);
    await updateDoc(tenantRef, {
      "account.password": hashedNewPass,
    });

    Swal.fire({
      icon: "success",
      title: "Password Berhasil Direset!",
      text: "Silakan login menggunakan password baru Anda.",
      confirmButtonColor: "#059669",
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Terjadi Kesalahan",
      text: error.message,
      confirmButtonColor: "#ef4444",
    });
  }
};