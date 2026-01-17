/**
 * Sales calculation engine
 * Calculates all KPIs from input data
 */

/**
 * Filter sales to ensure only one record per employee exists (deduplication)
 * PRIORITIZES the first record found (assuming desc sort) or effectively arbitrary if unsorted.
 * @param {Array} salesArray - Array of sales
 * @returns {Array} Deduplicated sales
 */
export function unifyDailySales(salesArray) {
    if (!salesArray || salesArray.length === 0) return [];

    const uniqueMap = {};
    salesArray.forEach(sale => {
        // Only keep the first one encountered for each employee
        if (!uniqueMap[sale.empleada]) {
            uniqueMap[sale.empleada] = sale;
        }
    });

    return Object.values(uniqueMap);
}

/**
 * Filter sales to ensure only one record per employee PER DAY exists (history deduplication)
 * @param {Array} salesArray - Array of sales
 * @returns {Array} Deduplicated sales
 */
export function unifyHistorySales(salesArray) {
    if (!salesArray || salesArray.length === 0) return [];

    const uniqueMap = {};
    salesArray.forEach(sale => {
        const dateStr = new Date(sale.fecha).toDateString();
        const key = `${dateStr}_${sale.empleada}`;

        // Only keep the first one encountered for each employee/date combo
        if (!uniqueMap[key]) {
            uniqueMap[key] = sale;
        }
    });

    return Object.values(uniqueMap);
}

/**
 * Aggregate sales by employee for a specific date
 * Supports both new unit sales system and legacy total records
 * @param {Array} salesArray - All sales records for a date
 * @param {string} empleada - Employee name to filter
 * @returns {Object} Aggregated data for that employee
 */
export function aggregateDailyByEmployee(salesArray, empleada) {
    if (!salesArray || salesArray.length === 0) {
        return {
            operaciones: 0,
            unidades: 0,
            ventaBruta: 0,
            abonos: 0,
            venta: 0,
            clientes: 0,
            horasTrabajadas: 0,
            hasClose: false
        };
    }

    // Filter by employee
    const empSales = salesArray.filter(s => s.empleada === empleada);

    if (empSales.length === 0) {
        return {
            operaciones: 0,
            unidades: 0,
            ventaBruta: 0,
            abonos: 0,
            venta: 0,
            clientes: 0,
            horasTrabajadas: 0,
            hasClose: false
        };
    }

    // Check for legacy record (tipo 'total' or no tipo with full data)
    const legacyRecord = empSales.find(s =>
        (!s.tipo || s.tipo === 'total') && s.clientes !== undefined && s.operaciones !== undefined
    );

    // Always check for separate abono records (they can coexist with legacy records)
    const abonosRecords = empSales.filter(s => s.tipo === 'abono');
    const abonosFromSeparateRecords = abonosRecords.reduce((sum, s) => sum + (s.abono || 0), 0);

    if (legacyRecord) {
        // Combine legacy record with any separate abono records
        const totalAbonos = (legacyRecord.abonos || 0) + abonosFromSeparateRecords;
        const adjustedVenta = (legacyRecord.venta || 0) - abonosFromSeparateRecords;

        try {
            const ratios = calculateRatios({ ...legacyRecord, venta: adjustedVenta });
            return {
                ...legacyRecord,
                ...ratios,
                abonos: totalAbonos,
                venta: adjustedVenta,
                ventaBruta: legacyRecord.ventaBruta || legacyRecord.venta || 0,
                hasClose: true
            };
        } catch {
            return {
                ...legacyRecord,
                abonos: totalAbonos,
                venta: adjustedVenta,
                ventaBruta: legacyRecord.ventaBruta || legacyRecord.venta || 0,
                conversion: 0,
                apo: 0,
                pmv: 0,
                ticketMedio: 0,
                productividad: 0,
                hasClose: true
            };
        }
    }

    // Aggregate from unit sales
    const unitarias = empSales.filter(s => s.tipo === 'unitaria');
    // abonosRecords already defined above
    const ajustes = empSales.filter(s => s.tipo === 'ajuste');
    const cierre = empSales.find(s => s.tipo === 'cierre');

    const operaciones = unitarias.length;
    const unidades = unitarias.reduce((sum, s) => sum + (s.articulos || 0), 0);
    const ventaBruta = unitarias.reduce((sum, s) => sum + (s.venta || 0), 0);
    const abonos = abonosFromSeparateRecords;

    // Add adjustments
    const ventaAjuste = ajustes.reduce((sum, s) => sum + (s.ventaAjuste || 0), 0);
    const abonoAjuste = ajustes.reduce((sum, s) => sum + (s.abonoAjuste || 0), 0);

    const ventaFinal = ventaBruta - abonos + ventaAjuste - abonoAjuste;
    const clientes = cierre?.clientes || 0;
    const horasTrabajadas = cierre?.horasTrabajadas || 0;

    const result = {
        operaciones,
        unidades,
        ventaBruta,
        abonos: abonos + abonoAjuste,
        venta: ventaFinal,
        clientes,
        horasTrabajadas,
        hasClose: !!cierre,
        empleada
    };

    // Calculate ratios if we have enough data
    if (operaciones > 0 && unidades > 0 && clientes > 0 && horasTrabajadas > 0) {
        try {
            const ratios = calculateRatios(result);
            return { ...result, ...ratios };
        } catch {
            // Fall through to default ratios
        }
    }

    // Partial ratios for incomplete data
    return {
        ...result,
        conversion: clientes > 0 ? roundTo((operaciones * 100) / clientes, 2) : 0,
        apo: operaciones > 0 ? roundTo(unidades / operaciones, 2) : 0,
        pmv: unidades > 0 ? roundTo(ventaFinal / unidades, 2) : 0,
        ticketMedio: operaciones > 0 ? roundTo(ventaFinal / operaciones, 2) : 0,
        productividad: horasTrabajadas > 0 ? roundTo(ventaFinal / horasTrabajadas, 2) : 0
    };
}

