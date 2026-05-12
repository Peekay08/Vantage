/* ─── ANALYTICS CORE LOGIC ─── */

document.addEventListener("DOMContentLoaded", () => {
    initCharts();
    fetchAnalyticsData();
    populateFilters(); // New dynamic filter loader
    initTableLogic();
    populateTimeline();
    initSidebar();

    // LIVE REFRESH EVERY 30 SECONDS
    setInterval(() => {
        fetchAnalyticsData();
        populateTimeline();
    }, 30000);
});

/* ─── SIDEBAR TOGGLE ─── */
function initSidebar() {
    const toggle = document.getElementById("toggle");
    const menuBar = document.querySelector(".menu-bar");
    if (toggle && menuBar) {
        toggle.addEventListener("click", () => {
            menuBar.classList.toggle("close");
        });
    }

    const logoutBtn = document.getElementById("logout-btn");
    const logoutOverlay = document.getElementById("logout-overlay");
    const cancelLogout = document.getElementById("cancel-logout");
    const confirmLogout = document.getElementById("confirm-logout");

    logoutBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        logoutOverlay?.classList.remove("hidden");
    });

    cancelLogout?.addEventListener("click", () => {
        logoutOverlay?.classList.add("hidden");
    });

    confirmLogout?.addEventListener("click", () => {
        localStorage.removeItem("user");
        window.location.href = "login.html";
    });
}

/* ─── CHARTS INITIALIZATION ─── */
let occupancyTrendChart, buildingRankChart, peakHoursChart;

function initCharts() {
    const ctxTrend = document.getElementById('occupancyTrendChart').getContext('2d');
    const ctxRank = document.getElementById('buildingRankChart').getContext('2d');
    const ctxPeak = document.getElementById('peakHoursChart').getContext('2d');

    // Gradient for line chart
    const gradient = ctxTrend.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(102, 130, 153, 0.4)');
    gradient.addColorStop(1, 'rgba(102, 130, 153, 0)');

    occupancyTrendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
            datasets: [{
                label: 'Campus Avg %',
                data: [15, 45, 82, 65, 88, 30, 10],
                borderColor: '#668299',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#668299',
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: 'rgba(102, 130, 153, 0.1)' }, ticks: { color: '#bfcfdb' } },
                x: { grid: { display: false }, ticks: { color: '#bfcfdb' } }
            }
        }
    });

    buildingRankChart = new Chart(ctxRank, {
        type: 'bar',
        data: {
            labels: ['Volta', 'Nile', 'Benue', 'Science', 'Law'],
            datasets: [{
                label: 'Avg Occupancy %',
                data: [85, 72, 45, 92, 38],
                backgroundColor: [
                    '#ff6b6b', '#668299', '#52c41a', '#ff9f43', '#0abde3'
                ],
                borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { max: 100, grid: { color: 'rgba(102, 130, 153, 0.1)' }, ticks: { color: '#bfcfdb' } },
                y: { grid: { display: false }, ticks: { color: '#bfcfdb' } }
            }
        }
    });

    peakHoursChart = new Chart(ctxPeak, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            datasets: [{
                label: 'Peak Hour Intensity',
                data: [65, 88, 95, 72, 50],
                backgroundColor: 'rgba(102, 130, 153, 0.6)',
                borderColor: '#668299',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(102, 130, 153, 0.1)' }, ticks: { display: false } },
                x: { grid: { display: false }, ticks: { color: '#bfcfdb' } }
            }
        }
    });
}

/* ─── REPORT CENTER UI ─── */
function toggleReportModal() {
    document.getElementById('reportModal').classList.toggle('hidden');
}

