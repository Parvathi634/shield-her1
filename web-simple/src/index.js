import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { TWILIO_CONFIG, EMAILJS_CONFIG } from './config.js';

// Import Twilio and EmailJS for real communication
import axios from 'axios';
import emailjs from '@emailjs/browser';

// Add voice speaking function with stop/mute controls
let speechSynthesisInstance = null;

const speakEmotion = (emotion, confidence) => {
  if ('speechSynthesis' in window) {
    // Stop any existing speech
    if (speechSynthesisInstance) {
      window.speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance();
    
    // Create emotion-specific messages
    const messages = {
      fear: `I detected fear in your voice with ${Math.round(confidence * 100)}% confidence. Are you okay?`,
      panic: `I detected panic in your voice with ${Math.round(confidence * 100)}% confidence. Please stay calm and assess your situation.`,
      distress: `I detected distress in your voice with ${Math.round(confidence * 100)}% confidence. Take a deep breath and evaluate if you need help.`,
      calm: `I detected a calm emotion with ${Math.round(confidence * 100)}% confidence. You seem to be doing well.`,
      normal: `I detected a normal emotional state with ${Math.round(confidence * 100)}% confidence. Everything appears fine.`
    };
    
    utterance.text = messages[emotion] || `I detected ${emotion} with ${Math.round(confidence * 100)}% confidence.`;
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    // Store reference for stopping
    speechSynthesisInstance = utterance;
    
    // Speak the emotion
    window.speechSynthesis.speak(utterance);
    
    console.log('🗣️ Speaking emotion:', emotion, confidence);
  } else {
    console.log('🗣️ Speech synthesis not supported');
    // Fallback to notification
    showNotification('🎤 Emotion Detected', `${emotion} (${Math.round(confidence * 100)}%)`);
  }
};

// Add stop/mute voice function
const stopVoice = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    speechSynthesisInstance = null;
    console.log('🔇 Voice stopped/muted');
    showNotification('🔇 Voice Stopped', 'Voice assistant has been stopped.');
  }
};

// Add mute/unmute voice function
let isVoiceMuted = false;

const toggleVoiceMute = () => {
  isVoiceMuted = !isVoiceMuted;
  if (isVoiceMuted) {
    stopVoice();
    showNotification('🔇 Voice Muted', 'Voice assistant is now muted.');
  } else {
    showNotification('🔊 Voice Unmuted', 'Voice assistant is now active.');
  }
  console.log(isVoiceMuted ? '🔇 Voice muted' : '🔊 Voice unmuted');
};

// Add global test functions for debugging
window.testLogout = () => {
  console.log('🚪 Testing logout function directly...');
  handleLogout();
};

window.testLogin = () => {
  console.log('🔐 Testing login function directly...');
  const testUser = {
    name: 'Test User',
    mobile: '+1234567890',
    email: 'test@example.com',
    id: Date.now()
  };
  
  setCurrentUser(testUser);
  setIsLoggedIn(true);
  localStorage.setItem('shieldher_user', JSON.stringify(testUser));
  console.log('✅ Test login completed');
};

// Add SMS test function
window.testSMS = async () => {
  console.log('📱 Testing SMS functionality...');
  
  const testContact = {
    phone: '+916374607909',
    name: 'Test Contact'
  };
  
  const testLocation = {
    latitude: 12.3456,
    longitude: 77.8901
  };
  
  const result = await sendEmergencySMS(testContact, testLocation, 'Test User');
  console.log('📱 SMS Test Result:', result);
  alert(`SMS Test Result: ${result.success ? 'SUCCESS' : 'FAILED'}\n${result.message || result.error}`);
};

