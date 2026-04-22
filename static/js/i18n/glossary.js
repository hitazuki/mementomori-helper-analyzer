/**
 * 游戏专有名词对照表
 * 基于 LOG_KEYWORDS.md 提取
 */
const glossary = {
  // ==================== 物品名称 ====================
  'item.diamond': {
    'zh-CN': '钻石',
    'zh-TW': '鑽石',
    'en-US': 'Diamonds',
    'ja-JP': 'ダイヤ'
  },
  'item.runeTicket': {
    'zh-CN': '符石兑换券',
    'zh-TW': '符石兌換券',
    'en-US': 'Rune Ticket',
    'ja-JP': 'ルーンチケット'
  },
  'item.upgradePanacea': {
    'zh-CN': '强化秘药',
    'zh-TW': '強化秘藥',
    'en-US': 'Upgrade Panacea',
    'ja-JP': '強化秘薬'
  },

  // ==================== 塔名称 ====================
  'tower.infinity': {
    'zh-CN': '无穷之塔',
    'zh-TW': '無窮之塔',
    'en-US': 'Infinity',
    'ja-JP': '無窮の塔'
  },
  'tower.azure': {
    'zh-CN': '忧蓝之塔',
    'zh-TW': '憂藍之塔',
    'en-US': 'Azure',
    'ja-JP': '藍の塔'
  },
  'tower.crimson': {
    'zh-CN': '业红之塔',
    'zh-TW': '業紅之塔',
    'en-US': 'Crimson',
    'ja-JP': '紅の塔'
  },
  'tower.emerald': {
    'zh-CN': '苍翠之塔',
    'zh-TW': '蒼翠之塔',
    'en-US': 'Emerald',
    'ja-JP': '翠の塔'
  },
  'tower.amber': {
    'zh-CN': '流金之塔',
    'zh-TW': '流金之塔',
    'en-US': 'Amber',
    'ja-JP': '黄の塔'
  },

  // 塔名简称（用于表格显示）
  'tower.infinity.short': {
    'zh-CN': '无穷',
    'zh-TW': '無窮',
    'en-US': 'Infinity',
    'ja-JP': '無窮'
  },
  'tower.azure.short': {
    'zh-CN': '忧蓝',
    'zh-TW': '憂藍',
    'en-US': 'Azure',
    'ja-JP': '藍'
  },
  'tower.crimson.short': {
    'zh-CN': '业红',
    'zh-TW': '業紅',
    'en-US': 'Crimson',
    'ja-JP': '紅'
  },
  'tower.emerald.short': {
    'zh-CN': '苍翠',
    'zh-TW': '蒼翠',
    'en-US': 'Emerald',
    'ja-JP': '翠'
  },
  'tower.amber.short': {
    'zh-CN': '流金',
    'zh-TW': '流金',
    'en-US': 'Amber',
    'ja-JP': '黄'
  },

  // ==================== 洞窟 ====================
  'cave.spaceTime': {
    'zh-CN': '时空洞窟',
    'zh-TW': '時空洞窟',
    'en-US': 'Cave of Space-Time',
    'ja-JP': '時空の洞窟'
  },

  // ==================== 挑战结果 ====================
  'result.victory': {
    'zh-CN': '胜利',
    'zh-TW': '勝利',
    'en-US': 'Victory',
    'ja-JP': '勝利'
  },
  'result.defeat': {
    'zh-CN': '败北',
    'zh-TW': '敗北',
    'en-US': 'Defeat',
    'ja-JP': '敗北'
  },
  'result.challenge': {
    'zh-CN': '挑战',
    'zh-TW': '挑戰',
    'en-US': 'Challenge',
    'ja-JP': '挑戦'
  },

  // ==================== 层级单位 ====================
  'unit.floor': {
    'zh-CN': '层',
    'zh-TW': '層',
    'en-US': 'F',
    'ja-JP': '階層'
  },

  // ==================== 品质/稀有度 ====================
  'rarity.none': {
    'zh-CN': '无',
    'zh-TW': '無',
    'en-US': 'None',
    'ja-JP': '無'
  },
  'rarity.sr': {
    'zh-CN': 'SR',
    'zh-TW': 'SR',
    'en-US': 'SR',
    'ja-JP': 'SR'
  }
};

/**
 * 塔名称映射（英文 -> 语言键名）
 * 用于将服务器返回的英文塔名转换为翻译键
 */
const towerNameMap = {
  'Infinity': 'tower.infinity',
  'Azure': 'tower.azure',
  'Crimson': 'tower.crimson',
  'Emerald': 'tower.emerald',
  'Amber': 'tower.amber'
};

/**
 * 根据塔名获取翻译
 * @param {string} towerName - 塔名（英文）
 * @param {string} lang - 语言代码
 * @returns {string} 翻译后的塔名
 */
function getTowerName(towerName, lang) {
  const key = towerNameMap[towerName];
  if (!key) return towerName;
  const item = glossary[key];
  return item ? (item[lang] || item['zh-CN'] || towerName) : towerName;
}
