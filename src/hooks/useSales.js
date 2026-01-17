import { useState, useEffect, useCallback } from 'react';
import { getSales, getLastSale, addSale as addSaleService, deleteSale as deleteSaleService } from '../services/salesService';
import { calculateRatios, aggregateDailyTotal } from '../utils/calculations';
import { isFirebaseConfigured } from '../config/firebase.config';

// LocalStorage key for demo data
const DEMO_STORAGE_KEY = 'altona_demo_sales';

// Get demo sales from localStorage
function getDemoSales() {
    try {
        const data = localStorage.getItem(DEMO_STORAGE_KEY);
        if (data) {
            const sales = JSON.parse(data);
            // Convert date strings back to Date objects
            return sales.map(s => ({ ...s, fecha: new Date(s.fecha) }));
        }
    } catch (e) {
        console.error('Error reading demo sales:', e);
    }
    return [];
}

// Save demo sales to localStorage
function saveDemoSales(sales) {
    try {
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(sales));
    } catch (e) {
        console.error('Error saving demo sales:', e);
    }
}

export function useSales() {
    const [sales, setSales] = useState([]);
    const [todaysSales, setTodaysSales] = useState([]); // Array of today's records
    const [dailyTotal, setDailyTotal] = useState(null); // Aggregated total for today
    const [lastSale, setLastSale] = useState(null); // Keep for compatibility (most recent single record)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDemo, setIsDemo] = useState(false);

    // Blacklist to store IDs that have been deleted in this session.
    // This prevents "zombie" records from reappearing if the server returns stale data due to latency.
    const deletedIdsRef = useState(() => new Set())[0];

    const processSalesData = useCallback((allSales) => {
        // Filter out any locally deleted IDs
        // We use the Set to ensure O(1) lookup
        const activeSales = allSales.filter(s => !deletedIdsRef.has(s.id));

        const now = new Date();
        const todayStr = now.toDateString();

        // 1. Identify today's sales (all types: unitaria, abono, cierre, ajuste, total)
        const todayRecords = activeSales.filter(s => {
            const d = new Date(s.fecha);
            return d.toDateString() === todayStr;
        });

        // 2. Aggregate today's sales using aggregateDailyTotal
        // This handles all record types correctly (unitaria, abono, cierre, etc.)
        const todayAggregated = aggregateDailyTotal(todayRecords);

        // 3. Determine "lastSale"
        const mostRecent = activeSales.length > 0 ? activeSales[0] : null;

        setSales(activeSales);
        setTodaysSales(todayRecords);
        setDailyTotal(todayAggregated.total);
        setLastSale(mostRecent);
    }, [deletedIdsRef]);

    const fetchSales = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Check if in demo mode OR if Firebase is not configured
            const demoUser = localStorage.getItem('altona_demo_user');
            if (demoUser || !isFirebaseConfigured) {
                setIsDemo(true);
                const demoSales = getDemoSales();
                processSalesData(demoSales);
                setLoading(false);
                return;
            }

            // Try Firebase (only if configured)
            // Fetch more records to ensure we catch today's and context (increased to catch duplicates)
            const salesData = await getSales(150);
            console.log(`useSales: Fetched ${salesData.length} records`);
            processSalesData(salesData);

        } catch (err) {
            // If Firebase fails, fall back to demo mode
            console.warn('Firebase not available, using demo mode:', err.message);
            setIsDemo(true);
            const demoSales = getDemoSales();
            processSalesData(demoSales);
        } finally {
            setLoading(false);
        }
    }, [processSalesData]);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const addSale = async (saleInput) => {
        try {
            setError(null);

            // Calculate ratios
            const ratios = calculateRatios(saleInput);

            // Combine input with calculated values
            const saleData = {
                id: Date.now().toString(),
                ...saleInput,
                fecha: new Date(saleInput.fecha),
                ...ratios,
                createdAt: new Date()
            };

            if (isDemo) {
                // Save to localStorage in demo mode
                const currentSales = getDemoSales();
                const newSales = [saleData, ...currentSales];
                saveDemoSales(newSales);
                processSalesData(newSales);
            } else {
                // Save to Firestore
                await addSaleService(saleData);
                await fetchSales();
            }

            return saleData;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const deleteSale = async (id) => {
        try {
            await deleteMultipleSales([id]);
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const deleteMultipleSales = async (ids) => {
        try {
            setError(null);
            console.log('useSales: deleteMultipleSales called for IDs:', ids);

            if (isDemo) {
                const currentSales = getDemoSales();
                const newSales = currentSales.filter(s => !ids.includes(s.id));
                saveDemoSales(newSales);
                processSalesData(newSales);
            } else {
                // Add to blacklist immediately
                ids.forEach(id => deletedIdsRef.add(id));
                console.log('useSales: Added IDs to blacklist:', ids);

                // Optimistic update FIRST to clear UI immediately
                setSales(prev => prev.filter(s => !ids.includes(s.id)));
                setTodaysSales(prev => prev.filter(s => !ids.includes(s.id)));

                // Execute deletions
                await Promise.all(ids.map(id => deleteSaleService(id)));
                console.log('useSales: Batch delete success');

                // Fetch fresh data with a delay to allow Firestore consistency
                setTimeout(() => {
                    console.log('useSales: Refreshing after batch delete (2000ms delay)...');
                    fetchSales();
                }, 2000);
            }
        } catch (err) {
            console.error('useSales: Error in deleteMultipleSales:', err);
            setError(err.message);
            throw err;
        }
    };

    const refresh = () => {
        fetchSales();
    };

    return {
        sales,
        lastSale,
        todaysSales,
        dailyTotal,
        loading,
        error,
        addSale,
        deleteSale,
        deleteMultipleSales,
        refresh,
        isDemo
    };
}
