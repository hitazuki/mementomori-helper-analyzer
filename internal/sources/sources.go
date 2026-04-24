package sources

import "fmt"

// SourceID represents a unique identifier for a diamond source.
// - 0: Unknown/unmatched source
// - 1-99999: Game TextResource IDs
// - 100000+: Helper custom IDs
type SourceID int

// SourceTranslation represents a source with its translations
type SourceTranslation struct {
	Alias        string            `json:"alias"`
	Translations map[string]string `json:"translations"`
}

// Game built-in source IDs from TextResource
const (
	SourceIDFountainOfPrayers SourceID = 140   // Fountain of Prayers
	SourceIDLoginBonus        SourceID = 719   // Login Bonus (签到奖励)
	SourceIDPresentsBox       SourceID = 21308 // Presents Box
	SourceIDMonthlyBoost      SourceID = 21332 // Monthly Boost
	SourceIDTotalLogins       SourceID = 3331  // Total Logins
	SourceIDWorldClears       SourceID = 23277 // World Player Clears
)

// Mission group IDs from TextResource
const (
	MissionGroupDailyID  SourceID = 23214
	MissionGroupWeeklyID SourceID = 23215
	MissionGroupMainID   SourceID = 23213
)

// Helper custom source IDs
const (
	SourceIDAutoBuyStore    SourceID = 100002
	SourceIDExpectedValue   SourceID = 100003
	SourceIDMissionsClaimed SourceID = 100004
	SourceIDGacha           SourceID = 100005
	SourceIDOpen            SourceID = 100006
	SourceIDTowerInfinity   SourceID = 100007
	SourceIDTempleIllusions SourceID = 100008
)

// sourceDefinitions contains all source translations
// key: source ID, value: alias + translations by language code
var sourceDefinitions = map[SourceID]SourceTranslation{
	SourceIDFountainOfPrayers: {
		Alias: "Fountain of Prayers",
		Translations: map[string]string{
			"en-US": "Fountain of Prayers:",
			"zh-TW": "祈願之泉:",
			"zh-CN": "祈愿之泉:",
			"ja-JP": "祈りの泉:",
			"ko-KR": "기원의 샘:",
		},
	},
	SourceIDPresentsBox: {
		Alias: "Presents Box",
		Translations: map[string]string{
			"en-US": "Presents Box",
			"zh-TW": "禮物箱",
			"zh-CN": "礼物箱",
			"ja-JP": "プレゼントボックス",
			"ko-KR": "선물 상자",
		},
	},
	SourceIDMonthlyBoost: {
		Alias: "Monthly Boost",
		Translations: map[string]string{
			"en-US": "Monthly Boost",
			"zh-TW": "每月強化組合包",
			"zh-CN": "每月强化组合包",
			"ja-JP": "月間ブースト",
			"ko-KR": "월간 부스트",
		},
	},
	SourceIDTotalLogins: {
		Alias: "Total Logins This Month",
		Translations: map[string]string{
			"en-US": "Total Logins This Month:",
			"zh-TW": "本月累計簽到天數：",
			"zh-CN": "本月累计签到天数：",
			"ja-JP": "今月の合計ログイン日数：",
			"ko-KR": "이번 달 보상 수령:",
		},
	},
	SourceIDWorldClears: {
		Alias: "World Player Clears",
		Translations: map[string]string{
			"en-US": "A player in your World clears",
			"zh-TW": "本世界首次有玩家",
			"zh-CN": "本世界首次有玩家",
			"ja-JP": "ワールド内のプレイヤーが初めて",
			"ko-KR": "월드 내 플레이어가 최초로",
		},
	},
	MissionGroupDailyID: {
		Alias: "Daily Mission Reward",
		Translations: map[string]string{
			"en-US": "Get Daily Reward",
			"zh-TW": "领取 Daily 奖励",
			"zh-CN": "领取 Daily 奖励",
			"ja-JP": "Daily の報酬",
			"ko-KR": "일일 보상",
		},
	},
	MissionGroupWeeklyID: {
		Alias: "Weekly Mission Reward",
		Translations: map[string]string{
			"en-US": "Get Weekly Reward",
			"zh-TW": "领取 Weekly 奖励",
			"zh-CN": "领取 Weekly 奖励",
			"ja-JP": "Weekly の報酬",
			"ko-KR": "주간 보상",
		},
	},
	MissionGroupMainID: {
		Alias: "Main Mission Reward",
		Translations: map[string]string{
			"en-US": "Get Main Reward",
			"zh-TW": "领取 Main 奖励",
			"zh-CN": "领取 Main 奖励",
			"ja-JP": "Main の報酬",
			"ko-KR": "메인 보상",
		},
	},
	SourceIDLoginBonus: {
		Alias: "Login Bonus",
		Translations: map[string]string{
			"en-US": "Login Bonus",
			"zh-TW": "簽到獎勵",
			"zh-CN": "签到奖励",
			"ja-JP": "ログインボーナス",
			"ko-KR": "로그인 보너스",
		},
	},
	SourceIDAutoBuyStore: {
		Alias: "Auto Buy Store Items",
		Translations: map[string]string{
			"en-US": "Auto Buy Store Items",
			"zh-TW": "自動購買商城物品",
			"zh-CN": "自动购买商城物品",
			"ja-JP": "自動購入ストアアイテム",
			"ko-KR": "자동으로 상점 아이템 구매",
		},
	},
	SourceIDExpectedValue: {
		Alias: "Expected Value Below 20",
		Translations: map[string]string{
			"en-US": "Expected Diamond Value",
			"zh-TW": "當前任務的鑽石數量期望值",
			"zh-CN": "当前任务的钻石数量期望值",
			"ja-JP": "現在のタスクのダイヤの期待値",
			"ko-KR": "현재 작업의 다이아몬드 예상 값",
		},
	},
	SourceIDMissionsClaimed: {
		Alias: "Missions Claim All",
		Translations: map[string]string{
			"en-US": "Missions Claim All",
			"zh-TW": "剩餘挑戰次數不足",
			"zh-CN": "剩余挑战次数不足",
			"ja-JP": "残り挑戦回数がありません",
			"ko-KR": "시공의 동굴 완료",
		},
	},
	SourceIDTowerInfinity: {
		Alias: "Tower of Infinity",
		Translations: map[string]string{
			"en-US": "Tower of Infinity:",
			"zh-TW": "無窮之塔:",
			"zh-CN": "无穷之塔:",
			"ja-JP": "無窮の塔:",
			"ko-KR": "무한의 탑:",
		},
	},
	SourceIDTempleIllusions: {
		Alias: "Temple of Illusions",
		Translations: map[string]string{
			"en-US": "Temple of Illusions",
			"zh-TW": "幻影神殿",
			"zh-CN": "幻影神殿",
			"ja-JP": "幻影の神殿",
			"ko-KR": "환영의 신전",
		},
	},
}

// GetAll returns all source definitions for API response
func GetAll() map[string]SourceTranslation {
	result := make(map[string]SourceTranslation)
	for id, trans := range sourceDefinitions {
		result[fmt.Sprintf("%d", id)] = trans
	}
	return result
}

// Translate returns the translated text for a source ID
func Translate(id int, lang string) string {
	sid := SourceID(id)
	if trans, ok := sourceDefinitions[sid]; ok {
		if text, ok := trans.Translations[lang]; ok {
			return text
		}
		return trans.Alias
	}
	return ""
}

// GetAlias returns the alias for a source ID
func GetAlias(id int) string {
	sid := SourceID(id)
	if trans, ok := sourceDefinitions[sid]; ok {
		return trans.Alias
	}
	return ""
}
