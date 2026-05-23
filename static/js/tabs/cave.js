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

    // 获取指定角色指定日期的状态
    getStatus(instance, charName, date) {
        for (const serverData of Object.values(instance.caveStats || {})) {
            if (serverData && serverData[charName] && serverData[charName][date]) {
                return serverData[charName][date].status;
            }
        }
        return null;
    },

    // 获取今天所有角色的整体状态
    // 优先级：有任一角色 error → 'error'；全部 finished → 'finished'；有 started → 'started'；无记录 → null
    getTodayOverallStatus(instance) {
        const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        const stats = instance.caveStats || {};
        let hasAny = false;
        let hasError = false;
        let hasStarted = false;
        let allFinished = true;

        for (const serverData of Object.values(stats)) {
            if (!serverData) continue;
            for (const charData of Object.values(serverData)) {
                if (!charData || !charData[today]) continue;
                hasAny = true;
                const status = charData[today].status;
                if (status === 'error') hasError = true;
                if (status === 'started') hasStarted = true;
                if (status !== 'finished') allFinished = false;
            }
        }

        if (!hasAny) return null;
        if (hasError) return 'error';
        if (allFinished) return 'finished';
        if (hasStarted) return 'started';
        return null;
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
