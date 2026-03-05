/**
 * Dashboard.js - Visualization Engine for Casa do Vitorino
 * Requires: Chart.js and DataEngine.js
 */

const Dashboard = (() => {
    // Chart instances to destroy/recreate on update
    let occGaugeChart = null;
    let revparChart = null;
    let gopChart = null;

    // Colores basados en la paleta botánica del Douro
    const colors = {
        primary: '#92BD2E', // Verde Chive brillante / Insignia
        secondary: '#496A12', // Verde Oliva
        alert: '#A76595', // Magenta empolvado para alertas
        green: '#92BD2E',
        textMain: '#F5F5F5',
        textSec: '#D9BEFF', // Lavanda
        gridLines: 'rgba(146, 189, 46, 0.2)'
    };

    /**
     * Helper para formatear monedas
     */
    const formatCurrency = (val) => {
        return new Intl.NumberFormat('es-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
    };

    /**
     * Helper para generar las estrellas del NPS
     */
    const generateStars = (nps) => {
        // Asumiendo NPS de 0 a 100, >90 = 5 estrellas, >70 = 4, >50 = 3...
        let stars = 5;
        if (nps < 60) stars = 2;
        else if (nps < 75) stars = 3;
        else if (nps < 90) stars = 4;

        return '★'.repeat(stars) + '☆'.repeat(5 - stars);
    };

    /**
     * Dibuja el Gauge de Ocupación simulado con un Doughnut de Chart.js
     */
    const renderOccupancyGauge = (avgOccStr) => {
        const ctx = document.getElementById('occGauge');
        if (!ctx) return;

        if (occGaugeChart) occGaugeChart.destroy();

        // Convertir string de '%'' a float e.g. "65.50%" -> 65.50
        const occValue = parseFloat(avgOccStr);
        const remainder = 100 - occValue;

        // Semáforo: Rojo (Terracota) si < 33.5%, Verde si > 50%, Oro si medio
        let color = colors.primary;
        if (occValue < 33.5) color = colors.alert;
        else if (occValue > 50) color = colors.green;

        occGaugeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Ocupado', 'Disponible'],
                datasets: [{
                    data: [occValue, remainder],
                    backgroundColor: [color, 'rgba(255, 255, 255, 0.1)'],
                    borderWidth: 0,
                    circumference: 180,
                    rotation: 270,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '80%',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });

        // Actualizar el valor central
        const valPlaceholder = document.getElementById('kpi-occ');
        if (valPlaceholder) {
            valPlaceholder.textContent = `${occValue.toFixed(1)}%`;
            valPlaceholder.style.color = color;
        }
    };

    /**
     * Dibuja gráfico de barras para RevPAR mensual
     */
    const renderRevparChart = (monthlyData) => {
        const ctx = document.getElementById('revparChart');
        if (!ctx) return;

        if (revparChart) revparChart.destroy();

        const labels = monthlyData.map(d => d.Mes.substring(0, 3)); // Ene, Feb, Mar...
        const dataValues = monthlyData.map(d => d.RevPAR);

        revparChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'RevPAR (€)',
                    data: dataValues,
                    backgroundColor: colors.primary,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: colors.gridLines },
                        ticks: { color: colors.textSec }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: colors.textSec }
                    }
                }
            }
        });
    };

    /**
     * Dibuja gráfico de línea para GOP y Evolución de Ingresos Totales
     */
    const renderGopChart = (monthlyData) => {
        const ctx = document.getElementById('gopChart');
        if (!ctx) return;

        if (gopChart) gopChart.destroy();

        const labels = monthlyData.map(d => d.Mes.substring(0, 3));
        const gopData = monthlyData.map(d => d.GOP);
        const ingresosData = monthlyData.map(d => d.Ingresos_Totales);

        gopChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'GOP (€)',
                        data: gopData,
                        borderColor: colors.primary,
                        backgroundColor: 'rgba(146, 189, 46, 0.2)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Ingresos (€)',
                        data: ingresosData,
                        borderColor: colors.textSec,
                        borderDash: [5, 5],
                        borderWidth: 2,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: colors.textSec, boxWidth: 12 }
                    }
                },
                scales: {
                    y: {
                        grid: { color: colors.gridLines },
                        ticks: { color: colors.textSec }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: colors.textSec }
                    }
                }
            }
        });
    };

    /**
     * Actualiza toda la interfaz basada en los datos re-calculados
     */
    const updateDashboard = (data) => {
        if (data.error) {
            console.error(data.error);
            return;
        }

        // 1. KPIs Fila Superior: Occ, ADR, RevPAR (Promedios)
        renderOccupancyGauge(data.analisis_financiero_anual.ocupacion_media);

        const avgADR = data.raw_monthly_data.reduce((acc, r) => acc + r.ADR, 0) / data.raw_monthly_data.length;
        document.getElementById('kpi-adr').textContent = formatCurrency(avgADR);

        const avgRevPAR = data.raw_monthly_data.reduce((acc, r) => acc + r.RevPAR, 0) / data.raw_monthly_data.length;
        document.getElementById('kpi-revpar').textContent = formatCurrency(avgRevPAR);
        renderRevparChart(data.raw_monthly_data);

        // 2. KPIs Fila Central: GOP (Value + Chart), NPS, Ventas Extra
        document.getElementById('kpi-gop').textContent = formatCurrency(data.analisis_financiero_anual.beneficio_operativo_gop);
        renderGopChart(data.raw_monthly_data);

        const npsValue = parseFloat(data.analisis_financiero_anual.nps_objetivo);
        document.getElementById('kpi-nps').textContent = npsValue.toFixed(1) + "%";
        document.getElementById('kpi-nps-stars').textContent = generateStars(npsValue);

        // Cálculo de Ventas Extra (Aproximación interactiva basada en pernoctaciones)
        // Estimaremos ~15% de los ingresos totales como ventas extra (f&b, tours, etc)
        const ventasExtra = data.analisis_financiero_anual.facturacion_proyectada * 0.15;
        document.getElementById('kpi-ventas-extra').textContent = formatCurrency(ventasExtra);

        // 3. KPIs Fila Inferior (ESG):
        document.getElementById('kpi-agua').textContent = data.impacto_ambiental.eficiencia_hidrica_l + " L";

        const avgEnergia = data.raw_monthly_data.reduce((acc, r) => acc + r.Energia_KWh_Huesped, 0) / data.raw_monthly_data.length;
        document.getElementById('kpi-energia').textContent = avgEnergia.toFixed(1) + " KWh";

        document.getElementById('kpi-km0').textContent = data.impacto_ambiental.km_cero_vinculacion;
    };

    /**
     * Inicializador y Binding de eventos
     */
    const init = async () => {
        await DataEngine.init();

        const numCasasSelect = document.getElementById('num-casas');
        const habPorCasaSelect = document.getElementById('hab-por-casa');

        const triggerUpdate = () => {
            const casas = parseInt(numCasasSelect.value) || 1;
            const hab = parseInt(habPorCasaSelect.value) || 5;
            const data = DataEngine.getAggregatedData(casas, hab);
            updateDashboard(data);
        };

        numCasasSelect.addEventListener('change', triggerUpdate);
        habPorCasaSelect.addEventListener('change', triggerUpdate);

        // Carga inicial
        triggerUpdate();
    };

    return { init };
})();

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', Dashboard.init);
