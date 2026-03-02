import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token && !user) {
            api.get('/auth/me')
                .then(({ data }) => {
                    setUser(data);
                    localStorage.setItem('user', JSON.stringify(data));
                })
                .catch(() => {
                    localStorage.clear();
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
        window.location.href = '/login';
    };

    const hasPermission = (module, action = 'read') => {
        if (!user) return false;
        const matrix = {
            ADMIN: { leads: ['read', 'write', 'delete'], clients: ['read', 'write', 'delete'], projects: ['read', 'write', 'delete'], tasks: ['read', 'write', 'delete'], invoices: ['read', 'write', 'delete'], payments: ['read', 'write', 'delete'], reports: ['read', 'write', 'delete'], admin: ['read', 'write', 'delete'] },
            SALES: { leads: ['read', 'write'], clients: ['read', 'write'], projects: [], tasks: [], invoices: ['read'], payments: [], reports: ['read'], admin: [] },
            PROJECT_MANAGER: { leads: [], clients: ['read'], projects: ['read', 'write'], tasks: ['read', 'write', 'delete'], invoices: [], payments: [], reports: ['read'], admin: [] },
            DEVELOPER: { leads: [], clients: [], projects: ['read'], tasks: ['read', 'write'], invoices: [], payments: [], reports: [], admin: [] },
            BILLING: { leads: [], clients: ['read'], projects: [], tasks: [], invoices: ['read', 'write'], payments: ['read', 'write'], reports: ['read'], admin: [] },
        };
        return matrix[user.role]?.[module]?.includes(action) || false;
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
}
