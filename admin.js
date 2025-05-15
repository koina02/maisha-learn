// admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Upload Module
const uploadForm = document.getElementById("uploadModuleForm");
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("moduleTitle").value;
    const content = document.getElementById("moduleContent").value;

    try {
      await addDoc(collection(db, "modules"), { title, content });
      alert("Module uploaded!");
    } catch (error) {
      alert("Failed to upload: " + error.message);
    }
  });
}

// Fetch Students
const studentList = document.getElementById("studentList");
if (studentList) {
  const usersSnapshot = await getDocs(collection(db, "users"));
  usersSnapshot.forEach((doc) => {
    const li = document.createElement("li");
    li.textContent = doc.data().name + " - " + doc.data().email;
    studentList.appendChild(li);
  });
}
