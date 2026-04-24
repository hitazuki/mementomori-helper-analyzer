/**
 * 来源翻译模块
 * 根据 source_id 翻译物品变动来源名称
 */
const SourceI18n = {
  // source_id -> { alias, translations: { lang: text } }
  mapping: {},

  // 是否已初始化
  initialized: false,

  /**
   * 初始化，从 API 加载来源映射
   */
  async init() {
    try {
      const res = await fetch('/api/sources');
      this.mapping = await res.json();
      this.initialized = true;
    } catch (e) {
      console.error('Failed to load source mappings:', e);
      this.mapping = {};
    }
  },

  /**
   * 翻译来源名称
   * @param {string} sourceKey - 来源 key（可能是 "id:140" 或原始字符串）
   * @param {string} lang - 目标语言（可选，默认使用 I18n 当前语言）
   * @returns {string} 翻译后的名称
   */
  translate(sourceKey, lang) {
    if (!sourceKey) return sourceKey;

    // 默认使用 I18n 当前语言
    if (!lang && typeof I18n !== 'undefined') {
      lang = I18n.getLanguage();
    }
    if (!lang) lang = 'zh-CN';

    // "none" 显示为 "未知"
    if (sourceKey === 'none') {
      const unknownTexts = {
        'zh-CN': '未知',
        'zh-TW': '未知',
        'en-US': 'Unknown',
        'ja-JP': '不明',
        'ko-KR': '알 수 없음'
      };
      return unknownTexts[lang] || 'Unknown';
    }

    // 自动判断：key 格式为 "id:XXX" 时翻译
    if (sourceKey.startsWith('id:')) {
      const id = sourceKey.substring(3);
      const entry = this.mapping[id];
      if (entry) {
        if (entry.translations && entry.translations[lang]) {
          return entry.translations[lang];
        }
        if (entry.alias) return entry.alias;
      }
    }

    // 非 "id:XXX" 格式：直接返回原始内容
    return sourceKey;
  },

  /**
   * 批量翻译来源名称
   * @param {Array<string>} sourceKeys - 来源 key 数组
   * @param {string} lang - 目标语言
   * @returns {Array<string>} 翻译后的名称数组
   */
  translateAll(sourceKeys, lang) {
    return sourceKeys.map(key => this.translate(key, lang));
  },

  /**
   * 获取来源的 alias
   * @param {string} sourceKey - 来源 key
   * @returns {string} alias 或原始 key
   */
  getAlias(sourceKey) {
    if (!sourceKey) return sourceKey;

    if (sourceKey.startsWith('id:')) {
      const id = sourceKey.substring(3);
      const entry = this.mapping[id];
      if (entry && entry.alias) return entry.alias;
    }

    return sourceKey;
  }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SourceI18n;
}
