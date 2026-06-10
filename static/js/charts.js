// ECharts 图表工具
const Charts = {
    // 创建或获取图表实例
    init(containerId) {
        const el = document.getElementById(containerId);
        if (!el) return null;

        let chart = echarts.getInstanceByDom(el);
        if (!chart) {
            const isDarkMode = document.documentElement.classList.contains('dark');
            // 提供兜底宽高，防止在 display: none 或尚未 Layout 完成时初始化，
            // 导致 ECharts 内部 width=0 从而无法构建坐标系，最终引发 coordSys.type 的 TypeError
            chart = echarts.init(el, isDarkMode ? 'dark' : null, {
                width: el.clientWidth > 0 ? undefined : (el.style.width === '100%' ? 800 : parseInt(el.style.width) || 800),
                height: el.clientHeight > 0 ? undefined : (parseInt(el.style.height) || 400)
            });

            // 响应式优化：使用 ResizeObserver
            const resizeObserver = new ResizeObserver(() => {
                requestAnimationFrame(() => chart.resize());
            });
            resizeObserver.observe(el);
        }
        return chart;
    },

    // 补齐 Series 数量（解决 ECharts 5 默认 merge 模式下减少 series 数量时旧数据残留的问题）
    _padSeries(chart, newSeries, type) {
        const currentOption = chart.getOption();
        const currentSeriesCount = (currentOption && currentOption.series) ? currentOption.series.length : 0;
        
        const paddedSeries = [...newSeries];
        if (paddedSeries.length < currentSeriesCount) {
            for (let i = paddedSeries.length; i < currentSeriesCount; i++) {
                paddedSeries.push({
                    name: '',
                    type: type,
                    data: []
                });
            }
        }
        return paddedSeries;
    },

    // 折线图 - 用于 MMTH 历史趋势
    createLineChart(chart, options) {
        if (!chart) return;

        const totalPoints = options.xAxis?.length || 0;
        const shouldSample = totalPoints > 50;
        
        const baseSeries = this.buildLineSeries(options.series, shouldSample);
        const finalSeries = this._padSeries(chart, baseSeries, 'line');

        chart.setOption({
            backgroundColor: 'transparent',
            color: typeof Utils !== 'undefined' ? Utils.chartColors : undefined,
            animationDurationUpdate: 500,
            title: { text: options.title || '', left: 'center' },
            tooltip: {
                trigger: 'axis',
                formatter: this.lineTooltipFormatter,
                confine: true
            },
            legend: { 
                data: (options.series || []).map(s => s.name), 
                bottom: 0, 
                type: 'scroll' 
            },
            grid: { left: '3%', right: '4%', bottom: '8%', top: '10%', containLabel: true },
            toolbox: { feature: { saveAsImage: { title: I18n.t('chart.saveAsImage') } }, right: 20 },
            dataZoom: [{ type: 'inside', start: 0, end: 100 }],
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
            series: finalSeries
        }); // 默认 merge
    },

    // 柱状图 - 用于日志统计
    createBarChart(chart, options) {
        if (!chart) return;

        const baseSeries = this.buildBarSeries(options.series);
        const finalSeries = this._padSeries(chart, baseSeries, 'bar');

        chart.setOption({
            backgroundColor: 'transparent',
            color: typeof Utils !== 'undefined' ? Utils.chartColors : undefined,
            animationDurationUpdate: 500,
            title: { text: options.title || '', left: 'center' },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: this.barTooltipFormatter,
                confine: true
            },
            legend: { 
                data: (options.series || []).map(s => s.name), 
                bottom: 0, 
                type: 'scroll' 
            },
            grid: { left: '3%', right: '4%', bottom: '20%', top: '10%', containLabel: true },
            dataZoom: [
                { type: 'inside', start: 0, end: 100 },
                { type: 'slider', start: 0, end: 100, bottom: 30, height: 20 }
            ],
            xAxis: {
                type: 'category',
                data: options.xAxis || [],
                axisLabel: { rotate: 45 }
            },
            yAxis: { type: 'value' },
            series: finalSeries
        }); // 默认 merge
    },

    // 饼图 - 用于来源分布
    createPieChart(chart, options) {
        if (!chart) return;

        chart.setOption({
            backgroundColor: 'transparent',
            color: typeof Utils !== 'undefined' ? Utils.chartColors : undefined,
            animationDurationUpdate: 500,
            title: { text: options.title, left: 'center' },
            tooltip: { 
                trigger: 'item', 
                formatter: options.tooltipFormatter || '{b}: {c} ({d}%)',
                confine: true 
            },
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
        }); // 默认 merge
    },

    // 空图表
    showEmpty(chart, message) {
        if (!chart) return;
        chart.setOption({
            backgroundColor: 'transparent',
            title: { text: message || I18n.t('chart.noData'), left: 'center', top: 'center' },
            series: []
        }); // 默认 merge
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
            connectNulls: true,
            emphasis: { focus: 'series' }
        }));
    },

    // 构建柱状图系列
    buildBarSeries(seriesData) {
        return (seriesData || []).map(item => ({
            name: item.name,
            type: 'bar',
            data: item.data,
            large: true,
            largeThreshold: 500,
            emphasis: { focus: 'series' }
        }));
    },

    // 折线图 tooltip
    lineTooltipFormatter(params) {
        if (!params || params.length === 0) return '';
        let result = params[0]?.axisValue + '<br/>';
        params.forEach(p => {
            if (p.value != null && p.seriesName) { // 使用 != null 同时规避 null 和 undefined
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
            if (!p.seriesName || p.value == null) return; // 忽略空白补齐的 series 和 null/undefined 数据
            const val = p.value;
            const sign = val >= 0 ? '+' : '';
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
