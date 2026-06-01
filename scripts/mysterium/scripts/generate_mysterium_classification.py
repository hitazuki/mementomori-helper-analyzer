# 秘仪属性分类报表生成器
#
# 【用途】
#   从游戏 Master 数据中提取所有秘仪的 LR 级属性加成，
#   按属性类型（生命、攻击、魔力…）分组排序后输出 Markdown 报表。
#   同时支持 BattleParameter（战斗属性）和 BaseParameter（腕力/魔力等基础属性）。
#
# 【输出】
#   mysterium/output/mysterium_classification.md
#
# 【使用方法】
#   python mysterium/scripts/generate_mysterium_classification.py
#
# 【可选后续操作】
#   运行 md_to_img.py 将输出的 Markdown 渲染为长图 PNG。
#
# 【前置条件】
#   - data/Master/ 目录下存在以下数据文件：
#     TextResourceZhCnMB.json / CharacterCollectionMB.json /
#     CharacterCollectionLevelMB.json / CharacterMB.json

"""
生成秘仪角色数值分类文?(Mysterium Classification Generator)

说明:
本项目会定期更新游戏数据 (JSON 格式)。该脚本用于从以下四个基础 JSON 数据文件中提?
所有的“秘?(CharacterCollection)”数据，并按它们提供的属性加成类型和数值进行排序分类?

依赖数据文件 (位于 data/Master/ 目录):
- TextResourceZhCnMB.json         : 提供属性名、角色名、秘仪名等所有文本的中文翻译?
- CharacterCollectionMB.json      : 提供秘仪本身的定义及其所需包含的角?ID?
- CharacterCollectionLevelMB.json : 提供秘仪在不同等?(脚本提取最高等?稀有度 CharacterRarityFlags: 16384) 下的属性加成详情?
- CharacterMB.json                : 提供角色的称?子名称映射，用于区分同名不同 ID 的角?(如：科迪(夏日残响))?

数值类型换算规?
通过解析 ChangeParameterType 字段来精确区分数值的实际含义?
- 1 (Addition)                                     : 绝对固定数?(?+1500)
- 2 (AdditionPercent)                              : 百分比加?(脚本自动除以 100，如 200 -> +2%)
- 3 (PlayerLevelConstantMultiplicationAddition)    : 随玩家等级成长的数值加?(脚本转化?+Lv×N)

输出结果:
- 默认输出 Markdown 格式?mysterium/output/mysterium_classification.md
"""

import json
import os

# 动态推导项目目?(假设该脚本存放在 mysterium/scripts/ 目录?
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(script_dir))
data_dir = os.path.join(project_root, "data", "Master")
output_path = os.path.join(project_root, "mysterium", "output", "mysterium_classification.md")

