// script.js (ES module) - Version 2.0 (Email verification removed)
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
  try {
    const snap = await getDoc(doc(db, 'profiles', uid));
    const role = snap.exists() ? snap.data().role : null;
    console.log('getUserRole - UID:', uid, 'Role:', role, 'Exists:', snap.exists());
    return role;
  } catch (err) {
    console.error('getUserRole error for UID:', uid, err);
    throw err;
  }
}

export async function getUserProfile(uid) {
  // Check localStorage first for instant loading
  const cachedProfile = localStorage.getItem(`profile_${uid}`);
  if (cachedProfile) {
    const profile = JSON.parse(cachedProfile);
    // Still fetch from Firebase in background to update cache
    getDoc(doc(db, 'profiles', uid)).then(snap => {
      if (snap.exists()) {
        const updatedProfile = snap.data();
        localStorage.setItem(`profile_${uid}`, JSON.stringify(updatedProfile));
      }
    }).catch(err => console.error('Background profile sync error:', err));
    return profile;
  }
  
  // If not in cache, fetch from Firebase
  const snap = await getDoc(doc(db, 'profiles', uid));
  if (snap.exists()) {
    const profileData = snap.data();
    // Cache it for next time
    localStorage.setItem(`profile_${uid}`, JSON.stringify(profileData));
    return profileData;
  }
  return null;
}

export function requireAuth(expectedRole) {
  onAuthStateChanged(auth, async (user) => {
    console.log('requireAuth called for role:', expectedRole, 'User:', user?.uid);
    if (!user) { 
      console.log('requireAuth - No user, redirecting to login');
      location.href = `${expectedRole}-login.html`; 
      return; 
    }
    try {
      const role = await getUserRole(user.uid);
      console.log('requireAuth - Got role:', role, 'Expected:', expectedRole);
      if (!role) {
        console.log('requireAuth - No role found, redirecting to login');
        location.href = `${expectedRole}-login.html`;
        return;
      }
      if (role !== expectedRole) {
        console.log('requireAuth - Role mismatch, redirecting to correct dashboard');
        location.href = `${role}-dashboard.html`;
        return;
      }
      // Role matches, allow access
      console.log('requireAuth - Role matches, allowing access');
      // Optional: update UI with user info
      const who = document.getElementById('whoami');
      if (who) who.textContent = `Signed in as ${role}.`;
    } catch (err) {
      console.error('requireAuth - Error getting role:', err);
      location.href = `${expectedRole}-login.html`;
    }
  });
}

export async function logout() {
  // Clear profile cache before logging out
  const currentUser = auth.currentUser;
  if (currentUser) {
    localStorage.removeItem(`profile_${currentUser.uid}`);
  }
  await signOut(auth);
  location.href = 'index.html'; // or role chooser
}

