// ECharts 图表工具
const Charts = {
    // 创建或获取图表实例
    init(containerId) {
        const el = document.getElementById(containerId);
        if (!el) return null;
        return echarts.init(el);
    },

    // 折线图 - 用于 MMTH 历史趋势
    createLineChart(chart, options) {
        if (!chart) return;

        const totalPoints = options.xAxis?.length || 0;
        const shouldSample = totalPoints > 50;

        chart.setOption({
            title: { text: options.title || '', left: 'center' },
            tooltip: {
                trigger: 'axis',
                formatter: this.lineTooltipFormatter
            },
            legend: { data: (options.series || []).map(s => s.name), bottom: 0, type: 'scroll' },
            grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
            toolbox: { feature: { saveAsImage: { title: '保存图片' } }, right: 20 },
            dataZoom: [
                { type: 'inside', start: 0, end: 100 },
                { type: 'slider', start: 0, end: 100, bottom: 40, height: 20 }
            ],
            xAxis: {
                type: 'category',
                data: options.xAxis || [],
                axisLabel: { rotate: 45 }
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    formatter: v => v >= 100000 ? (v / 1000).toFixed(0) + 'k' : v
                }
            },
            series: this.buildLineSeries(options.series, shouldSample)
        }, true);
    },

    // 柱状图 - 用于日志统计
    createBarChart(chart, options) {
        if (!chart) return;

        chart.setOption({
            title: { text: options.title || '', left: 'center' },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: this.barTooltipFormatter
            },
            legend: { data: (options.series || []).map(s => s.name), bottom: 0, type: 'scroll' },
            grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
            xAxis: {
                type: 'category',
                data: options.xAxis || [],
                axisLabel: { rotate: 45 }
            },
            yAxis: { type: 'value' },
            series: this.buildBarSeries(options.series)
        }, true);
    },

    // 饼图 - 用于来源分布
    createPieChart(chart, options) {
        if (!chart) return;

        chart.setOption({
            title: { text: options.title || '', left: 'center' },
            tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
            series: [{
                type: 'pie',
                radius: '60%',
                center: ['50%', '50%'],
                data: options.data || [],
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        }, true);
    },

    // 空图表
    showEmpty(chart, message = '暂无数据') {
        if (!chart) return;
        chart.setOption({
            title: { text: message, left: 'center', top: 'center' }
        }, true);
    },

    // 构建折线图系列
    buildLineSeries(seriesData, shouldSample) {
        return (seriesData || []).map(item => ({
            name: item.name,
            type: 'line',
            smooth: !shouldSample,
            symbol: shouldSample ? 'none' : 'circle',
            symbolSize: shouldSample ? 0 : 6,
            sampling: shouldSample ? 'lttb' : 'none',
            data: item.data,
            connectNulls: true
        }));
    },

    // 构建柱状图系列
    buildBarSeries(seriesData, legends) {
        return (seriesData || []).map((item, idx) => ({
            name: item.name,
            type: 'bar',
            data: item.data,
            itemStyle: { color: Utils.chartColors[idx % Utils.chartColors.length] },
            emphasis: { focus: 'series' }
        }));
    },

    // 折线图 tooltip
    lineTooltipFormatter(params) {
        if (!params || params.length === 0) return '';
        let result = params[0]?.axisValue + '<br/>';
        params.forEach(p => {
            if (p.value !== null) {
                result += `${p.marker} ${p.seriesName}: ${p.value.toLocaleString()}<br/>`;
            }
        });
        return result;
    },

    // 柱状图 tooltip
    barTooltipFormatter(params) {
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
};
