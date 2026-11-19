import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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

const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const btn = document.getElementById("btn-register-submit");
    const nama = document.getElementById("reg-nama").value.trim();
    const phoneInput = document.getElementById("reg-phone");
    const phone = phoneInput ? phoneInput.value.trim() : "-";
    const rawUsername = document.getElementById("reg-username").value.trim();
    const usernameKey = rawUsername.toLowerCase();
    const password = document.getElementById("reg-password").value;
    const confirm = document.getElementById("reg-confirm").value;

    if (password !== confirm) {
      Swal.fire({
        icon: "warning",
        title: "Password Tidak Cocok",
        text: "Konfirmasi password harus sama dengan password yang dibuat.",
        confirmButtonColor: "#16a34a",
      });
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerText = "Menyimpan ke Cloud...";
    }

    try {
      const tenantRef = doc(db, "umkm_tenants", usernameKey);
      const existingSnap = await getDoc(tenantRef);

      if (existingSnap.exists()) {
        Swal.fire({
          icon: "error",
          title: "Username Terpakai",
          text: "Username tersebut sudah terdaftar, gunakan username lain!",
          confirmButtonColor: "#ef4444",
        });
        return;
      }

      await setDoc(tenantRef, {
        account: {
          storeName: nama,
          ownerName: nama,
          username: rawUsername,
          password: password,
          phone: phone || "-",
          address: "",
          logoData: "",
        },
        products: [],
        customers: [],
        orders: [],
        expenses: [],
      });

      Swal.fire({
        icon: "success",
        title: "Pendaftaran Berhasil!",
        text: "Akun Anda telah tersimpan di Cloud. Silakan login.",
        confirmButtonColor: "#16a34a",
      }).then(() => {
        window.location.href = "index.html";
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Gagal Mendaftar",
        text: "Terjadi kesalahan saat menyimpan akun: " + error.message,
        confirmButtonColor: "#ef4444",
      });
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Daftar Sekarang";
      }
    }
  });
}