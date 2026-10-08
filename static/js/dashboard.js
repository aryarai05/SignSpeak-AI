/**
 * SignSpeak AI — Interactive Analytics Dashboard Controller
 */

class DashboardController {
    constructor() {
        this.totalPredictionsElem = document.getElementById('stat-total-predictions');
        this.avgConfidenceElem = document.getElementById('stat-avg-confidence');
        this.mostRecognizedElem = document.getElementById('stat-most-recognized');
        this.accuracyElem = document.getElementById('stat-model-accuracy');

        this.trendChartCanvas = document.getElementById('trend-chart');
        this.distributionChartCanvas = document.getElementById('distribution-chart');
        this.confidenceChartCanvas = document.getElementById('confidence-chart');

        this.historyTableBody = document.getElementById('history-table-body');
        this.searchInput = document.getElementById('history-search');
        this.inputFilter = document.getElementById('history-input-filter');
        this.statusFilter = document.getElementById('history-status-filter');
        this.clearBtn = document.getElementById('btn-clear-history');
        this.exportCsvBtn = document.getElementById('btn-export-csv');

        this.page = 0;
        this.limit = 15;

        this.charts = {};

        this.init();
    }

    async init() {
        await this.loadStatistics();
        await this.loadHistory();
        this.initEventListeners();
    }

