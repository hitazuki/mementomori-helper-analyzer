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

    // 图表颜色
    chartColors: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316']
};
