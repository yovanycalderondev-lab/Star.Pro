// Importar funciones necesarias desde Firebase SDK mediante CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect, 
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
// CONFIGURACIÓN OFICIAL DE SAMAZIL
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

// Inicializar Firebase y Servicios
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Elementos de la interfaz HTML
const btnLogin = document.getElementById("btn-login-google");
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
// 1. AUTENTICACIÓN CON GOOGLE (REDIRECCIÓN)
// ==========================================
if (btnLogin) {
  btnLogin.addEventListener("click", async () => {
    try {
      // Usa redirección para evitar bloqueos de Pop-ups en Netlify
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      console.error("Error al redirigir para iniciar sesión:", error);
    }
  });
}

if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    signOut(auth);
  });
}

// Escuchar cambios de sesión del usuario
onAuthStateChanged(auth, async (user) => {
  if (user) {
    usuarioActual = user;
    if (btnLogin) btnLogin.style.display = "none";
    if (usuarioInfo) usuarioInfo.style.display = "inline-block";
    if (nombreUsuarioHeader) nombreUsuarioHeader.textContent = `Hola, ${user.displayName}`;
    if (contenidoPrincipal) contenidoPrincipal.style.display = "block";

    // Cargar tarifa de la base de datos y conectar los mensajes
    await cargarPerfilUsuario(user.uid);
    escucharMensajes();
  } else {
    usuarioActual = null;
    if (btnLogin) btnLogin.style.display = "inline-block";
    if (usuarioInfo) usuarioInfo.style.display = "none";
    if (contenidoPrincipal) contenidoPrincipal.style.display = "none";
  }
});

// ==========================================
// 2. BASE DE DATOS: PERFIL Y TARIFA POR HORA
// ==========================================
if (formPerfil) {
  formPerfil.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!usuarioActual) return;

    const precio = precioHoraInput.value;

    try {
      await setDoc(doc(db, "usuarios", usuarioActual.uid), {
        nombre: usuarioActual.displayName,
        email: usuarioActual.email,
        precioHora: precio,
        fotoPerfil: usuarioActual.photoURL || ""
      }, { merge: true });

      alert("¡Tarifa por hora guardada exitosamente!");
    } catch (error) {
      console.error("Error al guardar perfil:", error);
      alert("Hubo un error al guardar los datos.");
    }
  });
}

async function cargarPerfilUsuario(uid) {
  try {
    const userDoc = await getDoc(doc(db, "usuarios", uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.precioHora && precioHoraInput) {
        precioHoraInput.value = data.precioHora;
      }
    }
  } catch (error) {
    console.error("Error al cargar perfil:", error);
  }
}

// ==========================================
// 3. BASE DE DATOS: MENSAJES EN TIEMPO REAL
// ==========================================
if (formMensaje) {
  formMensaje.addEventListener("submit", async (e) => {
    e.preventDefault();
    const texto = inputMensaje.value.trim();
    if (!texto || !usuarioActual) return;

    try {
      await addDoc(collection(db, "mensajes"), {
        texto: texto,
        usuario: usuarioActual.displayName,
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
      div.style.marginBottom = "8px";
      
      const esMio = msg.uid === usuarioActual.uid;
      div.style.textAlign = esMio ? "right" : "left";
      
      div.innerHTML = `
        <strong style="color: ${esMio ? '#ff8c00' : '#333'}">${msg.usuario}:</strong> 
        <span>${msg.texto}</span>
      `;
      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}