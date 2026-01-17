import { useState } from 'react';

const EMPLOYEES = ['Ingrid', 'Marta'];

export default function AddSaleModal({ isOpen, onClose, onSubmit, existingSales }) {
    const [formData, setFormData] = useState({
        fecha: new Date().toISOString().split('T')[0],
        empleada: EMPLOYEES[0],
        clientes: '',
        operaciones: '',
        unidades: '',
        venta: '',
        horasTrabajadas: '',
        abonos: ''
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

        // Validate all fields are filled
        const requiredFields = ['clientes', 'operaciones', 'unidades', 'venta', 'horasTrabajadas'];
        for (const field of requiredFields) {
            if (!formData[field] || parseFloat(formData[field]) <= 0) {
                setError(`El campo "${getFieldLabel(field)}" debe ser mayor que 0`);
                return;
            }
        }

        try {
            setLoading(true);

            // Convert to numbers
            const ventaBruta = parseFloat(formData.venta);
            const abonos = formData.abonos ? parseFloat(formData.abonos) : 0;
            const ventaNeta = ventaBruta - abonos;

            const saleInput = {
                fecha: formData.fecha,
                empleada: formData.empleada,
                clientes: parseInt(formData.clientes, 10),
                operaciones: parseInt(formData.operaciones, 10),
                unidades: parseInt(formData.unidades, 10),
                venta: ventaNeta,
                ventaBruta: ventaBruta,
                abonos: abonos,
                horasTrabajadas: parseFloat(formData.horasTrabajadas)
            };

            // Check for existing record
            // Convert existing sales dates to compare locally
            const existingRecord = existingSales?.find(s => {
                const sDate = new Date(s.fecha).toISOString().split('T')[0];
                return sDate === formData.fecha && s.empleada === formData.empleada;
            });

            if (existingRecord) {
                const confirmOverwrite = window.confirm(
                    `⚠️ YA EXISTE UN REGISTRO PARA ${formData.empleada.toUpperCase()} EN ESTA FECHA (${formData.fecha}).\n\n` +
                    `Datos existentes: ${existingRecord.venta}€\n` +
                    `Nuevos datos: ${formData.venta}€\n\n` +
                    `¿Deseas SOBREESCRIBIR los datos antiguos?`
                );

                if (!confirmOverwrite) {
                    setLoading(false);
                    return;
                }
            }

            await onSubmit(saleInput);

            // Reset form
            setFormData({
                fecha: new Date().toISOString().split('T')[0],
                empleada: EMPLOYEES[0],
                clientes: '',
                operaciones: '',
                unidades: '',
                venta: '',
                horasTrabajadas: '',
                abonos: ''
            });

            onClose();
        } catch (err) {
            setError(err.message || 'Error al guardar la venta');
        } finally {
            setLoading(false);
        }
    };

    const getFieldLabel = (field) => {
        const labels = {
            clientes: 'Clientes',
            operaciones: 'Operaciones',
            unidades: 'Unidades',
            venta: 'Venta (€)',
            horasTrabajadas: 'Horas trabajadas',
            abonos: 'Abonos (€)'
        };
        return labels[field] || field;
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Nueva Venta</h2>
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
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Clientes (visitantes)</label>
                                <input
                                    type="number"
                                    name="clientes"
                                    value={formData.clientes}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Ej: 100"
                                    min="1"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Operaciones (tickets)</label>
                                <input
                                    type="number"
                                    name="operaciones"
                                    value={formData.operaciones}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Ej: 15"
                                    min="1"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Unidades vendidas</label>
                                <input
                                    type="number"
                                    name="unidades"
                                    value={formData.unidades}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Ej: 25"
                                    min="1"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Venta total (€)</label>
                                <input
                                    type="number"
                                    name="venta"
                                    value={formData.venta}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Ej: 500"
                                    min="0.01"
                                    step="0.01"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
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

                            <div className="form-group">
                                <label className="form-label">Abonos (€)</label>
                                <input
                                    type="number"
                                    name="abonos"
                                    value={formData.abonos}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Ej: 50.00"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Guardando...' : 'Calcular y Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
