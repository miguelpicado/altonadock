import { useState, useRef, useEffect } from 'react';

export default function FabDropdown({
    activeTab,
    onAddUnitSale,
    onAddTotalSale,
    onAddDailySale
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // For "Diario" tab, show text button
    if (activeTab === 'registro') {
        return (
            <button
                className="fab-text-button"
                onClick={onAddDailySale}
            >
                + Añadir venta diaria
            </button>
        );
    }

    // For "Resumen" and "Venta" tabs, show dropdown
    return (
        <div className="fab-dropdown-container" ref={dropdownRef}>
            <button
                className={`fab ${isOpen ? 'fab-open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                +
            </button>

            {isOpen && (
                <div className="fab-dropdown-menu">
                    <button
                        className="fab-dropdown-item"
                        onClick={() => {
                            onAddUnitSale();
                            setIsOpen(false);
                        }}
                    >
                        <span className="fab-dropdown-icon">🛍️</span>
                        <span>Añadir venta/abono</span>
                    </button>
                    <button
                        className="fab-dropdown-item"
                        onClick={() => {
                            onAddTotalSale();
                            setIsOpen(false);
                        }}
                    >
                        <span className="fab-dropdown-icon">📋</span>
                        <span>Cierre de turno</span>
                    </button>
                </div>
            )}
        </div>
    );
}
