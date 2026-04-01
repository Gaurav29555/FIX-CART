// ===== Global Variables =====
let currentUser = null;
let currentTab = 'login';

// ===== DOM Elements =====
const navToggle = document.getElementById('navToggle');
const navMenu = document.querySelector('.nav-menu');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const authModal = document.getElementById('authModal');
const modalClose = document.getElementById('modalClose');
const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const startBooking = document.getElementById('startBooking');
const browseServices = document.getElementById('browseServices');

// ===== Navigation Toggle =====
navToggle?.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    document.body.classList.toggle('nav-open');
});

// ===== Authentication Modal =====
function openAuthModal(tab = 'login') {
    authModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    switchAuthTab(tab);
}

function closeAuthModal() {
    authModal.classList.remove('active');
    document.body.style.overflow = '';
}

loginBtn?.addEventListener('click', () => openAuthModal('login'));
registerBtn?.addEventListener('click', () => openAuthModal('register'));
modalClose?.addEventListener('click', closeAuthModal);

// Close modal on outside click
authModal?.addEventListener('click', (e) => {
    if (e.target === authModal) {
        closeAuthModal();
    }
});

// ===== Auth Tab Switching =====
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        switchAuthTab(tab.dataset.tab);
    });
});

function switchAuthTab(tab) {
    currentTab = tab;
    
    // Update active tab
    authTabs.forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    // Show/hide forms
    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
}

// ===== Form Submissions =====
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleLogin(e.target);
});

registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleRegister(e.target);
});

async function handleLogin(form) {
    const formData = new FormData(form);
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;
    
    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:8082/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store tokens
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            currentUser = data.user;
            showNotification('Login successful!', 'success');
            closeAuthModal();
            updateUI();
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

async function handleRegister(form) {
    const formData = new FormData(form);
    const firstName = form.querySelector('input[type="text"]').value;
    const lastName = form.querySelectorAll('input[type="text"]')[1].value;
    const email = form.querySelector('input[type="email"]').value;
    const phone = form.querySelector('input[type="tel"]').value;
    const password = form.querySelector('input[type="password"]').value;
    const role = form.querySelector('select').value;
    
    if (!firstName || !lastName || !email || !phone || !password) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    if (password.length < 8) {
        showNotification('Password must be at least 8 characters', 'error');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:8082/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password,
                firstName: firstName,
                lastName: lastName,
                phone: phone,
                role: role
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Registration successful! Please log in.', 'success');
            switchAuthTab('login');
        } else {
            showNotification(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// ===== UI Updates =====
function updateUI() {
    if (currentUser) {
        // Update navigation
        loginBtn.textContent = 'Dashboard';
        loginBtn.onclick = () => window.location.href = '/dashboard.html';
        registerBtn.textContent = 'Logout';
        registerBtn.onclick = handleLogout;
    } else {
        // Reset to default state
        loginBtn.textContent = 'Sign In';
        loginBtn.onclick = () => openAuthModal('login');
        registerBtn.textContent = 'Get Started';
        registerBtn.onclick = () => openAuthModal('register');
    }
}

function handleLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    currentUser = null;
    updateUI();
    showNotification('Logged out successfully', 'success');
}

// ===== Scroll Animations =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.service-item, .testimonial-card, .step').forEach(el => {
    observer.observe(el);
});

// ===== Smooth Scrolling =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ===== Button Actions =====
startBooking?.addEventListener('click', () => {
    if (currentUser) {
        window.location.href = '/booking.html';
    } else {
        openAuthModal('register');
    }
});

browseServices?.addEventListener('click', () => {
    document.querySelector('#services').scrollIntoView({
        behavior: 'smooth'
    });
});

// ===== Notification System =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== Service Card Interactions =====
document.querySelectorAll('.service-item .btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const serviceItem = btn.closest('.service-item');
        const serviceTitle = serviceItem.querySelector('.service-title').textContent;
        
        if (currentUser) {
            // Store selected service and redirect to booking
            localStorage.setItem('selectedService', serviceTitle);
            window.location.href = '/booking.html';
        } else {
            openAuthModal('register');
        }
    });
});

// ===== Form Validation =====
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[0-9]{10}$/;
    return re.test(phone.replace(/\D/g, ''));
}

// Add real-time validation
document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('blur', function() {
        if (this.type === 'email' && this.value && !validateEmail(this.value)) {
            this.classList.add('error');
            showNotification('Please enter a valid email address', 'error');
        } else if (this.type === 'tel' && this.value && !validatePhone(this.value)) {
            this.classList.add('error');
            showNotification('Please enter a valid 10-digit phone number', 'error');
        } else {
            this.classList.remove('error');
        }
    });
});

// ===== Keyboard Navigation =====
document.addEventListener('keydown', (e) => {
    // ESC key closes modal
    if (e.key === 'Escape' && authModal.classList.contains('active')) {
        closeAuthModal();
    }
    
    // Tab navigation in forms
    if (e.key === 'Tab' && authModal.classList.contains('active')) {
        const focusableElements = authModal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }
});

// ===== Auto-login on page load =====
window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    
    if (savedUser && accessToken) {
        try {
            currentUser = JSON.parse(savedUser);
            updateUI();
        } catch (error) {
            console.error('Error parsing saved user:', error);
            localStorage.removeItem('user');
        }
    }
});

// ===== Network Error Handling =====
window.addEventListener('online', () => {
    showNotification('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    showNotification('No internet connection', 'error');
});

// ===== Performance Monitoring =====
if ('PerformanceObserver' in window) {
    const perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
                console.log('LCP:', entry.startTime);
            }
            if (entry.entryType === 'first-input-delay') {
                console.log('FID:', entry.processingStart - entry.startTime);
            }
        }
    });
    
    perfObserver.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
}

// ===== Export for testing =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateEmail,
        validatePhone,
        handleLogin,
        handleRegister
    };
}
