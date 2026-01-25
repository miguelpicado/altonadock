import { useState, useEffect } from 'react';
import { formatCurrency, formatPercentage } from '../utils/calculations';

const EMPLOYEES = ['Ingrid', 'Marta'];

export default function AddTotalSaleModal({
    isOpen,
    onClose,
    onSubmitClose,
    onSubmitAdjustment,
    aggregatedData // { ingrid: {...}, marta: {...}, total: {...} }
}) {
    const [formData, setFormData] = useState({
        empleada: EMPLOYEES[0],
        clientes: '',
        horasTrabajadas: '8',
        ventaReal: '',
        motivoAjuste: '',
        // New manual fields
        objetivo: '',
        ly: '',
        ticketsCRM: '',
        altasCRM: '',
        lecturaRapida: {
            funcionado: '',
            noFuncionado: '',
            producto: '',
            limpieza: false,
            perfilado: false,
            reposicion: false
        }
    });

    const [closureType, setClosureType] = useState('day'); // 'day' | 'turn'
    const [showReport, setShowReport] = useState(false);
    const [lastReportData, setLastReportData] = useState(null);
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
        const { name, value, type, checked } = e.target;

        if (name.startsWith('lectura_')) {
            const field = name.replace('lectura_', '');
            setFormData(prev => ({
                ...prev,
                lecturaRapida: {
                    ...prev.lecturaRapida,
                    [field]: type === 'checkbox' ? checked : value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
        setError('');
    };

    const generateReportTable = (data, inputs) => {
        const dateStr = new Date().toLocaleDateString('es-ES', {
            year: 'numeric', month: '2-digit', day: '2-digit'
        });

        const safeData = {
            ingrid: data?.ingrid || {},
            marta: data?.marta || {},
            total: data?.total || {}
        };

        const totalCRM = safeData.total.ticketsCRM || 0;
        const totalTickets = safeData.total.operaciones || 0;
        const crmPercentage = totalTickets > 0 ? (totalCRM / totalTickets) * 100 : 0;

        const objectiveVal = parseFloat(inputs.objetivo) || 0;
        const lyVal = parseFloat(inputs.ly) || 0;
        const totalVenta = safeData.total.venta || 0;

        const percentVsLy = lyVal > 0 ? ((totalVenta - lyVal) / lyVal) * 100 : 0;
        const percentVsObj = objectiveVal > 0 ? ((totalVenta - objectiveVal) / objectiveVal) * 100 : 0;

        const checkMark = '✔️'; // Unicode checkmark

        return `
            <table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
                <!-- HEADER -->
                <tr style="background-color: #f8f9fa;">
                    <td colspan="6" style="text-align: center; font-weight: bold; padding: 10px;">REPORTE CIERRE DE TIENDA – KPI´s</td>
                </tr>
                <tr>
                    <td style="font-weight: bold;">Tienda</td>
                    <td>ECI A Coruña</td>
                    <td style="font-weight: bold;">Canal</td>
                    <td></td>
                    <td style="font-weight: bold;">Periodo</td>
                    <td>${dateStr}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold;">Responsable</td>
                    <td>${inputs.empleada}</td>
                    <td colspan="4"></td>
                </tr>
                
                <!-- KPI'S DE VENTA -->
                <tr style="background-color: #d1d5db;">
                    <td colspan="6" style="text-align: center; font-weight: bold;">KPI´s DE VENTA</td>
                </tr>
                <tr style="background-color: #e5e7eb; font-weight: bold;">
                    <td>KPI</td>
                    <td>Resultado</td>
                    <td>Objetivo</td>
                    <td>LY</td>
                    <td>% vs LY</td>
                    <td>% vs Obj</td>
                </tr>
                <tr>
                    <td>Ventas (€)</td>
                    <td>${formatCurrency(totalVenta)}</td>
                    <td>${inputs.objetivo ? formatCurrency(objectiveVal) : ''}</td>
                    <td>${inputs.ly ? formatCurrency(lyVal) : ''}</td>
                    <td>${inputs.ly ? formatPercentage(percentVsLy) : ''}</td>
                    <td>${inputs.objetivo ? formatPercentage(percentVsObj) : ''}</td>
                </tr>
                <tr>
                    <td>Nº Tickets</td>
                    <td>${safeData.total.operaciones || 0}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <td>ATV (€)</td>
                    <td>${formatCurrency(safeData.total.ticketMedio || 0)}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <td>UPT</td>
                    <td>${safeData.total.apo || 0}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>

                <!-- KPI'S DE PRODUCTIVIDAD -->
                <tr style="background-color: #d1d5db;">
                    <td colspan="6" style="text-align: center; font-weight: bold;">KPI´s DE PRODUCTIVIDAD</td>
                </tr>
                <tr style="background-color: #e5e7eb; font-weight: bold;">
                    <td>KPI</td>
                    <td>Resultado</td>
                    <td>Objetivo</td>
                    <td>LY</td>
                    <td>% vs LY</td>
                    <td>Valoración</td>
                </tr>
                <tr>
                    <td>Ventas Ingrid (€)</td>
                    <td>${formatCurrency(safeData.ingrid.venta || 0)}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <td>Ventas Marta (€)</td>
                    <td>${formatCurrency(safeData.marta.venta || 0)}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <td>Conversión (%)</td>
                    <td>${formatPercentage(safeData.total.conversion || 0)}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>

                <!-- KPI'S DE CLIENTE / MARCA -->
                <tr style="background-color: #d1d5db;">
                    <td colspan="6" style="text-align: center; font-weight: bold;">KPI´s DE CLIENTE / MARCA</td>
                </tr>
                <tr style="background-color: #e5e7eb; font-weight: bold;">
                    <td>KPI</td>
                    <td>Resultado</td>
                    <td>Objetivo</td>
                    <td>LY</td>
                    <td>Valor</td>
                    <td>Comentarios</td>
                </tr>
                 <tr>
                    <td>Altas CRM</td>
                    <td>${safeData.total.altasCRM || 0}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <td>% Tickets con CRM</td>
                    <td>${formatPercentage(crmPercentage)}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <td>Devoluciones</td>
                    <td>${safeData.total.abonosCount || 0}</td>
                    <td></td>
                    <td></td>
                    <td>${formatCurrency(Math.abs(safeData.total.abonos || 0))}</td>
                    <td></td>
                </tr>

                <!-- LECTURA RÁPIDA -->
                <tr style="background-color: #d1d5db;">
                    <td colspan="6" style="text-align: center; font-weight: bold;">LECTURA RÁPIDA DEL CIERRE</td>
                </tr>
                <tr>
                    <td colspan="2">Qué ha funcionado</td>
                    <td colspan="4">${inputs.lecturaRapida.funcionado || ''}</td>
                </tr>
                <tr>
                    <td colspan="2">Qué no ha funcionado</td>
                    <td colspan="4">${inputs.lecturaRapida.noFuncionado || ''}</td>
                </tr>
                 <tr>
                    <td colspan="2">Producto</td>
                    <td colspan="4">${inputs.lecturaRapida.producto || ''}</td>
                </tr>
                <tr>
                    <td colspan="2">Limpieza de tienda</td>
                    <td colspan="4">${inputs.lecturaRapida.limpieza ? checkMark : ''}</td>
                </tr>
                <tr>
                    <td colspan="2">Perfilado</td>
                    <td colspan="4">${inputs.lecturaRapida.perfilado ? checkMark : ''}</td>
                </tr>
                <tr>
                    <td colspan="2">Reposicion diaria</td>
                    <td colspan="4">${inputs.lecturaRapida.reposicion ? checkMark : ''}</td>
                </tr>
            </table>
        `;
    };

    const handleCopyTable = async () => {
        if (!lastReportData) return;

        // Generate a plain text version for compatibility (e.g., WhatsApp, Notepad)
        // Replace cell endings with tabs and row endings with newlines
        const plainText = lastReportData
            .replace(/<\/td>/gi, '\t')
            .replace(/<\/tr>/gi, '\n')
            .replace(/<\/?[^>]+(>|$)/g, "") // Strip remaining tags
            .replace(/^\s*[\r\n]/gm, ""); // Remove empty lines

        try {
            const htmlBlob = new Blob([lastReportData], { type: 'text/html' });
            const textBlob = new Blob([plainText], { type: 'text/plain' });

            const data = [new ClipboardItem({
                'text/html': htmlBlob,
                'text/plain': textBlob
            })];

            await navigator.clipboard.write(data);
            alert('Tabla copiada al portapapeles');
        } catch (err) {
            console.error('Failed to copy: ', err);
            // Fallback
            try {
                const listener = (e) => {
                    e.clipboardData.setData("text/html", lastReportData);
                    e.clipboardData.setData("text/plain", plainText);
                    e.preventDefault();
                };
                document.addEventListener("copy", listener);
                document.execCommand("copy");
                document.removeEventListener("copy", listener);
                alert('Tabla copiada al portapapeles (modo compatibilidad)');
            } catch (fallbackErr) {
                console.error('Fallback failed:', fallbackErr);
                alert('No se pudo copiar automáticamente. Por favor selecciónalo manualmente.');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.clientes || parseInt(formData.clientes) <= 0) {
            setError('El número de clientes debe ser mayor que 0');
            return;
        }

        try {
            setLoading(true);
            const fecha = new Date().toISOString().split('T')[0];
            const calculatedVenta = empData?.venta || 0;
            const realVenta = parseFloat(formData.ventaReal) || calculatedVenta;
            const difference = realVenta - calculatedVenta;

            // Submit turn close with extra manual data if Day closure
            const closeData = {
                empleada: formData.empleada,
                clientes: parseInt(formData.clientes, 10),
                horasTrabajadas: parseFloat(formData.horasTrabajadas),
                fecha,
                // Extra metadata can be stored if backend supports it
                metadata: closureType === 'day' ? {
                    objetivo: formData.objetivo,
                    ly: formData.ly,
                    ticketsCRM: aggregatedData?.total?.ticketsCRM || 0,
                    altasCRM: aggregatedData?.total?.altasCRM || 0,
                    lectura: formData.lecturaRapida
                } : undefined
            };

            await onSubmitClose(closeData);

            if (Math.abs(difference) > 0.01) {
                await onSubmitAdjustment({
                    empleada: formData.empleada,
                    ventaAjuste: difference,
                    abonoAjuste: 0,
                    motivo: formData.motivoAjuste || 'Ajuste de cierre',
                    fecha
                });
            }

            // Generate report ONLY if it's END OF DAY
            if (closureType === 'day') {
                const reportHTML = generateReportTable(aggregatedData, formData);
                setLastReportData(reportHTML);
                setShowReport(true); // Switch to report view
            } else {
                onClose(); // Just close for partial shifts
            }

        } catch (err) {
            setError(err.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    if (showReport) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2 className="modal-title">✅ Turno Cerrado</h2>
                        <button className="modal-close" onClick={onClose}>×</button>
                    </div>
                    <div className="modal-body">
                        <div className="text-center mb-lg">
                            <p>El turno se ha cerrado correctamente.</p>
                            <p className="text-sm text-gray margin-top-sm">
                                Ahora puedes copiar la tabla de KPIs para enviarla por email.
                            </p>
                        </div>

                        <div style={{
                            background: '#f3f4f6',
                            padding: '1rem',
                            borderRadius: '8px',
                            maxHeight: '300px',
                            overflow: 'auto',
                            marginBottom: '1rem',
                            border: '1px solid #e5e7eb'
                        }}>
                            <div dangerouslySetInnerHTML={{ __html: lastReportData }} />
                        </div>

                        <div className="flex gap-md justify-center">
                            <button
                                className="btn btn-primary"
                                onClick={handleCopyTable}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                📋 Copiar Tabla
                            </button>
                            <button className="btn btn-secondary" onClick={onClose}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const calculatedVenta = empData?.venta || 0;
    const realVenta = parseFloat(formData.ventaReal) || calculatedVenta;
    const difference = realVenta - calculatedVenta;
    const hasDifference = Math.abs(difference) > 0.01;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: closureType === 'day' ? '1000px' : '600px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">📋 Cierre de Turno</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && (
                            <div className="card mb-md error-card">
                                {error}
                            </div>
                        )}

                        {/* Closure Type Selector */}
                        <div className="card mb-md" style={{ background: 'var(--bg-secondary)', padding: '0.75rem' }}>
                            <label className="form-label mb-sm" style={{ display: 'block' }}>Tipo de Cierre</label>
                            <div className="flex gap-md">
                                <button
                                    type="button"
                                    className={`btn ${closureType === 'turn' ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ flex: 1, padding: '0.75rem 0.5rem', fontSize: '1rem' }}
                                    onClick={() => setClosureType('turn')}
                                >
                                    ☀️ Cierre Parcial
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${closureType === 'day' ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ flex: 1, padding: '0.75rem 0.5rem', fontSize: '1rem' }}
                                    onClick={() => setClosureType('day')}
                                >
                                    🌙 Cierre Jornada
                                </button>
                            </div>
                        </div>

                        {/* Two Column Layout for Day Closure */}
                        <div className={closureType === 'day' ? 'closure-grid' : ''}>

                            {/* LEFT COLUMN: Quantitative Data */}
                            <div>
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

                                {/* Basic Data */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Clientes *</label>
                                        <input
                                            type="number"
                                            name="clientes"
                                            value={formData.clientes}
                                            onChange={handleChange}
                                            className="form-input"
                                            required
                                            min="1"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Horas</label>
                                        <input
                                            type="number"
                                            name="horasTrabajadas"
                                            value={formData.horasTrabajadas}
                                            onChange={handleChange}
                                            className="form-input"
                                            step="0.5"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Manual KPIs (Only for Day) */}
                                {closureType === 'day' && (
                                    <div className="card mb-md" style={{ background: 'var(--bg-secondary)' }}>
                                        <h4 className="section-title mb-md">📊 Datos Adicionales</h4>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Objetivo (€)</label>
                                                <input type="number" name="objetivo" value={formData.objetivo} onChange={handleChange} className="form-input" step="0.01" />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Venta LY (€)</label>
                                                <input type="number" name="ly" value={formData.ly} onChange={handleChange} className="form-input" step="0.01" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Adjustment Section */}
                                {hasDifference && (
                                    <div className="card mt-md warning-card">
                                        <div className="mb-md text-center">
                                            <span style={{ color: difference > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                                                {difference > 0 ? '+' : ''}{formatCurrency(difference)} ajuste
                                            </span>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Venta real</label>
                                            <input
                                                type="number"
                                                name="ventaReal"
                                                value={formData.ventaReal}
                                                onChange={handleChange}
                                                className="form-input"
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Motivo ajuste</label>
                                            <input
                                                type="text"
                                                name="motivoAjuste"
                                                value={formData.motivoAjuste}
                                                onChange={handleChange}
                                                className="form-input"
                                                placeholder="Ej: Descuadre caja"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT COLUMN: Qualitative Data (Only for Day) */}
                            {closureType === 'day' && (
                                <div>
                                    <div className="card" style={{ background: 'var(--bg-secondary)', height: '100%' }}>
                                        <h4 className="section-title mb-md">📝 Lectura Rápida</h4>

                                        <div className="form-group">
                                            <label className="form-label">Qué ha funcionado</label>
                                            <input type="text" name="lectura_funcionado" value={formData.lecturaRapida.funcionado} onChange={handleChange} className="form-input" />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Qué NO ha funcionado</label>
                                            <input type="text" name="lectura_noFuncionado" value={formData.lecturaRapida.noFuncionado} onChange={handleChange} className="form-input" />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Producto destacado</label>
                                            <input type="text" name="lectura_producto" value={formData.lecturaRapida.producto} onChange={handleChange} className="form-input" />
                                        </div>

                                    </div>
                                </div>
                            )}

                        </div>
                        {/* End Grid */}

                        {/* Full Width Tasks Buttons (Only for Day) */}
                        {closureType === 'day' && (
                            <div className="card mt-md" style={{ background: 'var(--bg-secondary)', padding: '0.75rem' }}>
                                <div className="flex gap-sm">
                                    <button
                                        type="button"
                                        className={`btn ${formData.lecturaRapida.limpieza ? 'btn-primary' : 'btn-secondary'}`}
                                        style={{ flex: 1, padding: '0.75rem 0.5rem', fontSize: '1rem' }}
                                        onClick={() => handleChange({ target: { name: 'lectura_limpieza', type: 'checkbox', checked: !formData.lecturaRapida.limpieza } })}
                                    >
                                        🧹 Limpieza
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn ${formData.lecturaRapida.perfilado ? 'btn-primary' : 'btn-secondary'}`}
                                        style={{ flex: 1, padding: '0.75rem 0.5rem', fontSize: '1rem' }}
                                        onClick={() => handleChange({ target: { name: 'lectura_perfilado', type: 'checkbox', checked: !formData.lecturaRapida.perfilado } })}
                                    >
                                        👕 Perfilado
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn ${formData.lecturaRapida.reposicion ? 'btn-primary' : 'btn-secondary'}`}
                                        style={{ flex: 1, padding: '0.75rem 0.5rem', fontSize: '1rem' }}
                                        onClick={() => handleChange({ target: { name: 'lectura_reposicion', type: 'checkbox', checked: !formData.lecturaRapida.reposicion } })}
                                    >
                                        📦 Reposición
                                    </button>
                                </div>
                            </div>
                        )}

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
            </div >
        </div >
    );
}
