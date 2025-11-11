// Simple role-based navigation from the landing page
function goToLogin(role) {
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

// Initialize Firebase using compat SDK if not already initialized
function initFirebaseIfNeeded() {
  if (!window.firebase || !window.firebaseConfig) {
    console.warn('Firebase SDK or config not loaded yet.');
    return null;
  }
  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }
  return {
    auth: firebase.auth(),
    db: firebase.firestore()
  };
}

// ---------- Client-side validation helpers ----------
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

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

function redirectToRoleDashboard(role) {
  if (role === 'coach') {
    window.location.href = 'coach-dashboard.html';
    return;
  }
  window.location.href = 'athlete-dashboard.html';
}

function redirectToRoleLogin(role) {
  if (role === 'coach') {
    window.location.href = 'coach-login.html';
    return;
  }
  window.location.href = 'athlete-login.html';
}

async function fetchUserRole(db, uid) {
  const docRef = db.collection('profiles').doc(uid);
  const snap = await docRef.get();
  return snap.exists ? (snap.data().role || null) : null;
}

// Login with Firebase Auth and route by Firestore profile role
async function handleLoginSubmit(event) {
  event.preventDefault();
  window._loginInProgress = true;
  const { auth, db } = initFirebaseIfNeeded() || {};
  if (!auth || !db) {
    showFormMessage(event.target, 'Authentication not initialized. Please try again.', 'error');
    window._loginInProgress = false;
    return;
  }
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
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const uid = cred.user?.uid;
    if (!uid) throw new Error('Missing user id after login.');
    const role = await fetchUserRole(db, uid);
    if (!role) {
      showFormMessage(form, 'No profile found. Please contact support.', 'error');
      return;
    }
    // Enforce page-specific role on login pages: block logging in with the wrong role
    if (desiredRole && role !== desiredRole) {
      try { await auth.signOut(); } catch (_e) {}
      const roleName = role === 'coach' ? 'Coach' : 'Athlete';
      const desiredName = desiredRole === 'coach' ? 'Coach' : 'Athlete';
      showFormMessage(form, `This account is a ${roleName} account. Please use the ${desiredName} login page.`, 'error');
      const pwdInput = form.querySelector('input[type="password"]');
      if (pwdInput) pwdInput.value = '';
      return;
    }
    redirectToRoleDashboard(role);
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
  } finally {
    restoreBtn();
    window._loginInProgress = false;
  }
}

// Sign up, create profile document, optional email verification, and route
async function handleSignupSubmit(event) {
  event.preventDefault();
  const { auth, db } = initFirebaseIfNeeded() || {};
  if (!auth || !db) {
    showFormMessage(event.target, 'Authentication not initialized. Please try again.', 'error');
    return;
  }
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
  formEl.querySelectorAll('input[required]').forEach((input) => {
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
    const cred = await auth.createUserWithEmailAndPassword(formData.email, formData.password);
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
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (role === 'coach' && formData.sport) {
      profile.sport = formData.sport;
    }
    await db.collection('profiles').doc(user.uid).set(profile, { merge: true });

    // Send email verification if available
    try {
      await user.sendEmailVerification();
      showFormMessage(formEl, 'Account created. Please verify your email, then log in.', 'success');
    } catch (_) {
      // Ignore if verification not enabled or fails
      showFormMessage(formEl, 'Account created. You can now log in.', 'success');
    }

    // Redirect to corresponding login
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

// Forgot password handler
async function handleForgotPassword(event) {
  event.preventDefault();
  const { auth } = initFirebaseIfNeeded() || {};
  if (!auth) return;
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
    await auth.sendPasswordResetEmail(email);
    showFormMessage(form, 'Password reset email sent. Please check your inbox.', 'success');
  } catch (err) {
    const code = err && err.code ? String(err.code) : '';
    let friendly = 'Unable to send reset email. Try again later.';
    if (code.includes('user-not-found')) friendly = 'No account found for this email.';
    if (code.includes('invalid-email')) friendly = 'Please enter a valid email.';
    showFormMessage(form, friendly, 'error');
  }
}

// Shared auth state guard and redirector
function setupAuthGuards() {
  const init = initFirebaseIfNeeded();
  if (!init) return;
  const { auth, db } = init;

  auth.onAuthStateChanged(async (user) => {
    const path = (location.pathname || '').toLowerCase();
    const isAuthPage = path.includes('login') || path.includes('create-account');
    const expectedDashboardRole = getRoleFromPageForDashboard(); // for dashboard pages only
    const params = new URLSearchParams(location.search || '');

    // Auto sign-out flow: visiting a login page with ?switch=1 logs out then reloads without the flag
    if (isAuthPage && params.get('switch') === '1') {
      try {
        await auth.signOut();
      } catch (_e) {}
      // Reload without the switch param to avoid loops
      const url = new URL(location.href);
      url.searchParams.delete('switch');
      location.replace(url.toString());
      return;
    }

    if (!user) {
      if (!isAuthPage) {
        // On a protected page, send to the correct login page based on URL
        if (expectedDashboardRole === 'coach') {
          window.location.href = 'coach-login.html';
        } else if (expectedDashboardRole === 'athlete') {
          window.location.href = 'athlete-login.html';
        } else {
          // Fallback to landing
          // window.location.href = 'index.html';
        }
      }
      return;
    }

    // User is logged in
    let role = null;
    try {
      role = await fetchUserRole(db, user.uid);
    } catch (_e) {}

    const enforceEmailVerification = !!(window.authOptions && window.authOptions.enforceEmailVerification);

    if (isAuthPage) {
      // Already logged in but on login/signup page
      if (window._loginInProgress) {
        // Avoid racing redirects while a form submission is handling logic
        return;
      }
      if (enforceEmailVerification && user.emailVerified === false) {
        // Stay on auth page and inform user
        const form = document.querySelector('form.auth-form');
        showFormMessage(form || document.body, 'Please verify your email before continuing.', 'error');
        return;
      }
      if (role) redirectToRoleDashboard(role);
      return;
    }

    // On dashboard, if role mismatch, still send to their dashboard
    if (expectedDashboardRole && role && role !== expectedDashboardRole) {
      redirectToRoleDashboard(role);
      return;
    }

    // Enforce email verification on dashboards if enabled
    if (expectedDashboardRole && enforceEmailVerification && user.emailVerified === false) {
      redirectToRoleLogin(role || expectedDashboardRole);
    }
  });
}

// Initialize guards on load
document.addEventListener('DOMContentLoaded', setupAuthGuards);

// Sign out and route to appropriate login page
async function logout() {
  const init = initFirebaseIfNeeded();
  if (!init) return;
  const { auth } = init;
  const dashboardRole = getRoleFromPageForDashboard();
  try {
    await auth.signOut();
  } catch (_e) {}
  if (dashboardRole) {
    redirectToRoleLogin(dashboardRole);
  } else {
    // Fallback to landing
    // window.location.href = 'index.html';
  }
}

