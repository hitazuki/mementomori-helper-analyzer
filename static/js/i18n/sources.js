/**
 * Source translation module.
 * Translates item/diamond source keys such as "id:140".
 */
const SourceI18n = {
  // source_id -> { alias, translations: { lang: text } }
  mapping: {},

  initialized: false,

  rewardMissionFactor: 1000000,

  rewardMissionLabels: {
    111: {
      alias: "Get Guild Mission Reward",
      translations: {
        'zh-CN': '领取 Guild 任务奖励',
        'zh-TW': '領取 Guild 任務獎勵',
        'en-US': 'Get Guild Mission Reward',
        'ja-JP': 'Guild ミッション報酬を受け取る',
        'ko-KR': 'Guild 미션 보상을 수령합니다'
      }
    },
    23214: {
      alias: "Get Daily Mission Reward",
      translations: {
        'zh-CN': '领取 Daily 任务奖励',
        'zh-TW': '領取 Daily 任務獎勵',
        'en-US': 'Get Daily Mission Reward',
        'ja-JP': 'Daily ミッション報酬を受け取る',
        'ko-KR': 'Daily 미션 보상을 수령합니다'
      }
    },
    23215: {
      alias: "Get Weekly Mission Reward",
      translations: {
        'zh-CN': '领取 Weekly 任务奖励',
        'zh-TW': '領取 Weekly 任務獎勵',
        'en-US': 'Get Weekly Mission Reward',
        'ja-JP': 'Weekly ミッション報酬を受け取る',
        'ko-KR': 'Weekly 미션 보상을 수령합니다'
      }
    }
  },

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

  gachaPrefixes: ['Gacha ', '抽卡 ', 'ガチャ ', '가챠 '],
  openPrefixes: ['Open ', '開放 ', '開啟 ', '開啓 ', '开启 ', '開く ', '열기 ', '오픈 '],

  parseCompositeDynamic(sourceKey) {
    if (!sourceKey) return null;
    
    for (const prefix of this.gachaPrefixes) {
      if (sourceKey.startsWith(prefix)) {
        return { type: '100005', suffix: sourceKey.substring(prefix.length) };
      }
    }
    
    for (const prefix of this.openPrefixes) {
      if (sourceKey.startsWith(prefix)) {
        return { type: '100004', suffix: sourceKey.substring(prefix.length) };
      }
    }
    
    return null;
  },

  /**
   * Translate source name.
   * @param {string} sourceKey - Source key, usually "id:140" or raw text.
   * @param {string} lang - Target language; defaults to I18n current language.
   * @returns {string}
   */
  translate(sourceKey, lang) {
    if (!sourceKey) return sourceKey;

    if (!lang && typeof I18n !== 'undefined') {
      lang = I18n.getLanguage();
    }
    if (!lang) lang = 'zh-CN';

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

    if (sourceKey.startsWith('id:')) {
      const id = sourceKey.substring(3);

      const compositeText = this.translateRewardMissionComposite(id, lang);
      if (compositeText) return compositeText;

      const entry = this.mapping[id];
      if (entry) {
        if (entry.translations && entry.translations[lang]) {
          return entry.translations[lang];
        }
        if (entry.alias) return entry.alias;
      }
    } else {
      const dynamic = this.parseCompositeDynamic(sourceKey);
      if (dynamic) {
        let translatedPrefix = '';
        const entry = this.mapping[dynamic.type];
        if (entry && entry.translations && entry.translations[lang]) {
          translatedPrefix = entry.translations[lang] + ' ';
        } else if (entry && entry.alias) {
          translatedPrefix = entry.alias + ' ';
        } else {
          translatedPrefix = dynamic.type === '100005' ? 'Gacha ' : 'Open ';
        }
        return translatedPrefix + dynamic.suffix;
      }
    }

    return sourceKey;
  },

  translateAll(sourceKeys, lang) {
    return sourceKeys.map(key => this.translate(key, lang));
  },

  getAlias(sourceKey) {
    if (!sourceKey) return sourceKey;

    if (sourceKey.startsWith('id:')) {
      const id = sourceKey.substring(3);

      const composite = this.parseRewardMissionComposite(id);
      if (composite) {
        return composite.definition.alias;
      }

      const entry = this.mapping[id];
      if (entry && entry.alias) return entry.alias;
    } else {
      const dynamic = this.parseCompositeDynamic(sourceKey);
      if (dynamic) {
        let prefixAlias = dynamic.type === '100005' ? 'Gacha ' : 'Open ';
        const entry = this.mapping[dynamic.type];
        if (entry && entry.alias) prefixAlias = entry.alias + ' ';
        return prefixAlias + dynamic.suffix;
      }
    }

    return sourceKey;
  },

  hasI18n(sourceKey) {
    if (!sourceKey) return false;
    if (sourceKey === 'none') return true;
    if (sourceKey.startsWith('id:')) {
        const id = sourceKey.substring(3);
        if (this.mapping[id] || this.parseRewardMissionComposite(id)) return true;
    }
    if (this.parseCompositeDynamic(sourceKey)) return true;
    return false;
  },

  parseRewardMissionComposite(id) {
    const numericId = Number(id);
    if (!Number.isSafeInteger(numericId) || numericId < this.rewardMissionFactor) {
      return null;
    }

    const textResourceId = Math.floor(numericId / this.rewardMissionFactor);
    const amount = numericId % this.rewardMissionFactor;
    const definition = this.rewardMissionLabels[textResourceId];
    if (!definition || amount < 0) return null;

    return { textResourceId, amount, definition };
  },

  translateRewardMissionComposite(id, lang) {
    const composite = this.parseRewardMissionComposite(id);
    if (!composite) return '';

    const template = composite.definition.translations[lang]
      || composite.definition.translations['en-US']
      || composite.definition.alias;

    return template;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SourceI18n;
}
