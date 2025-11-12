// script.js (ES module)
import { auth, db, authOptions } from './firebase-config.js';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { 
  doc, 
  getDoc, 
  collection, 
  setDoc,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ============================================
// Core authentication functions
// ============================================

export async function getUserRole(uid) {
  const snap = await getDoc(doc(db, 'profiles', uid));
  return snap.exists() ? snap.data().role : null;
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'profiles', uid));
  return snap.exists() ? snap.data() : null;
}

export function requireAuth(expectedRole) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) { 
      location.href = `${expectedRole}-login.html`; 
      return; 
    }
    const role = await getUserRole(user.uid);
    if (role !== expectedRole) {
      location.href = `${role}-dashboard.html`;
      return;
    }
    // Optional: update UI with user info
    const who = document.getElementById('whoami');
    if (who) who.textContent = `Signed in as ${role}.`;
  });
}

export async function logout() {
  await signOut(auth);
  location.href = 'index.html'; // or role chooser
}

// ============================================
// Validation helpers
// ============================================

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

// ============================================
// UI helper functions
// ============================================

function ensureErrorElementAfter(inputEl) {
  if (!inputEl) return null;
  let next = inputEl.nextElementSibling;
  if (!next || !next.classList || !next.classList.contains('field-error')) {
    const el = document.createElement('div');
    el.className = 'field-error';
    el.style.marginTop = '6px';
    el.style.fontSize = '0.85rem';
    el.style.color = '#b00020';
    inputEl.parentNode.insertBefore(el, inputEl.nextSibling);
    next = el;
  }
  return next;
}

function clearFieldErrors(formEl) {
  if (!formEl) return;
  formEl.querySelectorAll('.field-error').forEach((el) => el.remove());
  formEl.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
}

function setFieldError(inputEl, message) {
  const errEl = ensureErrorElementAfter(inputEl);
  if (errEl) errEl.textContent = message;
  if (inputEl && inputEl.classList) inputEl.classList.add('is-invalid');
}

function showFormMessage(formEl, message, type) {
  if (!formEl) return;
  let msgEl = formEl.querySelector('.form-message');
  if (!msgEl) {
    msgEl = document.createElement('div');
    msgEl.className = 'form-message';
    msgEl.style.marginTop = '8px';
    msgEl.style.fontSize = '0.9rem';
    msgEl.style.lineHeight = '1.3';
    msgEl.style.color = type === 'error' ? '#b00020' : '#0b7';
    formEl.appendChild(msgEl);
  }
  msgEl.textContent = message;
  msgEl.style.color = type === 'error' ? '#b00020' : '#0b7';
}

function disableSubmitButton(formEl, pendingText) {
  const btn = formEl?.querySelector('button[type="submit"]');
  if (!btn) return () => {};
  const original = { text: btn.textContent, disabled: btn.disabled };
  btn.disabled = true;
  if (pendingText) btn.textContent = pendingText;
  return () => {
    btn.disabled = original.disabled;
    btn.textContent = original.text;
  };
}

// ============================================
// Page detection helpers
// ============================================

function getRoleFromPageForSignup() {
  const path = (location.pathname || '').toLowerCase();
  if (path.includes('coach-create-account')) return 'coach';
  return 'athlete'; // default for create-account.html
}

function getRoleFromPageForDashboard() {
  const path = (location.pathname || '').toLowerCase();
  if (path.includes('coach-dashboard')) return 'coach';
  if (path.includes('athlete-dashboard')) return 'athlete';
  return null;
}

// ============================================
// Navigation functions
// ============================================

export function goToLogin(role) {
  if (role === 'athlete') {
    window.location.href = 'athlete-login.html';
    return;
  }
  if (role === 'coach') {
    window.location.href = 'coach-login.html';
    return;
  }
  console.warn('Unknown role:', role);
}

async function redirectToRoleDashboard(role, uid) {
  const currentPage = window.location.pathname.split('/').pop() || '';
  console.log('redirectToRoleDashboard called - Current page:', currentPage, 'Role:', role);
  
  if (role === 'coach') {
    if (currentPage !== 'coach-dashboard.html' && !currentPage.includes('coach-dashboard')) {
      console.log('Redirecting to coach dashboard from:', currentPage);
      window.location.href = 'coach-dashboard.html';
    }
    return;
  }
  
  // For athletes
  if (role === 'athlete') {
    if (currentPage !== 'athlete-dashboard.html' && !currentPage.includes('athlete-dashboard')) {
      console.log('Redirecting to athlete dashboard from:', currentPage);
      window.location.href = 'athlete-dashboard.html';
    }
    return;
  }
}

