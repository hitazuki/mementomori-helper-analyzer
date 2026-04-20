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

    // 获取状态
    getStatus(instance, charName, date) {
        for (const serverData of Object.values(instance.caveStats || {})) {
            if (serverData && serverData[charName] && serverData[charName][date]) {
                return serverData[charName][date].status;
            }
        }
        return null;
    },

    getStatusText(instance, charName, date) {
        const status = this.getStatus(instance, charName, date);
        switch (status) {
            case 'finished': return '已完成';
            case 'started': return '未完成';
            case 'error': return '异常';
            default: return '未执行';
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
