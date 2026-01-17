import { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useSales } from './hooks/useSales';
import Header from './components/Header';
import TabBar from './components/TabBar';
import FabDropdown from './components/FabDropdown';
import AddSaleModal from './components/AddSaleModal';
import AddUnitSaleModal from './components/AddUnitSaleModal';
import AddTotalSaleModal from './components/AddTotalSaleModal';
import InstallPrompt from './components/InstallPrompt';
import ResumenTab from './pages/ResumenTab';
import UltimaVentaTab from './pages/UltimaVentaTab';
import RegistroDiarioTab from './pages/RegistroDiarioTab';
import LoginPage from './pages/LoginPage';
import {
    addUnitSale,
    addRefund,
    addTurnClose,
    addAdjustment
} from './services/salesService';
import { aggregateDailyTotal } from './utils/calculations';

function AppContent() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { sales, lastSale, todaysSales, dailyTotal, loading: salesLoading, addSale, deleteSale, deleteMultipleSales, refresh } = useSales();
    const [activeTab, setActiveTab] = useState('resumen');

    // Modal states
    const [isDailySaleModalOpen, setIsDailySaleModalOpen] = useState(false);
    const [isUnitSaleModalOpen, setIsUnitSaleModalOpen] = useState(false);
    const [isTotalSaleModalOpen, setIsTotalSaleModalOpen] = useState(false);

    // Calculate aggregated data for today
    const todayAggregated = useMemo(() => {
        if (!todaysSales || todaysSales.length === 0) {
            return {
                ingrid: { operaciones: 0, unidades: 0, ventaBruta: 0, abonos: 0, venta: 0, clientes: 0, horasTrabajadas: 0, hasClose: false },
                marta: { operaciones: 0, unidades: 0, ventaBruta: 0, abonos: 0, venta: 0, clientes: 0, horasTrabajadas: 0, hasClose: false },
                total: { operaciones: 0, unidades: 0, ventaBruta: 0, abonos: 0, venta: 0, clientes: 0, horasTrabajadas: 0, hasClose: false }
            };
        }
        return aggregateDailyTotal(todaysSales);
    }, [todaysSales]);

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

    // Handler for legacy daily sale (used in Registro tab)
    const handleAddDailySale = async (saleData) => {
        await addSale(saleData);
        setActiveTab('venta');
    };

    // Handler for unit sale
    const handleAddUnitSale = async (data) => {
        await addUnitSale(data);
        await refresh();
    };

    // Handler for refund
    const handleAddRefund = async (data) => {
        await addRefund(data);
        await refresh();
    };

    // Handler for turn close
    const handleTurnClose = async (data) => {
        await addTurnClose(data);
        await refresh();
    };

    // Handler for adjustment
    const handleAdjustment = async (data) => {
        await addAdjustment(data);
        await refresh();
    };

    return (
        <div className="app-container">
            <Header sales={sales} />

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
                            <UltimaVentaTab
                                lastSale={sales.length > 0 ? null : null}
                                dailyTotal={todayAggregated.total}
                                todaysSales={todaysSales}
                                aggregatedData={todayAggregated}
                            />
                        )}
                        {activeTab === 'registro' && (
                            <RegistroDiarioTab sales={sales} deleteSale={deleteSale} deleteMultipleSales={deleteMultipleSales} />
                        )}
                    </>
                )}
            </main>

            <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

            {/* FAB with dropdown for Resumen/Venta, text button for Registro */}
            <FabDropdown
                activeTab={activeTab}
                onAddUnitSale={() => setIsUnitSaleModalOpen(true)}
                onAddTotalSale={() => setIsTotalSaleModalOpen(true)}
                onAddDailySale={() => setIsDailySaleModalOpen(true)}
            />

            {/* Modal for adding historical/daily sales (Registro tab) */}
            <AddSaleModal
                isOpen={isDailySaleModalOpen}
                onClose={() => setIsDailySaleModalOpen(false)}
                onSubmit={handleAddDailySale}
                existingSales={sales}
            />

            {/* Modal for unit sales/refunds */}
            <AddUnitSaleModal
                isOpen={isUnitSaleModalOpen}
                onClose={() => setIsUnitSaleModalOpen(false)}
                onSubmitSale={handleAddUnitSale}
                onSubmitRefund={handleAddRefund}
            />

            {/* Modal for turn close */}
            <AddTotalSaleModal
                isOpen={isTotalSaleModalOpen}
                onClose={() => setIsTotalSaleModalOpen(false)}
                onSubmitClose={handleTurnClose}
                onSubmitAdjustment={handleAdjustment}
                aggregatedData={todayAggregated}
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