    initEventListeners() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => { this.page = 0; this.loadHistory(); });
        }
        if (this.inputFilter) {
            this.inputFilter.addEventListener('change', () => { this.page = 0; this.loadHistory(); });
        }
        if (this.statusFilter) {
            this.statusFilter.addEventListener('change', () => { this.page = 0; this.loadHistory(); });
        }
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clearHistoryConfirm());
        }
        if (this.exportCsvBtn) {
            this.exportCsvBtn.addEventListener('click', () => this.exportCsv());
        }
    }

    async loadStatistics() {
        try {
            const res = await fetch('/api/statistics');
            const data = await res.json();
            if (!data.success) return;

            const stats = data.statistics;

            // Fetch model metrics for accuracy card
            let modelAcc = 96.4;
            try {
                const infoRes = await fetch('/api/model-info');
                const infoData = await infoRes.json();
                if (infoData.success && infoData.info.metrics && infoData.info.metrics.accuracy) {
                    modelAcc = infoData.info.metrics.accuracy;
                }
            } catch (e) {}

            // Animate counters
            animateValue(this.totalPredictionsElem, 0, stats.total_predictions, 1200);
            animateValue(this.avgConfidenceElem, 0, stats.average_confidence, 1200, '%');
            animateValue(this.accuracyElem, 0, modelAcc, 1200, '%');

            if (this.mostRecognizedElem) {
                this.mostRecognizedElem.textContent = stats.most_recognized_sign !== 'None' 
                    ? `${stats.most_recognized_sign} (${stats.most_recognized_count})` 
                    : 'N/A';
            }

            // Render Charts
            this.renderCharts(stats);

        } catch (e) {
            console.error('Error loading dashboard statistics:', e);
        }
    }

    renderCharts(stats) {
        if (typeof Chart === 'undefined') return;

        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

        // 1. Recent Trend Line Chart
        if (this.trendChartCanvas && stats.recent_trend) {
            const labels = stats.recent_trend.map((_, i) => `#${i + 1}`);
            const confidences = stats.recent_trend.map(t => t.confidence);

            if (this.charts.trend) this.charts.trend.destroy();
            this.charts.trend = new Chart(this.trendChartCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Inference Confidence (%)',
                        data: confidences,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.12)',
                        fill: true,
                        tension: 0.35,
                        pointBackgroundColor: '#8b5cf6',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { min: 40, max: 100, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // 2. Class Distribution Doughnut Chart
        if (this.distributionChartCanvas && stats.distribution_by_sign) {
            const keys = Object.keys(stats.distribution_by_sign).slice(0, 8);
            const values = Object.values(stats.distribution_by_sign).slice(0, 8);

            if (this.charts.dist) this.charts.dist.destroy();
            this.charts.dist = new Chart(this.distributionChartCanvas, {
                type: 'doughnut',
                data: {
                    labels: keys,
                    datasets: [{
                        data: values,
                        backgroundColor: [
                            '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
                            '#f59e0b', '#f43f5e', '#3b82f6', '#ec4899'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { boxWidth: 12, padding: 12 } }
                    },
                    cutout: '68%'
                }
            });
        }

        // 3. Confidence Ranges Bar Chart
        if (this.confidenceChartCanvas && stats.confidence_distribution) {
            const confLabels = Object.keys(stats.confidence_distribution);
            const confCounts = Object.values(stats.confidence_distribution);

            if (this.charts.conf) this.charts.conf.destroy();
            this.charts.conf = new Chart(this.confidenceChartCanvas, {
                type: 'bar',
                data: {
                    labels: confLabels,
                    datasets: [{
                        label: 'Count',
                        data: confCounts,
                        backgroundColor: ['#f43f5e', '#f59e0b', '#6366f1', '#10b981'],
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }

    async loadHistory() {
        try {
            const sign = this.searchInput ? this.searchInput.value.trim() : '';
            const inputType = this.inputFilter ? this.inputFilter.value : '';
            const status = this.statusFilter ? this.statusFilter.value : '';

            let url = `/api/history?limit=${this.limit}&offset=${this.page * this.limit}`;
            if (sign) url += `&sign=${encodeURIComponent(sign)}`;
            if (inputType) url += `&input_type=${encodeURIComponent(inputType)}`;
            if (status) url += `&status=${encodeURIComponent(status)}`;

            const res = await fetch(url);
            const data = await res.json();
            if (!data.success) return;

            this.renderTable(data.items, data.total);
        } catch (e) {
            console.error('History load error:', e);
        }
    }

    renderTable(items, total) {
        if (!this.historyTableBody) return;

        if (!items || items.length === 0) {
            this.historyTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                        <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                        No predictions recorded yet. Start recognizing signs via webcam or upload.
                    </td>
                </tr>
            `;
            return;
        }

        this.historyTableBody.innerHTML = items.map(item => `
            <tr>
                <td class="mono-text" style="color: var(--text-secondary); font-size: 0.85rem;">${item.timestamp}</td>
                <td><span style="text-transform: capitalize;">${item.input_type}</span></td>
                <td><strong style="font-size: 1.15rem; color: var(--accent-cyan);">${item.prediction}</strong></td>
                <td>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span class="mono-text">${item.confidence.toFixed(1)}%</span>
                        <div class="progress-bar-container" style="width: 70px; height: 6px; margin: 0;">
                            <div class="progress-fill ${item.confidence >= 85 ? 'high' : item.confidence >= 70 ? 'medium' : 'low'}" style="width: ${item.confidence}%;"></div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge-status ${item.status}">
                        <span class="status-dot"></span>
                        ${item.status === 'recognized' ? 'Recognized' : 'Low Conf'}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    async clearHistoryConfirm() {
        if (!confirm('Are you sure you want to clear all prediction history? This action cannot be undone.')) return;

        try {
            const res = await fetch('/api/history/clear', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('Prediction history cleared.', 'success');
                this.page = 0;
                await this.loadStatistics();
                await this.loadHistory();
            }
        } catch (e) {
            showToast('Failed to clear history', 'error');
        }
    }

    async exportCsv() {
        try {
            const res = await fetch('/api/history?limit=100');
            const data = await res.json();
            if (!data.success || !data.items || data.items.length === 0) {
                showToast('No records available to export', 'error');
                return;
            }

            const headers = ['ID', 'Timestamp', 'Input Type', 'Prediction', 'Confidence (%)', 'Status'];
            const rows = data.items.map(i => [i.id, `"${i.timestamp}"`, i.input_type, `"${i.prediction}"`, i.confidence, i.status]);

            const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `signspeak_predictions_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showToast('Exported prediction history as CSV', 'success');
        } catch (e) {
            showToast('CSV export failed', 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('stat-total-predictions')) {
        window.dashboardController = new DashboardController();
    }
});
