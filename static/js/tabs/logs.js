// 钻石日志统计 Tab
const LogsTab = {
    // 初始数据
    initialData: {
        stats: {},
        selectedCharacter: '',
        logsTimeGroup: 'day',
        dailyChart: null,
        sourceChart: null
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

    // 更新图表
    updateCharts(instance) {
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
            title: '钻石净变动统计',
            xAxis: groupKeys,
            legends: characters,
            series
        });
    },

    updateSourceChart(instance) {
        if (!instance.sourceChart) return;

        const characters = instance.selectedCharacter
            ? [instance.selectedCharacter]
            : Utils.getCharacterNames(instance.stats);

        const sources = {};

        characters.forEach(charName => {
            const charData = instance.stats[charName] || {};
            const totalSources = charData.total?.sources || {};

            Object.entries(totalSources).forEach(([sourceName, sourceData]) => {
                if (!sources[sourceName]) sources[sourceName] = { gain: 0, consume: 0 };
                sources[sourceName].gain += sourceData.gain || 0;
                sources[sourceName].consume += sourceData.consume || 0;
            });
        });

        const data = Object.entries(sources)
            .map(([name, val]) => ({ name, value: val.gain + val.consume }))
            .filter(d => d.value > 0)
            .sort((a, b) => b.value - a.value);

        Charts.createPieChart(instance.sourceChart, {
            title: '来源分布',
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