function redirectToRoleLogin(role) {
  if (role === 'coach') {
    window.location.href = 'coach-login.html';
    return;
  }
  window.location.href = 'athlete-login.html';
}

// ============================================
// Form handlers
// ============================================

export async function handleLoginSubmit(event) {
  event.preventDefault();
  window._loginInProgress = true;
  
  const form = event.target;
  const desiredRole = (form.getAttribute('data-role') || '').toLowerCase(); // 'athlete' or 'coach' on login pages
  const email = form.querySelector('input[type="email"]')?.value || '';
  const password = form.querySelector('input[type="password"]')?.value || '';

  // Client-side validation
  clearFieldErrors(form);
  let hasError = false;
  const emailInput = form.querySelector('input[type="email"]');
  const passwordInput = form.querySelector('input[type="password"]');
  if (!email || !isValidEmail(email)) {
    hasError = true;
    setFieldError(emailInput, 'Please enter a valid email address.');
  }
  if (!isValidPassword(password)) {
    hasError = true;
    setFieldError(passwordInput, 'Password must be at least 8 characters.');
  }
  if (hasError) return;

  const restoreBtn = disableSubmitButton(form, 'Signing in...');
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user?.uid;
    if (!uid) throw new Error('Missing user id after login.');
    console.log('User logged in with UID:', uid);
    
    const role = await getUserRole(uid);
    console.log('User role:', role);
    
    if (!role) {
      showFormMessage(form, 'No profile found. Please contact support.', 'error');
      restoreBtn();
      window._loginInProgress = false;
      return;
    }
    // Enforce page-specific role on login pages: block logging in with the wrong role
    if (desiredRole && role !== desiredRole) {
      try { await signOut(auth); } catch (_e) {}
      const roleName = role === 'coach' ? 'Coach' : 'Athlete';
      const desiredName = desiredRole === 'coach' ? 'Coach' : 'Athlete';
      showFormMessage(form, `This account is a ${roleName} account. Please use the ${desiredName} login page.`, 'error');
      const pwdInput = form.querySelector('input[type="password"]');
      if (pwdInput) pwdInput.value = '';
      restoreBtn();
      window._loginInProgress = false;
      return;
    }
    // Reset login flag and redirect
    console.log('Login successful, redirecting...');
    window._loginInProgress = false;
    window._redirecting = true;
    // Don't await - let redirect happen asynchronously
    redirectToRoleDashboard(role, uid).catch(err => {
      console.error('Redirect error:', err);
      // Fallback redirect
      if (role === 'coach') {
        window.location.href = 'coach-dashboard.html';
      } else {
        window.location.href = 'athlete-dashboard.html';
      }
    });
  } catch (err) {
    const code = err && err.code ? String(err.code) : '';
    let friendly = 'Unable to sign in. Please check your details and try again.';
    if (code.includes('user-not-found') || code.includes('wrong-password')) {
      friendly = 'Incorrect email or password.';
    } else if (code.includes('too-many-requests')) {
      friendly = 'Too many attempts. Please wait a moment and try again.';
    } else if (code.includes('invalid-email')) {
      friendly = 'Please enter a valid email.';
    }
    showFormMessage(form, friendly, 'error');
    restoreBtn();
    window._loginInProgress = false;
  }
}

