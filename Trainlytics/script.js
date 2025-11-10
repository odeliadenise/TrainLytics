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

// Optional: Prevent form submit default behavior in demo pages if needed
function handleLoginSubmit(event) {
  // Replace this with real auth integration later
  // For now, just prevent page reload and log the role
  event.preventDefault();
  const form = event.target;
  const role = form.getAttribute('data-role');
  const email = form.querySelector('input[type="email"]')?.value || '';
  console.log(`Login attempt → role=${role}, email=${email}`);
  // Redirect to a placeholder dashboard if desired
  // window.location.href = `${role}-dashboard.html`;
  alert(`Logged in as ${role} (demo). Replace with real authentication.`);
}


// Demo handler for create-account submission
function handleSignupSubmit(event) {
  event.preventDefault();
  const formEl = event.target;
  const formData = {
    name: formEl.querySelector('#name')?.value || '',
    gender: formEl.querySelector('#gender')?.value || '',
    age: formEl.querySelector('#age')?.value || '',
    school: formEl.querySelector('#school')?.value || '',
    sport: formEl.querySelector('#sport')?.value || '',
    height: formEl.querySelector('#height')?.value || '',
    weight: formEl.querySelector('#weight')?.value || '',
    email: formEl.querySelector('#email')?.value || '',
    password: formEl.querySelector('#password')?.value || '',
  };
  console.log('Sign up data (demo):', formData);
  alert('Account created (demo). Replace with real sign-up flow.');
  // Example redirect:
  // window.location.href = 'athlete-login.html';
}