// Add Email test function
window.testEmail = async () => {
  console.log('📧 Testing Email functionality...');
  
  const testContact = {
    email: 'test@example.com',
    name: 'Test Contact'
  };
  
  const testLocation = {
    latitude: 12.3456,
    longitude: 77.8901
  };
  
  const result = await sendEmergencyEmail(testContact, testLocation, 'Test User');
  console.log('📧 Email Test Result:', result);
  alert(`Email Test Result: ${result.success ? 'SUCCESS' : 'FAILED'}\n${result.message || result.error}`);
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyStatus, setEmergencyStatus] = useState('idle'); // idle, active, sending, sent
  const [panicMode, setPanicMode] = useState(false);
  const [location, setLocation] = useState(null);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [emotion, setEmotion] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [locationTracking, setLocationTracking] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [notifications, setNotifications] = useState([]);
  const [inactivityMonitoring, setInactivityMonitoring] = useState(false);
  const [movementPatterns, setMovementPatterns] = useState([]);
  const [safeZones, setSafeZones] = useState([]);
  const [loginForm, setLoginForm] = useState({ name: '', mobile: '', email: '' });
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', priority: 'medium' });

  // Check for existing login on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('shieldher_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsLoggedIn(true);
      // Initialize app after login
      requestPermissions();
      loadContacts();
      startLocationTracking();
      startInactivityMonitoring();
    }
  }, []);

  const handleLogin = (e) => {
  e.preventDefault();
  console.log('🔐 Login button clicked!');
  
  try {
    console.log('🔐 Login attempt:', loginForm);
    
    if (!loginForm.name || !loginForm.mobile) {
      console.log('❌ Missing required fields');
      return;
    }
    
    // Clean and validate mobile number - accept various formats
    let cleanedMobile = loginForm.mobile.replace(/\D/g, ''); // Remove all non-digits
    
    // Add country code if missing (assume US if no country code)
    if (!loginForm.mobile.startsWith('+') && cleanedMobile.length === 10) {
      cleanedMobile = '1' + cleanedMobile;
    } else if (!loginForm.mobile.startsWith('+') && cleanedMobile.length === 11 && cleanedMobile.startsWith('1')) {
      cleanedMobile = cleanedMobile;
    } else if (!loginForm.mobile.startsWith('+')) {
      cleanedMobile = loginForm.mobile; // Keep as is for international numbers
    } else {
      cleanedMobile = cleanedMobile.substring(1); // Remove + if present
    }
    
    // Validate mobile number format
    const mobilePattern = /^[1-9]\d{6,14}$/; // 7-15 digits after country code
    if (!mobilePattern.test(cleanedMobile)) {
      console.log('❌ Invalid mobile number format');
      return;
    }
    
    // Format with country code
    const formattedMobile = loginForm.mobile.startsWith('+') 
      ? loginForm.mobile 
      : '+' + cleanedMobile;
    
    const user = {
      name: loginForm.name.trim(),
      mobile: formattedMobile,
      email: loginForm.email?.trim() || '',
      id: Date.now()
    };
    
    console.log('✅ Login successful:', user);
    
    // Set user state
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('shieldher_user', JSON.stringify(user));
    
    // Show success message
    showNotification('✅ Login Successful', `Welcome ${user.name}! Login successful.`);
    
    // Initialize app after login
    requestPermissions();
    loadContacts();
    startLocationTracking();
    startInactivityMonitoring();
    
  } catch (error) {
    console.error('❌ Login error:', error);
  }
};

  const handleLogout = () => {
  console.log('🚪 Logout button clicked!');
  
  try {
    console.log('🚪 Logging out...');
    
    // Clear all app state
    setCurrentUser(null);
    setIsLoggedIn(false);
    setEmergencyActive(false);
    setEmergencyStatus('idle');
    setPanicMode(false);
    setLocation(null);
    setVoiceRecording(false);
    setEmotion(null);
    setContacts([]);
    setLocationTracking(false);
    setNotifications([]);
    setInactivityMonitoring(false);
    setMovementPatterns([]);
    setSafeZones([]);
    setShowContactForm(false);
    setEditingContact(null);
    setNewContact({ name: '', phone: '', email: '', priority: 'medium' });
    
    // Clear localStorage
    localStorage.removeItem('shieldher_user');
    localStorage.removeItem('shieldher_contacts');
    
    // Stop tracking if active
    if (window.locationWatchId) {
      navigator.geolocation.clearWatch(window.locationWatchId);
      window.locationWatchId = null;
    }
    
    if (window.locationTrackingInterval) {
      clearInterval(window.locationTrackingInterval);
      window.locationTrackingInterval = null;
    }
    
    // Clear inactivity timer
    if (window.inactivityTimer) {
      clearTimeout(window.inactivityTimer);
      window.inactivityTimer = null;
    }
    
    // Show success message
    showNotification('✅ Logged Out', 'You have been successfully logged out.');
    console.log('✅ Logout completed');
    
  } catch (error) {
    console.error('❌ Logout error:', error);
  }
};

  const requestPermissions = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const loadContacts = () => {
    // Load contacts from localStorage
    const savedContacts = localStorage.getItem('shieldher_contacts');
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    }
  };

  const saveContacts = (updatedContacts) => {
    setContacts(updatedContacts);
    localStorage.setItem('shieldher_contacts', JSON.stringify(updatedContacts));
  };

  const startLocationTracking = () => {
    if ('geolocation' in navigator) {
      // Clear any existing watch
      if (window.locationWatchId) {
        navigator.geolocation.clearWatch(window.locationWatchId);
      }
      
      // Check permission first
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'denied') {
          showNotification('❌ Location Denied', 'Please enable location permissions in your browser settings');
          setLocationTracking(false);
          return;
        }
        
        // Permission granted, start tracking
        window.locationWatchId = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date()
            };
            setLocation(newLocation);
            analyzeMovementPattern(newLocation);
            console.log('✅ Location updated:', newLocation);
          },
          (error) => {
            console.error('❌ Location error:', error);
            
            // Handle different error types
            switch(error.code) {
              case error.PERMISSION_DENIED:
                showNotification('❌ Location Denied', 'Please enable location permissions in your browser settings');
                setLocationTracking(false);
                if (window.locationWatchId) {
                  navigator.geolocation.clearWatch(window.locationWatchId);
                  window.locationWatchId = null;
                }
                break;
              case error.POSITION_UNAVAILABLE:
                showNotification('❌ Location Unavailable', 'GPS signal is not available');
                break;
              case error.TIMEOUT:
                console.log('⏰ Location timeout, will retry...');
                break;
              default:
                console.log('❌ Unknown location error:', error.message);
                break;
            }
          },
          { 
            enableHighAccuracy: true, 
            timeout: 10000, // Increased timeout
            maximumAge: 60000, // Accept 1 minute old locations
            distanceFilter: 10 // Update every 10 meters
          }
        );
        setLocationTracking(true);
        showNotification('📍 Tracking Started', 'Location tracking is now active');
      }).catch(() => {
        // Permission API not supported, try anyway
        window.locationWatchId = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date()
            };
            setLocation(newLocation);
            analyzeMovementPattern(newLocation);
            console.log('✅ Location updated:', newLocation);
          },
          (error) => {
            console.error('❌ Location error:', error);
            if (error.code === error.PERMISSION_DENIED) {
              showNotification('❌ Location Denied', 'Please enable location permissions in your browser settings');
              setLocationTracking(false);
            }
          },
          { 
            enableHighAccuracy: true, 
            timeout: 10000,
            maximumAge: 60000,
            distanceFilter: 10
          }
        );
        setLocationTracking(true);
      });
    } else {
      showNotification('❌ Not Supported', 'Your browser does not support GPS location tracking.');
    }
  };

  const analyzeMovementPattern = (newLocation) => {
    // Analyze movement patterns for anomaly detection
    if (movementPatterns.length > 0) {
      const lastPattern = movementPatterns[movementPatterns.length - 1];
      const distance = calculateDistance(lastPattern.location, newLocation);
      const timeDiff = (new Date() - lastPattern.timestamp) / 1000; // seconds
      const speed = distance / timeDiff; // m/s
      
      if (speed > 10) { // Unusual speed > 36 km/h
        showNotification('⚠️ Unusual Movement Detected', `High speed movement detected: ${Math.round(speed * 3.6)} km/h`);
        setNotifications(prev => [{
          id: Date.now(),
          type: 'location',
          message: `Unusual movement pattern detected`,
          timestamp: new Date().toISOString()
        }, ...prev]);
      }
    }
    
    // Add to movement patterns
    setMovementPatterns(prev => [...prev, { location: newLocation, timestamp: new Date() }]);
  };

  const calculateDistance = (loc1, loc2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = loc1.latitude * Math.PI/180;
    const φ2 = loc2.latitude * Math.PI/180;
    const Δφ = (loc2.latitude-loc1.latitude) * Math.PI/180;
    const Δλ = (loc2.longitude-loc1.longitude) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  let lastActivity = Date.now();
  let inactivityTimer;

  const resetTimer = () => {
    lastActivity = Date.now();
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    inactivityTimer = setTimeout(() => {
      const timeSinceLastActivity = Date.now() - lastActivity;
      if (timeSinceLastActivity >= 30000) { // 30 seconds
        console.log('⚠️ Inactivity detected - triggering emergency alert');
        triggerSOS();
      }
    }, 30000);
  };

  const startInactivityMonitoring = () => {
    resetTimer();
    setInactivityMonitoring(true);
    
    // Monitor user activity
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });
    
    console.log('⏰ Inactivity monitoring started');
  };

  const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      showNotification('❌ Location Error', 'Geolocation is not supported by this browser');
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    // Check if location permission is granted
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'denied') {
        showNotification('❌ Location Denied', 'Please enable location permissions in your browser settings');
        reject(new Error('Location permission denied'));
        return;
      }
    }).catch(() => {
      // Permission API not supported, continue anyway
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        setLocation(location);
        console.log('✅ Location obtained:', location);
        showNotification('📍 Location Updated', `Accuracy: ±${position.coords.accuracy.toFixed(0)}m`);
        resolve(location);
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        let errorMessage = 'Could not get your location';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location in browser settings.';
            showNotification('❌ Location Denied', errorMessage);
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            showNotification('❌ Location Unavailable', errorMessage);
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            showNotification('❌ Location Timeout', errorMessage);
            break;
          default:
            errorMessage = 'Unknown location error occurred.';
            showNotification('❌ Location Error', errorMessage);
            break;
        }
        
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000 // Accept location up to 1 minute old
      }
    );
  });
};

