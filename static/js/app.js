function app() {
    return {
        // 通用状态
        loading: false,
        scraping: false,
        etlProcessing: false,
        activeTab: 'mmth',

        // MMTH 数据
        latestData: [],
        historyData: {},
        selectedAccount: '',
        dataType: 'total',
        mmthTimeGroup: 'day',
        lastScrapeTime: '',
        historyChart: null,

        // 日志统计数据
        stats: {},
        selectedCharacter: '',
        logsTimeGroup: 'day',
        dailyChart: null,
        sourceChart: null,

        // 洞穴统计数据
        caveStats: {},
        caveDays: 7,

        async init() {
            await Promise.all([
                this.loadLatestData(),
                this.loadHistoryData(),
                this.loadStats(),
                this.loadCaveStats()
            ]);
            // 延长延迟确保 Alpine.js 完成初始渲染
            setTimeout(() => this.initCharts(), 300);
        },

        switchTab(tab) {
            this.activeTab = tab;
            // 延长延迟确保 Alpine.js 完成 DOM 更新 (x-show 切换)
            setTimeout(() => {
                if (tab === 'mmth') {
                    this.historyChart && this.historyChart.resize();
                } else if (tab === 'logs') {
                    // 切换到日志统计时，如果图表未初始化则初始化，否则更新
                    this.initOrUpdateLogsCharts();
                }
                // cave tab 不需要图表初始化
            }, 150);
        },

        // 初始化或更新日志图表（延迟初始化策略）
        initOrUpdateLogsCharts() {
            const dailyEl = document.getElementById('dailyChart');
            const sourceEl = document.getElementById('sourceChart');

            // 如果图表未初始化，先初始化
            if (!this.dailyChart && dailyEl) {
                this.dailyChart = echarts.init(dailyEl);
            }
            if (!this.sourceChart && sourceEl) {
                this.sourceChart = echarts.init(sourceEl);
            }

            // 然后更新图表
            this.updateLogsCharts();
        },

        // ===== MMTH 相关 =====
        get mmthAccountNames() {
            return Object.keys(this.historyData || {}).sort();
        },

        async loadLatestData() {
            try {
                const res = await fetch('/api/mmth-diamonds/all');
                if (res.ok) {
                    const data = await res.json();
                    // 新格式：{scrape_time, results: [...]}
                    this.latestData = data.results || [];
                    this.lastScrapeTime = data.scrape_time || '';
                }
            } catch (e) {
                console.error('Failed to load latest data:', e);
            }
        },

        async loadHistoryData() {
            try {
                const res = await fetch('/api/mmth-diamonds/history');
                if (res.ok) {
                    const rawData = await res.json();
                    // 新格式：{ "server/account": [{timestamp, total, free, paid, server, account}, ...], ... }
                    // 转换为前端需要的格式：{ "account": [{timestamp, total, free, paid}, ...], ... }
                    const converted = {};
                    for (const [key, records] of Object.entries(rawData)) {
                        if (!Array.isArray(records) || records.length === 0) continue;

                        // 从第一条记录获取 account（所有记录属于同一账号）
                        const account = records[0].account;
                        if (!account) continue;

                        // 只保留需要的字段
                        converted[account] = records.map(r => ({
                            timestamp: r.timestamp,
                            total: r.total,
                            free: r.free,
                            paid: r.paid
                        }));
                    }
                    this.historyData = converted;
                } else {
                    this.historyData = {};
                }
            } catch (e) {
                console.error('Failed to load history data:', e);
                this.historyData = {};
            }
        },

        async triggerScrape() {
            this.scraping = true;
            try {
                const res = await fetch('/api/scrape/all', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    await this.loadLatestData();
                    await this.loadHistoryData();
                    this.updateMmthCharts();
                    alert('抓取成功');
                } else {
                    // 检查是否是 Chrome 未安装错误
                    if (data.chrome_needed) {
                        alert('⚠️ ' + data.error + '\n\n请安装 Chrome/Chromium 浏览器后再使用抓取功能。\n\nWindows: 下载 Google Chrome 安装\nLinux: sudo apt install chromium-browser');
                    } else {
                        alert('抓取失败: ' + (data.error || '未知错误'));
                    }
                }
            } catch (e) {
                alert('请求失败: ' + e.message);
            } finally {
                this.scraping = false;
            }
        },

        async triggerETL() {
            this.etlProcessing = true;
            try {
                const res = await fetch('/api/etl/process', { method: 'POST' });
                const data = await res.json();
                if (res.ok) {
                    await Promise.all([
                        this.loadStats(),
                        this.loadCaveStats()
                    ]);
                    if (this.activeTab === 'logs') {
                        this.updateLogsCharts();
                    }
                    alert(`ETL处理完成: 处理 ${data.total_files} 个文件，成功 ${data.success} 个`);
                } else {
                    alert('ETL处理失败: ' + (data.error || '未知错误'));
                }
            } catch (e) {
                alert('请求失败: ' + e.message);
            } finally {
                this.etlProcessing = false;
            }
        },

        // 时间分组函数
        getTimeKey(dateStr, groupType) {
            if (groupType === 'raw') {
                // 原始数据：返回完整时间戳（精确到分钟）
                return dateStr.substring(0, 16);
            }
            const date = new Date(dateStr);
            if (groupType === 'day') {
                return dateStr.substring(0, 10);
            } else if (groupType === 'week') {
                const d = new Date(date);
                d.setDate(d.getDate() - d.getDay());
                return d.toISOString().substring(0, 10) + ' 周';
            } else if (groupType === 'month') {
                return dateStr.substring(0, 7);
            }
            return dateStr.substring(0, 10);
        },

        updateMmthCharts() {
            if (!this.historyChart) return;

            const accounts = this.selectedAccount
                ? [this.selectedAccount]
                : Object.keys(this.historyData || {});

            if (accounts.length === 0 || accounts[0] === undefined) {
                this.historyChart.setOption({
                    title: { text: '暂无历史数据', left: 'center', top: 'center' }
                }, true);
                return;
            }

            const grouped = {};

            // 收集并分组数据 - 每组保留最晚的有效点
            accounts.forEach(account => {
                const history = this.historyData[account] || [];

                if (this.mmthTimeGroup === 'raw') {
                    // 原始模式：显示所有点
                    history.forEach((item, index) => {
                        const key = `${item.timestamp}_${index}`;
                        if (!grouped[key]) {
                            grouped[key] = {};
                        }
                        grouped[key][account] = item[this.dataType] || 0;
                        grouped[key]._timestamp = item.timestamp;
                    });
                } else {
                    // 聚合模式（天/周/月）：每组保留最晚的有效点
                    history.forEach(item => {
                        const key = this.getTimeKey(item.timestamp, this.mmthTimeGroup);
                        if (!grouped[key]) {
                            grouped[key] = {};
                        }

                        // 比较时间戳，保留更晚的点
                        const existingTime = grouped[key]._timestamp;
                        if (!existingTime || item.timestamp > existingTime) {
                            grouped[key][account] = item[this.dataType] || 0;
                            grouped[key]._timestamp = item.timestamp;
                        }
                    });
                }
            });

            const groupKeys = Object.keys(grouped).sort();

            // 自适应粒度：点数少时显示所有点，点数多时抽样
            const totalPoints = groupKeys.length;
            const shouldSample = totalPoints > 50;

            // 构建 X 轴标签（原始模式下显示简化时间戳）
            const xAxisData = groupKeys.map(key => {
                if (this.mmthTimeGroup === 'raw') {
                    // 原始模式：从 key 提取时间戳（去掉 _index 后缀）
                    // key 格式: "2026-04-17 10:04:36_12" -> 取 "2026-04-17 10:04:36"
                    const ts = key.split('_')[0];
                    return ts.substring(5, 16); // MM-DD HH:MM
                }
                return key;
            });

            // 构建系列数据
            const series = accounts.map(account => {
                const data = groupKeys.map(key => grouped[key][account] ?? null);

                return {
                    name: account,
                    type: 'line',
                    smooth: this.mmthTimeGroup !== 'raw', // 原始数据不使用平滑曲线
                    // 点数少时显示标记点，点数多时隐藏标记点以提高性能
                    symbol: shouldSample ? 'none' : 'circle',
                    symbolSize: shouldSample ? 0 : 6,
                    // 大数据量时启用抽样
                    sampling: shouldSample ? 'lttb' : 'none',
                    data: data,
                    connectNulls: true
                };
            });

            this.historyChart.setOption({
                title: { text: '钻石历史趋势', left: 'center' },
                tooltip: {
                    trigger: 'axis',
                    formatter: function(params) {
                        if (!params || params.length === 0) return '';
                        let result = params[0]?.axisValue + '<br/>';
                        params.forEach(p => {
                            if (p.value !== null) {
                                result += `${p.marker} ${p.seriesName}: ${p.value.toLocaleString()}<br/>`;
                            }
                        });
                        return result;
                    }
                },
                legend: { data: accounts, bottom: 0, type: 'scroll' },
                grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
                toolbox: { feature: { saveAsImage: { title: '保存图片' } }, right: 20 },
                dataZoom: [
                    { type: 'inside', start: 0, end: 100 },
                    { type: 'slider', start: 0, end: 100, bottom: 40, height: 20 }
                ],
                xAxis: { type: 'category', data: xAxisData, axisLabel: { rotate: 45 } },
                yAxis: {
                    type: 'value',
                    axisLabel: {
                        formatter: v => v >= 100000 ? (v / 1000).toFixed(0) + 'k' : v
                    }
                },
                series: series
            }, true);
        },

        // ===== 日志统计相关 =====
        get characterNames() {
            return Object.keys(this.stats || {});
        },

        // 获取当前选中的角色列表
        get selectedCharacters() {
            if (this.selectedCharacter) {
                return [this.selectedCharacter];
            }
            return this.characterNames;
        },

        get totalGain() {
            const characters = this.selectedCharacters;
            let total = 0;
            for (const charName of characters) {
                const char = this.stats[charName];
                if (char && char.total) total += char.total.gain || 0;
            }
            return total;
        },

        get totalConsume() {
            const characters = this.selectedCharacters;
            let total = 0;
            for (const charName of characters) {
                const char = this.stats[charName];
                if (char && char.total) total += char.total.consume || 0;
            }
            return total;
        },

        get totalNetChange() {
            return this.totalGain - this.totalConsume;
        },

        async loadStats() {
            try {
                const res = await fetch('/api/stats');
                if (res.ok) {
                    this.stats = await res.json();
                }
            } catch (e) {
                console.error('Failed to load stats:', e);
            }
        },

        // ===== 洞穴统计相关 =====
        get caveRecentDates() {
            const dates = [];
            const today = new Date();
            for (let i = 0; i < this.caveDays; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                dates.push(d.toISOString().substring(0, 10));
            }
            return dates;
        },

        get caveCharacters() {
            const chars = new Set();
            for (const serverName of Object.keys(this.caveStats || {})) {
                const serverData = this.caveStats[serverName];
                for (const charName of Object.keys(serverData || {})) {
                    chars.add(charName);
                }
            }
            return Array.from(chars).sort();
        },

        getCaveStatus(charName, date) {
            for (const serverName of Object.keys(this.caveStats || {})) {
                const serverData = this.caveStats[serverName];
                if (serverData && serverData[charName] && serverData[charName][date]) {
                    return serverData[charName][date].status;
                }
            }
            return null;
        },

        getCaveStatusText(charName, date) {
            const status = this.getCaveStatus(charName, date);
            switch (status) {
                case 'finished': return '已完成';
                case 'started': return '未完成';
                case 'error': return '异常';
                default: return '未执行';
            }
        },

        getCaveStatusClass(charName, date) {
            const status = this.getCaveStatus(charName, date);
            switch (status) {
                case 'finished': return 'bg-green-100 text-green-800';
                case 'started': return 'bg-yellow-100 text-yellow-800';
                case 'error': return 'bg-red-100 text-red-800';
                default: return 'bg-gray-100 text-gray-500';
            }
        },

        async loadCaveStats() {
            try {
                const res = await fetch('/api/cave/stats');
                if (res.ok) {
                    this.caveStats = await res.json();
                }
            } catch (e) {
                console.error('Failed to load cave stats:', e);
            }
        },

        updateLogsCharts() {
            this.updateDailyChart();
            this.updateSourceChart();
        },

        updateDailyChart() {
            if (!this.dailyChart) return;

            const characters = this.selectedCharacter
                ? [this.selectedCharacter]
                : Object.keys(this.stats || {});

            if (characters.length === 0) {
                this.dailyChart.setOption({
                    title: { text: '暂无数据', left: 'center', top: 'center' }
                }, true);
                return;
            }

            // 按时间分组收集数据
            const grouped = {};
            const allDates = new Set();

            characters.forEach(charName => {
                const charData = this.stats[charName] || {};
                const daily = charData.daily || {};

                Object.entries(daily).forEach(([date, dayData]) => {
                    const key = this.getTimeKey(date, this.logsTimeGroup);
                    allDates.add(date);

                    if (!grouped[key]) {
                        grouped[key] = {};
                    }
                    if (!grouped[key][charName]) {
                        grouped[key][charName] = { gain: 0, consume: 0 };
                    }
                    grouped[key][charName].gain += dayData.gain || 0;
                    grouped[key][charName].consume += dayData.consume || 0;
                });
            });

            const groupKeys = Object.keys(grouped).sort();

            // 构建系列 - 每个角色一个系列（净变化 = 获取 - 消耗）
            const series = [];
            const characterColors = [
                '#10b981', // 绿
                '#3b82f6', // 蓝
                '#8b5cf6', // 紫
                '#ec4899', // 粉
                '#f97316', // 橙
            ];

            characters.forEach((charName, idx) => {
                const netData = groupKeys.map(key => {
                    const charGroup = grouped[key][charName];
                    if (!charGroup) return 0;
                    return (charGroup.gain || 0) - (charGroup.consume || 0);
                });

                series.push({
                    name: charName,
                    type: 'bar',
                    data: netData,
                    itemStyle: { color: characterColors[idx % characterColors.length] },
                    emphasis: { focus: 'series' }
                });
            });

            this.dailyChart.setOption({
                title: { text: '钻石净变动统计', left: 'center' },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    formatter: function(params) {
                        if (!params || params.length === 0) return '';
                        let result = params[0].axisValue + '<br/>';
                        params.forEach(p => {
                            const val = p.value;
                            const sign = val >= 0 ? '+' : '';
                            const color = val >= 0 ? '#10b981' : '#ef4444';
                            result += `${p.marker} ${p.seriesName}: <span style="color:${color}">${sign}${val.toLocaleString()}</span><br/>`;
                        });
                        return result;
                    }
                },
                legend: { data: characters, bottom: 0, type: 'scroll' },
                grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
                xAxis: { type: 'category', data: groupKeys, axisLabel: { rotate: 45 } },
                yAxis: { type: 'value' },
                series: series
            }, true);
        },

        updateSourceChart() {
            if (!this.sourceChart) return;

            const characters = this.selectedCharacter
                ? [this.selectedCharacter]
                : Object.keys(this.stats || {});

            const sources = {};

            characters.forEach(charName => {
                const charData = this.stats[charName] || {};
                const totalSources = charData.total?.sources || {};

                Object.entries(totalSources).forEach(([sourceName, sourceData]) => {
                    if (!sources[sourceName]) {
                        sources[sourceName] = { gain: 0, consume: 0 };
                    }
                    sources[sourceName].gain += sourceData.gain || 0;
                    sources[sourceName].consume += sourceData.consume || 0;
                });
            });

            const data = Object.entries(sources)
                .map(([name, val]) => ({ name, value: val.gain + val.consume }))
                .filter(d => d.value > 0)
                .sort((a, b) => b.value - a.value);

            this.sourceChart.setOption({
                title: { text: '来源分布', left: 'center' },
                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                series: [{
                    type: 'pie',
                    radius: '60%',
                    center: ['50%', '50%'],
                    data: data,
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }]
            });
        },

        // ===== 通用 =====
        async refreshAll() {
            this.loading = true;
            try {
                await Promise.all([
                    this.loadLatestData(),
                    this.loadHistoryData(),
                    this.loadStats(),
                    this.loadCaveStats()
                ]);
                // 只更新当前显示的Tab图表
                this.updateMmthCharts();
                if (this.activeTab === 'logs') {
                    this.updateLogsCharts();
                }
            } finally {
                this.loading = false;
            }
        },

        initCharts() {
            const historyEl = document.getElementById('historyChart');

            // 只初始化 MMTH 图表（初始可见的 tab）
            // Logs 图表延迟到切换时初始化，避免在隐藏容器中初始化导致尺寸问题
            if (historyEl) this.historyChart = echarts.init(historyEl);

            // 更新 MMTH 图表
            this.updateMmthCharts();

            window.addEventListener('resize', () => {
                this.historyChart && this.historyChart.resize();
                this.dailyChart && this.dailyChart.resize();
                this.sourceChart && this.sourceChart.resize();
            });
        }
    };
}
