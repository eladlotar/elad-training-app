import { callFunction } from '../constants/api';

/**
 * Get all open sessions from Base44
 */
export async function getSessions() {
  const result = await callFunction('mobileAppApi', {
    action: 'getSessions',
  });
  if (!result.ok) throw new Error(result.error);
  return result.sessions;
}

/**
 * Enroll customer in a session
 */
export async function enrollInSession(customerId, sessionId) {
  const result = await callFunction('mobileAppApi', {
    action: 'enroll',
    customer_id: customerId,
    session_id: sessionId,
  });
  if (!result.ok) throw new Error(result.error);
  return result.enrollment;
}

/**
 * Get customer's enrollments
 */
export async function getMyEnrollments(customerId) {
  const result = await callFunction('mobileAppApi', {
    action: 'getMyEnrollments',
    customer_id: customerId,
  });
  if (!result.ok) throw new Error(result.error);
  return result.enrollments;
}

/**
 * Cancel an enrollment
 */
export async function cancelEnrollment(enrollmentId) {
  const result = await callFunction('mobileAppApi', {
    action: 'cancelEnrollment',
    enrollment_id: enrollmentId,
  });
  if (!result.ok) throw new Error(result.error);
  return true;
}

/**
 * Get fresh profile data
 */
export async function getProfile(customerId) {
  const result = await callFunction('mobileAppApi', {
    action: 'getProfile',
    customer_id: customerId,
  });
  if (!result.ok) throw new Error(result.error);
  return result.customer;
}
