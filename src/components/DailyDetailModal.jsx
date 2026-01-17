import { formatCurrency, formatPercentage } from '../utils/calculations';

export default function DailyDetailModal({ isOpen, onClose, dayData, onDelete }) {
    if (!isOpen || !dayData) return null;

    const { rawDate, aggregated, details } = dayData;

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="flex-col">
                        <h2 className="modal-title">Detalle Diario</h2>
                        <span className="text-muted text-sm" style={{ fontSize: '0.875rem' }}>{formatDate(rawDate)}</span>
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Aggregated Totals Highlight */}
                    <div className="card mb-lg" style={{ background: 'var(--bg-tertiary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span className="text-muted text-sm">Venta bruta</span>
                            <span style={{ fontWeight: 500 }}>{formatCurrency(aggregated.ventaBruta || aggregated.venta)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span className="text-muted text-sm">Abonos (€)</span>
                            <span style={{ fontWeight: 500, color: 'var(--danger)' }}>-{formatCurrency(aggregated.abonos || 0)}</span>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="text-muted text-xs uppercase" style={{ fontSize: '0.75rem' }}>Venta Neta Día</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                    {formatCurrency(aggregated.venta)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Split Breakdown */}
                    <h4 className="section-title mb-md">Desglose por Empleada</h4>
                    <div className="daily-split-details" style={{ marginBottom: '0' }}>
                        {['Ingrid', 'Marta'].map(empName => {
                            const empSale = details.find(s => s.empleada === empName);
                            return (
                                <div key={empName} className="daily-emp-detail">
                                    <div className="daily-emp-header">
                                        <span className="daily-emp-name">{empName}</span>
                                        <span className="daily-emp-status">
                                            {empSale ? formatCurrency(empSale.venta) : 'No registrado'}
                                        </span>
                                    </div>
                                    {empSale ? (
                                        <div className="daily-emp-stats">
                                            <div className="stat-row">
                                                <span>Conv:</span>
                                                <span className={empSale.conversion >= 10 ? 'text-success' : 'text-danger'}>
                                                    {formatPercentage(empSale.conversion)}
                                                </span>
                                            </div>
                                            <div className="stat-row">
                                                <span>T.Medio:</span>
                                                <span>{formatCurrency(empSale.ticketMedio)}</span>
                                            </div>
                                            <div className="stat-row">
                                                <span>PMV:</span>
                                                <span>{formatCurrency(empSale.pmv)}</span>
                                            </div>
                                            <div className="stat-row">
                                                <span>Prod:</span>
                                                <span>{formatCurrency(empSale.productividad)}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-muted py-2" style={{ fontSize: '0.75rem' }}>
                                            -
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Detailed Aggregated Stats Table */}
                    <h4 className="section-title mt-lg mb-md">Métricas Globales</h4>
                    <div className="report-grid" style={{ gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                        <div className="report-item">
                            <span className="report-label">Conversión Total</span>
                            <span className={`report-value ${aggregated.conversion >= 10 ? 'success' : 'danger'}`}>
                                {formatPercentage(aggregated.conversion)}
                            </span>
                        </div>
                        <div className="report-item">
                            <span className="report-label">Ticket Medio Global</span>
                            <span className="report-value">{formatCurrency(aggregated.ticketMedio)}</span>
                        </div>
                        <div className="report-item">
                            <span className="report-label">Clientes Totales</span>
                            <span className="report-value">{aggregated.clientes}</span>
                        </div>
                        <div className="report-item">
                            <span className="report-label">Total operaciones</span>
                            <span className="report-value">{aggregated.operaciones}</span>
                        </div>
                    </div>

                </div>

                <div className="modal-footer" style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="btn"
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--danger)',
                            border: '1px solid var(--danger)',
                            flex: 1
                        }}
                        onClick={() => {
                            if (window.confirm('¿Estás segura de que quieres borrar este registro? Esta acción no se puede deshacer.')) {
                                onDelete && onDelete(dayData);
                            }
                        }}
                    >
                        Borrar
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