async function downloadReport(type, format) {
    toggleReportModal();
    console.log(`Generating ${type} report in ${format} format...`);

    // Feedback: Show "Generating" status
    const btn = document.querySelector('.btn-report-center');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Generating...`;
    btn.disabled = true;

    if (format === 'pdf') {
        if (type === 'snapshot') {
            window.print();
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }
    }

    // CSV LOGIC
    let endpoint = "";
    let filename = "";
    const bldg = document.getElementById('buildingFilter').value;
    const dept = document.getElementById('deptFilter').value;

    switch(type) {
        case 'occupancy':
            endpoint = "/api/reports/occupancy";
            filename = `vantage_occupancy_audit_${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'usage':
            endpoint = "/api/reports/usage";
            filename = `vantage_building_usage_${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'utilization':
            endpoint = "/api/reports/room-utilization?building=" + bldg + "&dept=" + dept;
            filename = `vantage_room_utilization_${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'timetable':
            endpoint = "/api/reports/timetable?building=" + bldg + "&dept=" + dept;
            filename = `vantage_timetable_export_${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'alerts':
            endpoint = "/api/reports/alerts";
            filename = `vantage_emergency_log_${new Date().toISOString().split('T')[0]}.csv`;
            break;
    }

    try {
        const response = await fetch(`http://localhost:8080${endpoint}`);
        const result = await response.json();
        const data = result.data || result; 
        const generatedOn = result.generatedOn || new Date().toLocaleString();

        if (!Array.isArray(data) || data.length === 0) {
            alert("No data available for this report criteria.");
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }

        // PROFESSIONAL CSV FORMATTING
        const headers = Object.keys(data[0]);
        let csvContent = `--------------------------------------------------\n`;
        csvContent += `VANTAGE CAMPUS INTELLIGENCE | INSTITUTIONAL REPORT\n`;
        csvContent += `--------------------------------------------------\n`;
        csvContent += `REPORT TYPE  : ${type.toUpperCase()}\n`;
        csvContent += `GENERATED ON : ${generatedOn}\n`;
        csvContent += `STATUS       : OFFICIAL / AUDITED\n`;
        csvContent += `--------------------------------------------------\n\n`;
        
        csvContent += headers.map(h => `"${h.toUpperCase()}"`).join(",") + "\n";

        data.forEach(row => {
            csvContent += headers.map(h => {
                let val = row[h] === null ? "" : row[h];
                return `"${val.toString().replace(/"/g, '""')}"`;
            }).join(",") + "\n";
        });

        csvContent += `\n--------------------------------------------------\n`;
        csvContent += `End of Report | Vantage Audit v2.4 | Confidential\n`;

        // Trigger Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        console.error("Report generation failed:", err);
        alert("Failed to generate report. Please ensure the backend is running.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function populateFilters() {
    try {
        // Buildings
        const bRes = await fetch(`http://localhost:8080/api/analytics/buildings`);
        const buildings = await bRes.json();
        const bSelect = document.getElementById('buildingFilter');
        bSelect.innerHTML = '<option value="all">All Buildings</option>';
        buildings.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.innerText = b.name;
            bSelect.appendChild(opt);
        });

        // Departments
        const dRes = await fetch(`http://localhost:8080/api/analytics/departments`);
        const departments = await dRes.json();
        const dSelect = document.getElementById('deptFilter');
        dSelect.innerHTML = '<option value="all">All Departments</option>';
        departments.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.innerText = d;
            dSelect.appendChild(opt);
        });
    } catch (err) {
        console.error("Failed to populate filters:", err);
    }
}

/* ─── DATA FETCHING (REAL) ─── */
const API_BASE = "http://localhost:8080/api/analytics";

async function fetchAnalyticsData() {
    try {
        const response = await fetch(`${API_BASE}/overview`);
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        document.getElementById('stat-buildings').innerText = data.totalBuildings;
        document.getElementById('stat-rooms').innerText = data.totalRooms;
        document.getElementById('stat-active').innerText = data.activeClasses;
        document.getElementById('stat-available').innerText = data.availableClasses;
        document.getElementById('stat-avg-occupancy').innerText = `${data.avgOccupancy}%`;

        // Update print timestamp
        document.querySelector('.analytics-container').setAttribute('data-timestamp', data.generatedOn || new Date().toLocaleString());

        await populateUtilizationTable();
        await updateCharts();
    } catch (err) {
        console.error("Failed to fetch overview:", err);
    }
}

