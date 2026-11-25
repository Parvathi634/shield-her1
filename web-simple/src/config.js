// Configuration for SHIELD-HER Web App
// Replace these with your actual API keys and service details

export const TWILIO_CONFIG = {
  accountSid: process.env.REACT_APP_TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID',
  authToken: process.env.REACT_APP_TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_AUTH_TOKEN',
  fromNumber: process.env.REACT_APP_TWILIO_FROM_NUMBER || '+1234567890',
  messageServiceId: process.env.REACT_APP_TWILIO_MESSAGE_SERVICE_ID || 'YOUR_TWILIO_MESSAGE_SERVICE_ID'
};

export const EMAILJS_CONFIG = {
  serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID || 'YOUR_EMAILJS_SERVICE_ID',
  templateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID || 'YOUR_EMAILJS_TEMPLATE_ID',
  publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || 'YOUR_EMAILJS_PUBLIC_KEY',
  messageServiceId: process.env.REACT_APP_EMAILJS_MESSAGE_SERVICE_ID || 'YOUR_EMAILJS_MESSAGE_SERVICE_ID'
};

export const EMERGENCY_SERVICES = {
  police: '911',
  ambulance: '911',
  fire: '911',
  // Add local emergency numbers for different regions
  localPolice: process.env.REACT_APP_LOCAL_POLICE || '100',
  localAmbulance: process.env.REACT_APP_LOCAL_AMBULANCE || '108'
};

export const APP_CONFIG = {
  name: 'SHIELD-HER',
  version: '1.0.0',
  emergencyTimeout: 30000, // 30 seconds
  locationUpdateInterval: 5000, // 5 seconds
  maxRetries: 3,
  retryDelay: 2000 // 2 seconds
};