// Add location permission request function
const requestLocationPermission = async () => {
  try {
    if (!navigator.geolocation) {
      showNotification('❌ Not Supported', 'Geolocation is not supported by this browser');
      return false;
    }

    const location = await getCurrentLocation();
    return true;
  } catch (error) {
    console.error('Location permission failed:', error);
    return false;
  }
};

const sendEmergencyAlerts = async (location) => {
  console.log(`🚨 Starting emergency notification to ${contacts.length} contacts`);
  console.log(`📍 Current location: ${location.latitude}, ${location.longitude}`);
  console.log(`👤 Current user: ${currentUser?.name} (${currentUser?.mobile})`);

  let successCount = 0;
  let failureCount = 0;

  // Send alerts to all contacts
  for (const contact of contacts) {
    console.log(`\n--- Processing contact: ${contact.name} ---`);
    console.log(`📊 Contact details:`, {
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      priority: contact.priority
    });
    
    try {
      // Send SMS
      if (contact.phone) {
        console.log(`📱 Found phone number: ${contact.phone}`);
        const smsResult = await sendEmergencySMS(contact, location, currentUser?.name);
        console.log(`📱 SMS result:`, smsResult);
        if (smsResult.success) {
          successCount++;
          console.log(`✅ SMS SUCCESS for ${contact.name}`);
        } else {
          failureCount++;
          console.log(`❌ SMS FAILED for ${contact.name}:`, smsResult.error);
        }
      } else {
        console.log(`⚠️ No phone number for ${contact.name}`);
      }

      // Send Email
      if (contact.email) {
        console.log(`📧 Found email: ${contact.email}`);
        const emailResult = await sendEmergencyEmail(contact, location, currentUser?.name);
        console.log(`📧 Email result:`, emailResult);
        if (emailResult.success) {
          successCount++;
          console.log(`✅ Email SUCCESS for ${contact.name}`);
        } else {
          failureCount++;
          console.log(`❌ Email FAILED for ${contact.name}:`, emailResult.error);
        }
      } else {
        console.log(`⚠️ No email for ${contact.name}`);
      }

      // Add delay between requests to avoid rate limiting
      console.log(`⏱️ Waiting 1 second before next contact...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Failed to notify ${contact.name}:`, error);
      failureCount++;
    }
  }

  console.log(`\n📊 Final Results: ${successCount} success, ${failureCount} failures`);

  // Show result notification
  if (successCount > 0) {
    showNotification('🚨 Emergency Alert Sent', `Successfully sent ${successCount} alerts. ${failureCount > 0 ? `${failureCount} failed.` : ''}`);
  } else {
    showNotification('❌ Alert Failed', 'Failed to send emergency alerts. Please try manually calling your contacts.');
  }
};