export async function handleSignupSubmit(event) {
  event.preventDefault();
  
  const formEl = event.target;
  const role = getRoleFromPageForSignup();
  const formData = {
    name: formEl.querySelector('#name')?.value || '',
    gender: formEl.querySelector('#gender')?.value || '',
    age: formEl.querySelector('#age')?.value || '',
    school: formEl.querySelector('#school')?.value || '',
    sport: formEl.querySelector('#sport')?.value || '',
    height: formEl.querySelector('#height')?.value || '',
    weight: formEl.querySelector('#weight')?.value || '',
    email: formEl.querySelector('#email')?.value || '',
    password: formEl.querySelector('#password')?.value || ''
  };

  // Client-side validation for required fields (respecting markup) and formats
  clearFieldErrors(formEl);
  let hasError = false;
  // Validate all inputs with required attribute
  formEl.querySelectorAll('input[required], select[required]').forEach((input) => {
    const value = (input.value || '').trim();
    if (!value) {
      hasError = true;
      setFieldError(input, 'This field is required.');
    }
  });
  // Email format
  const emailInput = formEl.querySelector('#email');
  if (emailInput && !isValidEmail(formData.email)) {
    hasError = true;
    setFieldError(emailInput, 'Please enter a valid email address.');
  }
  // Password length
  const passwordInput = formEl.querySelector('#password');
  if (passwordInput && !isValidPassword(formData.password)) {
    hasError = true;
    setFieldError(passwordInput, 'Password must be at least 8 characters.');
  }
  if (hasError) return;

  const restoreBtn = disableSubmitButton(formEl, 'Creating account...');
  try {
    const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
    const user = cred.user;
    if (!user) throw new Error('Missing user after sign up.');

    // Create profile in Firestore
    const profile = {
      name: formData.name,
      gender: formData.gender,
      age: formData.age,
      school: formData.school,
      height: formData.height,
      weight: formData.weight,
      email: formData.email,
      role: role,
      createdAt: serverTimestamp()
    };
    
    // Add sport for both coaches and athletes
    if (formData.sport) {
      profile.sport = formData.sport;
    }
    
    await setDoc(doc(db, 'profiles', user.uid), profile, { merge: true });

    // Send email verification if available
    try {
      await user.sendEmailVerification();
      showFormMessage(formEl, 'Account created. Please verify your email, then log in.', 'success');
    } catch (_) {
      // Ignore if verification not enabled or fails
      showFormMessage(formEl, 'Account created. You can now log in.', 'success');
    }

    // For athletes, auto-redirect to dashboard (already logged in with sport selected)
    if (role === 'athlete') {
      console.log('Athlete signup complete, redirecting to dashboard...');
      // Small delay to show success message, then redirect
      setTimeout(() => {
        window.location.href = 'athlete-dashboard.html';
      }, 1500);
      return;
    }

    // Redirect to corresponding login for coaches
    redirectToRoleLogin(role);
  } catch (err) {
    const code = err && err.code ? String(err.code) : '';
    let friendly = 'Unable to create your account. Please review your details.';
    if (code.includes('email-already-in-use')) {
      friendly = 'An account with this email already exists.';
    } else if (code.includes('weak-password')) {
      friendly = 'Password is too weak. Please choose a stronger one.';
    } else if (code.includes('invalid-email')) {
      friendly = 'Please enter a valid email.';
    }
    showFormMessage(formEl, friendly, 'error');
  } finally {
    restoreBtn();
  }
}

export async function handleForgotPassword(event) {
  event.preventDefault();
  
  // Find the nearest form and its email value
  const form = event.target.closest('form') || document.querySelector('form.auth-form');
  const emailInput = form?.querySelector('input[type="email"]');
  const email = emailInput?.value || '';
  clearFieldErrors(form);
  if (!isValidEmail(email)) {
    setFieldError(emailInput, 'Enter a valid email to reset your password.');
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showFormMessage(form, 'Password reset email sent. Please check your inbox.', 'success');
  } catch (err) {
    const code = err && err.code ? String(err.code) : '';
    let friendly = 'Unable to send reset email. Try again later.';
    if (code.includes('user-not-found')) friendly = 'No account found for this email.';
    if (code.includes('invalid-email')) friendly = 'Please enter a valid email.';
    showFormMessage(form, friendly, 'error');
  }
}

export async function handleSportSelection(event) {
  event.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    window.location.href = 'athlete-login.html';
    return;
  }

  const form = event.target;
  const selectedSport = form.querySelector('input[name="sport"]:checked')?.value;
  
  if (!selectedSport) {
    showFormMessage(form, 'Please select a sport.', 'error');
    return;
  }

  const restoreBtn = disableSubmitButton(form, 'Saving...');
  try {
    // Update profile with selected sport
    await updateDoc(doc(db, 'profiles', user.uid), {
      sport: selectedSport
    });

    // Redirect to athlete dashboard
    window._redirecting = true;
    window.location.replace('athlete-dashboard.html');
  } catch (err) {
    console.error('Error saving sport:', err);
    showFormMessage(form, 'Unable to save your sport selection. Please try again.', 'error');
    restoreBtn();
  }
}

// ============================================
// Auth state guard
// ============================================