/**
 * Aggregate all employees for a specific date
 * @param {Array} salesArray - All sales records for a date
 * @returns {Object} { ingrid: {...}, marta: {...}, total: {...} }
 */
export function aggregateDailyTotal(salesArray) {
    const ingrid = aggregateDailyByEmployee(salesArray, 'Ingrid');
    const marta = aggregateDailyByEmployee(salesArray, 'Marta');

    // Combine totals
    const total = {
        operaciones: ingrid.operaciones + marta.operaciones,
        unidades: ingrid.unidades + marta.unidades,
        ventaBruta: ingrid.ventaBruta + marta.ventaBruta,
        abonos: ingrid.abonos + marta.abonos,
        venta: ingrid.venta + marta.venta,
        clientes: ingrid.clientes + marta.clientes,
        horasTrabajadas: ingrid.horasTrabajadas + marta.horasTrabajadas,
        hasClose: ingrid.hasClose && marta.hasClose
    };

    // Calculate combined ratios
    if (total.operaciones > 0 && total.unidades > 0) {
        total.conversion = total.clientes > 0 ? roundTo((total.operaciones * 100) / total.clientes, 2) : 0;
        total.apo = roundTo(total.unidades / total.operaciones, 2);
        total.pmv = roundTo(total.venta / total.unidades, 2);
        total.ticketMedio = roundTo(total.venta / total.operaciones, 2);
        total.productividad = total.horasTrabajadas > 0 ? roundTo(total.venta / total.horasTrabajadas, 2) : 0;
    } else {
        total.conversion = 0;
        total.apo = 0;
        total.pmv = 0;
        total.ticketMedio = 0;
        total.productividad = 0;
    }

    return { ingrid, marta, total };
}

/**
 * Aggregate multiple sales records into a single summary with calculated ratios
 * @param {Array} salesArray - Array of sale records
 * @returns {Object|null} Aggregated sale object or null
 */
