// 钻石日志统计 Tab
const LogsTab = {
    // 初始数据
    initialData: {
        stats: {},
        selectedCharacter: '',
        logsTimeGroup: 'day',
        dailyChart: null,
        sourceChart: null,
        logsSelectedPeriod: null  // 当前点击选中的时间段（null = 全量）
    },

    // 加载数据
    async load() {
        return await API.loadStats();
    },

    // 初始化图表
    initCharts(instance) {
        instance.dailyChart = Charts.init('dailyChart');
        instance.sourceChart = Charts.init('sourceChart');
        this.updateCharts(instance);
    },

    // 更新图表（过滤条件改变时调用，重置时间段选择）
    updateCharts(instance) {
        instance.logsSelectedPeriod = null;
        this.updateDailyChart(instance);
        this.updateSourceChart(instance);
    },

    updateDailyChart(instance) {
        if (!instance.dailyChart) return;

        const characters = instance.selectedCharacter
            ? [instance.selectedCharacter]
            : Utils.getCharacterNames(instance.stats);

        if (characters.length === 0) {
            Charts.showEmpty(instance.dailyChart);
            return;
        }

        const grouped = {};

        characters.forEach(charName => {
            const charData = instance.stats[charName] || {};
            const daily = charData.daily || {};

            Object.entries(daily).forEach(([date, dayData]) => {
                const key = Utils.getTimeKey(date, instance.logsTimeGroup);

                if (!grouped[key]) grouped[key] = {};
                if (!grouped[key][charName]) grouped[key][charName] = { gain: 0, consume: 0 };
                grouped[key][charName].gain += dayData.gain || 0;
                grouped[key][charName].consume += dayData.consume || 0;
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

        Charts.createBarChart(instance.dailyChart, {
            title: I18n.t('chart.dailyChange'),
            xAxis: groupKeys,
            legends: characters,
            series
        });

        // 注册点击事件：点击柱子时过滤饼图至该时间段
        const groupKeysCopy = [...groupKeys];
        instance.dailyChart.off('click');
        instance.dailyChart.on('click', (params) => {
            if (params.componentType !== 'series') return;
            const clickedKey = groupKeysCopy[params.dataIndex];
            // 再次点击同一柱子则取消选中（恢复全量视图）
            instance.logsSelectedPeriod = instance.logsSelectedPeriod === clickedKey ? null : clickedKey;
            LogsTab.updateSourceChart(instance);
        });
    },

    updateSourceChart(instance) {
        if (!instance.sourceChart) return;

        const characters = instance.selectedCharacter
            ? [instance.selectedCharacter]
            : Utils.getCharacterNames(instance.stats);

        const selectedPeriod = instance.logsSelectedPeriod;
        const sources = {};

        if (selectedPeriod) {
            // 只聚合属于选中时间段的每日 sources
            characters.forEach(charName => {
                const charData = instance.stats[charName] || {};
                const daily = charData.daily || {};

                for (const [date, dayData] of Object.entries(daily)) {
                    // 只处理属于选中时间段的日期
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
            // 全量：使用 total.sources
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
        const data = Object.entries(sources)
            .map(([key, val]) => ({
                name: SourceI18n.translate(key, lang),
                value: val.gain - val.consume
            }))
            .filter(d => d.value > 0)
            .sort((a, b) => b.value - a.value);

        // 标题显示当前选中的时间段（若有）
        const periodLabel = selectedPeriod ? ` · ${selectedPeriod}` : '';
        Charts.createPieChart(instance.sourceChart, {
            title: I18n.t('chart.sourceDistribution') + periodLabel,
            data
        });
    },

    // Getters
    getCharacterNames(instance) {
        return Utils.getCharacterNames(instance.stats);
    },

    getSelectedCharacters(instance) {
        return instance.selectedCharacter ? [instance.selectedCharacter] : this.getCharacterNames(instance);
    },

    getTotalGain(instance) {
        return Utils.aggregateTotal(instance.stats, this.getSelectedCharacters(instance), 'gain');
    },

    getTotalConsume(instance) {
        return Utils.aggregateTotal(instance.stats, this.getSelectedCharacters(instance), 'consume');
    }
};
