// MMTH 钻石监控 Tab
const MmthTab = {
    // 初始数据
    initialData: {
        latestData: [],
        historyData: {},
        selectedAccount: '',
        dataType: 'total',
        mmthTimeGroup: 'day',
        lastScrapeTime: '',
        historyChart: null
    },

    // 加载数据
    async load() {
        const [latest, history] = await Promise.all([
            API.loadMmthLatest(),
            API.loadMmthHistory()
        ]);
        return {
            latestData: latest.results,
            lastScrapeTime: latest.scrapeTime,
            historyData: history
        };
    },

    // 初始化图表
    initChart(instance) {
        instance.historyChart = Charts.init('historyChart');
        this.updateChart(instance);
    },

    // 更新图表
    updateChart(instance) {
        if (!instance.historyChart) return;

        const accounts = instance.selectedAccount
            ? [instance.selectedAccount]
            : Object.keys(instance.historyData || {});

        if (accounts.length === 0 || accounts[0] === undefined) {
            Charts.showEmpty(instance.historyChart);
            return;
        }

        const grouped = {};

        accounts.forEach(account => {
            const history = instance.historyData[account] || [];

            if (instance.mmthTimeGroup === 'raw') {
                history.forEach((item, index) => {
                    const key = `${item.timestamp}_${index}`;
                    if (!grouped[key]) grouped[key] = {};
                    grouped[key][account] = item[instance.dataType] || 0;
                    grouped[key]._timestamp = item.timestamp;
                });
            } else {
                history.forEach(item => {
                    const key = Utils.getTimeKey(item.timestamp, instance.mmthTimeGroup);
                    if (!grouped[key]) grouped[key] = {};

                    const timestampKey = `_ts_${account}`;
                    const existingTime = grouped[key][timestampKey];
                    if (!existingTime || item.timestamp > existingTime) {
                        grouped[key][account] = item[instance.dataType] || 0;
                        grouped[key][timestampKey] = item.timestamp;
                    }
                });
            }
        });

        const groupKeys = Object.keys(grouped).sort();

        const xAxisData = groupKeys.map(key => {
            if (instance.mmthTimeGroup === 'raw') {
                const ts = key.split('_')[0];
                return ts.substring(5, 16);
            }
            return key;
        });

        const series = accounts.map(account => ({
            name: account,
            data: groupKeys.map(key => grouped[key][account] ?? null)
        }));

        Charts.createLineChart(instance.historyChart, {
            title: I18n.t('chart.diamondTrend'),
            xAxis: xAxisData,
            legends: accounts,
            series
        });
    },

    // 抓取
    async scrape(instance) {
        const data = await API.triggerScrape();
        if (data.success) {
            const loaded = await this.load();
            instance.latestData = loaded.latestData;
            instance.historyData = loaded.historyData;
            instance.lastScrapeTime = loaded.lastScrapeTime;
            this.updateChart(instance);
            alert(I18n.t('status.success'));
        } else if (data.chrome_needed) {
            alert('⚠️ ' + data.error + '\n\n' + I18n.t('warn.scrape'));
        } else {
            alert(I18n.t('status.failed') + ': ' + (data.error || 'Unknown error'));
        }
        return data.success;
    }
};
