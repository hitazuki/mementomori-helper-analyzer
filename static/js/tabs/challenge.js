// 战斗统计 Tab
const ChallengeTab = {
    // 塔类型
    towerTypes: ['Infinity', 'Azure', 'Crimson', 'Emerald', 'Amber'],

    typeOptions: [
        { value: 'all', label: '全部' },
        { value: 'quest', label: '主线' },
        { value: 'Infinity', label: '塔 - Infinity' },
        { value: 'Azure', label: '塔 - Azure' },
        { value: 'Crimson', label: '塔 - Crimson' },
        { value: 'Emerald', label: '塔 - Emerald' },
        { value: 'Amber', label: '塔 - Amber' }
    ],

    // 初始数据
    initialData: {
        challengeStats: {},
        challengeSelectedCharacter: '',
        challengeSelectedType: 'all'
    },

    // 加载数据
    async load() {
        return await API.loadChallengeStats();
    },

    // Getters
    getCharacterNames(instance) {
        return Utils.getNestedCharacterNames(instance.challengeStats);
    },

    getQuestStats(instance) {
        const characters = instance.challengeSelectedCharacter
            ? [instance.challengeSelectedCharacter]
            : this.getCharacterNames(instance);

        if (instance.challengeSelectedType !== 'all' && instance.challengeSelectedType !== 'quest') {
            return [];
        }

        // 全部角色：显示每个角色的最后挑战关卡
        if (!instance.challengeSelectedCharacter && characters.length > 0) {
            const lastLevels = [];
            characters.forEach(charName => {
                let lastLevel = null;
                let lastTime = '';
                for (const serverData of Object.values(instance.challengeStats || {})) {
                    if (serverData && serverData[charName]) {
                        const quest = serverData[charName].quest || {};
                        for (const [level, levelStats] of Object.entries(quest)) {
                            const levelTime = levelStats.last_time || '';
                            if (levelTime && levelTime > lastTime) {
                                lastTime = levelTime;
                                lastLevel = {
                                    level,
                                    attempts: levelStats.attempts || 0,
                                    success: levelStats.success || false,
                                    last_time: levelTime,
                                    character: charName
                                };
                            }
                        }
                    }
                }
                if (lastLevel) lastLevels.push(lastLevel);
            });
            return lastLevels.sort((a, b) => (b.last_time || '').localeCompare(a.last_time || ''));
        }

        // 单个角色：显示该角色的所有关卡
        const stats = {};
        characters.forEach(charName => {
            for (const serverData of Object.values(instance.challengeStats || {})) {
                if (serverData && serverData[charName]) {
                    const quest = serverData[charName].quest || {};
                    for (const [level, levelStats] of Object.entries(quest)) {
                        if (!stats[level]) {
                            stats[level] = { level, attempts: 0, success: false, last_time: '' };
                        }
                        stats[level].attempts += levelStats.attempts || 0;
                        if (levelStats.success) stats[level].success = true;
                        if (levelStats.last_time && (!stats[level].last_time || levelStats.last_time > stats[level].last_time)) {
                            stats[level].last_time = levelStats.last_time;
                        }
                    }
                }
            }
        });

        return Object.keys(stats)
            .sort((a, b) => (stats[b].last_time || '').localeCompare(stats[a].last_time || ''))
            .map(l => stats[l]);
    },

    // 获取塔统计
    getTowerStats(instance, towerType) {
        const characters = instance.challengeSelectedCharacter
            ? [instance.challengeSelectedCharacter]
            : this.getCharacterNames(instance);

        if (instance.challengeSelectedType !== 'all' && instance.challengeSelectedType !== towerType) {
            return [];
        }

        // 全部角色
        if (!instance.challengeSelectedCharacter && characters.length > 0) {
            const lastLevels = [];
            characters.forEach(charName => {
                let lastLevel = null;
                let lastTime = '';
                for (const serverData of Object.values(instance.challengeStats || {})) {
                    if (serverData && serverData[charName]) {
                        const towers = serverData[charName].towers || {};
                        const tower = towers[towerType] || {};
                        for (const [level, levelStats] of Object.entries(tower)) {
                            const levelTime = levelStats.last_time || '';
                            if (levelTime && levelTime > lastTime) {
                                lastTime = levelTime;
                                lastLevel = {
                                    level,
                                    attempts: levelStats.attempts || 0,
                                    success: levelStats.success || false,
                                    last_time: levelTime,
                                    character: charName
                                };
                            }
                        }
                    }
                }
                if (lastLevel) lastLevels.push(lastLevel);
            });
            return lastLevels.sort((a, b) => (b.last_time || '').localeCompare(a.last_time || ''));
        }

        // 单个角色
        const stats = {};
        characters.forEach(charName => {
            for (const serverData of Object.values(instance.challengeStats || {})) {
                if (serverData && serverData[charName]) {
                    const towers = serverData[charName].towers || {};
                    const tower = towers[towerType] || {};
                    for (const [level, levelStats] of Object.entries(tower)) {
                        if (!stats[level]) {
                            stats[level] = { level, attempts: 0, success: false, last_time: '' };
                        }
                        stats[level].attempts += levelStats.attempts || 0;
                        if (levelStats.success) stats[level].success = true;
                        if (levelStats.last_time && (!stats[level].last_time || levelStats.last_time > stats[level].last_time)) {
                            stats[level].last_time = levelStats.last_time;
                        }
                    }
                }
            }
        });

        return Object.keys(stats)
            .sort((a, b) => (stats[b].last_time || '').localeCompare(stats[a].last_time || ''))
            .map(l => stats[l]);
    }
};
