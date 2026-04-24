// 主入口 - Alpine.js 应用
function app() {
    return {
        // 通用状态
        loading: false,
        scraping: false,
        etlProcessing: false,
        activeTab: 'mmth',

        // i18n 状态
        currentLang: 'zh-CN',

        // MMTH 数据
        ...MmthTab.initialData,

        // 日志统计数据
        ...LogsTab.initialData,

        // 洞穴统计数据
        ...CaveTab.initialData,

        // 挑战统计数据
        ...ChallengeTab.initialData,

        // 物品统计数据
        ...ItemsTab.initialData,

        // ===== i18n 方法 =====
        t(key, params) {
            return I18n.t(key, params);
        },

        setLanguage(lang) {
            I18n.setLanguage(lang);
            this.currentLang = lang;
            // 更新 HTML lang 属性
            document.documentElement.lang = lang;
        },

        // ===== 初始化 =====
        async init() {
            // 初始化 i18n
            this.currentLang = I18n.init();
            document.documentElement.lang = this.currentLang;

            // 初始化来源翻译
            await SourceI18n.init();

            await Promise.all([
                this.loadMmth(),
                this.loadLogs(),
                this.loadCave(),
                this.loadChallenge(),
                this.loadItems()
            ]);
            setTimeout(() => this.initCharts(), 300);
        },

        // ===== Tab 切换 =====
        switchTab(tab) {
            this.activeTab = tab;
            setTimeout(() => this.handleTabSwitch(tab), 150);
        },

        handleTabSwitch(tab) {
            if (tab === 'mmth' && this.historyChart) {
                this.historyChart.resize();
            }
            if (tab === 'logs') {
                this.initOrUpdateLogsCharts();
            }
            if (tab === 'items') {
                this.initOrUpdateItemCharts();
            }
        },

        // ===== 图表初始化 =====
        initCharts() {
            MmthTab.initChart(this);
            window.addEventListener('resize', () => this.handleResize());
        },

        initOrUpdateLogsCharts() {
            if (!this.dailyChart) {
                LogsTab.initCharts(this);
            } else {
                LogsTab.updateCharts(this);
            }
        },

        initOrUpdateItemCharts() {
            if (!this.itemDailyChart) {
                ItemsTab.initCharts(this);
            } else {
                ItemsTab.updateCharts(this);
            }
        },

        handleResize() {
            this.historyChart?.resize();
            this.dailyChart?.resize();
            this.sourceChart?.resize();
            this.itemDailyChart?.resize();
            this.itemSourceChart?.resize();
        },

        // ===== 数据加载 =====
        async loadMmth() {
            const data = await MmthTab.load();
            this.latestData = data.latestData;
            this.historyData = data.historyData;
            this.lastScrapeTime = data.lastScrapeTime;
        },

        async loadLogs() {
            this.stats = await LogsTab.load();
        },

        async loadCave() {
            this.caveStats = await CaveTab.load();
        },

        async loadChallenge() {
            this.challengeStats = await ChallengeTab.load();
        },

        async loadItems() {
            const data = await ItemsTab.load();
            this.runeTicketStats = data.runeTicketStats;
            this.upgradePanaceaStats = data.upgradePanaceaStats;
        },

        // ===== 操作 =====
        async triggerScrape() {
            this.scraping = true;
            try {
                await MmthTab.scrape(this);
            } finally {
                this.scraping = false;
            }
        },

        async triggerETL() {
            this.etlProcessing = true;
            try {
                const data = await API.triggerETL();
                if (data.total_files !== undefined) {
                    await Promise.all([
                        this.loadLogs(),
                        this.loadCave(),
                        this.loadChallenge()
                    ]);
                    if (this.activeTab === 'logs') {
                        this.initOrUpdateLogsCharts();
                    }
                    alert(`ETL ${this.t('status.success')}: ${data.total_files} files, ${data.success} ${this.t('status.success').toLowerCase()}`);
                } else {
                    alert('ETL ' + this.t('status.failed') + ': ' + (data.error || 'Unknown error'));
                }
            } catch (e) {
                alert(this.t('status.failed') + ': ' + e.message);
            } finally {
                this.etlProcessing = false;
            }
        },

        async refreshAll() {
            this.loading = true;
            try {
                await Promise.all([
                    this.loadMmth(),
                    this.loadLogs(),
                    this.loadCave(),
                    this.loadChallenge(),
                    this.loadItems()
                ]);
                MmthTab.updateChart(this);
                if (this.activeTab === 'logs') {
                    this.initOrUpdateLogsCharts();
                }
            } finally {
                this.loading = false;
            }
        },

        // ===== MMTH Getters =====
        get mmthAccountNames() {
            return Object.keys(this.historyData || {}).sort();
        },

        // ===== 图表更新 =====
        updateMmthCharts() {
            MmthTab.updateChart(this);
        },

        // ===== 日志统计 Getters =====
        get characterNames() {
            return LogsTab.getCharacterNames(this);
        },

        get selectedCharacters() {
            return this.selectedCharacter ? [this.selectedCharacter] : this.characterNames;
        },

        get totalGain() {
            return LogsTab.getTotalGain(this);
        },

        get totalConsume() {
            return LogsTab.getTotalConsume(this);
        },

        get totalNetChange() {
            return this.totalGain - this.totalConsume;
        },

        // ===== 日志图表更新 =====
        updateLogsCharts() {
            this.initOrUpdateLogsCharts();
        },

        // ===== 洞窟 Getters =====
        get caveRecentDates() {
            return CaveTab.getRecentDates(this);
        },

        get caveCharacters() {
            return CaveTab.getCharacters(this);
        },

        getCaveStatus(charName, date) {
            return CaveTab.getStatus(this, charName, date);
        },

        getCaveStatusText(charName, date) {
            return CaveTab.getStatusText(this, charName, date);
        },

        getCaveStatusClass(charName, date) {
            return CaveTab.getStatusClass(this, charName, date);
        },

        // ===== 挑战 Getters =====
        get challengeCharacterNames() {
            return ChallengeTab.getCharacterNames(this);
        },

        get challengeQuestStats() {
            return ChallengeTab.getQuestStats(this);
        },

        getChallengeTowerStats(towerType) {
            return ChallengeTab.getTowerStats(this, towerType);
        },

        // ===== 物品 Getters =====
        get itemCharacterNames() {
            return ItemsTab.getCharacterNames(this);
        },

        get currentItemStats() {
            return this.itemType === 'upgradePanacea' ? this.upgradePanaceaStats : this.runeTicketStats;
        },

        get itemTypeName() {
            return ItemsTab.getTypeName(this);
        },

        get itemTotalGain() {
            return ItemsTab.getTotalGain(this);
        },

        get itemTotalConsume() {
            return ItemsTab.getTotalConsume(this);
        },

        get itemTotalNetChange() {
            return this.itemTotalGain - this.itemTotalConsume;
        },

        get upgradePanaceaTotalGain() {
            const originalType = this.itemType;
            this.itemType = 'upgradePanacea';
            const result = ItemsTab.getTotalGain(this);
            this.itemType = originalType;
            return result;
        },

        get upgradePanaceaTotalConsume() {
            const originalType = this.itemType;
            this.itemType = 'upgradePanacea';
            const result = ItemsTab.getTotalConsume(this);
            this.itemType = originalType;
            return result;
        },

        get upgradePanaceaTotalNetChange() {
            return this.upgradePanaceaTotalGain - this.upgradePanaceaTotalConsume;
        },

        // 物品图表更新
        updateItemCharts() {
            this.initOrUpdateItemCharts();
        },

        // 塔类型常量
        challengeTowerTypes: ChallengeTab.towerTypes,
        get challengeTypeOptions() {
            return ChallengeTab.getTypeOptions();
        }
    };
}
