// 钻石日志统计 Tab
const LogsTab = {
    // 初始数据
    initialData: {
        stats: {},
        selectedCharacter: '',
        logsTimeGroup: 'day',
        logsSelectedPeriod: null,  // 当前点击选中的时间段（null = 全量）
        logsDateRangeType: 'all',  // 'all', '7d', '30d', 'custom'
        logsCustomDateRange: [null, null], // [startKey, endKey]
        logsSelectedSource: '',    // 当前选中的来源筛选
        logsSourceOptions: [],     // 来源筛选下拉列表
        currentGain: 0,
        currentConsume: 0,
        currentNetChange: 0,
        currentAvgNet: 0,
        fountainAvgLabel: 'logs.avgDay',
        fountainRangeLabel: '',

        // 对比视图状态
        logsViewMode: 'trend',
        logsCompareMetric: 'netChange',
        logsCompareSortCol: 'netChange',
        logsCompareSortAsc: false,
        logsCompareData: [],
        logsTopGain: {},
        logsTopConsume: {},
        logsTopNet: {}
    },

    // 加载数据
    async load() {
        return await API.loadStats();
    },

    // 判断来源是否有 i18n 支持
    hasI18n(sourceKey) {
        return typeof SourceI18n !== 'undefined' && typeof SourceI18n.hasI18n === 'function'
            ? SourceI18n.hasI18n(sourceKey)
            : false;
    },

    // 初始化图表
    initCharts(instance) {
        // 生成来源下拉列表
        const sourceKeys = new Set();
        Object.values(instance.stats || {}).forEach(charData => {
            Object.keys(charData.total?.sources || {}).forEach(k => sourceKeys.add(k));
        });
        
        const lang = I18n.getLanguage();
        const options = [];
        let hasOther = false;

        const dynamicGroups = new Set();

        sourceKeys.forEach(k => {
            if (this.hasI18n(k)) {
                const dyn = typeof SourceI18n !== 'undefined' && SourceI18n.parseCompositeDynamic ? SourceI18n.parseCompositeDynamic(k) : null;
                if (dyn) {
                    dynamicGroups.add('id:' + dyn.type);
                } else {
                    options.push({ value: k, label: SourceI18n.translate(k, lang) });
                }
            } else {
                hasOther = true;
            }
        });

        dynamicGroups.forEach(g => {
            options.push({ value: g, label: SourceI18n.translate(g, lang) });
        });
        
        // 按字典序排一下
        options.sort((a, b) => a.label.localeCompare(b.label));

        if (hasOther) {
            options.push({ value: 'other', label: I18n.t('logs.sourceOther') });
        }
        
        instance.logsSourceOptions = options;

        this.updateCharts(instance);
    },

    getFilteredDates(allDates, timeGroup, rangeType, customRange) {
        if (rangeType === 'all') return allDates;
        
        const groupKeysSet = new Set();
        allDates.forEach(d => groupKeysSet.add(Utils.getTimeKey(d, timeGroup)));
        const groupKeys = Array.from(groupKeysSet).sort();
        
        let startKey, endKey;
        if (rangeType === '7d') {
            startKey = groupKeys[Math.max(0, groupKeys.length - 7)];
            endKey = groupKeys[groupKeys.length - 1];
        } else if (rangeType === '30d') {
            startKey = groupKeys[Math.max(0, groupKeys.length - 30)];
            endKey = groupKeys[groupKeys.length - 1];
        } else if (rangeType === 'custom' && customRange[0]) {
            startKey = customRange[0];
            endKey = customRange[1];
        } else {
            return allDates;
        }
        
        return allDates.filter(d => {
            const k = Utils.getTimeKey(d, timeGroup);
            return k >= startKey && k <= endKey;
        });
    },

    // 重新渲染所有图表
    updateCharts(instance) {
        if (!instance.stats) return;

        if (instance.logsViewMode === 'trend') {
            this.updateDailyChart(instance);
            this.updateSourceChart(instance);
        } else {
            this.updateCompareView(instance);
        }
    },

    // 更新每日柱状图
    updateDailyChart(instance) {
        const chart = Charts.init('dailyChart');
        if (!chart) return;

        const characters = instance.selectedCharacter 
            ? [instance.selectedCharacter]
            : Utils.getCharacterNames(instance.stats);

        if (characters.length === 0) {
            Charts.showEmpty(chart);
            return;
        }

        const grouped = {};

        characters.forEach(charName => {
            const charData = instance.stats[charName] || {};
            const daily = charData.daily || {};

            Object.entries(daily).forEach(([date, dayData]) => {
                const key = Utils.getTimeKey(date, instance.logsTimeGroup);

                if (!grouped[key]) grouped[key] = {
                    sourceGain: 0, sourceConsume: 0
                };
                if (!grouped[key][charName]) grouped[key][charName] = { gain: 0, consume: 0 };
                
                let dayGain = 0;
                let dayConsume = 0;

                const daySources = dayData.sources || {};
                const sel = instance.logsSelectedSource;
                
                if (sel === 'other') {
                    for (const [sKey, sData] of Object.entries(daySources)) {
                        if (!this.hasI18n(sKey)) {
                            dayGain += sData.gain || 0;
                            dayConsume += sData.consume || 0;
                        }
                    }
                } else if (sel && typeof SourceI18n !== 'undefined' && SourceI18n.parseCompositeDynamic && ['id:67', 'id:100005'].includes(sel)) {
                    for (const [sKey, sData] of Object.entries(daySources)) {
                        const dyn = SourceI18n.parseCompositeDynamic(sKey);
                        if (dyn && 'id:' + dyn.type === sel) {
                            dayGain += sData.gain || 0;
                            dayConsume += sData.consume || 0;
                        }
                    }
                } else if (sel) {
                    const sData = daySources[sel];
                    if (sData) {
                        dayGain = sData.gain || 0;
                        dayConsume = sData.consume || 0;
                    }
                } else {
                    dayGain = dayData.gain || 0;
                    dayConsume = dayData.consume || 0;
                }

                grouped[key][charName].gain += dayGain;
                grouped[key][charName].consume += dayConsume;
                grouped[key].sourceGain += dayGain;
                grouped[key].sourceConsume += dayConsume;
            });
        });

        const groupKeys = Object.keys(grouped).sort();

        const series = characters.map(charName => ({
            name: charName,
            data: groupKeys.map(key => {
                const charGroup = grouped[key][charName];
                if (!charGroup) return 0;
                return (charGroup.gain || 0) - (charGroup.consume || 0);
            })
        }));

        let dzStart = undefined;
        let dzEnd = undefined;
        if (instance.logsDateRangeType === '7d') {
            dzStart = Math.max(0, groupKeys.length - 7);
            dzEnd = groupKeys.length - 1;
        } else if (instance.logsDateRangeType === '30d') {
            dzStart = Math.max(0, groupKeys.length - 30);
            dzEnd = groupKeys.length - 1;
        } else if (instance.logsDateRangeType === 'custom' && instance.logsCustomDateRange[0]) {
            dzStart = instance.logsCustomDateRange[0];
            dzEnd = instance.logsCustomDateRange[1];
        }

        Charts.createBarChart(chart, {
            title: I18n.t('chart.dailyChange'),
            xAxis: groupKeys,
            legends: characters,
            showAverage: true,
            series,
            dataZoomStartValue: dzStart,
            dataZoomEndValue: dzEnd
        });

        const getZoomRange = () => {
            const dz = chart.getOption().dataZoom?.[0];
            if (dz && dz.startValue !== undefined) {
                return { start: dz.startValue, end: dz.endValue };
            }
            return { start: 0, end: groupKeys.length - 1 };
        };
        
        const initRange = getZoomRange();
        this.calculateRangeStats(instance, groupKeys, grouped, initRange.start, initRange.end);

        chart.off('dataZoom');
        chart.on('dataZoom', () => {
            const r = getZoomRange();
            this.calculateRangeStats(instance, groupKeys, grouped, r.start, r.end);
            
            const isFull = r.start === 0 && r.end === groupKeys.length - 1;
            if (isFull) {
                instance.logsDateRangeType = 'all';
            } else {
                instance.logsDateRangeType = 'custom';
                instance.logsCustomDateRange = [groupKeys[r.start], groupKeys[r.end]];
            }
        });

        const groupKeysCopy = [...groupKeys];
        chart.off('click');
        chart.on('click', (params) => {
            if (params.componentType !== 'series') return;
            const clickedKey = groupKeysCopy[params.dataIndex];
            instance.logsSelectedPeriod = instance.logsSelectedPeriod === clickedKey ? null : clickedKey;
            LogsTab.updateSourceChart(instance);
        });
    },

    calculateRangeStats(instance, groupKeys, grouped, startIdx, endIdx) {
        if (!groupKeys || groupKeys.length === 0) {
            instance.currentGain = 0;
            instance.currentConsume = 0;
            instance.currentNetChange = 0;
            instance.currentAvgNet = null;
            instance.fountainRangeLabel = '';
            return;
        }
        startIdx = Math.max(0, startIdx || 0);
        endIdx = Math.min(groupKeys.length - 1, endIdx !== undefined ? endIdx : groupKeys.length - 1);

        let gain = 0;
        let consume = 0;
        for (let i = startIdx; i <= endIdx; i++) {
            gain += grouped[groupKeys[i]].sourceGain || 0;
            consume += grouped[groupKeys[i]].sourceConsume || 0;
        }

        instance.currentGain = gain;
        instance.currentConsume = consume;
        instance.currentNetChange = gain - consume;
        
        const count = endIdx - startIdx + 1;
        instance.currentAvgNet = count > 0 ? Math.round(instance.currentNetChange / count) : 0;

        const timeGrp = instance.logsTimeGroup;
        if (timeGrp === 'week') instance.fountainAvgLabel = 'logs.avgWeek';
        else if (timeGrp === 'month') instance.fountainAvgLabel = 'logs.avgMonth';
        else instance.fountainAvgLabel = 'logs.avgDay';

        if (startIdx === 0 && endIdx === groupKeys.length - 1) {
            instance.fountainRangeLabel = '';
        } else {
            instance.fountainRangeLabel = `${groupKeys[startIdx]} ~ ${groupKeys[endIdx]}`;
        }
    },

    updateSourceChart(instance) {
        const chart = Charts.init('sourceChart');
        if (!chart) return;

        const characters = instance.selectedCharacter
            ? [instance.selectedCharacter]
            : Utils.getCharacterNames(instance.stats);

        const selectedPeriod = instance.logsSelectedPeriod;
        const sources = {};

        if (selectedPeriod) {
            characters.forEach(charName => {
                const charData = instance.stats[charName] || {};
                const daily = charData.daily || {};

                for (const [date, dayData] of Object.entries(daily)) {
                    if (Utils.getTimeKey(date, instance.logsTimeGroup) !== selectedPeriod) continue;
                    const daySources = dayData.sources || {};
                    for (const [sourceKey, sourceData] of Object.entries(daySources)) {
                        if (!sources[sourceKey]) sources[sourceKey] = { gain: 0, consume: 0 };
                        sources[sourceKey].gain += sourceData.gain || 0;
                        sources[sourceKey].consume += sourceData.consume || 0;
                    }
                }
            });
        } else {
            characters.forEach(charName => {
                const charData = instance.stats[charName] || {};
                const totalSources = charData.total?.sources || {};

                Object.entries(totalSources).forEach(([sourceKey, sourceData]) => {
                    if (!sources[sourceKey]) sources[sourceKey] = { gain: 0, consume: 0 };
                    sources[sourceKey].gain += sourceData.gain || 0;
                    sources[sourceKey].consume += sourceData.consume || 0;
                });
            });
        }

        const lang = I18n.getLanguage();
        const data = [];
        const otherDetails = [];
        let otherNet = 0;
        
        const sel = instance.logsSelectedSource;
        const dynamicNets = { 'id:67': 0, 'id:100005': 0 };
        const dynamicDetails = { 'id:67': [], 'id:100005': [] };

        if (sel === 'other') {
            for (const [sKey, val] of Object.entries(sources)) {
                if (!this.hasI18n(sKey)) {
                    const net = val.gain - val.consume;
                    if (net > 0) data.push({ name: sKey, value: net });
                }
            }
        } else if (sel && typeof SourceI18n !== 'undefined' && SourceI18n.parseCompositeDynamic && ['id:67', 'id:100005'].includes(sel)) {
            for (const [sKey, val] of Object.entries(sources)) {
                const dyn = SourceI18n.parseCompositeDynamic(sKey);
                if (dyn && 'id:' + dyn.type === sel) {
                    const net = val.gain - val.consume;
                    if (net > 0) data.push({ name: SourceI18n.translate(sKey, lang), value: net });
                }
            }
        } else if (sel) {
            const val = sources[sel];
            if (val) {
                const net = val.gain - val.consume;
                if (net > 0) data.push({ name: SourceI18n.translate(sel, lang), value: net });
            }
        } else {
            for (const [sKey, val] of Object.entries(sources)) {
                const net = val.gain - val.consume;
                if (net <= 0) continue;
                
                const dyn = typeof SourceI18n !== 'undefined' && SourceI18n.parseCompositeDynamic ? SourceI18n.parseCompositeDynamic(sKey) : null;
                if (dyn) {
                    const grp = 'id:' + dyn.type;
                    dynamicNets[grp] += net;
                    dynamicDetails[grp].push({ name: SourceI18n.translate(sKey, lang), value: net });
                } else if (this.hasI18n(sKey)) {
                    data.push({ name: SourceI18n.translate(sKey, lang), value: net });
                } else {
                    otherNet += net;
                    otherDetails.push({ name: sKey, value: net });
                }
            }
            
            ['id:67', 'id:100005'].forEach(grp => {
                if (dynamicNets[grp] > 0) {
                    data.push({
                        name: SourceI18n.translate(grp, lang),
                        value: dynamicNets[grp],
                        details: dynamicDetails[grp].sort((a, b) => b.value - a.value)
                    });
                }
            });

            if (otherNet > 0) {
                data.push({
                    name: I18n.t('logs.sourceOther'),
                    value: otherNet,
                    details: otherDetails.sort((a, b) => b.value - a.value)
                });
            }
        }

        data.sort((a, b) => b.value - a.value);

        const periodLabel = selectedPeriod ? ` · ${selectedPeriod}` : '';
        Charts.createPieChart(chart, {
            title: I18n.t('chart.sourceDistribution') + periodLabel,
            data,
            tooltipFormatter: (params) => {
                let res = `${params.marker} ${params.name}: ${params.value.toLocaleString()} (${params.percent}%)`;
                if (params.data.details && params.data.details.length > 0) {
                    res += '<br/><hr style="margin:5px 0;border:none;border-top:1px solid #ccc;"/>';
                    params.data.details.slice(0, 15).forEach(d => {
                        res += `<div style="font-size:12px">${d.name}: ${d.value.toLocaleString()}</div>`;
                    });
                    if (params.data.details.length > 15) {
                        res += `<div style="font-size:12px">...</div>`;
                    }
                }
                return res;
            }
        });
    },

    // Getters
    getCharacterNames(instance) {
        return Utils.getCharacterNames(instance.stats);
    },

    // ===== 对比视图逻辑 =====
    updateCompareView(instance) {
        let characters = Utils.getCharacterNames(instance.stats);
        if (instance.selectedCharacter) {
            characters = characters.filter(c => c === instance.selectedCharacter);
        }
        if (characters.length === 0) {
            instance.logsCompareData = [];
            this.renderCompareChart(instance);
            return;
        }

        // 提取所有的日期并过滤
        const allDatesSet = new Set();
        Object.values(instance.stats || {}).forEach(charData => {
            Object.keys(charData.daily || {}).forEach(d => allDatesSet.add(d));
        });
        const allDates = Array.from(allDatesSet).sort();
        
        let filterDates = this.getFilteredDates(allDates, instance.logsTimeGroup, instance.logsDateRangeType, instance.logsCustomDateRange);
        
        // 考虑到 logsSelectedPeriod（点击趋势图柱子触发的单时间点筛选）
        if (instance.logsSelectedPeriod) {
            filterDates = filterDates.filter(d => Utils.getTimeKey(d, instance.logsTimeGroup) === instance.logsSelectedPeriod);
        }

        const mappedSet = new Set(instance.logsSourceOptions.map(opt => opt.value));

        // 使用 utils 聚合数据
        const aggregated = Utils.aggregateByCharacter(
            instance.stats, 
            characters, 
            filterDates, 
            instance.logsSelectedSource, 
            mappedSet
        );

        const dataArray = Object.keys(aggregated).map(name => ({
            name,
            gain: aggregated[name].gain,
            consume: aggregated[name].consume,
            netChange: aggregated[name].netChange,
            avgGain: aggregated[name].avgGain,
            avgConsume: aggregated[name].avgConsume,
            avgNet: aggregated[name].avgNetChange,
            daysCount: aggregated[name].daysCount
        }));

        instance.logsCompareData = dataArray;

        // 计算 Top 3
        if (dataArray.length > 0) {
            const topGain = [...dataArray].sort((a, b) => b.avgGain - a.avgGain)[0];
            const topConsume = [...dataArray].sort((a, b) => b.consume - a.consume)[0];
            const topNet = [...dataArray].sort((a, b) => b.netChange - a.netChange)[0];
            instance.logsTopGain = { name: topGain.name, value: topGain.avgGain };
            instance.logsTopConsume = { name: topConsume.name, value: topConsume.consume };
            instance.logsTopNet = { name: topNet.name, value: topNet.netChange };
        } else {
            instance.logsTopGain = {};
            instance.logsTopConsume = {};
            instance.logsTopNet = {};
        }

        // 默认排序：按当前选中的 Metric 降序
        this.sortCompareTable(instance, instance.logsCompareSortCol, instance.logsCompareSortAsc);
        
        // 渲染图表
        this.renderCompareChart(instance);
    },

    renderCompareChart(instance) {
        const chart = Charts.init('logsCompareChart');
        if (!chart) return;

        const lang = I18n.getLanguage();
        let sortKey = instance.logsCompareMetric; // 'gain', 'consume', 'netChange', 'avgGain'
        
        // 按所选指标降序排列图表数据
        const chartData = [...instance.logsCompareData].sort((a, b) => a[sortKey] - b[sortKey]);
        
        // 横向条形图，yAxis 是角色名
        const yAxisData = chartData.map(d => d.name);
        const seriesData = chartData.map(d => d[sortKey]);

        let color = '#3b82f6'; // blue
        if (sortKey === 'gain') color = '#22c55e'; // green
        if (sortKey === 'consume') color = '#ef4444'; // red
        if (sortKey === 'avgGain') color = '#a855f7'; // purple

        Charts.createHorizontalBarChart(chart, {
            title: I18n.t('compare.chartTitle'),
            yAxis: yAxisData,
            showAverage: true,
            series: [{
                name: I18n.t('compare.metric' + sortKey.charAt(0).toUpperCase() + sortKey.slice(1)),
                data: seriesData,
                itemStyle: { color: color }
            }]
        });
    },

    sortCompareTable(instance, col, forceAsc = null) {
        if (forceAsc !== null) {
            instance.logsCompareSortAsc = forceAsc;
        } else if (instance.logsCompareSortCol === col) {
            instance.logsCompareSortAsc = !instance.logsCompareSortAsc;
        } else {
            instance.logsCompareSortAsc = false;
        }
        instance.logsCompareSortCol = col;

        instance.logsCompareData.sort((a, b) => {
            let valA = a[col];
            let valB = b[col];
            if (typeof valA === 'string') {
                return instance.logsCompareSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return instance.logsCompareSortAsc ? valA - valB : valB - valA;
        });
    }
};
