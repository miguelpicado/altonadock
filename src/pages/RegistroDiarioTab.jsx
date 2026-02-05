import { useState, useMemo } from 'react';
import { formatCurrency, aggregateDailyTotal } from '../utils/calculations';
import { normalizeDate } from '../utils/dateUtils';
import DailyDetailModal from '../components/DailyDetailModal';

export default function RegistroDiarioTab({ sales, deleteSale, deleteMultipleSales }) {
    const [selectedDay, setSelectedDay] = useState(null);

    // Group sales by day
    const dailyRecords = useMemo(() => {
        if (!sales || sales.length === 0) return [];

        const grouped = {};

        sales.forEach(sale => {
            try {
                const dateStr = normalizeDate(sale.fecha).toDateString();
                if (!grouped[dateStr]) {
                    grouped[dateStr] = [];
                }
                grouped[dateStr].push(sale);
            } catch (error) {
                console.error('Error grouping sale by date:', error, sale);
            }
        });

        // Convert to array and sort descending
        return Object.entries(grouped)
            .map(([dateStr, dateSales]) => {
                try {
                    // Validate dateSales array
                    if (!dateSales || dateSales.length === 0) {
                        console.warn('Empty dateSales for dateStr:', dateStr);
                        return null;
                    }

                    // Use aggregateDailyTotal for proper calculation
                    const { ingrid, marta, total } = aggregateDailyTotal(dateSales);

                    return {
                        dateStr,
                        rawDate: normalizeDate(dateSales[0].fecha),
                        aggregated: total, // Use the correctly aggregated total
                        details: [ingrid, marta].filter(emp => emp.operaciones > 0 || emp.hasClose), // Pass per-employee data
                        hasIngrid: ingrid.operaciones > 0 || ingrid.hasClose,
                        hasMarta: marta.operaciones > 0 || marta.hasClose,
                        allRecords: dateSales // Keep original records for deletion
                    };
                } catch (error) {
                    console.error('Error mapping daily sales:', error, dateStr);
                    return null;
                }
            })
            .filter(record => record !== null) // Remove failed mappings
            .sort((a, b) => b.rawDate - a.rawDate);

    }, [sales]);

    const formatDateShort = (date) => {
        return new Date(date).toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
    };

    const handleDeleteDay = async (dayData) => {
        if (!dayData || !dayData.allRecords) return;

        // Get all record IDs for this day
        const targetIds = dayData.allRecords.map(record => record.id);

        try {
            await Promise.all(targetIds.map(id => deleteSale(id)));
            setSelectedDay(null); // Close modal
        } catch (error) {
            console.error("Error deleting day records:", error);
            alert("Error al borrar los registros");
        }
    };

    if (!sales || sales.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <h3 className="empty-state-title">Sin registros</h3>
                <p className="empty-state-text">
                    El historial de registros diarios aparecerá aquí
                </p>
            </div>
        );
    }

    return (
        <div className="registro-diario">
            <h3 className="section-title">📅 Historial Diario</h3>

            <div className="daily-cards-grid">
                {dailyRecords.map((day) => (
                    <div
                        key={day.dateStr}
                        className="daily-card-visual"
                        onClick={() => setSelectedDay(day)}
                    >
                        <div className="daily-card-header">
                            <span className="daily-card-date">{formatDateShort(day.rawDate)}</span>
                            <div className="daily-badges-mini">
                                {day.hasIngrid && <span className="dot dot-ingrid" title="Ingrid"></span>}
                                {day.hasMarta && <span className="dot dot-marta" title="Marta"></span>}
                            </div>
                        </div>
                        <div className="daily-card-amount">
                            {formatCurrency(day.aggregated.venta)}
                        </div>
                        <div className="daily-card-footer">
                            <span className="text-muted text-xs">Ver detalle →</span>
                        </div>
                    </div>
                ))}
            </div>

            <DailyDetailModal
                isOpen={!!selectedDay}
                onClose={() => setSelectedDay(null)}
                dayData={selectedDay}
                onDelete={handleDeleteDay}
            />
        </div>
    );
}
