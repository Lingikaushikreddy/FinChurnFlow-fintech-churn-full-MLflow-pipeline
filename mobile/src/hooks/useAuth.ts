/**
 * useAuth Hook - Authentication state and actions
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  sendOtp,
  verifyOtp,
  refreshToken,
  logout,
  clearError,
} from '../store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((state: RootState) => state.auth);

  const handleSendOtp = useCallback(
    async (phone: string) => {
      return dispatch(sendOtp(phone)).unwrap();
    },
    [dispatch]
  );

  const handleVerifyOtp = useCallback(
    async (phone: string, otp: string) => {
      return dispatch(verifyOtp({ phone, otp })).unwrap();
    },
    [dispatch]
  );

  const handleRefreshToken = useCallback(async () => {
    return dispatch(refreshToken()).unwrap();
  }, [dispatch]);

  const handleLogout = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    ...auth,
    sendOtp: handleSendOtp,
    verifyOtp: handleVerifyOtp,
    refreshToken: handleRefreshToken,
    logout: handleLogout,
    clearError: handleClearError,
  };
};

export default useAuth;
