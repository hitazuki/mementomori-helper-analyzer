/**
 * i18n 核心模块 - 语言管理器
 * 支持简体中文、繁体中文、英文
 */
const I18n = {
  supportedLanguages: ['zh-CN', 'zh-TW', 'en-US'],
  currentLang: 'zh-CN',

  // 存储键名
  storageKey: 'mmth-lang',

  /**
   * 初始化语言设置
   * 从 localStorage 读取用户偏好，若无则使用浏览器语言或默认中文
   */
  init() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved && this.supportedLanguages.includes(saved)) {
      this.currentLang = saved;
    } else {
      // 尝试匹配浏览器语言
      const browserLang = navigator.language || navigator.userLanguage;
      if (browserLang.startsWith('zh')) {
        this.currentLang = browserLang === 'zh-TW' || browserLang === 'zh-HK' ? 'zh-TW' : 'zh-CN';
      } else if (browserLang.startsWith('en')) {
        this.currentLang = 'en-US';
      }
    }
    return this.currentLang;
  },

  /**
   * 切换语言
   * @param {string} lang - 语言代码
   */
  setLanguage(lang) {
    if (!this.supportedLanguages.includes(lang)) return;
    if (lang === this.currentLang) return;

    localStorage.setItem(this.storageKey, lang);

    // 刷新页面以应用新语言
    window.location.reload();
  },

  /**
   * 翻译 UI 文本
   * @param {string} key - 翻译键名
   * @param {object} params - 可选的插值参数
   * @returns {string} 翻译后的文本
   */
  t(key, params = null) {
    const dict = translations[this.currentLang] || translations['zh-CN'];
    let text = dict[key] || key;

    // 处理插值参数
    if (params) {
      Object.keys(params).forEach(k => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
      });
    }

    return text;
  },

  /**
   * 翻译游戏专有名词
   * @param {string} key - 名词键名
   * @returns {string} 翻译后的名词
   */
  glossary(key) {
    const item = glossary[key];
    if (!item) return key;
    return item[this.currentLang] || item['zh-CN'] || key;
  },

  /**
   * 根据原文反查并翻译专有名词
   * 用于翻译服务器返回的原始数据
   * @param {string} text - 原始文本
   * @returns {string} 翻译后的文本
   */
  translateText(text) {
    if (!text) return text;

    let result = text;

    // 遍历对照表，替换所有匹配的专有名词
    Object.keys(glossary).forEach(key => {
      const item = glossary[key];
      if (!item) return;

      // 检查所有语言版本是否在文本中
      Object.values(item).forEach(originalText => {
        if (result.includes(originalText)) {
          result = result.replace(new RegExp(originalText, 'g'), item[this.currentLang] || originalText);
        }
      });
    });

    return result;
  },

  /**
   * 获取当前语言
   * @returns {string} 当前语言代码
   */
  getLanguage() {
    return this.currentLang;
  },

  /**
   * 获取语言显示名称
   * @param {string} lang - 语言代码
   * @returns {string} 语言显示名称
   */
  getLanguageName(lang) {
    const names = {
      'zh-CN': '简体中文',
      'zh-TW': '繁體中文',
      'en-US': 'English'
    };
    return names[lang] || lang;
  }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = I18n;
}
