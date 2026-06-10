// 通用工具函数
const Utils = {
    // 时间分组
    getTimeKey(dateStr, groupType) {
        if (groupType === 'raw') return dateStr.substring(0, 16);
        if (groupType === 'day') return dateStr.substring(0, 10);
        if (groupType === 'week') {
            const d = new Date(dateStr);
            d.setDate(d.getDate() - d.getDay());
            // 使用本地时间格式化，避免 UTC 转换问题
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day} 周`;
        }
        if (groupType === 'month') return dateStr.substring(0, 7);
        return dateStr.substring(0, 10);
    },

    // 聚合统计数据
    aggregateTotal(stats, characters, field) {
        let total = 0;
        for (const char of characters) {
            const charData = stats[char];
            if (charData?.total) total += charData.total[field] || 0;
        }
        return total;
    },

    // 获取角色列表
    getCharacterNames(stats) {
        return Object.keys(stats || {}).sort();
    },

    // 从嵌套结构获取角色列表 (cave, challenge, items)
    getNestedCharacterNames(stats) {
        const charSet = new Set();
        Object.values(stats || {}).forEach(serverData => {
            Object.keys(serverData || {}).forEach(name => charSet.add(name));
        });
        return Array.from(charSet).sort();
    },

    // 按角色聚合数据，用于横向对比视图
    aggregateByCharacter(stats, characters, filterDates = null, selectedSource = null, mappedSourceKeys = null) {
        const result = {};
        characters.forEach(charName => {
            result[charName] = {
                gain: 0,
                consume: 0,
                daysCount: 0
            };
        });

        // 遍历所有角色
        for (const charName of characters) {
            const charData = stats[charName];
            if (!charData || !charData.daily) continue;

            const daily = charData.daily;
            
            let gain = 0;
            let consume = 0;
            let validDays = 0;

            const datesToProcess = filterDates ? filterDates.filter(d => daily[d]) : Object.keys(daily);

            for (const date of datesToProcess) {
                const dayData = daily[date];
                if (!dayData) continue;

                let dayGain = 0;
                let dayConsume = 0;

                if (selectedSource) {
                    const daySources = dayData.sources || {};
                    if (selectedSource === 'other') {
                        if (mappedSourceKeys) {
                            for (const [sKey, sData] of Object.entries(daySources)) {
                                if (!mappedSourceKeys.has(sKey)) {
                                    dayGain += sData.gain || 0;
                                    dayConsume += sData.consume || 0;
                                }
                            }
                        }
                    } else {
                        const sData = daySources[selectedSource];
                        if (sData) {
                            dayGain = sData.gain || 0;
                            dayConsume = sData.consume || 0;
                        }
                    }
                } else {
                    dayGain = dayData.gain || 0;
                    dayConsume = dayData.consume || 0;
                }

                gain += dayGain;
                consume += dayConsume;
                validDays++;
            }

            result[charName].gain += gain;
            result[charName].consume += consume;
            result[charName].daysCount += validDays;
        }

        // 计算衍生数据
        characters.forEach(charName => {
            const data = result[charName];
            data.netChange = data.gain - data.consume;
            data.avgGain = data.daysCount > 0 ? Math.round(data.gain / data.daysCount) : 0;
            data.avgConsume = data.daysCount > 0 ? Math.round(data.consume / data.daysCount) : 0;
            data.avgNetChange = data.daysCount > 0 ? Math.round(data.netChange / data.daysCount) : 0;
        });

        return result;
    },

    // 获取最近N天日期（使用本地时区）
    getRecentDates(days) {
        const dates = [];
        const today = new Date();
        for (let i = 0; i < days; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            // 使用本地时间格式化日期，避免 toISOString() 的 UTC 转换问题
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            dates.push(`${year}-${month}-${day}`);
        }
        return dates;
    },

    // 图表颜色 (高对比度、高辨识度分类色板，适合同时展示多条数据)
    chartColors: [
        '#3b82f6', // Blue 500
        '#ef4444', // Red 500
        '#10b981', // Emerald 500
        '#f59e0b', // Amber 500
        '#8b5cf6', // Violet 500
        '#06b6d4', // Cyan 500
        '#ec4899', // Pink 500
        '#84cc16', // Lime 500
        '#f97316', // Orange 500
        '#6366f1', // Indigo 500
        '#14b8a6', // Teal 500
        '#d946ef'  // Fuchsia 500
    ]
};
