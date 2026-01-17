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
    unifyHistorySales
} from '../utils/calculations';

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
            const saleDate = new Date(sale.fecha);

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
        });
    }, [sales, filterType, customStartDate, customEndDate]);

    // Calculate current month total for goal progress
    const currentMonthTotal = useMemo(() => {
        if (!sales || sales.length === 0) return 0;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return sales
            .filter(sale => {
                const saleDate = new Date(sale.fecha);
                return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
            })
            .reduce((sum, sale) => sum + sale.venta, 0);
    }, [sales]);

    // Goal percentage
    const goalPercentage = useMemo(() => {
        if (monthlyGoal.amount <= 0) return 0;
        return Math.round((currentMonthTotal / monthlyGoal.amount) * 100);
    }, [currentMonthTotal, monthlyGoal.amount]);

    // Deduplicate filtered sales for stats and charts
    const cleanSales = useMemo(() => {
        return unifyHistorySales(filteredSales);
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
            totalOperaciones: cleanSales.reduce((sum, s) => sum + s.operaciones, 0),
            totalClientes: cleanSales.reduce((sum, s) => sum + s.clientes, 0),
            totalUnidades: cleanSales.reduce((sum, s) => sum + s.unidades, 0),
            diasRegistrados: new Set(cleanSales.map(s => new Date(s.fecha).toDateString())).size
        };
    }, [cleanSales]);

    // Prepare chart data
    const chartData = useMemo(() => {
        if (!cleanSales || cleanSales.length === 0) return null;

        const sortedSales = [...cleanSales].reverse();
        const labels = sortedSales.map(sale => {
            const date = new Date(sale.fecha);
            return `${date.getDate()}/${date.getMonth() + 1}`;
        });

        // For charts, we might want to aggregate by day if both employees work same day
        // But simply showing the points is okay for now. 
        // Better: Group by date for the line charts.

        // Group by Date for Line Charts
        const dailyData = {};
        sortedSales.forEach(s => {
            const d = new Date(s.fecha).toDateString();
            if (!dailyData[d]) dailyData[d] = {
                venta: 0, conversion: 0, count: 0, date: new Date(s.fecha)
            };
            dailyData[d].venta += s.venta;
            dailyData[d].conversion += s.conversion; // simplified avg later
            dailyData[d].count += 1;
        });

        const dates = Object.keys(dailyData);
        const dailyLabels = dates.map(d => {
            const date = dailyData[d].date;
            return `${date.getDate()}/${date.getMonth() + 1}`;
        });

        const dailyVentas = dates.map(d => dailyData[d].venta);
        // Average conversion for the day
        const dailyConversion = dates.map(d => dailyData[d].conversion / dailyData[d].count);

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
                    data: [
                        cleanSales.filter(s => s.empleada === 'Ingrid').reduce((sum, s) => sum + s.venta, 0),
                        cleanSales.filter(s => s.empleada === 'Marta').reduce((sum, s) => sum + s.venta, 0)
                    ],
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
    }, [cleanSales]);

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
                        <>
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
                        </>
                    )}
                </>
            )}
        </div>
    );
}
