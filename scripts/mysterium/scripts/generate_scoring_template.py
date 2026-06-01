# 评分模板初始化生成器
#
# 【用途】
#   从游戏 Master 数据自动扫描所有秘仪涉及的属性类型，
#   生成一份带占位符的评分模板，方便用户填入各属性的主观分值。
#
#   ⚠️  注意：此脚本会覆盖已有的评分模板！
#   通常只在初始化或游戏大版本更新后需要重新生成模板。
#   日常使用请直接编辑 docs/mysterium_scoring_template.md。
#
# 【输出】
#   mysterium/docs/mysterium_scoring_template.md（会覆盖现有文件）
#
# 【使用方法】
#   python mysterium/scripts/generate_scoring_template.py
#
# 【后续操作】
#   生成后打开 docs/mysterium_scoring_template.md，
#   将各行末尾的 [填写评分] 替换为你的主观分值（数字），
#   然后运行 generate_character_value_ranking.py 计算排行榜。

import json
import os
from collections import Counter

data_dir = r'd:\VSCProject\mmth-analyzer\data\Master'
texts = json.load(open(os.path.join(data_dir, 'TextResourceZhCnMB.json'), encoding='utf-8'))
levels = json.load(open(os.path.join(data_dir, 'CharacterCollectionLevelMB.json'), encoding='utf-8'))

text_map = {t['StringKey']: t['Text'] for t in texts}
param_names = {
    1: text_map.get('[BattleParameterTypeHp]', '生命'),
    2: text_map.get('[BattleParameterTypeAttackPower]', '攻击�?),
    3: text_map.get('[BattleParameterTypePhysicalDamageRelax]', '物理防御�?),
    4: text_map.get('[BattleParameterTypeMagicDamageRelax]', '魔法防御�?),
    5: text_map.get('[BattleParameterTypeHit]', '命中'),
    6: text_map.get('[BattleParameterTypeAvoidance]', '闪避'),
    7: text_map.get('[BattleParameterTypeCritical]', '暴击'),
    8: text_map.get('[BattleParameterTypeCriticalResist]', '暴击抗�?),
    9: text_map.get('[BattleParameterTypeCriticalDamageEnhance]', '暴击伤害强化'),
    10: text_map.get('[BattleParameterTypePhysicalCriticalDamageRelax]', '物理暴击伤害降低'),
    11: text_map.get('[BattleParameterTypeMagicCriticalDamageRelax]', '魔法暴击伤害降低'),
    12: text_map.get('[BattleParameterTypeDefensePenetration]', '防御穿�?),
    13: text_map.get('[BattleParameterTypeDefense]', '防御�?),
    14: text_map.get('[BattleParameterTypeDamageEnhance]', '物魔防御穿�?),
    15: text_map.get('[BattleParameterTypeDebuffHit]', '弱化效果命中'),
    16: text_map.get('[BattleParameterTypeDebuffResist]', '弱化效果抗�?),
    17: text_map.get('[BattleParameterTypeDamageReflect]', '伤害反弹'),
    18: text_map.get('[BattleParameterTypeHpDrain]', '吸血'),
    19: text_map.get('[BattleParameterTypeSpeed]', '速度'),
}

stats_map = {}
for d in levels:
    if d.get('CharacterRarityFlags') == 512:
        infos = d.get('BattleParameterChangeInfos')
        if infos:
            for p in infos:
                ptype = p['BattleParameterType']
                ctype = p.get('ChangeParameterType', 1)
                val = p['Value']
                
                if ptype in (9, 10, 11, 17, 18) and ctype == 1:
                    ctype = 2
                    
                pname = param_names.get(ptype, f'未知({ptype})')
                key = (pname, ctype)
                
                if key not in stats_map:
                    stats_map[key] = []
                stats_map[key].append(val)

output_lines = ['# 秘仪属性评分模�?, '', '请在下面 `[填写评分]` 处为您认为的“基准数值”打分。后续工具将根据您的基准分，对其他不同数值进行等比缩放计算�?, '']
output_lines.append('| 属性名�?| 加成类型 | 基准数�?(最常见) | 评分 (填入数字) |')
output_lines.append('| :--- | :--- | :--- | :--- |')

for (pname, ctype), values in sorted(stats_map.items()):
    most_common_val = Counter(values).most_common(1)[0][0]
    
    if ctype == 2:
        val_percent = most_common_val / 100.0
        val_str = f'+{int(val_percent)}%' if val_percent.is_integer() else f'+{val_percent}%'
        ctype_str = '百分比加�?
    elif ctype == 3:
        val_str = f'+Lv×{int(most_common_val)}' if most_common_val.is_integer() else f'+Lv×{most_common_val}'
        ctype_str = '随等级成�?
    else:
        val_str = f'+{int(most_common_val)}' if most_common_val.is_integer() else f'+{most_common_val}'
        ctype_str = '固定数�?
        
    output_lines.append(f'| {pname} | {ctype_str} | {val_str} | [填写评分] |')

with open(r'd:\VSCProject\mmth-analyzer\mysterium\docs\mysterium_scoring_template.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines))
print('Template created.')