async function setupAuthGuards() {
  // Prevent multiple simultaneous guard checks
  if (window._authGuardRunning) return;
  window._authGuardRunning = true;

  onAuthStateChanged(auth, async (user) => {
    // Prevent redirect loops by checking if we're already redirecting
    if (window._redirecting) {
      window._authGuardRunning = false;
      return;
    }

    const path = (location.pathname || '').toLowerCase();
    const currentPage = path.split('/').pop() || '';
    const isAuthPage = path.includes('login') || path.includes('create-account');
    const expectedDashboardRole = getRoleFromPageForDashboard(); // for dashboard pages only
    const params = new URLSearchParams(location.search || '');

    // Auto sign-out flow: visiting a login page with ?switch=1 logs out then reloads without the flag
    if (isAuthPage && params.get('switch') === '1') {
      try {
        await signOut(auth);
      } catch (_e) {}
      // Reload without the switch param to avoid loops
      const url = new URL(location.href);
      url.searchParams.delete('switch');
      location.replace(url.toString());
      window._authGuardRunning = false;
      return;
    }

    if (!user) {
      if (!isAuthPage) {
        // On a protected page, send to the correct login page based on URL
        // But only if we're not already on a login page
        if (expectedDashboardRole === 'coach' && !currentPage.includes('coach-login')) {
          window._redirecting = true;
          window.location.replace('coach-login.html');
        } else if (expectedDashboardRole === 'athlete' && !currentPage.includes('athlete-login')) {
          window._redirecting = true;
          window.location.replace('athlete-login.html');
        }
      }
      window._authGuardRunning = false;
      return;
    }

    // User is logged in
    let role = null;
    try {
      role = await getUserRole(user.uid);
    } catch (_e) {
      window._authGuardRunning = false;
      return;
    }

    const enforceEmailVerification = !!(authOptions && authOptions.enforceEmailVerification);

    if (isAuthPage) {
      // Already logged in but on login/signup page
      if (window._loginInProgress) {
        // Let the login handler manage the redirect
        window._authGuardRunning = false;
        return;
      }
      if (enforceEmailVerification && user.emailVerified === false) {
        // Stay on auth page and inform user
        const form = document.querySelector('form.auth-form');
        showFormMessage(form || document.body, 'Please verify your email before continuing.', 'error');
        window._authGuardRunning = false;
        return;
      }
      if (role) {
        // Only redirect if login is not in progress
        if (!window._loginInProgress && !window._redirecting) {
          window._redirecting = true;
          await redirectToRoleDashboard(role, user.uid);
        }
      }
      window._authGuardRunning = false;
      return;
    }

    // Check if on sport selection page - allow it if athlete has no sport
    const isSportSelectionPage = path.includes('athlete-select-sport');
    if (isSportSelectionPage && role === 'athlete') {
      try {
        const profile = await getUserProfile(user.uid);
        if (profile && profile.sport) {
          // Already has sport selected, redirect to dashboard
          if (!window._redirecting && currentPage !== 'athlete-dashboard.html') {
            window._redirecting = true;
            window.location.replace('athlete-dashboard.html');
          }
          window._authGuardRunning = false;
          return;
        }
      } catch (err) {
        console.error('Error checking sport:', err);
      }
      // Allow access to sport selection page if no sport
      window._authGuardRunning = false;
      return;
    }

    // On dashboard, if role mismatch, still send to their dashboard
    if (expectedDashboardRole && role && role !== expectedDashboardRole) {
      if (!window._redirecting) {
        window._redirecting = true;
        await redirectToRoleDashboard(role, user.uid);
      }
      window._authGuardRunning = false;
      return;
    }

    // For athlete dashboard, check if sport is selected
    if (expectedDashboardRole === 'athlete' && role === 'athlete') {
      try {
        const profile = await getUserProfile(user.uid);
        if (!profile || !profile.sport) {
          // No sport selected, redirect to sport selection
          if (!window._redirecting && currentPage !== 'athlete-select-sport.html') {
            window._redirecting = true;
            window.location.replace('athlete-select-sport.html');
          }
          window._authGuardRunning = false;
          return;
        }
      } catch (err) {
        console.error('Error checking sport:', err);
      }
    }

    // Enforce email verification on dashboards if enabled
    if (expectedDashboardRole && enforceEmailVerification && user.emailVerified === false) {
      if (!window._redirecting) {
        window._redirecting = true;
        redirectToRoleLogin(role || expectedDashboardRole);
      }
    }

    window._authGuardRunning = false;
  });
}

// Initialize guards on load
document.addEventListener('DOMContentLoaded', setupAuthGuards);

