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

        // 深色模式状态
        isDarkMode: false,

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

            // 初始化深色模式
            const savedMode = localStorage.getItem('darkMode');
            if (savedMode === 'true' || (savedMode === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                this.isDarkMode = true;
                document.documentElement.classList.add('dark');
            } else {
                this.isDarkMode = false;
                document.documentElement.classList.remove('dark');
            }

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
            // 1. Alpine.js 是异步更新 DOM 的，必须先用 $nextTick 等待 DOM 真实渲染出 display: block
            this.$nextTick(() => {
                // 2. 此时 DOM 虽有 block，但浏览器可能还没完成物理像素级的排版（Layout）。
                // 必须再用 requestAnimationFrame 等一帧，确保 clientWidth 绝对不为 0。
                // 否则 ECharts 会在宽高为 0 时构建坐标系失败，从而导致内部抛出 coordSys.type 的 TypeError！
                requestAnimationFrame(() => {
                    this.handleTabSwitch(tab);
                });
            });
        },

        handleTabSwitch(tab) {
            if (tab === 'mmth') {
                const historyChart = Charts.init('historyChart');
                if (historyChart) historyChart.resize();
            }
            if (tab === 'logs') {
                this.initOrUpdateLogsCharts();
                // 在图表 setOption 后再次触发布局重算，保障内部坐标系绝对正确
                requestAnimationFrame(() => {
                    const dailyChart = Charts.init('dailyChart');
                    const sourceChart = Charts.init('sourceChart');
                    if (dailyChart) dailyChart.resize();
                    if (sourceChart) sourceChart.resize();
                });
            }
            if (tab === 'items') {
                this.initOrUpdateItemCharts();
                requestAnimationFrame(() => {
                    const itemDailyChart = Charts.init('itemDailyChart');
                    const itemSourceChart = Charts.init('itemSourceChart');
                    if (itemDailyChart) itemDailyChart.resize();
                    if (itemSourceChart) itemSourceChart.resize();
                });
            }
        },

        // ===== 图表初始化 =====
        initCharts() {
            MmthTab.initChart(this);
            // 图表响应式现在由 charts.js 中的 ResizeObserver 处理
        },

        // 切换深色模式
        toggleDarkMode() {
            this.isDarkMode = !this.isDarkMode;
            localStorage.setItem('darkMode', this.isDarkMode);
            if (this.isDarkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            setTimeout(() => this.rebuildAllCharts(), 50); // 稍微延迟等待 Vue/Alpine 更新 DOM class
        },

        // 重建所有图表以应用新主题
        rebuildAllCharts() {
            // 销毁已有实例
            const chartIds = ['historyChart', 'dailyChart', 'sourceChart', 'itemDailyChart', 'itemSourceChart', 'caveChart', 'challengeChart'];
            chartIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    const chart = echarts.getInstanceByDom(el);
                    if (chart) chart.dispose();
                }
            });

            // 根据当前 activeTab 重新初始化
            if (this.activeTab === 'mmth') {
                MmthTab.initChart(this);
            } else if (this.activeTab === 'logs') {
                LogsTab.initCharts(this);
            } else if (this.activeTab === 'items') {
                ItemsTab.initCharts(this);
            } else if (this.activeTab === 'cave') {
                CaveTab.initCharts(this);
            } else if (this.activeTab === 'challenge') {
                ChallengeTab.initCharts(this);
            }
        },

        initOrUpdateLogsCharts() {
            const chart = Charts.init('dailyChart');
            if (chart.getOption()) {
                LogsTab.updateCharts(this);
            } else {
                LogsTab.initCharts(this);
            }
        },

        initOrUpdateItemCharts() {
            const chart = Charts.init('itemDailyChart');
            if (chart.getOption()) {
                ItemsTab.updateCharts(this);
            } else {
                ItemsTab.initCharts(this);
            }
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

            // 立即设置状态，避免等待 API 响应
            this.scraping = true;

            const data = await API.triggerScrape();
            console.log('Scrape trigger response:', data);

            // 根据HTTP状态码判断结果
            // 202 Accepted: 任务启动成功
            // 409 Conflict: 任务已在运行
            if (data._httpStatus === 202 || data.status === 'running') {
                this.scrapeStatus = await API.getScrapeStatus();
                this.pollScrapeStatus();
            } else if (data._httpStatus === 409 || data.error === '任务已在运行中') {
                // 任务已在运行，进入轮询状态
                this.scrapeStatus = await API.getScrapeStatus();
                this.pollScrapeStatus();
            } else if (data.error) {
                this.scraping = false;
                alert('Scrape ' + this.t('status.failed') + ': ' + data.error);
            } else {
                console.warn('Unexpected scrape response, checking status...');
                const status = await API.getScrapeStatus();
                if (status.status === 'running') {
                    this.scrapeStatus = status;
                    this.pollScrapeStatus();
                } else {
                    this.scraping = false;
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
            }, 3000); // 每 3 秒轮询一次
        },

        async triggerETL() {
            if (this.etlProcessing) return;

            // 立即设置状态，避免等待 API 响应
            this.etlProcessing = true;

            const data = await API.triggerETL();
            console.log('ETL trigger response:', data);

            // 根据HTTP状态码判断结果
            // 202 Accepted: 任务启动成功
            // 409 Conflict: 任务已在运行
            if (data._httpStatus === 202 || data.status === 'running') {
                this.etlStatus = await API.getETLStatus();
                this.pollETLStatus();
            } else if (data._httpStatus === 409 || data.error === 'ETL task already running') {
                // 任务已在运行（可能是定时任务或其他人触发），进入轮询状态
                this.etlStatus = await API.getETLStatus();
                console.log('ETL task already running, polling status...');
                this.pollETLStatus();
            } else if (data.error) {
                this.etlProcessing = false;
                alert('ETL ' + this.t('status.failed') + ': ' + data.error);
            } else {
                console.warn('Unexpected ETL response, checking status...');
                const status = await API.getETLStatus();
                if (status.status === 'running') {
                    this.etlStatus = status;
                    this.pollETLStatus();
                } else {
                    this.etlProcessing = false;
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
            }, 3000); // 每 3 秒轮询一次
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

        // 所有角色最近执行的整体状态摘要（用于 Header 常驻标识）
        // 返回 { status, date } 或 null
        get caveOverallStatus() {
            return CaveTab.getOverallStatus(this);
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
