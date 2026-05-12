// ECharts 图表工具
const Charts = {
    // 创建或获取图表实例
    init(containerId) {
        const el = document.getElementById(containerId);
        if (!el) return null;

        let chart = echarts.getInstanceByDom(el);
        if (!chart) {
            // 根据根节点是否包含 dark 类来判断深色模式
            const isDarkMode = document.documentElement.classList.contains('dark');
            chart = echarts.init(el, isDarkMode ? 'dark' : null);

            // 响应式优化：使用 ResizeObserver
            const resizeObserver = new ResizeObserver(() => {
                // 使用 requestAnimationFrame 避免 "ResizeObserver loop limit exceeded" 错误
                requestAnimationFrame(() => chart.resize());
            });
            resizeObserver.observe(el);
        }
        return chart;
    },

    // 折线图 - 用于 MMTH 历史趋势
    createLineChart(chart, options) {
        if (!chart) return;

        const totalPoints = options.xAxis?.length || 0;
        const shouldSample = totalPoints > 50;

        chart.setOption({
            backgroundColor: 'transparent',
            color: typeof Utils !== 'undefined' ? Utils.chartColors : undefined,
            animationDurationUpdate: 500,
            title: { text: options.title || '', left: 'center' },
            tooltip: {
                trigger: 'axis',
                formatter: this.lineTooltipFormatter
            },
            legend: { data: (options.series || []).map(s => s.name), bottom: 0, type: 'scroll' },
            grid: { left: '3%', right: '4%', bottom: '8%', top: '10%', containLabel: true },
            toolbox: { feature: { saveAsImage: { title: I18n.t('chart.saveAsImage') } }, right: 20 },
            // 仅保留鼠标滚轮/触控板缩放，移除底部滑条
            dataZoom: [
                { type: 'inside', start: 0, end: 100 }
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
        // replaceMerge 确保 series 数量变化时旧系列被移除，同时保留图例点击选中状态
        }, { replaceMerge: ['series', 'xAxis'] });
    },

    // 柱状图 - 用于日志统计
    createBarChart(chart, options) {
        if (!chart) return;

        chart.setOption({
            backgroundColor: 'transparent',
            color: typeof Utils !== 'undefined' ? Utils.chartColors : undefined,
            animationDurationUpdate: 500,
            title: { text: options.title || '', left: 'center' },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: this.barTooltipFormatter
            },
            legend: { data: (options.series || []).map(s => s.name), bottom: 0, type: 'scroll' },
            grid: { left: '3%', right: '4%', bottom: '8%', top: '10%', containLabel: true },
            xAxis: {
                type: 'category',
                data: options.xAxis || [],
                axisLabel: { rotate: 45 }
            },
            yAxis: { type: 'value' },
            series: this.buildBarSeries(options.series)
        // replaceMerge 确保 series 数量变化时旧系列被移除，同时保留图例点击选中状态
        }, { replaceMerge: ['series', 'xAxis'] });
    },

    // 饼图 - 用于来源分布
    createPieChart(chart, options) {
        if (!chart) return;

        chart.setOption({
            backgroundColor: 'transparent',
            color: typeof Utils !== 'undefined' ? Utils.chartColors : undefined,
            animationDurationUpdate: 500,
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
    showEmpty(chart, message) {
        if (!chart) return;
        chart.setOption({
            backgroundColor: 'transparent',
            title: { text: message || I18n.t('chart.noData'), left: 'center', top: 'center' }
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
            large: true,
            largeThreshold: 500,
            // 颜色将使用全局的 Utils.chartColors，移除局部的硬编码
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
        let result = `<div class="font-medium mb-1">${params[0].axisValue}</div>`;
        params.forEach(p => {
            const val = p.value;
            const sign = val >= 0 ? '+' : '';
            // 不再使用硬编码颜色，利用 Tailwind 类的思路，但在 tooltip HTML 里我们使用通用颜色或原生类
            const colorClass = val >= 0 ? 'color: #10b981;' : 'color: #ef4444;';
            result += `
                <div class="flex items-center gap-2 mt-1">
                    ${p.marker} 
                    <span class="flex-1">${p.seriesName}:</span> 
                    <span style="font-weight: 600; ${colorClass}">${sign}${val.toLocaleString()}</span>
                </div>`;
        });
        return result;
    }
};
