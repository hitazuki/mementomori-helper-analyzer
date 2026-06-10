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

    // 递归标准化数据中的 sources，聚合 Gacha/Open
    normalizeSources(stats) {
        if (!stats || typeof stats !== 'object') return stats;
        
        if ('sources' in stats && typeof stats.sources === 'object' && stats.sources !== null) {
            const newSources = {};
            for (const [sKey, sData] of Object.entries(stats.sources)) {
                let normKey = sKey;
                if (typeof SourceI18n !== 'undefined' && SourceI18n.parseCompositeDynamic) {
                    const dyn = SourceI18n.parseCompositeDynamic(sKey);
                    if (dyn) normKey = 'id:' + dyn.type;
                }
                
                if (!newSources[normKey]) {
                    newSources[normKey] = { gain: 0, consume: 0 };
                }
                newSources[normKey].gain += sData.gain || 0;
                newSources[normKey].consume += sData.consume || 0;
                
                for (const k in sData) {
                    if (k !== 'gain' && k !== 'consume') {
                        newSources[normKey][k] = sData[k];
                    }
                }
            }
            stats.sources = newSources;
        }

        for (const val of Object.values(stats)) {
            if (val && typeof val === 'object') {
                Utils.normalizeSources(val);
            }
        }
        
        return stats;
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
        const chars = new Set();
        for (const serverData of Object.values(stats || {})) {
            for (const charName of Object.keys(serverData || {})) {
                chars.add(charName);
            }
        }
        return Array.from(chars).sort();
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