export function aggregateSales(salesArray) {
    if (!salesArray || salesArray.length === 0) {
        return null;
    }

    const initialStats = {
        clientes: 0,
        operaciones: 0,
        unidades: 0,
        venta: 0,
        ventaBruta: 0,
        abonos: 0,
        horasTrabajadas: 0,
    };

    const totals = salesArray.reduce((acc, sale) => {
        return {
            clientes: acc.clientes + (sale.clientes || 0),
            operaciones: acc.operaciones + (sale.operaciones || 0),
            unidades: acc.unidades + (sale.unidades || 0),
            venta: acc.venta + (sale.venta || 0),
            ventaBruta: acc.ventaBruta + (sale.ventaBruta || sale.venta || 0),
            abonos: acc.abonos + (sale.abonos || 0),
            horasTrabajadas: acc.horasTrabajadas + (sale.horasTrabajadas || 0),
        };
    }, initialStats);

    // If no meaningful data, return zeroes to avoid NaN
    if (totals.clientes === 0 && totals.operaciones === 0) {
        return {
            ...totals,
            conversion: 0,
            apo: 0,
            pmv: 0,
            ticketMedio: 0,
            productividad: 0
        };
    }

    try {
        const ratios = calculateRatios(totals);
        return {
            ...totals,
            ...ratios
        };
    } catch (e) {
        // Fallback for edge cases
        return {
            ...totals,
            conversion: 0,
            apo: 0,
            pmv: 0,
            ticketMedio: 0,
            productividad: 0
        };
    }
}

/**
 * Calculate all sales ratios from input data
 * @param {Object} input - Input data from user
 * @param {number} input.clientes - Number of visitors
 * @param {number} input.operaciones - Number of transactions
 * @param {number} input.unidades - Total units sold
 * @param {number} input.venta - Total sales in €
 * @param {number} input.horasTrabajadas - Hours worked
 * @returns {Object} Calculated ratios
 */
export function calculateRatios(input) {
    const { clientes, operaciones, unidades, venta, horasTrabajadas } = input;

    // Validate inputs to avoid division by zero
    if (clientes <= 0 || operaciones <= 0 || unidades <= 0 || horasTrabajadas <= 0) {
        throw new Error('Todos los valores deben ser mayores que 0');
    }

    // Calculate ratios
    const conversion = (operaciones * 100) / clientes;
    const apo = unidades / operaciones;
    const pmv = venta / unidades;
    const ticketMedio = venta / operaciones;
    const productividad = venta / horasTrabajadas;

    return {
        conversion: roundTo(conversion, 2),
        apo: roundTo(apo, 2),
        pmv: roundTo(pmv, 2),
        ticketMedio: roundTo(ticketMedio, 2),
        productividad: roundTo(productividad, 2)
    };
}

/**
 * Validate that Ticket Medio = APO × PMV (cross-validation)
 * @param {Object} ratios - Calculated ratios
 * @returns {boolean} True if validation passes
 */
export function validateCalculations(ratios) {
    const { apo, pmv, ticketMedio } = ratios;
    const expectedTicketMedio = apo * pmv;
    const tolerance = 0.01; // Allow small floating point differences

    return Math.abs(ticketMedio - expectedTicketMedio) < tolerance;
}

/**
 * Round number to specified decimal places
 * @param {number} value - Number to round
 * @param {number} decimals - Decimal places
 * @returns {number} Rounded number
 */
export function roundTo(value, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

/**
 * Format currency value
 * @param {number} value - Value to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

/**
 * Format percentage value
 * @param {number} value - Value to format (already in percentage form)
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value) {
    return `${value.toFixed(2)}%`;
}

/**
 * Format number with decimals
 * @param {number} value - Value to format
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted number string
 */
export function formatNumber(value, decimals = 2) {
    return new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

/**
 * Calculate trend percentage between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {Object} Trend info with percentage and direction
 */
export function calculateTrend(current, previous) {
    if (previous === 0) {
        return { percentage: 0, direction: 'neutral' };
    }

    const change = ((current - previous) / previous) * 100;

    return {
        percentage: roundTo(Math.abs(change), 1),
        direction: change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'
    };
}

/**
 * Get summary statistics from an array of sales
 * @param {Array} sales - Array of sale records
 * @param {string} field - Field to summarize
 * @returns {Object} Summary with avg, min, max, total
 */
export function getSummaryStats(sales, field) {
    if (!sales || sales.length === 0) {
        return { avg: 0, min: 0, max: 0, total: 0 };
    }

    const values = sales.map(sale => sale[field] || 0);
    const total = values.reduce((sum, val) => sum + val, 0);

    return {
        avg: roundTo(total / values.length, 2),
        min: roundTo(Math.min(...values), 2),
        max: roundTo(Math.max(...values), 2),
        total: roundTo(total, 2)
    };
}