def load_json(name):
    file_path = os.path.join(data_dir, name)
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def generate_classification():
    print("开始加?JSON 数据...")
    texts = load_json("TextResourceZhCnMB.json")
    collections = load_json("CharacterCollectionMB.json")
    levels = load_json("CharacterCollectionLevelMB.json")
    characters = load_json("CharacterMB.json")

    print("正在构建文本映射...")
    # Build string key to text mapping
    text_map = {t["StringKey"]: t["Text"] for t in texts}

    # Map parameter types to Chinese names
    param_names = {
        1: text_map.get("[BattleParameterTypeHp]", "生命"),
        2: text_map.get("[BattleParameterTypeAttackPower]", "攻击力"),
        3: text_map.get("[BattleParameterTypePhysicalDamageRelax]", "物理防御力"),
        4: text_map.get("[BattleParameterTypeMagicDamageRelax]", "魔法防御力"),
        5: text_map.get("[BattleParameterTypeHit]", "命中"),
        6: text_map.get("[BattleParameterTypeAvoidance]", "闪避"),
        7: text_map.get("[BattleParameterTypeCritical]", "暴击"),
        8: text_map.get("[BattleParameterTypeCriticalResist]", "暴击抗性"),
        9: text_map.get("[BattleParameterTypeCriticalDamageEnhance]", "暴击伤害强化"),
        10: text_map.get("[BattleParameterTypePhysicalCriticalDamageRelax]", "物理暴击伤害降低"),
        11: text_map.get("[BattleParameterTypeMagicCriticalDamageRelax]", "魔法暴击伤害降低"),
        12: text_map.get("[BattleParameterTypeDefensePenetration]", "防御穿透"),
        13: text_map.get("[BattleParameterTypeDefense]", "防御力"),
        14: text_map.get("[BattleParameterTypeDamageEnhance]", "物魔防御穿透"),
        15: text_map.get("[BattleParameterTypeDebuffHit]", "弱化效果命中"),
        16: text_map.get("[BattleParameterTypeDebuffResist]", "弱化效果抗性"),
        17: text_map.get("[BattleParameterTypeDamageReflect]", "伤害反弹"),
        18: text_map.get("[BattleParameterTypeHpDrain]", "吸血"),
        19: text_map.get("[BattleParameterTypeSpeed]", "速度"),
    }
    
    # Also add the base parameter names for completeness
    base_param_names = {
        1: "腕力",
        2: "技力",
        3: "魔力",
        4: "耐久力"
    }

    # Map character IDs to exact full names
    char_names = {}
    for char in characters:
        cid = char["Id"]
        name_key = char.get("NameKey")
        sub_key = char.get("Name2Key")
        
        name = text_map.get(name_key, f"Unknown({cid})") if name_key else f"Unknown({cid})"
        
        if sub_key:
            sub_name = text_map.get(sub_key, "")
            if sub_name:
                name = f"{name}({sub_name})"
                
        char_names[cid] = name

    print("正在匹配秘仪与相关角色...")
    # Map collection ID to Collection properties
    col_map = {}
    for c in collections:
        name = text_map.get(c.get("NameKey", ""), "Unknown")
        req_chars = c.get("RequiredCharacterIds", [])
        req_char_names = [char_names.get(cid, f"Unknown({cid})") for cid in req_chars]
        col_map[c["Id"]] = {
            "Name": name,
            "Characters": req_char_names
        }

    # Group by Stat Type
    results = {p: [] for p in list(param_names.values()) + list(base_param_names.values())}

    print("正在解析秘仪的属性加成数据(CharacterRarityFlags: 512)...")
    for d in levels:
        if d.get("CharacterRarityFlags") == 512:
            col_info = col_map.get(d["CollectionId"])
            if not col_info: continue
            
            infos = d.get("BattleParameterChangeInfos") or []
            for p in infos:
                ptype = p["BattleParameterType"]
                ctype = p.get("ChangeParameterType", 1)
                
                # 修正特殊类型的百分比: 暴击伤害强化(9/10/11)、伤害反弹(17)、吸血(18) 在数据中配置为 1(固定值)，但实际是百分比(除以100)
                if ptype in (9, 10, 11, 17, 18) and ctype == 1:
                    ctype = 2
                    
                pname = param_names.get(ptype, f"未知属性({ptype})")
                if pname not in results:
                    results[pname] = []
                results[pname].append({
                    "Name": col_info["Name"],
                    "Characters": col_info["Characters"],
                    "Value": p["Value"],
                    "CType": ctype
                })
                
            base_infos = d.get("BaseParameterChangeInfos") or []
            for p in base_infos:
                ptype = p["BaseParameterType"]
                ctype = p.get("ChangeParameterType", 1)
                pname = base_param_names.get(ptype, f"基础属性({ptype})")
                if pname not in results:
                    results[pname] = []
                results[pname].append({
                    "Name": col_info["Name"],
                    "Characters": col_info["Characters"],
                    "Value": p["Value"],
                    "CType": ctype
                })

    print(f"正在生成结果文件并保存至: {output_path}")
    # Output as markdown
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("# 秘仪角色分类（基础 LR 稀有度加成）\n\n")
        f.write("此分类展示了秘仪在 **LR** 星级状态下（即数据底层的 `CharacterRarityFlags: 512`）所提供的属性加成数值。\n")
        f.write("加成类型包括：百分比加成（如 +5%）、随等级成长的固定数值（如 +Lv×70）以及绝对固定数值（如 +1500）。\n")
        f.write("同一数值类型的秘仪已按加成类型分类，并在各类型内部从大到小排序。同名不同ID的角色已通过后缀称号（如：夏装）区分。\n\n")
        
        # Sort stat categories alphabetically
        sorted_stats = sorted(results.keys())
        for stat in sorted_stats:
            cols = results[stat]
            if not cols: continue
            f.write(f"## {stat}\n")
            # Deduplicate
            unique_cols = {}
            for c in cols:
                k = c["Name"] + "_" + str(c["Value"]) + "_" + str(c["CType"])
                unique_cols[k] = c
            
            # Sort by CType (2:Percent -> 3:LevelScaling -> 1:Flat), then Value descending, then Name ascending
            # CType 2 -> weight 0, CType 3 -> weight 1, CType 1 -> weight 2
            def sort_key(x):
                ct = x["CType"]
                weight = 0 if ct == 2 else (1 if ct == 3 else 2)
                return (weight, -x["Value"], x["Name"])

            sorted_cols = sorted(unique_cols.values(), key=sort_key)
            
            for c in sorted_cols:
                chars_str = ", ".join(c["Characters"])
                val = c["Value"]
                ctype = c["CType"]
                
                if ctype == 2:
                    val_percent = val / 100.0
                    val_str = f"+{int(val_percent)}%" if val_percent.is_integer() else f"+{val_percent}%"
                elif ctype == 3:
                    val_str = f"+Lv×{int(val)}" if val.is_integer() else f"+Lv×{val}"
                else:
                    val_str = f"+{int(val)}" if val.is_integer() else f"+{val}"
                    
                f.write(f"- **{c['Name']}**: {stat} {val_str} (需要: {chars_str})\n")
            f.write("\n")
            
    print("分类生成完毕！")

if __name__ == "__main__":
    generate_classification()