// ============================================
// Validation helpers
// ============================================

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  // Firebase requires a valid email format, so we need basic validation
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return trimmed.length > 0 && re.test(trimmed);
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
// Team member removal (for coach dashboard)
window.removeAthleteFromTeam = async function(athleteId) {
  // Find the active team in view
  const teamName = document.getElementById('teamDetailsName')?.textContent;
  if (!teamName) return alert('No team selected.');
  // Find team by name (could use ID if stored)
  let team = null;
  if (window.teams && Array.isArray(window.teams)) {
    team = window.teams.find(t => t.name === teamName);
  }
  if (!team) return alert('Team not found.');
  // Remove athlete from memberIds
  const newMembers = (team.memberIds || []).filter(id => id !== athleteId);
  team.memberIds = newMembers;
  // Update in Firebase
  try {
    await updateDoc(doc(db, 'teams', team.id), { memberIds: newMembers });
    alert('Athlete removed from team.');
    // Refresh team details view
    if (window.viewTeamDetails) window.viewTeamDetails(team.id);
  } catch (err) {
    alert('Failed to remove athlete: ' + err.message);
  }
};
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
    setFieldError(emailInput, 'Please enter your email address.');
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
      friendly = 'Please check your email address.';
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
    setFieldError(emailInput, 'Please enter a valid email address (e.g., user@example.com).');
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
    // Trim email before sending to Firebase
    const email = formData.email.trim();
    console.log('Attempting to create account with:', { email: email.substring(0, 5) + '...', passwordLength: formData.password.length, role });
    
    const cred = await createUserWithEmailAndPassword(auth, email, formData.password);
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
      email: email,
      role: role,
      createdAt: serverTimestamp()
    };
    
    // Add sport for both coaches and athletes
    if (formData.sport) {
      profile.sport = formData.sport;
    }
    
    // Add avatar if uploaded
    const avatarData = getAvatarData();
    if (avatarData) {
      profile.avatar = avatarData;
    }
    
    await setDoc(doc(db, 'profiles', user.uid), profile, { merge: true });
    
    // Cache the profile in localStorage for instant loading on other pages
    localStorage.setItem(`profile_${user.uid}`, JSON.stringify(profile));
    
    console.log('Profile created for user:', user.uid, 'with role:', role);
    
    // Verify profile was created by reading it back
    try {
      const verifyProfile = await getUserProfile(user.uid);
      console.log('Profile verification - Role:', verifyProfile?.role);
      if (!verifyProfile || !verifyProfile.role) {
        console.error('Profile verification failed - role not found');
        throw new Error('Profile creation verification failed');
      }
    } catch (verifyErr) {
      console.error('Error verifying profile:', verifyErr);
      showFormMessage(formEl, 'Account created but profile verification failed. Please try logging in.', 'error');
      restoreBtn();
      return;
    }

    // Account created successfully
    showFormMessage(formEl, 'Account created. You can now log in.', 'success');

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
    console.error('Full signup error object:', err);
    console.error('Error stack:', err.stack);
    const code = err && err.code ? String(err.code) : '';
    const message = err && err.message ? String(err.message) : '';
    const errorString = JSON.stringify(err, null, 2);
    console.error('Error JSON:', errorString);
    
    let friendly = 'Unable to create your account. Please review your details.';
    
    // Check for specific Firebase error codes
    if (code === 'auth/email-already-in-use' || message.includes('email-already-in-use')) {
      friendly = 'An account with this email already exists.';
    } else if (code === 'auth/weak-password' || message.includes('weak-password')) {
      friendly = 'Password is too weak. Please choose a stronger one (at least 6 characters).';
    } else if (code === 'auth/invalid-email' || message.includes('invalid-email')) {
      friendly = 'Please enter a valid email address (e.g., user@example.com).';
      if (emailInput) setFieldError(emailInput, 'Invalid email format.');
    } else if (code === 'auth/invalid-argument' || message.includes('invalid-argument')) {
      friendly = 'Invalid email or password format. Please check your details.';
    } else if (code === 'auth/operation-not-allowed' || message.includes('operation-not-allowed')) {
      friendly = 'Email/password signup is not enabled in Firebase. Please enable it in Firebase Console > Authentication > Sign-in method.';
    } else if (code === 'auth/network-request-failed' || message.includes('network')) {
      friendly = 'Network error. Please check your internet connection and try again.';
    } else if (code === 'auth/too-many-requests' || message.includes('too-many-requests')) {
      friendly = 'Too many requests. Please wait a moment and try again.';
    } else if (code) {
      friendly = `Error (${code}): ${message || 'Please check your details and try again.'}`;
    } else if (message) {
      friendly = `Error: ${message}`;
    } else {
      friendly = `Unable to create account. Full error logged to console. Error: ${errorString.substring(0, 200)}`;
    }
    
    console.error('Error code:', code, 'Message:', message);
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
    setFieldError(emailInput, 'Enter your email to reset your password.');
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showFormMessage(form, 'Password reset email sent. Please check your inbox.', 'success');
  } catch (err) {
    const code = err && err.code ? String(err.code) : '';
    let friendly = 'Unable to send reset email. Try again later.';
    if (code.includes('user-not-found')) friendly = 'No account found for this email.';
    if (code.includes('invalid-email')) friendly = 'Please check your email address.';
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
      console.log('Auth guard - User logged in, UID:', user.uid, 'Role:', role);
    } catch (err) {
      console.error('Auth guard - Error getting user role:', err);
      // If we can't get the role, redirect to login
      if (!isAuthPage) {
        window._redirecting = true;
        if (expectedDashboardRole === 'coach') {
          window.location.replace('coach-login.html');
        } else {
          window.location.replace('athlete-login.html');
        }
      }
      window._authGuardRunning = false;
      return;
    }
    
    // If no role found and on a protected page, redirect to login
    if (!role && !isAuthPage) {
      console.log('Auth guard - No role found for user, redirecting to login');
      window._redirecting = true;
      if (expectedDashboardRole === 'coach') {
        window.location.replace('coach-login.html');
      } else {
        window.location.replace('athlete-login.html');
      }
      window._authGuardRunning = false;
      return;
    }

    if (isAuthPage) {
      // Already logged in but on login/signup page
      if (window._loginInProgress) {
        // Let the login handler manage the redirect
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

    window._authGuardRunning = false;
  });
}

// Initialize guards on load
document.addEventListener('DOMContentLoaded', setupAuthGuards);

// ============================================
// Avatar Upload Functionality
// ============================================

export function initializeAvatarUpload() {
  const avatarUpload = document.getElementById('avatar-upload');
  const avatarPreview = document.getElementById('avatar-preview');
  const avatarPlaceholder = document.getElementById('avatar-placeholder');
  
  if (avatarUpload) {
    avatarUpload.addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (file) {
        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('File size must be less than 5MB');
          return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
          alert('Please select an image file');
          return;
        }
        
        // Preview the image
        const reader = new FileReader();
        reader.onload = function(e) {
          avatarPreview.src = e.target.result;
          avatarPreview.style.display = 'block';
          avatarPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

// Convert image to base64 for storage
export function getAvatarData() {
  const avatarPreview = document.getElementById('avatar-preview');
  if (avatarPreview && avatarPreview.style.display !== 'none') {
    return avatarPreview.src;
  }
  return null;
}


