/**
 * Firebase Loader with CDN Fallback
 * Attempts to load Firebase from CDN, with fallback options
 */

(function() {
  // Firebase CDN URLs (version 10.12.2 - compat version)
  const FIREBASE_URLS = [
    // Primary CDN
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
    // Alternative CDNs (if primary fails)
    'https://cdn.jsdelivr.net/npm/firebase@10.12.2/compat/firebase-app.js'
  ];

  const FIREBASE_AUTH_URLS = [
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
    'https://cdn.jsdelivr.net/npm/firebase@10.12.2/compat/firebase-auth.js'
  ];

  const FIREBASE_FIRESTORE_URLS = [
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
    'https://cdn.jsdelivr.net/npm/firebase@10.12.2/compat/firebase-firestore.js'
  ];

  /**
   * Load a script from a URL with fallback support
   */
  function loadScript(urls, callback) {
    if (!Array.isArray(urls)) {
      urls = [urls];
    }

    let urlIndex = 0;

    function loadNextUrl() {
      if (urlIndex >= urls.length) {
        console.error('✗ Failed to load Firebase from all CDN sources');
        if (callback) callback(false);
        return;
      }

      const url = urls[urlIndex];
      const script = document.createElement('script');
      
      script.onload = function() {
        console.log('✓ Loaded:', url);
        if (callback) callback(true);
      };

      script.onerror = function() {
        console.warn('✗ Failed to load from:', url);
        console.log('  Trying next CDN...');
        urlIndex++;
        loadNextUrl();
      };

      script.src = url;
      script.async = true;
      document.head.appendChild(script);
    }

    loadNextUrl();
  }

  /**
   * Load all Firebase scripts sequentially with fallback support
   */
  window.loadFirebaseWithFallback = function(callback) {
    console.log('Starting Firebase loader with fallback support...');

    // Load Firebase App first
    loadScript(FIREBASE_URLS, function(success) {
      if (!success) {
        if (callback) callback(false);
        return;
      }

      // Then load Auth
      loadScript(FIREBASE_AUTH_URLS, function(success) {
        if (!success) {
          if (callback) callback(false);
          return;
        }

        // Finally load Firestore
        loadScript(FIREBASE_FIRESTORE_URLS, function(success) {
          if (success) {
            console.log('✓ All Firebase libraries loaded successfully');
            if (callback) callback(true);
          } else {
            if (callback) callback(false);
          }
        });
      });
    });
  };

  // Auto-start if not already loaded
  if (typeof firebase === 'undefined') {
    window.loadFirebaseWithFallback();
  } else {
    console.log('✓ Firebase already loaded');
  }
})();
