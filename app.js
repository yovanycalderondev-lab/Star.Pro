// Importar Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// CONFIGURACIÓN DE FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBHOzf9seIfLZhN1nfY5kClvYTPdOngMgI",
  authDomain: "samazil.firebaseapp.com",
  projectId: "samazil",
  storageBucket: "samazil.firebasestorage.app",
  messagingSenderId: "735433209556",
  appId: "1:735433209556:web:ac6f4b5f83a65a12f16d41",
  measurementId: "G-61J5H2RQKH"
};

// Inicialización de servicios
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Nodos del DOM
const authContainer = document.getElementById("auth-container");
const formAuth = document.getElementById("form-auth");
const btnLogout = document.getElementById("btn-logout");
const usuarioInfo = document.getElementById("usuario-info");
const nombreUsuarioHeader = document.getElementById("nombre-usuario-header");
const contenidoPrincipal = document.getElementById("contenido-principal");
const formPerfil = document.getElementById("perfilUsuario");
const precioHoraInput = document.getElementById("precioHora");
const formMensaje = document.getElementById("form-mensaje");
const inputMensaje = document.getElementById("input-mensaje");
const chatBox = document.getElementById("chat-box");

let usuarioActual = null;

// ==========================================
// 1. SISTEMA DE AUTENTICACIÓN
// ==========================================
if (formAuth) {
  formAuth.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("auth-nombre").value.trim();
    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;

    try {
      // Intentar iniciar sesión
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      // Si la cuenta no existe o las credenciales son genéricas de nuevo usuario, registrarlo
      if (
        error.code === 'auth/invalid-credential' || 
        error.code === 'auth/user-not-found'
      ) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(cred.user, { displayName: nombre });
        } catch (errCrear) {
          alert("Error al registrarse: " + errCrear.message);
        }
      } else {
        alert("Error de autenticación: " + error.message);
      }
    }
  });
}

if (btnLogout) {
  btnLogout.addEventListener("click", () => signOut(auth));
}

// Escuchar cambios en el estado de autenticación
onAuthStateChanged(auth, async (user) => {
  if (user) {
    usuarioActual = user;
    if (authContainer) authContainer.style.display = "none";
    if (usuarioInfo) usuarioInfo.style.display = "flex";
    if (nombreUsuarioHeader) nombreUsuarioHeader.textContent = `Hola, ${user.displayName || user.email}`;
    if (contenidoPrincipal) contenidoPrincipal.style.display = "block";

    await cargarPerfilUsuario(user.uid);
    escucharMensajes();
  } else {
    usuarioActual = null;
    if (authContainer) authContainer.style.display = "block";
    if (usuarioInfo) usuarioInfo.style.display = "none";
    if (contenidoPrincipal) contenidoPrincipal.style.display = "none";
  }
});

// ==========================================
// 2. GESTIÓN DEL PERFIL
// ==========================================
if (formPerfil) {
  formPerfil.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!usuarioActual) return;

    try {
      await setDoc(doc(db, "usuarios", usuarioActual.uid), {
        nombre: usuarioActual.displayName || usuarioActual.email,
        precioHora: precioHoraInput.value
      }, { merge: true });

      alert("¡Tarifa guardada con éxito!");
    } catch (error) {
      alert("Error al guardar: " + error.message);
    }
  });
}

async function cargarPerfilUsuario(uid) {
  try {
    const userDoc = await getDoc(doc(db, "usuarios", uid));
    if (userDoc.exists() && userDoc.data().precioHora) {
      precioHoraInput.value = userDoc.data().precioHora;
    }
  } catch (error) {
    console.error("Error al obtener el perfil:", error);
  }
}

// ==========================================
// 3. MENSAJES EN TIEMPO REAL
// ==========================================
if (formMensaje) {
  formMensaje.addEventListener("submit", async (e) => {
    e.preventDefault();
    const texto = inputMensaje.value.trim();
    if (!texto || !usuarioActual) return;

    try {
      await addDoc(collection(db, "mensajes"), {
        texto: texto,
        usuario: usuarioActual.displayName || usuarioActual.email,
        uid: usuarioActual.uid,
        fecha: serverTimestamp()
      });
      inputMensaje.value = "";
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
    }
  });
}

function escucharMensajes() {
  const q = query(collection(db, "mensajes"), orderBy("fecha", "asc"));

  onSnapshot(q, (snapshot) => {
    if (!chatBox) return;
    chatBox.innerHTML = "";

    snapshot.forEach((doc) => {
      const msg = doc.data();
      const div = document.createElement("div");
      
      const esMio = usuarioActual && msg.uid === usuarioActual.uid;
      
      // Estilos ajustados al tema de placas GT
      div.style.alignSelf = esMio ? "flex-end" : "flex-start";
      div.style.backgroundColor = esMio ? "var(--marigold)" : "var(--ink-3)";
      div.style.color = esMio ? "var(--charcoal)" : "var(--paper)";
      div.style.borderBottomRightRadius = esMio ? "3px" : "12px";
      div.style.borderBottomLeftRadius = esMio ? "12px" : "3px";

      div.innerHTML = `
        <strong style="font-family: var(--font-data); font-size: 12px; display: block; margin-bottom: 2px;">${msg.usuario}:</strong>
        <span>${msg.texto}</span>
      `;

      chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  });
}