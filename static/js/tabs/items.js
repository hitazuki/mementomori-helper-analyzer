// 物品统计 Tab
const ItemsTab = {
    // 初始数据
    initialData: {
        runeTicketStats: {},
        upgradePanaceaStats: {},
        itemSelectedCharacter: '',
        itemTimeGroup: 'day',
        itemType: 'runeTicket',
        itemDailyChart: null,
        itemSourceChart: null,
        itemSelectedPeriod: null  // 当前点击选中的时间段（null = 全量）
    },

    // 加载数据
    async load() {
        const [runeTicket, upgradePanacea] = await Promise.all([
            API.loadRuneTicketStats(),
            API.loadUpgradePanaceaStats()
        ]);
        return { runeTicketStats: runeTicket, upgradePanaceaStats: upgradePanacea };
    },

    // 初始化图表
    initCharts(instance) {
        instance.itemDailyChart = Charts.init('itemDailyChart');
        instance.itemSourceChart = Charts.init('itemSourceChart');
        this.updateCharts(instance);
    },

    // 更新图表（过滤条件改变时调用，重置时间段选择）
    updateCharts(instance) {
        instance.itemSelectedPeriod = null;
        this.updateDailyChart(instance);
        this.updateSourceChart(instance);
    },

    updateDailyChart(instance) {
        if (!instance.itemDailyChart) return;

        const characters = instance.itemSelectedCharacter
            ? [instance.itemSelectedCharacter]
            : this.getCharacterNames(instance);

        if (characters.length === 0) {
            Charts.showEmpty(instance.itemDailyChart);
            return;
        }

        const itemStats = this.getCurrentStats(instance);
        const combinedStats = this.combineStats(itemStats, characters);

        const grouped = {};
        characters.forEach(charName => {
            const daily = combinedStats[charName]?.daily || {};
            Object.entries(daily).forEach(([date, dayData]) => {
                const key = Utils.getTimeKey(date, instance.itemTimeGroup);
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

        Charts.createBarChart(instance.itemDailyChart, {
            title: this.getTypeName(instance) + ' ' + I18n.t('chart.dailyChange'),
            xAxis: groupKeys,
            legends: characters,
            series
        });

        // 注册点击事件：点击柱子时过滤饼图至该时间段
        const groupKeysCopy = [...groupKeys];
        instance.itemDailyChart.off('click');
        instance.itemDailyChart.on('click', (params) => {
            if (params.componentType !== 'series') return;
            const clickedKey = groupKeysCopy[params.dataIndex];
            // 再次点击同一柱子则取消选中（恢复全量视图）
            instance.itemSelectedPeriod = instance.itemSelectedPeriod === clickedKey ? null : clickedKey;
            ItemsTab.updateSourceChart(instance);
        });
    },

    updateSourceChart(instance) {
        if (!instance.itemSourceChart) return;

        const characters = instance.itemSelectedCharacter
            ? [instance.itemSelectedCharacter]
            : this.getCharacterNames(instance);

        const itemStats = this.getCurrentStats(instance);
        const selectedPeriod = instance.itemSelectedPeriod;
        const sources = {};

        if (selectedPeriod) {
            // 只聚合属于选中时间段的每日 sources
            characters.forEach(charName => {
                for (const serverData of Object.values(itemStats || {})) {
                    if (serverData && serverData[charName]) {
                        const daily = serverData[charName].daily || {};
                        for (const [date, dayData] of Object.entries(daily)) {
                            // 只处理属于选中时间段的日期
                            if (Utils.getTimeKey(date, instance.itemTimeGroup) !== selectedPeriod) continue;
                            const daySources = dayData.sources || {};
                            for (const [sourceKey, sourceData] of Object.entries(daySources)) {
                                if (!sources[sourceKey]) sources[sourceKey] = { gain: 0, consume: 0 };
                                sources[sourceKey].gain += sourceData.gain || 0;
                                sources[sourceKey].consume += sourceData.consume || 0;
                            }
                        }
                    }
                }
            });
        } else {
            // 全量：使用 total.sources
            characters.forEach(charName => {
                for (const serverData of Object.values(itemStats || {})) {
                    if (serverData && serverData[charName] && serverData[charName].total) {
                        const totalSources = serverData[charName].total.sources || {};
                        Object.entries(totalSources).forEach(([sourceKey, sourceData]) => {
                            if (!sources[sourceKey]) sources[sourceKey] = { gain: 0, consume: 0 };
                            sources[sourceKey].gain += sourceData.gain || 0;
                            sources[sourceKey].consume += sourceData.consume || 0;
                        });
                    }
                }
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
        Charts.createPieChart(instance.itemSourceChart, {
            title: I18n.t('chart.sourceDistribution') + periodLabel,
            data
        });
    },

    // 辅助方法
    getCharacterNames(instance) {
        return Utils.getNestedCharacterNames(instance.runeTicketStats);
    },

    getCurrentStats(instance) {
        return instance.itemType === 'upgradePanacea' ? instance.upgradePanaceaStats : instance.runeTicketStats;
    },

    getTypeName(instance) {
        return instance.itemType === 'upgradePanacea' ? I18n.t('items.upgradePanacea') : I18n.t('items.runeTicket');
    },

    getTotalGain(instance) {
        return this.calculateTotal(instance, 'gain');
    },

    getTotalConsume(instance) {
        return this.calculateTotal(instance, 'consume');
    },

    calculateTotal(instance, field) {
        const characters = instance.itemSelectedCharacter
            ? [instance.itemSelectedCharacter]
            : this.getCharacterNames(instance);

        const itemStats = this.getCurrentStats(instance);
        let total = 0;

        for (const charName of characters) {
            for (const serverData of Object.values(itemStats || {})) {
                if (serverData && serverData[charName] && serverData[charName].total) {
                    total += serverData[charName].total[field] || 0;
                }
            }
        }
        return total;
    },

    combineStats(itemStats, characters) {
        const combined = {};
        characters.forEach(charName => {
            for (const serverData of Object.values(itemStats || {})) {
                if (serverData && serverData[charName]) {
                    if (!combined[charName]) combined[charName] = { daily: {} };
                    const daily = serverData[charName].daily || {};
                    for (const [date, dayData] of Object.entries(daily)) {
                        if (!combined[charName].daily[date]) {
                            combined[charName].daily[date] = { gain: 0, consume: 0 };
                        }
                        combined[charName].daily[date].gain += dayData.gain || 0;
                        combined[charName].daily[date].consume += dayData.consume || 0;
                    }
                }
            }
        });
        return combined;
    }
};