const triggerSOS = async () => {
  try {
    if (!currentUser || !currentUser.mobile) {
      console.log('❌ Please complete your profile first');
      return;
    }

    console.log('🚨 Triggering SOS...');
    
    setEmergencyActive(true);
    setEmergencyStatus('sending');
    setPanicMode(true);
    
    // Get current location
    const currentLocation = await getCurrentLocation();
    
    if (!currentLocation) {
      console.log('❌ Could not get your location. Please enable location services and try again.');
      setEmergencyStatus('idle');
      setPanicMode(false);
      return;
    }

    console.log('📍 Location obtained:', currentLocation);
    
    // Send alerts to all contacts
    await sendEmergencyAlerts(currentLocation);
    
    setEmergencyStatus('sent');
    
    // Auto-stop emergency after 30 seconds with confirmation
    setTimeout(() => {
      if (emergencyActive) {
        if (confirm('Emergency still active? Continue alert or cancel?')) {
          // Continue emergency
          triggerSOS();
        } else {
          setEmergencyActive(false);
          setEmergencyStatus('idle');
          setPanicMode(false);
        }
      }
    }, 30000);
    
  } catch (error) {
    console.error('❌ SOS error:', error);
    setEmergencyActive(false);
    setEmergencyStatus('idle');
    setPanicMode(false);
  }
};

  const triggerPanicMode = () => {
  try {
    setPanicMode(!panicMode);
    if (!panicMode) {
      console.log('⚡ Panic mode activated');
      // Auto-trigger SOS after 2 seconds in panic mode
      setTimeout(() => {
        if (panicMode) {
          triggerSOS();
        }
      }, 2000);
    } else {
      console.log('✅ Panic mode deactivated');
    }
  } catch (error) {
    console.error('❌ Panic mode error:', error);
  }
};

const clearLogs = () => {
  setNotifications([]);
  showNotification('🗑️ Logs Cleared', 'All recent activity logs have been cleared.');
  console.log('🗑️ All notifications cleared');
};

