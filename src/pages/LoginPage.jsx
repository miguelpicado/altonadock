import { useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const { login, loginDemo } = useAuth();
    const clickCountRef = useRef(0);
    const clickTimeoutRef = useRef(null);

    const handleLogin = async () => {
        try {
            await login();
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    const handleLogoClick = () => {
        clickCountRef.current += 1;

        // Reset counter after 3 seconds of inactivity
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
        }
        clickTimeoutRef.current = setTimeout(() => {
            clickCountRef.current = 0;
        }, 3000);

        // Activate demo mode after 10 clicks
        if (clickCountRef.current >= 10) {
            clickCountRef.current = 0;
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
            }
            loginDemo();
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <img
                    src={`${import.meta.env.BASE_URL}logo-altonadock.png`}
                    alt="Altonadock"
                    className="login-logo-img"
                    onClick={handleLogoClick}
                    style={{ cursor: 'pointer' }}
                />
                <h1 className="login-title">Sales Tracker</h1>
                <p className="login-subtitle">
                    Control de ventas del córner
                </p>

                <button className="btn btn-google btn-block" onClick={handleLogin}>
                    <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Iniciar sesión con Google
                </button>



                <p className="text-muted mt-lg" style={{ fontSize: '0.75rem' }}>
                    Tus datos se sincronizan automáticamente con tu cuenta de Google
                </p>
            </div>
        </div>
    );
}
