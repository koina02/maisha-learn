import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    getDoc,
    doc,
    query, 
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentAdmin = null;

// Admin Authentication Check - Fixed doc reference
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        // Verify admin role using direct document reference
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'admin') {
            showToast('Admin access required', 'error');
            window.location.href = 'dashboard.html';
            return;
        }
        
        currentAdmin = user;
        initAdminPanel();
    } catch (error) {
        showToast(`Authentication failed: ${error.message}`, 'error');
        window.location.href = 'login.html';
    }
});

// Initialize Admin Features
function initAdminPanel() {
    try {
        setupModuleUpload();
        loadStudents();
        setupRealTimeUpdates();
        setupSearch();
        setupLogout();
        setupStudentModal();
    } catch (error) {
        showToast(`Initialization failed: ${error.message}`, 'error');
    }
}

// Enhanced Module Upload with better validation
function setupModuleUpload() {
    const uploadForm = document.getElementById("uploadModuleForm");
    if (!uploadForm) return;

    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = uploadForm.querySelector('button[type="submit"]');
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="spinner"></div> Uploading...';

            const moduleData = {
                title: document.getElementById("moduleTitle").value.trim(),
                description: document.getElementById("moduleDescription").value.trim(),
                content: document.getElementById("moduleContent").value.trim(),
                difficulty: document.getElementById("moduleDifficulty").value,
                videoUrl: document.getElementById("moduleVideo").value.trim(),
                quizUrl: document.getElementById("moduleQuiz").value.trim(),
                createdBy: currentAdmin.uid,
                createdAt: serverTimestamp(),
                isPublished: document.getElementById("publishCheckbox").checked,
                lastUpdated: serverTimestamp(),
                tags: []
            };

            // Enhanced validation
            const validation = validateModule(moduleData);
            if (!validation.isValid) {
                showToast(validation.message, 'error');
                return;
            }

            await addDoc(collection(db, "modules"), moduleData);
            showToast('Module uploaded successfully!', 'success');
            uploadForm.reset();
        } catch (error) {
            showToast(`Upload failed: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Publish Module';
        }
    });
}

// Enhanced Student Management with empty state
async function loadStudents() {
    try {
        const studentList = document.getElementById("studentList");
        studentList.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner"></div></td></tr>';
        
        const querySnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
        
        studentList.innerHTML = '';
        
        if (querySnapshot.empty) {
            studentList.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-muted">
                        No students found
                    </td>
                </tr>
            `;
            return;
        }

        querySnapshot.forEach((doc) => {
            const student = doc.data();
            studentList.innerHTML += `
                <tr>
                    <td>${student.name || 'N/A'}</td>
                    <td>${student.email}</td>
                    <td>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar" 
                                 style="width: ${student.progress?.totalCompletion || 0}%">
                                ${Math.round(student.progress?.totalCompletion || 0)}%
                            </div>
                        </div>
                    </td>
                    <td>${formatDateTime(student.lastLogin?.toDate())}</td>
                    <td>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary view-student" data-id="${doc.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-student" data-id="${doc.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
    } catch (error) {
        showToast(`Failed to load students: ${error.message}`, 'error');
    }
}

// Enhanced Real-time Updates with error handling
function setupRealTimeUpdates() {
    const modulesUnsub = onSnapshot(query(collection(db, "modules")), 
        (snapshot) => {
            document.getElementById("totalModules").textContent = snapshot.size;
        },
        (error) => {
            showToast(`Modules update error: ${error.message}`, 'error');
        }
    );

    const studentsUnsub = onSnapshot(query(collection(db, "users"), where("role", "==", "student")), 
        (snapshot) => {
            document.getElementById("totalStudents").textContent = snapshot.size;
        },
        (error) => {
            showToast(`Students update error: ${error.message}`, 'error');
        }
    );

    // Cleanup on logout
    window.addEventListener('beforeunload', () => {
        modulesUnsub();
        studentsUnsub();
    });
}

// Enhanced Validation
function validateModule(data) {
    if (!data.title || data.title.length < 5) {
        return { isValid: false, message: 'Title must be at least 5 characters' };
    }
    if (!isValidUrl(data.videoUrl) || !isValidUrl(data.quizUrl)) {
        return { isValid: false, message: 'Please enter valid URLs' };
    }
    if (data.description.length < 50) {
        return { isValid: false, message: 'Description needs at least 50 characters' };
    }
    return { isValid: true };
}

// Enhanced Date Formatting
function formatDateTime(date) {
    if (!date) return 'Never';
    return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Student Modal Setup
function setupStudentModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Student Details</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body" id="studentModalContent"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    this.studentModal = new bootstrap.Modal(modal);
}

// Enhanced Student View Functionality
async function viewStudent(studentId) {
    try {
        const studentDoc = await getDoc(doc(db, "users", studentId));
        const student = studentDoc.data();
        
        const content = `
            <div class="row">
                <div class="col-md-4">
                    <h6>Basic Info</h6>
                    <p><strong>Name:</strong> ${student.name || 'N/A'}</p>
                    <p><strong>Email:</strong> ${student.email}</p>
                    <p><strong>Joined:</strong> ${formatDateTime(student.createdAt?.toDate())}</p>
                </div>
                <div class="col-md-8">
                    <h6>Progress Overview</h6>
                    <div class="progress mb-3">
                        <div class="progress-bar" 
                             style="width: ${student.progress?.totalCompletion || 0}%">
                            ${Math.round(student.progress?.totalCompletion || 0)}%
                        </div>
                    </div>
                    <div class="row">
                        ${Object.entries(student.progress?.modules || {}).map(([module, progress]) => `
                            <div class="col-6 mb-2">
                                <small>${module}</small>
                                <div class="progress" style="height: 5px;">
                                    <div class="progress-bar" style="width: ${progress}%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('studentModalContent').innerHTML = content;
        this.studentModal.show();
    } catch (error) {
        showToast(`Failed to load student: ${error.message}`, 'error');
    }
}

// Other existing functions remain with minor improvements... 