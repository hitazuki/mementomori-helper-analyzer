# 游戏 Master JSON 数据字典

本文档记录了目前已分析和验证过的 `data/Master/` 目录下核心 JSON 文件的结构及其主要字段含义，用于指导后续的数据挖掘和工具开发。

## 1. CharacterMB.json (角色基础数据)
包含了游戏中所有角色的基础信息及设定。

- **`Id`** (int): 角色唯一标识符。
- **`NameKey`** (string): 角色本名对应的文本 Key（需在 TextResource 翻译表中查找）。
- **`Name2Key`** (string): 角色称号/后缀对应的文本 Key，如“夏日残响”、“傲雪花誓”。原版常驻角色通常为空。
- **`CharacterType`** (int): **角色卡池定位（非常重要）**
  - `0`: 原皮（角色的初始版本/基础形态）。
  - `1`: 限定魔女 / 特殊独立机制角色（如福尔蒂娜、A.A.）。
  - `2`: 季节限定 / 节日换装角色 / 剧情 SP 衍生角色（如夏装科迪、暗黑伊利亚）。
- **`ElementType`** (int): 角色元素属性。
  - `1`: 蓝 (水/苍)
  - `2`: 红 (火/绯)
  - `3`: 绿 (风/翠)
  - `4`: 黄 (地/黄)
  - `5`: 光
  - `6`: 暗
- **`StartTimeFixJST` / `EndTimeFixJST`** (string): 角色的生效或卡池首次开放时间。常驻角色通常为 `2020-01-01`。
- **`RequireFragmentCount`** (int): 解锁该角色所需的碎片数量。
- **`BaseParameterGrossCoefficient`** (int): 角色基础属性面板的综合倍率。

---

## 2. TextResourceZhCnMB.json (本地化文本资源)
游戏的中文文本词典，所有的 `XxxKey` 字段最终都在这里被翻译为人类可读的文字。

- **`StringKey`** (string): 文本的唯一标识符（如 `[BattleParameterTypeHp]`、`[ElementTypeBlue]`）。
- **`Text`** (string): 具体的中文译文（如 `生命`、`蓝`）。

---

## 3. CharacterCollectionMB.json (秘仪定义)
定义了游戏中的“秘仪（图鉴共鸣）”组合。

- **`Id`** (int): 秘仪的唯一标识符。
- **`NameKey`** (string): 秘仪名称的文本 Key。
- **`RequiredCharacterIds`** (array): 激活或升级该秘仪所必须拥有的相关角色 ID 列表。

---

## 4. CharacterCollectionLevelMB.json (秘仪等级及加成数据)
记录了秘仪在满足不同角色稀有度等级要求时，所能提供的确切数值加成。

- **`CollectionId`** (int): 对应 `CharacterCollectionMB.json` 中的秘仪 ID。
- **`CharacterRarityFlags`** (int): 达成当前加成所需的角色星级/稀有度条件。该字段是一个基于 2 的幂的位掩码（Bitmask），换算规则如下：
  - `1`: N, `2`: R, `4`: R+, `8`: SR, `16`: SR+, `32`: SSR, `64`: SSR+
  - `128`: UR, `256`: UR+
  - `512`: LR, `1024`: LR+1, `2048`: LR+2, `4096`: LR+3, `8192`: LR+4, `16384`: LR+5... 以此类推。
- **`BattleParameterChangeInfos`** (array): 达标后提供的属性加成列表。
  - **`BattleParameterType`** (int): 增加的属性类型（如 `1`=生命, `2`=攻击力, `5`=命中, `17`=伤害反弹, `18`=吸血）。
  - **`ChangeParameterType`** (int): **加成的数值计算方式**
    - `1`: 绝对固定值（如 +1500）。*注意：部分进阶属性（如 暴击伤害强化(9)、爆伤减免(10/11)、伤害反弹(17)、吸血(18)）在底层配置为 1，但实际逻辑中为百分比（每 100 点 = 1%）。*
    - `2`: 百分比加成（需除以 100 展示，如 200 = 2%）。
    - `3`: 随玩家等级成长的数值加成（格式为 +Lv × N）。
  - **`Value`** (float/int): 加成数值的具体大小。

---

## 5. GachaCaseMB.json (卡池排期数据)
记录了历史至今所有的抽卡卡池活动，可用于数据挖掘计算角色复刻周期。

- **`Id`** (int): 卡池唯一标识符。
- **`StartTimeFixJST` / `EndTimeFixJST`** (string): 卡池绝对的开放与结束时间（日本标准时间）。由于缺乏周期循环标识，季节和限定角色的复刻频率需通过比对此时间戳来倒推统计。
- **`GachaCategoryType` / `GachaCaseFlags`** (int): 卡池的内部归类与逻辑标签，用于区分常驻池、精选池、复刻池等。

---

## 6. LimitedEventMB.json (限定活动排期数据)
记录了特殊时间段开放的限定活动排期。

- **`Id`** (int): 活动 ID。
- **`LimitedEventType`** (int): 运营活动分类。
- **`StartTime` / `EndTime`** (string): 活动开放和结束的具体时间戳。

---

## 7. GachaDestinyAddCharacterMB.json (命运扭蛋卡池数据)
记录了在“命运扭蛋”中可供玩家选择的限定角色名单。

- **`CharacterId`** (int): 限定角色 ID。
- **数据挖掘应用**：由于角色基础数据中缺乏直接标明“是否为限定角色”的布尔值字段，目前分析脚本中通过**判断角色的 `Id` 是否存在于此文件中**，来精确区分其是否为限定角色（所有常驻角色均不会出现在此列表中）。