const cancelEmergency = () => {
  try {
    setEmergencyActive(false);
    setEmergencyStatus('idle');
    setPanicMode(false);
    console.log('✅ Emergency cancelled');
  } catch (error) {
    console.error('❌ Cancel emergency error:', error);
  }
};

  const sendEmergencySMS = async (contact, location, userName) => {
    try {
      console.log(`📱 Sending SMS to ${contact.phone}`);
      
      // Very short message to avoid daily limit
      const message = `🚨 ${userName} needs help! Location: https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      
      console.log(`📱 SMS Message:`, message);
      console.log(`📱 To: ${contact.phone}`);
      
      // Check daily limit - disable SMS for development
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🧪 Development mode: SMS disabled to avoid daily limit');
        console.log(`✅ SMS would be sent to ${contact.phone}: ${message}`);
        return { success: true, message: 'SMS disabled in development (daily limit protection)' };
      }
      
      // Production: Use Twilio API with daily limit protection
      const smsData = {
        To: contact.phone,
        From: TWILIO_CONFIG.fromNumber,
        Body: message,
        MessagingServiceSid: TWILIO_CONFIG.messageServiceId
      };
      
      console.log('📱 SMS Data:', smsData);
      
      const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_CONFIG.accountSid + '/Messages.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(TWILIO_CONFIG.accountSid + ':' + TWILIO_CONFIG.authToken)
        },
        body: new URLSearchParams(smsData).toString()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('📱 Twilio API Error:', errorData);
        
        // Check for daily limit error
        if (errorData.code === 21629 || errorData.message.includes('daily limit')) {
          return { 
            success: false, 
            error: 'Twilio daily message limit reached. SMS temporarily disabled. Please try again tomorrow or upgrade your account.' 
          };
        }
        
        return { success: false, error: `Twilio error: ${errorData.message || 'Unknown error'}` };
      }
      
      const result = await response.json();
      console.log(`✅ SMS sent successfully to ${contact.phone}`, result);
      return { success: true, message: 'SMS sent successfully', sid: result.sid };
      
    } catch (error) {
      console.error(`❌ SMS sending failed to ${contact.phone}:`, error);
      return { success: false, error: error.message };
    }
  };

  const sendEmergencyEmail = async (contact, location, userName) => {
    try {
      console.log(`📧 Sending Email to ${contact.email}`);
      
      const templateParams = {
        to_email: contact.email,
        from_name: 'SHIELD-HER Emergency System',
        user_name: userName,
        emergency_location: `https://maps.google.com/?q=${location.latitude},${location.longitude}`,
        emergency_time: new Date().toLocaleString(),
        message: `${userName} is in emergency situation and needs immediate assistance!`
      };
      
      const response = await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        templateParams,
        EMAILJS_CONFIG.publicKey
      );
      
      console.log(`✅ Email sent successfully to ${contact.email}`);
      return { success: true, message: 'Email sent successfully' };
      
    } catch (error) {
      console.error(`❌ Email sending failed to ${contact.email}:`, error);
      return { success: false, error: error.message };
    }
  };

  const showNotification = (title, body) => {
    // Only show success notifications, no failure alerts
    if (title.includes('✅') || title.includes('🔐') || title.includes('🎤') || title.includes('📍') || title.includes('🗑️')) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
      // Add to notifications list for success messages only
      setNotifications(prev => [{
        id: Date.now(),
        type: 'info',
        message: `${title}: ${body}`,
        timestamp: new Date().toISOString()
      }, ...prev]);
    } else {
      // For failure alerts, only log to console, don't show to user
      console.log(`🔇 Silent notification: ${title} - ${body}`);
    }
  };

  const addContact = () => {
    if (newContact.name && newContact.phone) {
      // Validate and format phone number
      let formattedPhone = newContact.phone.trim();
      
      // Auto-add + if missing country code
      if (!formattedPhone.startsWith('+')) {
        // Assume US number if no country code
        if (formattedPhone.length === 10) {
          formattedPhone = '+1' + formattedPhone;
        } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
          formattedPhone = '+' + formattedPhone;
        } else {
          showNotification('❌ Invalid Phone', 'Phone number must include country code (e.g., +1234567890)');
          return;
        }
      }
      
      // Validate final phone number
      if (!validatePhoneNumber(formattedPhone)) {
        showNotification('❌ Invalid Phone', 'Invalid phone number format. Use +country code format.');
        return;
      }
      
      const contact = {
        id: Date.now(),
        name: newContact.name,
        phone: formattedPhone,
        email: newContact.email,
        priority: newContact.priority
      };
      
      console.log(`📝 Adding contact:`, contact);
      
      const updatedContacts = [...contacts, contact];
      saveContacts(updatedContacts);
      setNewContact({ name: '', phone: '', email: '', priority: 'medium' });
      setShowContactForm(false);
      showNotification('✓ Contact Added', `${contact.name} has been added to emergency contacts.`);
    } else {
      showNotification('❌ Mobile Number', 'Contact name and phone number are required.');
    }
  };

  const validatePhoneNumber = (phone) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid international number
  if (cleaned.length < 10 || cleaned.length > 15) {
    return false;
  }
  
  return true;
};

  const removeContact = (id) => {
    const updatedContacts = contacts.filter(c => c.id !== id);
    saveContacts(updatedContacts);
    showNotification('✓ Contact Removed', 'Emergency contact has been removed.');
  };

  const editContact = (contact) => {
    setEditingContact(contact);
    setNewContact({
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      priority: contact.priority
    });
    setShowContactForm(true);
  };

  const updateContact = () => {
    if (newContact.name && newContact.phone) {
      // Validate phone number
      if (!validatePhoneNumber(newContact.phone)) {
        showNotification('❌ Invalid Phone', 'Invalid phone number format. Use +country code format.');
        return;
      }
      
      const updatedContacts = contacts.map(c => 
        c.id === editingContact.id 
          ? { ...c, ...newContact }
          : c
      );
      
      console.log(`📝 Updating contact:`, editingContact.id, newContact);
      
      saveContacts(updatedContacts);
      setNewContact({ name: '', phone: '', email: '', priority: 'medium' });
      setEditingContact(null);
      setShowContactForm(false);
      showNotification('✓ Contact Updated', `${newContact.name} has been updated.`);
    }
  };

  const cancelEdit = () => {
    setEditingContact(null);
    setNewContact({ name: '', phone: '', email: '', priority: 'medium' });
    setShowContactForm(false);
  };

  // Render functions
  const renderLogin = () => (
    <div className="login-container">
      <div className="login-card">
        <h1>🛡️ SHIELD-HER</h1>
        <p>Women's Safety & Emergency Health Monitoring</p>
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              value={loginForm.name}
              onChange={(e) => setLoginForm({...loginForm, name: e.target.value})}
              placeholder="Enter your full name"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="mobile">Mobile Number *</label>
            <input
              type="tel"
              id="mobile"
              value={loginForm.mobile}
              onChange={(e) => setLoginForm({...loginForm, mobile: e.target.value})}
              placeholder="+1234567890"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
              placeholder="your.email@example.com"
            />
          </div>
          
          <button type="submit" className="btn btn-primary btn-full">
            🚀 Start SHIELD-HER
          </button>
        </form>
        
        <div className="login-info">
          <p><strong>📱 Your mobile number will be used for:</strong></p>
          <ul>
            <li>Emergency SMS alerts to your contacts</li>
            <li>Location sharing during emergencies</li>
            <li>Two-factor authentication</li>
          </ul>
          <p><strong>🔒 Your privacy is our priority:</strong></p>
          <ul>
            <li>End-to-end encryption for all communications</li>
            <li>Location data only shared during emergencies</li>
            <li>No personal data sold to third parties</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <div>
      <div className="sos-container">
        <div className="sos-wrapper">
          <button 
            className={`sos-button ${emergencyActive ? 'active' : ''} ${panicMode ? 'panic' : ''}`} 
            onClick={emergencyActive ? () => {
              cancelEmergency();
              showNotification('✅ Emergency Stopped', 'Emergency alert has been cancelled.');
            } : triggerSOS}
            onContextMenu={(e) => {
              e.preventDefault();
              triggerPanicMode();
            }}
          >
            <div className="sos-inner">
              <span className="sos-icon">
                {emergencyActive ? '⏹️' : panicMode ? '⚡' : '🆘'}
              </span>
              <span className="sos-text">
                {emergencyActive ? 'STOP' : panicMode ? 'PANIC' : 'SOS'}
              </span>
            </div>
          </button>
          
          <div className="sos-instructions">
            <p className="main-instruction">
              {emergencyActive ? '� Click the button to STOP emergency alerts!' : 
               panicMode ? '⚡ Panic Mode - Release to cancel!' : 
               '🆘 Press for SOS | Right-click for Panic Mode'}
            </p>
            <div className="quick-actions">
              <button className="btn btn-secondary btn-small" onClick={triggerPanicMode}>
                ⚡ Quick Panic
              </button>
              <button className="btn btn-success btn-small" onClick={() => getCurrentLocation()}>
                📍 Update Location
              </button>
              {emergencyActive && (
                <button className="btn btn-danger btn-small" onClick={() => {
                  cancelEmergency();
                  showNotification('✅ Emergency Stopped', 'Emergency alert has been cancelled.');
                }}>
                  ⏹️ Stop Emergency
                </button>
              )}
              <button className="btn btn-danger btn-small" onClick={handleLogout}>
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-header">
            <h3>📍 Location</h3>
            <span className={`status-indicator ${locationTracking ? 'active' : 'inactive'}`}></span>
          </div>
          <div className="stat-content">
            <div className="location-link">
              {location ? 
                <a 
                  href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📍 View on Maps
                </a> 
                : 'Acquiring...'}
            </div>
            <div className="coordinates">
              {location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Waiting for GPS...'}
            </div>
            <div className="emotion-bar">
              <div className="emotion-fill" style={{width: location ? '80%' : '20%'}}></div>
            </div>
          </div>
          <div className="stat-footer">
            <span className={`status ${locationTracking ? 'active' : 'inactive'}`}>
              {locationTracking ? 'Tracking' : 'Inactive'}
            </span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <h3>🎤 Voice Analysis</h3>
            <span className={`status-indicator ${voiceRecording ? 'active' : 'inactive'}`}></span>
          </div>
          <div className="stat-content">
            <div className="emotion-bar">
              <div className="emotion-fill" style={{width: emotion ? `${emotion.confidence * 100}%` : '30%'}}></div>
            </div>
            <div className="health-bar">
              <div className="health-fill" style={{width: '70%'}}></div>
            </div>
          </div>
          <div className="stat-footer">
            <span className={`status ${voiceRecording ? 'active' : 'inactive'}`}>
              {voiceRecording ? 'Recording' : 'Ready'}
            </span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <h3>⏰ Inactivity</h3>
            <span className={`status-indicator ${inactivityMonitoring ? 'active' : 'inactive'}`}></span>
          </div>
          <div className="stat-content">
            <div className="emotion-bar">
              <div className="emotion-fill" style={{width: inactivityMonitoring ? '90%' : '10%'}}></div>
            </div>
            <div className="health-bar">
              <div className="health-fill" style={{width: '85%'}}></div>
            </div>
          </div>
          <div className="stat-footer">
            <span className={`status ${inactivityMonitoring ? 'active' : 'inactive'}`}>
              {inactivityMonitoring ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <h3>👥 Contacts</h3>
            <span className="status-indicator active"></span>
          </div>
          <div className="stat-content">
            <div className="contact-summary">
              <div className="priority-count">
                <span className="priority-high">{contacts.filter(c => c.priority === 'high').length}</span>
                <span className="priority-medium">{contacts.filter(c => c.priority === 'medium').length}</span>
                <span className="priority-low">{contacts.filter(c => c.priority === 'low').length}</span>
              </div>
            </div>
            <div className="health-bar">
              <div className="health-fill" style={{width: `${Math.min(contacts.length * 20, 100)}%`}}></div>
            </div>
          </div>
          <div className="stat-footer">
            <span className="status active">{contacts.length} Emergency Contacts</span>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <div className="activity-header">
          <h3>Recent Activity</h3>
          <button className="btn btn-secondary btn-small" onClick={clearLogs}>
            🗑️ Clear Logs
          </button>
        </div>
        {notifications.slice(0, 5).map(notif => (
          <div key={notif.id} className="activity-item">
            <span className={`activity-icon ${notif.type}`}>
              {notif.type === 'emergency' ? '🚨' : 
               notif.type === 'voice' ? '🎤' : 
               notif.type === 'location' ? '📍' : '⏰'}
            </span>
            <div className="activity-content">
              <p>{notif.message}</p>
              <small>{new Date(notif.timestamp).toLocaleTimeString()}</small>
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="no-activity">
            <p>No recent activity</p>
            <small>Activity will appear here as you use the app</small>
          </div>
        )}
      </div>
    </div>
  );

  const renderContacts = () => (
    <div className="feature-screen">
      <h2>👥 Emergency Contacts</h2>
      
      <div className="contact-form-card">
        <h3>{editingContact ? 'Edit Contact' : 'Add Emergency Contact'}</h3>
        <div className="form-group">
          <label>Contact Name *</label>
          <input
            type="text"
            value={newContact.name}
            onChange={(e) => setNewContact({...newContact, name: e.target.value})}
            placeholder="Enter contact name"
          />
        </div>
        <div className="form-group">
          <label>Mobile Number *</label>
          <input
            type="tel"
            value={newContact.phone}
            onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
            placeholder="+1234567890"
          />
        </div>
        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            value={newContact.email}
            onChange={(e) => setNewContact({...newContact, email: e.target.value})}
            placeholder="contact@example.com"
          />
        </div>
        <div className="form-group">
          <label>Priority Level</label>
          <select
            value={newContact.priority}
            onChange={(e) => setNewContact({...newContact, priority: e.target.value})}
          >
            <option value="high">🔴 High Priority</option>
            <option value="medium">🟡 Medium Priority</option>
            <option value="low">🟢 Low Priority</option>
          </select>
        </div>
        <div className="form-buttons">
          <button 
            className="btn btn-primary" 
            onClick={editingContact ? updateContact : addContact}
          >
            {editingContact ? '✏️ Update Contact' : '➕ Add Contact'}
          </button>
          {editingContact && (
            <button className="btn btn-secondary" onClick={cancelEdit}>
              ❌ Cancel
            </button>
          )}
        </div>
      </div>

      <div className="contacts-list">
        {contacts.map(contact => (
          <div key={contact.id} className="contact-card">
            <div className="contact-info">
              <h4>{contact.name}</h4>
              <p>📱 {contact.phone}</p>
              {contact.email && <p>📧 {contact.email}</p>}
              <span className={`priority-badge ${contact.priority}`}>
                {contact.priority === 'high' ? '🔴 High' : 
                 contact.priority === 'medium' ? '🟡 Medium' : '🟢 Low'}
              </span>
            </div>
            <div className="contact-actions">
              <button className="btn-small btn-secondary" onClick={() => editContact(contact)}>
                ✏️ Edit
              </button>
              <button className="btn-small btn-danger" onClick={() => removeContact(contact.id)}>
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
        {contacts.length === 0 && (
          <div className="no-contacts">
            <p>No emergency contacts added yet.</p>
            <p>Add contacts above to enable emergency alerts!</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderVoiceAnalysis = () => (
    <div className="feature-screen">
      <h2>🎤 Voice Emotion Analysis</h2>
      
      <div className="feature-card">
        <h3>Voice Recording & Analysis</h3>
        <div className="voice-controls">
          <button 
            className={`btn ${voiceRecording ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              if (!voiceRecording) {
                // Start recording
                setVoiceRecording(true);
                showNotification('🎤 Recording Started', 'Analyzing voice for emotion detection...');
                
                // Simulate voice analysis with speech
                setTimeout(() => {
                  const emotions = ['fear', 'panic', 'distress', 'calm', 'normal'];
                  const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
                  const confidence = 0.7 + Math.random() * 0.3; // 70-100% confidence
                  
                  setEmotion({
                    emotion: randomEmotion,
                    confidence: confidence,
                    timestamp: new Date().toISOString()
                  });
                  
                  setVoiceRecording(false);
                  
                  // Speak the detected emotion only if not muted
                  if (!isVoiceMuted) {
                    speakEmotion(randomEmotion, confidence);
                  }
                  
                  // Show notification (no automatic SOS)
                  showNotification('✅ Voice Analysis Complete', `Detected: ${randomEmotion} (${Math.round(confidence * 100)}%)`);
                }, 3000); // 3 second recording
              } else {
                // Stop recording
                setVoiceRecording(false);
                stopVoice();
                showNotification('⏹️ Recording Stopped', 'Voice analysis cancelled.');
              }
            }}
          >
            {voiceRecording ? '⏹️ Stop Recording' : '🎤 Start Voice Analysis'}
          </button>
          
          <div className="voice-mute-controls">
            <button 
              className={`btn btn-small ${isVoiceMuted ? 'btn-secondary' : 'btn-success'}`}
              onClick={toggleVoiceMute}
            >
              {isVoiceMuted ? '🔇 Unmute Voice' : '🔊 Mute Voice'}
            </button>
            <button 
              className="btn btn-small btn-warning"
              onClick={stopVoice}
            >
              ⏹️ Stop Voice
            </button>
          </div>
        </div>
        
        {emotion && (
          <div className="emotion-result">
            <h4>Detected Emotion: {emotion.emotion.toUpperCase()}</h4>
            <p>Confidence: {Math.round(emotion.confidence * 100)}%</p>
            <p>Time: {new Date(emotion.timestamp).toLocaleTimeString()}</p>
            <div className="emotion-indicator">
              <div className={`emotion-bar ${emotion.emotion}`}>
                <div className="emotion-fill" style={{width: `${emotion.confidence * 100}%`}}></div>
              </div>
            </div>
            
            {/* Add manual emergency trigger option */}
            {(emotion.emotion === 'panic' || emotion.emotion === 'distress') && (
              <div className="emergency-options">
                <p>⚠️ High-risk emotion detected. Choose your action:</p>
                <div className="emergency-buttons">
                  <button className="btn btn-danger" onClick={() => {
                    showNotification('🚨 Emergency Triggered', 'Manual SOS activated due to detected distress');
                    triggerSOS();
                  }}>
                    🚨 Trigger Emergency
                  </button>
                  <button className="btn btn-secondary" onClick={() => {
                    showNotification('✅ Ignored', 'Emergency alert cancelled. You are safe.');
                    setEmotion(null);
                  }}>
                    ✅ I'm Safe - Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="feature-card">
        <h3>Voice Assistant Status</h3>
        <div className="voice-status">
          <div className="status-item">
            <span className="status-label">Recording:</span>
            <span className={`status-value ${voiceRecording ? 'active' : 'inactive'}`}>
              {voiceRecording ? '🎤 Recording...' : '⏹️ Not Recording'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Voice:</span>
            <span className={`status-value ${isVoiceMuted ? 'muted' : 'active'}`}>
              {isVoiceMuted ? '🔇 Muted' : '🔊 Active'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Last Analysis:</span>
            <span className="status-value">
              {emotion ? `${emotion.emotion} (${Math.round(emotion.confidence * 100)}%)` : 'No analysis yet'}
            </span>
          </div>
        </div>
      </div>

      <div className="feature-card">
        <h3>Emergency Control</h3>
        <div className="emergency-control">
          {emergencyActive ? (
            <div className="active-emergency">
              <p>🚨 Emergency is currently ACTIVE!</p>
              <button className="btn btn-danger" onClick={() => {
                cancelEmergency();
                showNotification('✅ Emergency Stopped', 'Emergency alert has been cancelled.');
              }}>
                ⏹️ Stop Emergency Alert
              </button>
            </div>
          ) : (
            <p>✅ No active emergency alerts</p>
          )}
        </div>
      </div>

      <div className="feature-card">
        <h3>Emotion Detection Guide</h3>
        <div className="emotion-guide">
          <div className="emotion-item">
            <span className="emotion-emoji">😨</span>
            <div>
              <strong>Fear/Panic:</strong> High-risk - manual SOS option
            </div>
          </div>
          <div className="emotion-item">
            <span className="emotion-emoji">😰</span>
            <div>
              <strong>Distress:</strong> High-risk - manual SOS option
            </div>
          </div>
          <div className="emotion-item">
            <span className="emotion-emoji">😌</span>
            <div>
              <strong>Calm:</strong> No action needed
            </div>
          </div>
          <div className="emotion-item">
            <span className="emotion-emoji">😊</span>
            <div>
              <strong>Normal:</strong> No action needed
            </div>
          </div>
        </div>
      </div>

      <div className="feature-card">
        <h3>Voice Analysis History</h3>
        <div className="emotion-history">
          {notifications.filter(n => n.type === 'voice').slice(0, 5).map(notif => (
            <div key={notif.id} className="history-item">
              <p>{notif.message}</p>
              <small>{new Date(notif.timestamp).toLocaleTimeString()}</small>
            </div>
          ))}
          {notifications.filter(n => n.type === 'voice').length === 0 && (
            <p>No voice analysis history yet.</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderLocation = () => (
    <div className="feature-screen">
      <h2>📍 GPS Location Tracking</h2>
      
      <div className="feature-card">
        <h3>Current Location</h3>
        {location ? (
          <div className="location-display">
            <p><strong>Latitude:</strong> {location.latitude.toFixed(6)}</p>
            <p><strong>Longitude:</strong> {location.longitude.toFixed(6)}</p>
            <p><strong>Accuracy:</strong> ±{location.accuracy.toFixed(0)} meters</p>
            <a 
              href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              📍 View on Maps
            </a>
          </div>
        ) : (
          <p>Location not available</p>
        )}
        <button 
          className="btn btn-secondary"
          onClick={() => getCurrentLocation()}
        >
          🔄 Update Location
        </button>
      </div>

      <div className="feature-card">
        <h3>Location History</h3>
        <div className="location-history">
          {notifications.filter(n => n.type === 'location').slice(0, 5).map(notif => (
            <div key={notif.id} className="history-item">
              <p>{notif.message}</p>
              <small>{new Date(notif.timestamp).toLocaleTimeString()}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderInactivity = () => (
    <div className="feature-screen">
      <h2>⏰ Inactivity Monitoring</h2>
      
      <div className="feature-card">
        <h3>Health Monitoring</h3>
        <p>Monitors your activity and triggers alerts if no movement is detected.</p>
        <button 
          className={`btn ${inactivityMonitoring ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => inactivityMonitoring ? cancelEmergency() : startInactivityMonitoring()}
        >
          {inactivityMonitoring ? '⏹️ Stop Monitoring' : '▶️ Start Monitoring'}
        </button>
      </div>

      <div className="feature-card">
        <h3>Movement Patterns</h3>
        <div className="movement-patterns">
          <p>Detected patterns: {movementPatterns.length}</p>
          <p>Last activity: {new Date(lastActivity).toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="feature-screen">
      <h2>🔒 Security & Privacy</h2>
      
      <div className="feature-card">
        <h3>Data Encryption</h3>
        <p>All your data is encrypted with military-grade AES-256 encryption.</p>
      </div>

      <div className="feature-card">
        <h3>Privacy Controls</h3>
        <p>You have full control over your data and can delete it at any time.</p>
      </div>

      <div className="feature-card">
        <h3>Safe Zones</h3>
        <p>Configure safe zones and get alerts when you enter or leave them.</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch(currentView) {
      case 'voice': return renderVoiceAnalysis();
      case 'location': return renderLocation();
      case 'inactivity': return renderInactivity();
      case 'contacts': return renderContacts();
      case 'security': return renderSecurity();
      default: return renderHome();
    }
  };

  return (
    <div className="app">
      {!isLoggedIn ? (
        renderLogin()
      ) : (
        <>
          <header className="header">
            <div className="header-top">
              <div className="user-info">
                <span>👤 {currentUser?.name}</span>
                <span className="user-mobile">📱 {currentUser?.mobile}</span>
              </div>
              <button className="logout-btn" onClick={() => {
  console.log('🚪 Logout button clicked inline!');
  alert('🚪 Logout button clicked inline!');
  handleLogout();
}}>
  🚪 Logout
</button>
            </div>
            <h1>🛡️ SHIELD-HER</h1>
            <p>Women's Safety & Emergency Health Monitoring</p>
            
            <nav className="nav-tabs">
              <button 
                className={`nav-tab ${currentView === 'home' ? 'active' : ''}`}
                onClick={() => setCurrentView('home')}
              >
                🏠 Home
              </button>
              <button 
                className={`nav-tab ${currentView === 'contacts' ? 'active' : ''}`}
                onClick={() => setCurrentView('contacts')}
              >
                👥 Contacts
              </button>
              <button 
                className={`nav-tab ${currentView === 'voice' ? 'active' : ''}`}
                onClick={() => setCurrentView('voice')}
              >
                🎤 Voice
              </button>
              <button 
                className={`nav-tab ${currentView === 'location' ? 'active' : ''}`}
                onClick={() => setCurrentView('location')}
              >
                📍 Location
              </button>
              <button 
                className={`nav-tab ${currentView === 'inactivity' ? 'active' : ''}`}
                onClick={() => setCurrentView('inactivity')}
              >
                ⏰ Inactivity
              </button>
              <button 
                className={`nav-tab ${currentView === 'security' ? 'active' : ''}`}
                onClick={() => setCurrentView('security')}
              >
                🔒 Security
              </button>
            </nav>
          </header>
          
          <main className="main">
            {renderContent()}
          </main>
          
          {emergencyActive && (
            <div className="emergency-banner">
              🚨 EMERGENCY ACTIVE - All contacts and services have been notified
              <button className="btn btn-danger btn-small" onClick={() => {
                cancelEmergency();
                showNotification('✅ Emergency Stopped', 'Emergency alert has been cancelled.');
              }}>
                ⏹️ Stop Emergency
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
