import { useState, useMemo, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import StatCard from '../components/StatCard';
import {
    formatCurrency,
    formatPercentage,
    formatNumber,
    getSummaryStats,
    calculateTrend,
    aggregateDailyTotal
} from '../utils/calculations';
import { normalizeDate } from '../utils/dateUtils';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Storage keys
const GOAL_STORAGE_KEY = 'altona_monthly_goal';

export default function ResumenTab({ sales, lastSale }) {
    // Filter state
    const [filterType, setFilterType] = useState('month'); // 'month', 'year', 'custom'
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // Goal state
    const [monthlyGoal, setMonthlyGoal] = useState(() => {
        const saved = localStorage.getItem(GOAL_STORAGE_KEY);
        return saved ? JSON.parse(saved) : { amount: 0, month: new Date().getMonth(), year: new Date().getFullYear() };
    });
    const [editingGoal, setEditingGoal] = useState(false);
    const [goalInput, setGoalInput] = useState(monthlyGoal.amount.toString());

    // Save goal to localStorage
    useEffect(() => {
        localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify(monthlyGoal));
    }, [monthlyGoal]);

    // Filter sales based on selected filter
    const filteredSales = useMemo(() => {
        if (!sales || sales.length === 0) return [];

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return sales.filter(sale => {
            try {
                const saleDate = normalizeDate(sale.fecha);

                switch (filterType) {
                    case 'month':
                        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
                    case 'year':
                        return saleDate.getFullYear() === currentYear;
                    case 'custom':
                        if (!customStartDate || !customEndDate) return true;
                        const start = new Date(customStartDate);
                        const end = new Date(customEndDate);
                        end.setHours(23, 59, 59, 999);
                        return saleDate >= start && saleDate <= end;
                    default:
                        return true;
                }
            } catch (error) {
                console.error('Error filtering sale:', error, sale);
                return false;
            }
        });
    }, [sales, filterType, customStartDate, customEndDate]);

    // Calculate current month total for goal progress
    const currentMonthTotal = useMemo(() => {
        if (!sales || sales.length === 0) return 0;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Filter sales for current month
        const monthSales = sales.filter(sale => {
            const saleDate = new Date(sale.fecha);
            return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
        });

        // Group by day and aggregate
        const grouped = {};
        monthSales.forEach(sale => {
            const dateStr = new Date(sale.fecha).toDateString();
            if (!grouped[dateStr]) grouped[dateStr] = [];
            grouped[dateStr].push(sale);
        });

        // Sum the net sales for each day
        let total = 0;
        Object.values(grouped).forEach(daySales => {
            const { total: dayTotal } = aggregateDailyTotal(daySales);
            total += dayTotal.venta || 0;
        });

        return total;
    }, [sales]);

    // Goal percentage
    const goalPercentage = useMemo(() => {
        if (monthlyGoal.amount <= 0) return 0;
        return Math.round((currentMonthTotal / monthlyGoal.amount) * 100);
    }, [currentMonthTotal, monthlyGoal.amount]);

    // Aggregate filtered sales by day for stats and charts
    const cleanSales = useMemo(() => {
        if (!filteredSales || filteredSales.length === 0) return [];

        // Group by date
        const grouped = {};
        filteredSales.forEach(sale => {
            const dateStr = new Date(sale.fecha).toDateString();
            if (!grouped[dateStr]) grouped[dateStr] = [];
            grouped[dateStr].push(sale);
        });

        // Aggregate each day and return array of daily totals
        return Object.entries(grouped).map(([dateStr, daySales]) => {
            const { total } = aggregateDailyTotal(daySales);
            return {
                ...total,
                fecha: daySales && daySales.length > 0 ? normalizeDate(daySales[0].fecha) : new Date(dateStr),
                dateStr
            };
        });
    }, [filteredSales]);

    // Calculate summary statistics
    const stats = useMemo(() => {
        if (!cleanSales || cleanSales.length === 0) return null;

        const ventaStats = getSummaryStats(cleanSales, 'venta');
        const conversionStats = getSummaryStats(cleanSales, 'conversion');
        const ticketStats = getSummaryStats(cleanSales, 'ticketMedio');
        const productividadStats = getSummaryStats(cleanSales, 'productividad');
        const apoStats = getSummaryStats(cleanSales, 'apo');

        return {
            venta: ventaStats,
            conversion: conversionStats,
            ticketMedio: ticketStats,
            productividad: productividadStats,
            apo: apoStats,
            totalVentas: ventaStats.total,
            totalAbonos: cleanSales.reduce((sum, s) => sum + (s.abonos || 0), 0),
            totalOperaciones: cleanSales.reduce((sum, s) => sum + (s.operaciones || 0), 0),
            totalClientes: cleanSales.reduce((sum, s) => sum + (s.clientes || 0), 0),
            totalUnidades: cleanSales.reduce((sum, s) => sum + (s.unidades || 0), 0),
            diasRegistrados: cleanSales.length
        };
    }, [cleanSales]);

    // Prepare chart data
    const chartData = useMemo(() => {
        if (!cleanSales || cleanSales.length === 0) return null;

        // Sort by date for timeline charts
        const sortedSales = [...cleanSales].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        const dailyLabels = sortedSales.map(s => {
            const date = new Date(s.fecha);
            return `${date.getDate()}/${date.getMonth() + 1}`;
        });

        const dailyVentas = sortedSales.map(s => s.venta || 0);
        const dailyConversion = sortedSales.map(s => s.conversion || 0);

        // Calculate total by employee from filteredSales
        const employeeTotals = { Ingrid: 0, Marta: 0 };

        // Group filteredSales by day and employee
        const grouped = {};
        filteredSales.forEach(sale => {
            const dateStr = new Date(sale.fecha).toDateString();
            if (!grouped[dateStr]) grouped[dateStr] = [];
            grouped[dateStr].push(sale);
        });

        Object.values(grouped).forEach(daySales => {
            const { ingrid, marta } = aggregateDailyTotal(daySales);
            employeeTotals.Ingrid += ingrid.venta || 0;
            employeeTotals.Marta += marta.venta || 0;
        });

        return {
            ventas: {
                labels: dailyLabels,
                datasets: [{
                    label: 'Ventas (€)',
                    data: dailyVentas,
                    borderColor: '#c4a574',
                    backgroundColor: 'rgba(196, 165, 116, 0.15)',
                    fill: true,
                    tension: 0.4
                }]
            },
            conversion: {
                labels: dailyLabels,
                datasets: [{
                    label: 'Conversión (%)',
                    data: dailyConversion,
                    borderColor: '#8fa67a',
                    backgroundColor: 'rgba(143, 166, 122, 0.15)',
                    fill: true,
                    tension: 0.4
                }]
            },
            empleadas: {
                labels: ['Ingrid', 'Marta'],
                datasets: [{
                    label: 'Ventas (€)',
                    data: [employeeTotals.Ingrid, employeeTotals.Marta],
                    backgroundColor: [
                        'rgba(196, 165, 116, 0.8)',
                        'rgba(93, 138, 168, 0.8)'
                    ],
                    borderColor: [
                        '#c4a574',
                        '#5d8aa8'
                    ],
                    borderWidth: 2
                }]
            }
        };
    }, [cleanSales, filteredSales]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.08)' },
                ticks: { color: 'rgba(255, 255, 255, 0.6)' }
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.08)' },
                ticks: { color: 'rgba(255, 255, 255, 0.6)' }
            }
        }
    };

    const handleSaveGoal = () => {
        const amount = parseFloat(goalInput) || 0;
        setMonthlyGoal({
            amount,
            month: new Date().getMonth(),
            year: new Date().getFullYear()
        });
        setEditingGoal(false);
    };

    const getFilterLabel = () => {
        switch (filterType) {
            case 'month': return 'Este Mes';
            case 'year': return 'Este Año';
            case 'custom': return 'Personalizado';
            default: return '';
        }
    };

    // Empty state
    if (!sales || sales.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <h3 className="empty-state-title">Sin datos para mostrar</h3>
                <p className="empty-state-text">
                    Añade ventas para ver estadísticas y gráficos
                </p>
            </div>
        );
    }

    return (
        <div className="resumen">
            {/* Date Filter Bar */}
            <div className="filter-bar">
                <div className="filter-buttons">
                    <button
                        className={`filter-btn ${filterType === 'month' ? 'active' : ''}`}
                        onClick={() => setFilterType('month')}
                    >
                        Este Mes
                    </button>
                    <button
                        className={`filter-btn ${filterType === 'year' ? 'active' : ''}`}
                        onClick={() => setFilterType('year')}
                    >
                        Este Año
                    </button>
                    <button
                        className={`filter-btn ${filterType === 'custom' ? 'active' : ''}`}
                        onClick={() => setFilterType('custom')}
                    >
                        Personalizado
                    </button>
                </div>

                {filterType === 'custom' && (
                    <div className="filter-group">
                        <input
                            type="date"
                            className="filter-input"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                        />
                        <span className="filter-label">→</span>
                        <input
                            type="date"
                            className="filter-input"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* Monthly Goal Card */}
            <div className="goal-card">
                <div className="goal-header">
                    <h4 className="goal-title">🎯 Objetivo del Mes</h4>
                    <button
                        className="goal-edit-btn"
                        onClick={() => setEditingGoal(!editingGoal)}
                    >
                        {editingGoal ? 'Cancelar' : 'Editar'}
                    </button>
                </div>

                {editingGoal ? (
                    <div className="goal-input-row">
                        <div className="form-group">
                            <label className="form-label">Objetivo mensual (€)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={goalInput}
                                onChange={(e) => setGoalInput(e.target.value)}
                                placeholder="Ej: 5000"
                            />
                        </div>
                        <button className="btn btn-primary" onClick={handleSaveGoal}>
                            Guardar
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="goal-progress">
                            <div className="goal-progress-bar">
                                <div
                                    className={`goal-progress-fill ${goalPercentage >= 100 ? 'over-target' : ''}`}
                                    style={{ width: `${Math.min(goalPercentage, 100)}%` }}
                                />
                            </div>
                        </div>
                        <div className="goal-stats">
                            <div className="goal-current">
                                <span className="goal-current-label">Conseguido</span>
                                <span className="goal-current-value">{formatCurrency(currentMonthTotal)}</span>
                            </div>
                            <div className="goal-percentage">
                                <span className="goal-percentage-value">{goalPercentage}%</span>
                                <span className="goal-percentage-label">del objetivo</span>
                            </div>
                            <div className="goal-target">
                                <span className="goal-target-label">Objetivo</span>
                                <span className="goal-target-value">{formatCurrency(monthlyGoal.amount)}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* KPI Summary */}
            <h3 className="section-title">📈 {getFilterLabel()} - Resumen</h3>
            {filteredSales.length === 0 ? (
                <p className="text-muted mb-lg">No hay datos en este período</p>
            ) : (
                <>
                    <div className="stats-grid">
                        <StatCard label="Total Ventas" value={formatCurrency(stats?.totalVentas || 0)} />
                        <StatCard label="Venta Media" value={formatCurrency(stats?.venta?.avg || 0)} />
                        <StatCard
                            label="Conversión Media"
                            value={formatPercentage(stats?.conversion?.avg || 0)}
                            variant={stats?.conversion?.avg >= 15 ? 'success' : stats?.conversion?.avg >= 10 ? 'warning' : 'danger'}
                        />
                        <StatCard label="Ticket Medio" value={formatCurrency(stats?.ticketMedio?.avg || 0)} />
                        <StatCard label="APO Medio" value={formatNumber(stats?.apo?.avg || 0)} unit="uds/op" />
                        <StatCard label="Productividad" value={formatCurrency(stats?.productividad?.avg || 0)} unit="/hora" />
                        <StatCard label="Días Registrados" value={stats?.diasRegistrados || 0} unit="días" />
                        <StatCard label="Total Abonos" value={formatCurrency(stats?.totalAbonos || 0)} variant="danger" />
                    </div>

                    {/* Charts */}
                    {chartData && (
                        <div className="charts-grid">
                            <div className="chart-container">
                                <h4 className="chart-title">📊 Evolución de ventas</h4>
                                <div className="chart-wrapper">
                                    <Line data={chartData.ventas} options={chartOptions} />
                                </div>
                            </div>

                            <div className="chart-container">
                                <h4 className="chart-title">🎯 Evolución de conversión</h4>
                                <div className="chart-wrapper">
                                    <Line data={chartData.conversion} options={chartOptions} />
                                </div>
                            </div>

                            <div className="chart-container">
                                <h4 className="chart-title">👥 Ventas por empleada</h4>
                                <div className="chart-wrapper">
                                    <Bar data={chartData.empleadas} options={chartOptions} />
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
