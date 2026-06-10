// 钻石日志统计 Tab
const LogsTab = {
    // 初始数据
    initialData: {
        stats: {},
        selectedCharacter: '',
        logsTimeGroup: 'day',
        logsSelectedPeriod: null,  // 当前点击选中的时间段（null = 全量）
        logsSelectedSource: '',    // 当前选中的来源筛选
        logsSourceOptions: [],     // 来源筛选下拉列表
        currentGain: 0,
        currentConsume: 0,
        currentNetChange: 0,
        currentAvgNet: 0,
        fountainAvgLabel: 'logs.avgDay',
        fountainRangeLabel: ''
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

        sourceKeys.forEach(k => {
            if (this.hasI18n(k)) {
                options.push({ value: k, label: SourceI18n.translate(k, lang) });
            } else {
                hasOther = true;
            }
        });
        
        // 按字典序排一下
        options.sort((a, b) => a.label.localeCompare(b.label));

        if (hasOther) {
            options.push({ value: 'other', label: I18n.t('logs.sourceOther') });
        }
        
        instance.logsSourceOptions = options;

        this.updateCharts(instance);
    },

    // 更新图表（过滤条件改变时调用，重置时间段选择）
    updateCharts(instance) {
        instance.logsSelectedPeriod = null;
        this.updateDailyChart(instance);
        this.updateSourceChart(instance);
    },

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

        Charts.createBarChart(chart, {
            title: I18n.t('chart.dailyChange'),
            xAxis: groupKeys,
            legends: characters,
            series
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

        if (sel === 'other') {
            for (const [sKey, val] of Object.entries(sources)) {
                if (!this.hasI18n(sKey)) {
                    const net = val.gain - val.consume;
                    if (net > 0) data.push({ name: sKey, value: net });
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
                
                if (this.hasI18n(sKey)) {
                    data.push({ name: SourceI18n.translate(sKey, lang), value: net });
                } else {
                    otherNet += net;
                    otherDetails.push({ name: sKey, value: net });
                }
            }
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
    }
};
