// 主入口 - Alpine.js 应用
function app() {
    return {
        // 通用状态
        loading: false,
        scraping: false,
        scrapeStatus: null, // 抓取任务状态
        scrapePollInterval: null, // 抓取轮询定时器
        etlProcessing: false,
        etlStatus: null, // ETL 任务状态
        etlPollInterval: null, // ETL 轮询定时器
        scheduleSaving: false,
        scheduleStatus: '',
        scheduleError: '',
        activeTab: 'mmth',

        schedule: {
            cronScrape: '',
            cronETL: '',
            configPath: ''
        },

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
                this.loadSchedule(),
                this.loadMmth(),
                this.loadLogs(),
                this.loadCave(),
                this.loadChallenge(),
                this.loadItems()
            ]);
            setTimeout(() => this.initCharts(), 300);

            // 检查是否有进行中的任务
            await this.checkScrapeStatus();
            await this.checkETLStatus();
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

        async loadSchedule() {
            const data = await API.loadSchedule();
            if (!data) return;
            this.schedule.cronScrape = data.cron_scrape || '';
            this.schedule.cronETL = data.cron_etl || '';
            this.schedule.configPath = data.config_path || '';
        },

        // ===== 操作 =====
        async saveSchedule() {
            this.scheduleSaving = true;
            this.scheduleStatus = '';
            this.scheduleError = '';
            try {
                const data = await API.saveSchedule(this.schedule.cronScrape, this.schedule.cronETL);
                if (data.error) {
                    this.scheduleError = data.error;
                    return;
                }
                this.schedule.cronScrape = data.cron_scrape || '';
                this.schedule.cronETL = data.cron_etl || '';
                this.schedule.configPath = data.config_path || this.schedule.configPath;
                this.scheduleStatus = this.t('schedule.saved');
                setTimeout(() => {
                    if (this.scheduleStatus === this.t('schedule.saved')) {
                        this.scheduleStatus = '';
                    }
                }, 3000);
            } finally {
                this.scheduleSaving = false;
            }
        },

        async triggerScrape() {
            if (this.scraping) return;

            const data = await API.triggerScrape();
            console.log('Scrape trigger response:', data);

            // 根据HTTP状态码判断结果
            // 202 Accepted: 任务启动成功
            // 409 Conflict: 任务已在运行
            if (data._httpStatus === 202 || data.status === 'running') {
                this.scraping = true;
                this.scrapeStatus = await API.getScrapeStatus();
                this.pollScrapeStatus();
            } else if (data._httpStatus === 409 || data.error === '任务已在运行中') {
                // 任务已在运行，进入轮询状态
                this.scraping = true;
                this.scrapeStatus = await API.getScrapeStatus();
                this.pollScrapeStatus();
            } else if (data.error) {
                alert('Scrape ' + this.t('status.failed') + ': ' + data.error);
            } else {
                console.warn('Unexpected scrape response, checking status...');
                const status = await API.getScrapeStatus();
                if (status.status === 'running') {
                    this.scraping = true;
                    this.scrapeStatus = status;
                    this.pollScrapeStatus();
                } else {
                    alert('Scrape ' + this.t('status.failed') + ': Unexpected response');
                }
            }
        },

        // 检查抓取状态（用于页面刷新后恢复）
        async checkScrapeStatus() {
            const status = await API.getScrapeStatus();
            if (status.status === 'running') {
                this.scraping = true;
                this.scrapeStatus = status;
                this.pollScrapeStatus();
            }
        },

        // 轮询抓取状态
        pollScrapeStatus() {
            // 清除之前的轮询
            if (this.scrapePollInterval) {
                clearInterval(this.scrapePollInterval);
            }

            this.scrapePollInterval = setInterval(async () => {
                const status = await API.getScrapeStatus();
                this.scrapeStatus = status;

                if (status.status !== 'running') {
                    // 任务完成，停止轮询
                    clearInterval(this.scrapePollInterval);
                    this.scrapePollInterval = null;
                    this.scraping = false;

                    // 刷新数据
                    await this.loadMmth();
                    MmthTab.updateChart(this);

                    // 显示结果
                    if (status.status === 'completed') {
                        alert(`Scrape ${this.t('status.success')}: ${status.total_servers} servers`);
                    } else if (status.status === 'failed') {
                        alert('Scrape ' + this.t('status.failed') + ': ' + (status.error || 'Unknown error'));
                    }
                }
            }, 2000); // 每 2 秒轮询一次
        },

        async triggerETL() {
            if (this.etlProcessing) return;

            const data = await API.triggerETL();
            console.log('ETL trigger response:', data);

            // 根据HTTP状态码判断结果
            // 202 Accepted: 任务启动成功
            // 409 Conflict: 任务已在运行
            if (data._httpStatus === 202 || data.status === 'running') {
                this.etlProcessing = true;
                this.etlStatus = await API.getETLStatus();
                this.pollETLStatus();
            } else if (data._httpStatus === 409 || data.error === 'ETL task already running') {
                // 任务已在运行（可能是定时任务或其他人触发），进入轮询状态
                this.etlProcessing = true;
                this.etlStatus = await API.getETLStatus();
                console.log('ETL task already running, polling status...');
                this.pollETLStatus();
            } else if (data.error) {
                alert('ETL ' + this.t('status.failed') + ': ' + data.error);
            } else {
                console.warn('Unexpected ETL response, checking status...');
                const status = await API.getETLStatus();
                if (status.status === 'running') {
                    this.etlProcessing = true;
                    this.etlStatus = status;
                    this.pollETLStatus();
                } else {
                    alert('ETL ' + this.t('status.failed') + ': Unexpected response');
                }
            }
        },

        // 检查 ETL 状态（用于页面刷新后恢复）
        async checkETLStatus() {
            const status = await API.getETLStatus();
            if (status.status === 'running') {
                this.etlProcessing = true;
                this.etlStatus = status;
                this.pollETLStatus();
            }
        },

        // 轮询 ETL 状态
        pollETLStatus() {
            // 清除之前的轮询
            if (this.etlPollInterval) {
                clearInterval(this.etlPollInterval);
            }

            this.etlPollInterval = setInterval(async () => {
                const status = await API.getETLStatus();
                this.etlStatus = status;

                if (status.status !== 'running') {
                    // 任务完成，停止轮询
                    clearInterval(this.etlPollInterval);
                    this.etlPollInterval = null;
                    this.etlProcessing = false;

                    // 刷新数据
                    await Promise.all([
                        this.loadLogs(),
                        this.loadCave(),
                        this.loadChallenge()
                    ]);
                    if (this.activeTab === 'logs') {
                        this.initOrUpdateLogsCharts();
                    }

                    // 显示结果
                    if (status.status === 'completed') {
                        const msg = `ETL ${this.t('status.success')}: ${status.total_servers} servers, ${status.success_count} ${this.t('status.success').toLowerCase()}`;
                        if (status.failed_count > 0) {
                            alert(msg + `, ${status.failed_count} failed: ${status.failed_files.join(', ')}`);
                        } else {
                            alert(msg);
                        }
                    } else if (status.status === 'failed') {
                        alert('ETL ' + this.t('status.failed') + ': ' + (status.error || 'Unknown error'));
                    }
                }
            }, 2000); // 每 2 秒轮询一次
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
