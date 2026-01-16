import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useSales } from './hooks/useSales';
import Header from './components/Header';
import TabBar from './components/TabBar';
import FloatingButton from './components/FloatingButton';
import AddSaleModal from './components/AddSaleModal';
import InstallPrompt from './components/InstallPrompt';
import ResumenTab from './pages/ResumenTab';
import UltimaVentaTab from './pages/UltimaVentaTab';
import LoginPage from './pages/LoginPage';

function AppContent() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { sales, lastSale, loading: salesLoading, addSale } = useSales();
    const [activeTab, setActiveTab] = useState('resumen');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Show loading state
    if (authLoading) {
        return (
            <div className="login-container">
                <div className="loading">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    // Show login if not authenticated
    if (!isAuthenticated) {
        return <LoginPage />;
    }

    const handleAddSale = async (saleData) => {
        await addSale(saleData);
        // Switch to venta confirmada tab after adding
        setActiveTab('venta');
    };

    return (
        <div className="app-container">
            <Header />

            <main className="main-content">
                {salesLoading ? (
                    <div className="loading">
                        <div className="spinner"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'resumen' && (
                            <ResumenTab sales={sales} lastSale={lastSale} />
                        )}
                        {activeTab === 'venta' && (
                            <UltimaVentaTab lastSale={lastSale} />
                        )}
                    </>
                )}
            </main>

            <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

            <FloatingButton onClick={() => setIsModalOpen(true)} />

            <AddSaleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAddSale}
            />
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
            <InstallPrompt />
        </AuthProvider>
    );
}