/* ─── CHART UPDATES ─── */
async function updateCharts() {
    try {
        const building = document.getElementById('buildingFilter').value;

        // Trends
        const trendRes = await fetch(`${API_BASE}/occupancy-trends?building=${building}`);
        const trendData = await trendRes.json();
        
        if (trendData.length > 0) {
            occupancyTrendChart.data.labels = trendData.map(d => {
                const parts = d.time.split(' ');
                return parts.length > 1 ? parts[1].substring(0, 5) : d.time;
            });
            occupancyTrendChart.data.datasets[0].data = trendData.map(d => d.value);
            occupancyTrendChart.update();
        }

        // Rankings
        const rankRes = await fetch(`${API_BASE}/building-rankings`);
        const rankData = await rankRes.json();

        buildingRankChart.data.labels = rankData.map(d => d.name);
        buildingRankChart.data.datasets[0].data = rankData.map(d => d.occupancy);
        buildingRankChart.update();

        // Peak Hours
        const peakRes = await fetch(`${API_BASE}/peak-hours`);
        const peakData = await peakRes.json();
        
        peakHoursChart.data.labels = peakData.map(d => d.hour);
        peakHoursChart.data.datasets[0].data = peakData.map(d => d.count);
        peakHoursChart.update();
    } catch (err) {
        console.error("Failed to update charts:", err);
    }
}

/* ─── TABLE LOGIC ─── */
async function populateUtilizationTable() {
    try {
        const bldg = document.getElementById('buildingFilter').value;
        const dept = document.getElementById('deptFilter').value;
        const response = await fetch(`${API_BASE}/room-utilization?building=${bldg}&dept=${dept}`);
        const rooms = await response.json();

        const body = document.getElementById('roomsBody');
        body.innerHTML = '';

        rooms.forEach(room => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${room.room}</td>
                <td>${room.building}</td>
                <td><span class="status-badge ${room.status.toLowerCase()}">${room.status}</span></td>
                <td>${room.usageToday}</td>
                <td>${room.freeHours}</td>
                <td>${room.currentClass}</td>
                <td>${room.capacityUsage}%</td>
            `;
            body.appendChild(row);
        });
    } catch (err) {
        console.error("Failed to populate table:", err);
    }
}

function initTableLogic() {
    const searchInput = document.getElementById('tableSearch');
    searchInput.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll('#roomsBody tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    });

    // Full Page Re-fetch on filter change
    document.getElementById('buildingFilter').addEventListener('change', () => {
        fetchAnalyticsData(); // Update overview and trends for the building
    });
    document.getElementById('deptFilter').addEventListener('change', populateUtilizationTable);
    document.getElementById('dateRange').addEventListener('change', fetchAnalyticsData);
}

function sortTable(n) {
    const table = document.getElementById("roomsTable");
    let rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    switching = true;
    dir = "asc";
    while (switching) {
        switching = false;
        rows = table.rows;
        for (i = 1; i < (rows.length - 1); i++) {
            shouldSwitch = false;
            x = rows[i].getElementsByTagName("TD")[n];
            y = rows[i + 1].getElementsByTagName("TD")[n];
            if (dir == "asc") {
                if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                    shouldSwitch = true;
                    break;
                }
            } else if (dir == "desc") {
                if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                    shouldSwitch = true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            switchcount++;
        } else {
            if (switchcount == 0 && dir == "asc") {
                dir = "desc";
                switching = true;
            }
        }
    }
}

/* ─── TIMELINE ─── */
async function populateTimeline() {
    try {
        const response = await fetch(`${API_BASE}/activity-feed`);
        const events = await response.json();

        const timeline = document.getElementById('activityTimeline');
        timeline.innerHTML = '';

        events.forEach(ev => {
            const parts = ev.time.split(' ');
            const timeStr = parts.length > 1 ? parts[1].substring(0, 5) : ev.time;
            let icon = 'bx-info-circle';
            if (ev.type === 'occupancy_spike') icon = 'bx-trending-up';
            if (ev.type === 'simulation_start') icon = 'bx-play-circle';

            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <div class="timeline-icon"><i class='bx ${icon}'></i></div>
                <div class="timeline-content">
                    <span class="time">${timeStr}</span>
                    <span class="desc">${ev.message}</span>
                </div>
            `;
            timeline.appendChild(item);
        });
    } catch (err) {
        console.error("Failed to populate timeline:", err);
    }
}

/* ─── EXPORT SYSTEM ─── */
function exportData(format) {
    if (format === 'csv') {
        const rows = document.querySelectorAll('#roomsTable tr');
        let csvContent = "";
        rows.forEach(row => {
            const cols = row.querySelectorAll('th, td');
            const data = Array.from(cols).map(c => `"${c.innerText.replace(/"/g, '""')}"`).join(",");
            csvContent += data + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Vantage_Report_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else if (format === 'pdf') {
        // Professional approach: trigger print mode which allows saving as PDF
        window.print();
    }
}
