import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useRefreshTokenMutation } from '../store/api/authApi';
import { setCredentials, setAuthCheckComplete } from '../store/slices/authSlice';
import type { AppDispatch } from '../store/store';

export function AuthInit() {
    const dispatch = useDispatch<AppDispatch>();
    const [refreshToken] = useRefreshTokenMutation();

    useEffect(() => {
        refreshToken()
            .unwrap()
            .then((data) => {
                dispatch(setCredentials({
                    accessToken: data.accessToken,
                    refreshToken: null,
                    username: data.username,
                    email: data.email,
                    roles: data.roles,
                }));
            })
            .catch(() => {})
            .finally(() => {
                dispatch(setAuthCheckComplete());
            });
        // Run once on mount to restore session from httpOnly cookie
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}
