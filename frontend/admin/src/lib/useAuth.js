/**
 * useAuth.js — Re-export useAuth từ client's AuthContext
 * Admin code import từ đây thay vì trực tiếp client path
 * Path: admin/src/lib/ → ../../client/src/context/
 *   (admin/src → admin → frontend → frontend/client/src/context/)
 */
// admin/src/lib/ → ../../../ = frontend/ → client/src/context/AuthContext
export { useAuth } from '../../../client/src/context/AuthContext';
