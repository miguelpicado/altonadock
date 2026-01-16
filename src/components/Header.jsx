import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Header() {
    const { user, logout } = useAuth();
    const [showLogout, setShowLogout] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            setShowLogout(false);
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    return (
        <header className="header">
            <img
                src={`${import.meta.env.BASE_URL}logo-altonadock.png`}
                alt="Altonadock"
                className="header-logo"
            />

            {user && (
                <div className="header-user-container">
                    <div
                        className="header-user"
                        onClick={() => setShowLogout(!showLogout)}
                        style={{ cursor: 'pointer' }}
                    >
                        <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                            {user.displayName?.split(' ')[0]}
                        </span>
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt={user.displayName}
                                className="header-avatar"
                            />
                        ) : (
                            <div className="header-avatar-placeholder">
                                {user.displayName?.[0] || 'U'}
                            </div>
                        )}
                    </div>

                    {showLogout && (
                        <div className="logout-menu">
                            <button onClick={handleLogout} className="logout-btn">
                                🚪 Cerrar sesión
                            </button>
                        </div>
                    )}
                </div>
            )}
        </header>
    );
}
