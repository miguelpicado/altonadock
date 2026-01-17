/**
 * Convert sales data to CSV format and trigger download
 * Supports both legacy records and new unit sales system
 * @param {Array} sales - Array of sales objects
 */
export function exportSalesToCSV(sales) {
    if (!sales || sales.length === 0) {
        alert("No hay datos para exportar");
        return;
    }

    // Define CSV headers - added new columns for unit sales system
    const headers = [
        "Fecha",
        "Hora",
        "Tipo",
        "Empleada",
        "Artículos",
        "Venta (€)",
        "Abono (€)",
        "Venta Bruta (€)",
        "Unidades",
        "Operaciones",
        "Clientes",
        "Horas Trabajadas",
        "Conversion (%)",
        "Ticket Medio (€)",
        "APO (Unidades/Ticket)",
        "PMV (Precio Medio Venta)",
        "Productividad (€/h)",
        "Motivo Ajuste"
    ];

    // Helper to get record type label
    const getTypeLabel = (sale) => {
        if (!sale.tipo) return 'total';
        return sale.tipo;
    };

    // Construct CSV content
    const csvContent = [
        headers.join(","), // Header row
        ...sales.map(sale => {
            const dateStr = new Date(sale.fecha).toLocaleDateString();
            const tipo = getTypeLabel(sale);

            return [
                dateStr,
                sale.hora || '',
                tipo,
                `"${sale.empleada}"`,
                // For unit sales, use articulos; for legacy, use unidades
                tipo === 'unitaria' ? sale.articulos : sale.unidades || '',
                // venta field (adjusted for type)
                tipo === 'abono' ? '' : (sale.venta || 0),
                // abono field
                tipo === 'abono' ? sale.abono : (sale.abonos || ''),
                // ventaBruta
                sale.ventaBruta || '',
                // unidades (legacy only)
                tipo === 'total' || !sale.tipo ? sale.unidades : '',
                // operaciones (legacy only)
                tipo === 'total' || !sale.tipo ? sale.operaciones : '',
                // clientes (legacy or cierre)
                sale.clientes || '',
                // horas trabajadas
                sale.horasTrabajadas || '',
                // calculated ratios (legacy only)
                sale.conversion || '',
                sale.ticketMedio || '',
                sale.apo || '',
                sale.pmv || '',
                sale.productividad || '',
                // motivo (for adjustments)
                sale.motivo ? `"${sale.motivo}"` : ''
            ].map(val => {
                // Handle undefined/null
                if (val === null || val === undefined) return "";
                // If string with comma, ensure it's quoted
                if (typeof val === 'string' && val.includes(',') && !val.startsWith('"')) {
                    return `"${val}"`;
                }
                return val;
            }).join(",");
        })
    ].join("\n");

    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `ventas_altonadock_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
