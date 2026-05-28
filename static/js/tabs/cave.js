// 洞窟统计 Tab
const CaveTab = {
    // 初始数据
    initialData: {
        caveStats: {},
        caveDays: 7
    },

    // 加载数据
    async load() {
        return await API.loadCaveStats();
    },

    // Getters
    getRecentDates(instance) {
        // 强制依赖 caveStats，使其在数据刷新时重新计算（哪怕 caveDays !== 0）
        const _ = instance.caveStats;

        if (instance.caveDays === 0) {
            const allDates = new Set();
            for (const serverData of Object.values(instance.caveStats || {})) {
                for (const charData of Object.values(serverData || {})) {
                    for (const date of Object.keys(charData || {})) {
                        allDates.add(date);
                    }
                }
            }
            return Array.from(allDates).sort().reverse();
        }
        return Utils.getRecentDates(instance.caveDays);
    },

    getCharacters(instance) {
        return Utils.getNestedCharacterNames(instance.caveStats);
    },

    // 获取指定角色指定日期的状态
    getStatus(instance, charName, date) {
        for (const serverData of Object.values(instance.caveStats || {})) {
            if (serverData && serverData[charName] && serverData[charName][date]) {
                return serverData[charName][date].status;
            }
        }
        return null;
    },

    // 获取所有角色最近一次执行的整体状态摘要
    // 每个角色取其最新日期的记录，跨角色汇总：异常 > 未完成 > 已完成
    // 同时返回所有角色中最早的最后执行日期（最慢角色），供 Header 展示
    // 返回 { status, date } 或 null（无任何记录）
    getOverallStatus(instance) {
        const stats = instance.caveStats || {};

        // 收集每个角色的最新记录：{ status, latestDate }
        const charSummaries = [];

        for (const serverData of Object.values(stats)) {
            if (!serverData) continue;
            for (const [charName, charData] of Object.entries(serverData)) {
                if (!charData) continue;
                // 找该角色最新的日期
                const dates = Object.keys(charData).sort();
                if (dates.length === 0) continue;
                const latestDate = dates[dates.length - 1];
                const status = charData[latestDate].status;
                charSummaries.push({ charName, status, latestDate });
            }
        }

        if (charSummaries.length === 0) return null;

        // 汇总状态：异常 > 未完成（有任一角色未完成即为未完成）> 已完成
        // 使用标志位遍历全部角色，避免 break 导致遗漏
        let hasError = false;
        let hasStarted = false;
        for (const { status } of charSummaries) {
            if (status === 'error') hasError = true;
            if (status === 'started') hasStarted = true;
        }
        const overallStatus = hasError ? 'error' : hasStarted ? 'started' : 'finished';

        // 所有角色最后执行日期中最早的（最慢角色）
        const earliestDate = charSummaries
            .map(s => s.latestDate)
            .sort()[0];

        return { status: overallStatus, date: earliestDate };
    },

    getStatusText(instance, charName, date) {
        const status = this.getStatus(instance, charName, date);
        switch (status) {
            case 'finished': return I18n.t('cave.finished');
            case 'started': return I18n.t('cave.unfinished');
            case 'error': return I18n.t('cave.error');
            default: return I18n.t('cave.notStarted');
        }
    },

    getStatusClass(instance, charName, date) {
        const status = this.getStatus(instance, charName, date);
        switch (status) {
            case 'finished': return 'bg-green-100 text-green-800';
            case 'started': return 'bg-yellow-100 text-yellow-800';
            case 'error': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-500';
        }
    }
};
