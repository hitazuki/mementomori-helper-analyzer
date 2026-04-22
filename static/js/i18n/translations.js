/**
 * UI 文本翻译
 * 支持简体中文、繁体中文、英文
 */
const translations = {
  'zh-CN': {
    // 标题
    'app.title': 'MMTH Analyzer',
    'app.subtitle': '钻石监控 · 洞窟追踪 · 战斗统计',

    // 按钮
    'btn.refresh': '刷新数据',
    'btn.scrape': '抓取MMTH钻石',
    'btn.etl': '更新日志数据',

    // 加载状态
    'status.loading': '加载中...',
    'status.scraping': '抓取中...',
    'status.processing': '处理中...',

    // 警告
    'warn.scrape': '抓取功能需要 Chrome/Chromium 浏览器（Docker 镜像已内置）',

    // Tab 标签
    'tab.mmth': 'MMTH 钻石监控',
    'tab.logs': '钻石日志统计',
    'tab.cave': '洞窟日志统计',
    'tab.challenge': '战斗日志统计',
    'tab.items': '物品日志统计',

    // MMTH Tab
    'mmth.lastScrapeTime': '最后抓取时间: {time}',
    'mmth.latestData': '最新钻石数据',
    'mmth.historyTrend': '历史趋势',
    'mmth.selectAccount': '选择账号:',
    'mmth.allAccounts': '全部账号',
    'mmth.dataType': '数据类型:',
    'mmth.timeGroup': '时间维度:',
    'mmth.total': '总钻石',
    'mmth.free': '免费钻石',
    'mmth.paid': '付费钻石',
    'mmth.raw': '原始',
    'mmth.day': '按天',
    'mmth.week': '按周',
    'mmth.month': '按月',

    // 表格列名
    'col.server': '服务器',
    'col.account': '账号',
    'col.totalDiamond': '总钻石',
    'col.freeDiamond': '免费钻石',
    'col.paidDiamond': '付费钻石',
    'col.status': '状态',
    'col.time': '时间',
    'col.character': '角色',
    'col.level': '关卡',
    'col.attempts': '尝试次数',
    'col.lastChallenge': '最后挑战',
    'col.floor': '层数',
    'col.date': '日期',

    // 状态
    'status.normal': '正常',
    'status.noData': '暂无数据',
    'status.success': '成功',
    'status.failed': '失败',
    'status.cleared': '已通关',
    'status.notCleared': '未通关',

    // 日志统计 Tab
    'logs.selectCharacter': '选择角色:',
    'logs.all': '全部',
    'logs.totalGain': '总获取',
    'logs.totalConsume': '总消耗',
    'logs.netChange': '净变化',
    'logs.free': '免费',
    'logs.paid': '付费',

    // 洞窟 Tab
    'cave.title': '时空洞窟状态',
    'cave.displayDays': '显示天数:',
    'cave.days': '{n}天',
    'cave.all': '全部',
    'cave.finished': '已完成',
    'cave.unfinished': '未完成',
    'cave.error': '异常',
    'cave.notStarted': '未执行',

    // 战斗 Tab
    'challenge.selectCharacter': '选择角色:',
    'challenge.all': '全部',
    'challenge.levelType': '关卡类型:',
    'challenge.quest': '主线关卡',
    'challenge.tower': '塔 - {name}',
    'challenge.towerAll': '全部塔',

    // 物品 Tab
    'items.itemType': '物品类型:',
    'items.runeTicket': '饼干 (Rune Ticket)',
    'items.upgradePanacea': '红水 (Upgrade Panacea)',
    'items.selectCharacter': '选择角色:',
    'items.all': '全部',
    'items.timeGroup': '时间维度:',

    // 图表标题
    'chart.diamondTrend': '钻石历史趋势',
    'chart.sourceDistribution': '来源分布',
    'chart.dailyChange': '每日变动统计',
    'chart.saveAsImage': '保存图片',
    'chart.noData': '暂无数据'
  },

  'zh-TW': {
    // 標題
    'app.title': 'MMTH Analyzer',
    'app.subtitle': '鑽石監控 · 洞窟追蹤 · 戰鬥統計',

    // 按鈕
    'btn.refresh': '刷新數據',
    'btn.scrape': '抓取MMTH鑽石',
    'btn.etl': '更新日誌數據',

    // 載入狀態
    'status.loading': '載入中...',
    'status.scraping': '抓取中...',
    'status.processing': '處理中...',

    // 警告
    'warn.scrape': '抓取功能需要 Chrome/Chromium 瀏覽器（Docker 映像已內置）',

    // Tab 標籤
    'tab.mmth': 'MMTH 鑽石監控',
    'tab.logs': '鑽石日誌統計',
    'tab.cave': '洞窟日誌統計',
    'tab.challenge': '戰鬥日誌統計',
    'tab.items': '物品日誌統計',

    // MMTH Tab
    'mmth.lastScrapeTime': '最後抓取時間: {time}',
    'mmth.latestData': '最新鑽石數據',
    'mmth.historyTrend': '歷史趨勢',
    'mmth.selectAccount': '選擇帳號:',
    'mmth.allAccounts': '全部帳號',
    'mmth.dataType': '數據類型:',
    'mmth.timeGroup': '時間維度:',
    'mmth.total': '總鑽石',
    'mmth.free': '免費鑽石',
    'mmth.paid': '付費鑽石',
    'mmth.raw': '原始',
    'mmth.day': '按天',
    'mmth.week': '按週',
    'mmth.month': '按月',

    // 表格列名
    'col.server': '伺服器',
    'col.account': '帳號',
    'col.totalDiamond': '總鑽石',
    'col.freeDiamond': '免費鑽石',
    'col.paidDiamond': '付費鑽石',
    'col.status': '狀態',
    'col.time': '時間',
    'col.character': '角色',
    'col.level': '關卡',
    'col.attempts': '嘗試次數',
    'col.lastChallenge': '最後挑戰',
    'col.floor': '層數',
    'col.date': '日期',

    // 狀態
    'status.normal': '正常',
    'status.noData': '暫無數據',
    'status.success': '成功',
    'status.failed': '失敗',
    'status.cleared': '已通關',
    'status.notCleared': '未通關',

    // 日誌統計 Tab
    'logs.selectCharacter': '選擇角色:',
    'logs.all': '全部',
    'logs.totalGain': '總獲取',
    'logs.totalConsume': '總消耗',
    'logs.netChange': '淨變化',
    'logs.free': '免費',
    'logs.paid': '付費',

    // 洞窟 Tab
    'cave.title': '時空洞窟狀態',
    'cave.displayDays': '顯示天數:',
    'cave.days': '{n}天',
    'cave.all': '全部',
    'cave.finished': '已完成',
    'cave.unfinished': '未完成',
    'cave.error': '異常',
    'cave.notStarted': '未執行',

    // 戰鬥 Tab
    'challenge.selectCharacter': '選擇角色:',
    'challenge.all': '全部',
    'challenge.levelType': '關卡類型:',
    'challenge.quest': '主線關卡',
    'challenge.tower': '塔 - {name}',
    'challenge.towerAll': '全部塔',

    // 物品 Tab
    'items.itemType': '物品類型:',
    'items.runeTicket': '餅乾 (Rune Ticket)',
    'items.upgradePanacea': '紅水 (Upgrade Panacea)',
    'items.selectCharacter': '選擇角色:',
    'items.all': '全部',
    'items.timeGroup': '時間維度:',

    // 圖表標題
    'chart.diamondTrend': '鑽石歷史趨勢',
    'chart.sourceDistribution': '來源分佈',
    'chart.dailyChange': '每日變動統計',
    'chart.saveAsImage': '保存圖片',
    'chart.noData': '暫無數據'
  },

  'en-US': {
    // Title
    'app.title': 'MMTH Analyzer',
    'app.subtitle': 'Diamond Monitoring · Cave Tracking · Battle Statistics',

    // Buttons
    'btn.refresh': 'Refresh Data',
    'btn.scrape': 'Scrape MMTH Diamonds',
    'btn.etl': 'Update Log Data',

    // Loading status
    'status.loading': 'Loading...',
    'status.scraping': 'Scraping...',
    'status.processing': 'Processing...',

    // Warning
    'warn.scrape': 'Scraping requires Chrome/Chromium browser (included in Docker image)',

    // Tab labels
    'tab.mmth': 'MMTH Diamond Monitor',
    'tab.logs': 'Diamond Log Stats',
    'tab.cave': 'Cave Log Stats',
    'tab.challenge': 'Battle Log Stats',
    'tab.items': 'Item Log Stats',

    // MMTH Tab
    'mmth.lastScrapeTime': 'Last scrape time: {time}',
    'mmth.latestData': 'Latest Diamond Data',
    'mmth.historyTrend': 'History Trend',
    'mmth.selectAccount': 'Select Account:',
    'mmth.allAccounts': 'All Accounts',
    'mmth.dataType': 'Data Type:',
    'mmth.timeGroup': 'Time Group:',
    'mmth.total': 'Total Diamonds',
    'mmth.free': 'Free Diamonds',
    'mmth.paid': 'Paid Diamonds',
    'mmth.raw': 'Raw',
    'mmth.day': 'By Day',
    'mmth.week': 'By Week',
    'mmth.month': 'By Month',

    // Table columns
    'col.server': 'Server',
    'col.account': 'Account',
    'col.totalDiamond': 'Total Diamonds',
    'col.freeDiamond': 'Free Diamonds',
    'col.paidDiamond': 'Paid Diamonds',
    'col.status': 'Status',
    'col.time': 'Time',
    'col.character': 'Character',
    'col.level': 'Level',
    'col.attempts': 'Attempts',
    'col.lastChallenge': 'Last Challenge',
    'col.floor': 'Floor',
    'col.date': 'Date',

    // Status
    'status.normal': 'Normal',
    'status.noData': 'No data',
    'status.success': 'Success',
    'status.failed': 'Failed',
    'status.cleared': 'Cleared',
    'status.notCleared': 'Not Cleared',

    // Log Stats Tab
    'logs.selectCharacter': 'Select Character:',
    'logs.all': 'All',
    'logs.totalGain': 'Total Gain',
    'logs.totalConsume': 'Total Consume',
    'logs.netChange': 'Net Change',
    'logs.free': 'Free',
    'logs.paid': 'Paid',

    // Cave Tab
    'cave.title': 'Space-Time Cave Status',
    'cave.displayDays': 'Display Days:',
    'cave.days': '{n} days',
    'cave.all': 'All',
    'cave.finished': 'Finished',
    'cave.unfinished': 'Unfinished',
    'cave.error': 'Error',
    'cave.notStarted': 'Not Started',

    // Challenge Tab
    'challenge.selectCharacter': 'Select Character:',
    'challenge.all': 'All',
    'challenge.levelType': 'Level Type:',
    'challenge.quest': 'Quest Levels',
    'challenge.tower': 'Tower - {name}',
    'challenge.towerAll': 'All Towers',

    // Items Tab
    'items.itemType': 'Item Type:',
    'items.runeTicket': 'Rune Ticket',
    'items.upgradePanacea': 'Upgrade Panacea',
    'items.selectCharacter': 'Select Character:',
    'items.all': 'All',
    'items.timeGroup': 'Time Group:',

    // Chart titles
    'chart.diamondTrend': 'Diamond History Trend',
    'chart.sourceDistribution': 'Source Distribution',
    'chart.dailyChange': 'Daily Change Statistics',
    'chart.saveAsImage': 'Save as Image',
    'chart.noData': 'No data'
  }
};
