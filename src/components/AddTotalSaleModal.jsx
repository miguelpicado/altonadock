import { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/calculations';

const EMPLOYEES = ['Ingrid', 'Marta'];

export default function AddTotalSaleModal({
    isOpen,
    onClose,
    onSubmitClose,
    onSubmitAdjustment,
    aggregatedData // { ingrid: {...}, marta: {...} }
}) {
    const [formData, setFormData] = useState({
        empleada: EMPLOYEES[0],
        clientes: '',
        horasTrabajadas: '8',
        ventaReal: '',
        motivoAjuste: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Get the data for selected employee
    const empData = formData.empleada === 'Ingrid'
        ? aggregatedData?.ingrid
        : aggregatedData?.marta;

    // Update ventaReal when employee changes
    useEffect(() => {
        if (empData) {
            setFormData(prev => ({
                ...prev,
                ventaReal: empData.venta?.toFixed(2) || ''
            }));
        }
    }, [formData.empleada, empData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate clients
        if (!formData.clientes || parseInt(formData.clientes) <= 0) {
            setError('El número de clientes debe ser mayor que 0');
            return;
        }

        if (!formData.horasTrabajadas || parseFloat(formData.horasTrabajadas) <= 0) {
            setError('Las horas trabajadas deben ser mayor que 0');
            return;
        }

        try {
            setLoading(true);

            const fecha = new Date().toISOString().split('T')[0];

            // Check if there's an adjustment needed
            const calculatedVenta = empData?.venta || 0;
            const realVenta = parseFloat(formData.ventaReal) || calculatedVenta;
            const difference = realVenta - calculatedVenta;

            // Submit turn close
            await onSubmitClose({
                empleada: formData.empleada,
                clientes: parseInt(formData.clientes, 10),
                horasTrabajadas: parseFloat(formData.horasTrabajadas),
                fecha
            });

            // If there's a difference, create an adjustment
            if (Math.abs(difference) > 0.01) {
                await onSubmitAdjustment({
                    empleada: formData.empleada,
                    ventaAjuste: difference,
                    abonoAjuste: 0,
                    motivo: formData.motivoAjuste || 'Ajuste de cierre',
                    fecha
                });
            }

            // Reset form
            setFormData({
                empleada: EMPLOYEES[0],
                clientes: '',
                horasTrabajadas: '8',
                ventaReal: '',
                motivoAjuste: ''
            });

            onClose();
        } catch (err) {
            setError(err.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const calculatedVenta = empData?.venta || 0;
    const realVenta = parseFloat(formData.ventaReal) || calculatedVenta;
    const difference = realVenta - calculatedVenta;
    const hasDifference = Math.abs(difference) > 0.01;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">📋 Cierre de Turno</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && (
                            <div className="card mb-md" style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderColor: 'var(--danger)',
                                color: 'var(--danger)'
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Employee Selection */}
                        <div className="form-group">
                            <label className="form-label">Empleada</label>
                            <select
                                name="empleada"
                                value={formData.empleada}
                                onChange={handleChange}
                                className="form-input form-select"
                                required
                            >
                                {EMPLOYEES.map(emp => (
                                    <option key={emp} value={emp}>{emp}</option>
                                ))}
                            </select>
                        </div>

                        {/* Accumulated Data Card */}
                        <div className="card mb-lg" style={{ background: 'var(--bg-tertiary)' }}>
                            <h4 className="section-title mb-md" style={{ fontSize: '0.875rem' }}>
                                📊 Datos acumulados hoy - {formData.empleada}
                            </h4>
                            <div className="report-grid" style={{ gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                                <div className="report-item">
                                    <span className="report-label">Operaciones (tickets)</span>
                                    <span className="report-value">{empData?.operaciones || 0}</span>
                                </div>
                                <div className="report-item">
                                    <span className="report-label">Unidades vendidas</span>
                                    <span className="report-value">{empData?.unidades || 0}</span>
                                </div>
                                <div className="report-item">
                                    <span className="report-label">Venta bruta</span>
                                    <span className="report-value">{formatCurrency(empData?.ventaBruta || 0)}</span>
                                </div>
                                <div className="report-item">
                                    <span className="report-label">Abonos</span>
                                    <span className="report-value" style={{ color: 'var(--danger)' }}>
                                        -{formatCurrency(empData?.abonos || 0)}
                                    </span>
                                </div>
                                <div className="report-item" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                                    <span className="report-label" style={{ fontWeight: 600 }}>Venta neta calculada</span>
                                    <span className="report-value highlight">{formatCurrency(empData?.venta || 0)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Required Fields */}
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Clientes (visitantes) *</label>
                                <input
                                    type="number"
                                    name="clientes"
                                    value={formData.clientes}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Ej: 87"
                                    min="1"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Horas trabajadas</label>
                                <input
                                    type="number"
                                    name="horasTrabajadas"
                                    value={formData.horasTrabajadas}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Ej: 8"
                                    min="0.5"
                                    step="0.5"
                                    required
                                />
                            </div>
                        </div>

                        {/* Adjustment Section */}
                        <div className="card mt-md" style={{
                            background: hasDifference ? 'rgba(251, 191, 36, 0.1)' : 'var(--bg-secondary)',
                            borderColor: hasDifference ? 'var(--warning)' : 'var(--border-color)'
                        }}>
                            <h4 className="section-title mb-md" style={{ fontSize: '0.875rem' }}>
                                ⚠️ Ajuste de venta (opcional)
                            </h4>
                            <div className="form-group">
                                <label className="form-label">Venta real (si es diferente)</label>
                                <input
                                    type="number"
                                    name="ventaReal"
                                    value={formData.ventaReal}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder={calculatedVenta.toFixed(2)}
                                    step="0.01"
                                />
                            </div>

                            {hasDifference && (
                                <>
                                    <div className="mb-md" style={{
                                        padding: '0.5rem',
                                        background: difference > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: '4px',
                                        textAlign: 'center'
                                    }}>
                                        <span style={{ color: difference > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                            {difference > 0 ? '+' : ''}{formatCurrency(difference)} de ajuste
                                        </span>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Motivo del ajuste</label>
                                        <input
                                            type="text"
                                            name="motivoAjuste"
                                            value={formData.motivoAjuste}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="Ej: Descuadre de caja"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Guardando...' : 'Cerrar Turno'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
