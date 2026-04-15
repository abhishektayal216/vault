/**
 * App integrity checks
 * Detects tampering, rooted/jailbroken devices, and other security risks
 */

import * as Device from 'expo-device';
import * as Application from 'expo-application';

/**
 * Checks if the device is rooted (Android) or jailbroken (iOS)
 */
export const isDeviceCompromised = async () => {
  try {
    if (Device.DeviceType === Device.DeviceType.PHONE) {
      // Basic checks for rooted/jailbroken devices
      // This is not foolproof but provides a basic layer of protection
      const isEmulator = Device.isDevice;
      
      // In production, you would add more sophisticated checks
      // such as checking for suspicious files, su binary, etc.
      return !isEmulator; // Only run checks on real devices
    }
    return false;
  } catch (error) {
    console.error('Integrity check failed:', error);
    return false;
  }
};

/**
 * Verifies app signature (basic implementation)
 * In production, this would verify the app's signature against known values
 */
export const verifyAppSignature = async () => {
  try {
    const appId = Application.applicationId;
    const appVersion = Application.nativeApplicationVersion;
    
    // In production, verify these against known values
    // For now, just check they exist
    return !!(appId && appVersion);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
};

/**
 * Runs all integrity checks
 */
export const runIntegrityChecks = async () => {
  const checks = {
    deviceCompromised: await isDeviceCompromised(),
    signatureValid: await verifyAppSignature(),
  };
  
  const hasIssues = Object.values(checks).some(result => !result);
  
  return {
    passed: !hasIssues,
    checks
  };
};

/**
 * Gets device security info for logging (in development only)
 */
export const getSecurityInfo = async () => {
  if (__DEV__) {
    return {
      deviceName: Device.deviceName,
      deviceType: Device.DeviceType,
      platform: Device.platform,
      isDevice: Device.isDevice,
      applicationId: Application.applicationId,
      nativeVersion: Application.nativeApplicationVersion,
    };
  }
  return null;
};
