import { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToAuthChanges, signInWithGoogle, signOut } from '../services/authService';

const AuthContext = createContext(null);

// Demo user for testing without Firebase
const DEMO_USER = {
    uid: 'demo-user',
    displayName: 'Usuario Demo',
    email: 'demo@altona.test',
    photoURL: null,
    isDemo: true
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for demo user in localStorage
        const savedDemoUser = localStorage.getItem('altona_demo_user');
        if (savedDemoUser) {
            setUser(JSON.parse(savedDemoUser));
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToAuthChanges((user) => {
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const loginAsDemo = () => {
        localStorage.setItem('altona_demo_user', JSON.stringify(DEMO_USER));
        setUser(DEMO_USER);
    };

    const logout = async () => {
        try {
            // Clear demo user if exists
            localStorage.removeItem('altona_demo_user');

            if (user?.isDemo) {
                setUser(null);
            } else {
                await signOut();
            }
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    };

    const value = {
        user,
        loading,
        login,
        loginAsDemo,
        loginDemo: loginAsDemo, // Alias for hidden demo mode activation
        logout,
        isAuthenticated: !!user,
        isDemo: user?.isDemo || false
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
