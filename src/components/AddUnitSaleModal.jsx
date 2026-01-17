import { useState } from 'react';

const EMPLOYEES = ['Ingrid', 'Marta'];

export default function AddUnitSaleModal({ isOpen, onClose, onSubmitSale, onSubmitRefund }) {
    const [mode, setMode] = useState('venta'); // 'venta' or 'abono'
    const [formData, setFormData] = useState({
        empleada: EMPLOYEES[0],
        articulos: '',
        venta: '',
        abono: '',
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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

        try {
            setLoading(true);

            if (mode === 'venta') {
                // Validate sale fields
                if (!formData.articulos || parseInt(formData.articulos) <= 0) {
                    setError('El número de artículos debe ser mayor que 0');
                    return;
                }
                if (!formData.venta || parseFloat(formData.venta) <= 0) {
                    setError('El importe de venta debe ser mayor que 0');
                    return;
                }

                await onSubmitSale({
                    empleada: formData.empleada,
                    articulos: parseInt(formData.articulos, 10),
                    venta: parseFloat(formData.venta),
                    fecha: formData.fecha,
                    hora: formData.hora
                });
            } else {
                // Validate refund fields
                if (!formData.abono || parseFloat(formData.abono) <= 0) {
                    setError('El importe del abono debe ser mayor que 0');
                    return;
                }

                await onSubmitRefund({
                    empleada: formData.empleada,
                    abono: parseFloat(formData.abono),
                    fecha: formData.fecha,
                    hora: formData.hora
                });
            }

            // Reset form
            setFormData({
                empleada: EMPLOYEES[0],
                articulos: '',
                venta: '',
                abono: '',
                fecha: new Date().toISOString().split('T')[0],
                hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
            });
            setMode('venta');

            onClose();
        } catch (err) {
            setError(err.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {mode === 'venta' ? '🛍️ Nueva Venta' : '↩️ Nuevo Abono'}
                    </h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Mode Toggle */}
                        <div className="mode-toggle mb-lg">
                            <button
                                type="button"
                                className={`toggle-btn ${mode === 'venta' ? 'active' : ''}`}
                                onClick={() => setMode('venta')}
                            >
                                🛍️ Venta
                            </button>
                            <button
                                type="button"
                                className={`toggle-btn ${mode === 'abono' ? 'active' : ''}`}
                                onClick={() => setMode('abono')}
                                style={mode === 'abono' ? { background: 'rgba(239, 68, 68, 0.2)', borderColor: 'var(--danger)' } : {}}
                            >
                                ↩️ Abono
                            </button>
                        </div>

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

                        {/* Sale-specific fields */}
                        {mode === 'venta' && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Nº Artículos</label>
                                    <input
                                        type="number"
                                        name="articulos"
                                        value={formData.articulos}
                                        onChange={handleChange}
                                        className="form-input"
                                        placeholder="Ej: 3"
                                        min="1"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Importe (€)</label>
                                    <input
                                        type="number"
                                        name="venta"
                                        value={formData.venta}
                                        onChange={handleChange}
                                        className="form-input"
                                        placeholder="Ej: 45.50"
                                        min="0.01"
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {/* Refund-specific fields */}
                        {mode === 'abono' && (
                            <div className="form-group">
                                <label className="form-label">Importe del Abono (€)</label>
                                <input
                                    type="number"
                                    name="abono"
                                    value={formData.abono}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Ej: 25.00"
                                    min="0.01"
                                    step="0.01"
                                    required
                                    style={{ borderColor: 'var(--danger)' }}
                                />
                                <small className="text-muted" style={{ color: 'var(--danger)' }}>
                                    Este importe se restará del total de ventas
                                </small>
                            </div>
                        )}

                        {/* Date and Time */}
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Fecha</label>
                                <input
                                    type="date"
                                    name="fecha"
                                    value={formData.fecha}
                                    onChange={handleChange}
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Hora</label>
                                <input
                                    type="time"
                                    name="hora"
                                    value={formData.hora}
                                    onChange={handleChange}
                                    className="form-input"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={mode === 'abono' ? { background: 'var(--danger)' } : {}}
                        >
                            {loading ? 'Guardando...' : mode === 'venta' ? 'Registrar Venta' : 'Registrar Abono'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
