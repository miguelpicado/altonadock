import { useState, useEffect, useCallback } from 'react';
import { getSales, getLastSale, addSale as addSaleService } from '../services/salesService';
import { calculateRatios } from '../utils/calculations';
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
    const [lastSale, setLastSale] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDemo, setIsDemo] = useState(false);

    const fetchSales = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Check if in demo mode OR if Firebase is not configured
            const demoUser = localStorage.getItem('altona_demo_user');
            if (demoUser || !isFirebaseConfigured) {
                setIsDemo(true);
                const demoSales = getDemoSales();
                setSales(demoSales);
                setLastSale(demoSales.length > 0 ? demoSales[0] : null);
                setLoading(false);
                return;
            }

            // Try Firebase (only if configured)
            const [salesData, lastSaleData] = await Promise.all([
                getSales(30),
                getLastSale()
            ]);
            setSales(salesData);
            setLastSale(lastSaleData);
        } catch (err) {
            // If Firebase fails, fall back to demo mode
            console.warn('Firebase not available, using demo mode:', err.message);
            setIsDemo(true);
            const demoSales = getDemoSales();
            setSales(demoSales);
            setLastSale(demoSales.length > 0 ? demoSales[0] : null);
        } finally {
            setLoading(false);
        }
    }, []);

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
                setSales(newSales);
                setLastSale(saleData);
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

    const refresh = () => {
        fetchSales();
    };

    return {
        sales,
        lastSale,
        loading,
        error,
        addSale,
        refresh,
        isDemo
    };
}
