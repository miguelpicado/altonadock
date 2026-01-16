import { useState, useEffect } from 'react';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Check if previously dismissed
        const dismissed = localStorage.getItem('altona_install_dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed);
            const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
            // Show again after 7 days
            if (daysSinceDismissed < 7) {
                return;
            }
        }

        // Listen for the beforeinstallprompt event
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Show banner after a short delay
            setTimeout(() => setShowBanner(true), 2000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Listen for app installed
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowBanner(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowBanner(false);
        }

        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('altona_install_dismissed', Date.now().toString());
    };

    if (isInstalled || !showBanner) return null;

    return (
        <div className="install-banner">
            <div className="install-banner-content">
                <div className="install-banner-icon">📲</div>
                <div className="install-banner-text">
                    <strong>Instalar Altona Sales</strong>
                    <span>Acceso rápido desde tu pantalla de inicio</span>
                </div>
            </div>
            <div className="install-banner-actions">
                <button className="install-btn-dismiss" onClick={handleDismiss}>
                    Ahora no
                </button>
                <button className="install-btn-confirm" onClick={handleInstall}>
                    Instalar
                </button>
            </div>
        </div>
    );
}
