# 角色抽取性价比排行榜生成器
#
# 【用途】
#   读取 docs/mysterium_scoring_template.md 中的评分配置，
#   结合游戏 Master 数据，计算并输出限定角色/抽取方案的性价比排行榜。
#
# 【输出】
#   mysterium/output/character_value_ranking.md
#
# 【使用方法】
#   # 默认使用算法3（推荐）
#   python mysterium/scripts/generate_character_value_ranking.py
#
#   # 指定算法
#   python mysterium/scripts/generate_character_value_ranking.py --algo 1
#   python mysterium/scripts/generate_character_value_ranking.py --algo 2
#   python mysterium/scripts/generate_character_value_ranking.py --algo 3
#
# 【算法说明】
#   --algo 1  独立分摊法：每个秘仪的价值单独切分给各个角色，角色间互不影响
#   --algo 2  成套绑定法：有关联秘仪的角色打包为一个套装，统一计算套装性价比
#   --algo 3  方案枚举法：穷举所有"能点亮至少一个新秘仪"的最小角色组合，
#             自动排除单抽无效方案（如单抽仅作为他人秘仪条件的角色）
#
# 【前置条件】
#   - docs/mysterium_scoring_template.md 中已填写各属性的评分
#   - data/Master/ 目录下存在最新游戏数据

import json
import os
import re
import argparse
import itertools

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
MASTER_DIR = os.path.join(DATA_DIR, 'Master')
MYSTERIUM_DIR = os.path.dirname(os.path.dirname(__file__))

def parse_template():
    template_path = os.path.join(MYSTERIUM_DIR, 'docs', 'mysterium_scoring_template.md')
    if not os.path.exists(template_path):
        template_path = os.path.join(MYSTERIUM_DIR, 'docs', 'mysterium_scoring_template.example.md')
    scores = {}
    with open(template_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('|') and '----' not in line:
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 6:
                    stat_name = parts[1]
                    ctype_str = parts[2]
                    val_str = parts[3]
                    score_str = parts[4]
                    
                    if stat_name == '属性名称' or not stat_name or stat_name.startswith('**'):
                        continue
                        
                    score_m = re.search(r'[\d\.]+', score_str)
                    if score_m:
                        base_score = float(score_m.group(0))
                    else:
                        base_score = 0.0
                        
                    if base_score > 0:
                        # extract numeric from val_str
                        num_m = re.search(r'[\d\.]+', val_str)
                        if num_m:
                            base_val = float(num_m.group(0))
                            scores[(stat_name, ctype_str)] = (base_val, base_score)
    return scores

def load_json(name):
    with open(os.path.join(MASTER_DIR, name), 'r', encoding='utf-8') as f:
        return json.load(f)

def get_char_cost(char_data, is_limited):
    etype = char_data.get('ElementType', 1)
    if not is_limited:
        return 0.0
    
    if etype in (5, 6):
        return 1.75
    else:
        return 1.0

def main():
    parser = argparse.ArgumentParser(description="秘仪性价比计算")
    parser.add_argument('--algo', type=int, choices=[1, 2, 3], default=3,
                        help="1=独立分摊法, 2=成套绑定法, 3=抽取方案枚举法(默认)")
    args = parser.parse_args()

    template_scores = parse_template()
    
    level_cap_base_val, level_cap_score = template_scores.get(('等级上限', '固定数值'), (5.0, 0.0))
    level_cap_bonus_per_char = (5.0 / level_cap_base_val) * level_cap_score if level_cap_base_val > 0 else 0.0
    
    characters = load_json('CharacterMB.json')
    texts = load_json('TextResourceZhCnMB.json')
    collections = load_json('CharacterCollectionMB.json')
    col_levels = load_json('CharacterCollectionLevelMB.json')
    destiny = load_json('GachaDestinyAddCharacterMB.json')
    
    limited_ids = set(d['CharacterId'] for d in destiny)
    
    text_map = {t['StringKey']: t['Text'] for t in texts}
    param_names = {
        1: text_map.get('[BattleParameterTypeHp]', '生命'),
        2: text_map.get('[BattleParameterTypeAttackPower]', '攻击力'),
        3: text_map.get('[BattleParameterTypePhysicalDamageRelax]', '物理防御力'),
        4: text_map.get('[BattleParameterTypeMagicDamageRelax]', '魔法防御力'),
        5: text_map.get('[BattleParameterTypeHit]', '命中'),
        6: text_map.get('[BattleParameterTypeAvoidance]', '闪避'),
        7: text_map.get('[BattleParameterTypeCritical]', '暴击'),
        8: text_map.get('[BattleParameterTypeCriticalResist]', '暴击抗性'),
        9: text_map.get('[BattleParameterTypeCriticalDamageEnhance]', '暴击伤害强化'),
        10: text_map.get('[BattleParameterTypePhysicalCriticalDamageRelax]', '物理暴击伤害降低'),
        11: text_map.get('[BattleParameterTypeMagicCriticalDamageRelax]', '魔法暴击伤害降低'),
        12: text_map.get('[BattleParameterTypeDefensePenetration]', '防御穿透'),
        13: text_map.get('[BattleParameterTypeDefense]', '防御力'),
        14: text_map.get('[BattleParameterTypeDamageEnhance]', '物魔防御穿透'),
        15: text_map.get('[BattleParameterTypeDebuffHit]', '弱化效果命中'),
        16: text_map.get('[BattleParameterTypeDebuffResist]', '弱化效果抗性'),
        17: text_map.get('[BattleParameterTypeDamageReflect]', '伤害反弹'),
        18: text_map.get('[BattleParameterTypeHpDrain]', '吸血'),
        19: text_map.get('[BattleParameterTypeSpeed]', '速度'),
    }
    
    char_map = {}
    for c in characters:
        if c.get('IsIgnore'): continue
        cid = c['Id']
        cname = text_map.get(c['NameKey'], f'未知({cid})')
        cname2 = text_map.get(c.get('Name2Key', ''), '')
        if cname2:
            cname = f'{cname}({cname2})'
        
        is_limited = (cid in limited_ids)
        
        char_map[cid] = {
            'id': cid,
            'name': cname,
            'cost': get_char_cost(c, is_limited),
            'earned_score': 0.0,
            'is_limited': is_limited,
            'ce': 0.0
        }
        
    # Build collection levels mapping at LR (512)
    col_scores = {}
    for cl in col_levels:
        if cl.get('CharacterRarityFlags') == 512:
            cid = cl['CollectionId']
            total_score = 0.0
            infos = cl.get('BattleParameterChangeInfos') or []
            item_details = []
            item_short_details = []
            for p in infos:
                ptype = p['BattleParameterType']
                ctype = p.get('ChangeParameterType', 1)
                raw_val = p['Value']
                
                if ptype in (9, 10, 11, 17, 18) and ctype == 1:
                    ctype = 2
                    
                pname = param_names.get(ptype, f'未知({ptype})')
                
                # Determine ctype_str and evaluated val
                if ctype == 2:
                    ctype_str = '百分比加成'
                    eval_val = raw_val / 100.0
                elif ctype == 3:
                    ctype_str = '随等级成长'
                    eval_val = raw_val
                else:
                    ctype_str = '固定数值'
                    eval_val = raw_val
                    
                key = (pname, ctype_str)
                base_val, base_score = template_scores.get(key, (1.0, 0))
                
                item_score = (eval_val / base_val) * base_score if base_val > 0 else 0
                total_score += item_score
                item_details.append(f'{pname}({ctype_str}): +{eval_val} -> 得分: {item_score:.1f}')
                short_val = f"+{eval_val:g}%" if ctype == 2 else (f"(成长)+{eval_val:g}" if ctype == 3 else f"+{eval_val:g}")
                item_short_details.append(f"{pname}{short_val}")
                
            base_infos = cl.get('BaseParameterChangeInfos') or []
            for p in base_infos:
                ptype = p['BaseParameterType']
                ctype = p.get('ChangeParameterType', 1)
                raw_val = p['Value']
                
                if ptype == 1: pname = '腕力'
                elif ptype == 2: pname = '技力'
                elif ptype == 3: pname = '魔力'
                elif ptype == 4: pname = '耐久力'
                else: pname = f'基础属性({ptype})'
                
                if ctype == 2:
                    ctype_str = '百分比加成'
                    eval_val = raw_val / 100.0
                elif ctype == 3:
                    ctype_str = '随等级成长'
                    eval_val = raw_val
                else:
                    ctype_str = '固定数值'
                    eval_val = raw_val
                    
                key = (pname, ctype_str)
                base_val, base_score = template_scores.get(key, (1.0, 0))
                
                item_score = (eval_val / base_val) * base_score if base_val > 0 else 0
                total_score += item_score
                item_details.append(f'{pname}({ctype_str}): +{eval_val} -> 得分: {item_score:.1f}')
                short_val = f"+{eval_val*100:g}%" if ctype == 2 else (f"(成长)+{eval_val:g}" if ctype == 3 else f"+{eval_val:g}")
                item_short_details.append(f"{pname}{short_val}")
                
            col_scores[cid] = {'score': total_score, 'details': item_details, 'short_details': item_short_details}
            
    col_output = []
    
    # Process collections
    for col in collections:
        if col.get('IsIgnore'): continue
        cid = col['Id']
        cname = text_map.get(col['NameKey'], f'秘仪({cid})')
        req_chars = col.get('RequiredCharacterIds', [])
        
        if cid not in col_scores:
            continue
            
        c_score = col_scores[cid]['score']
        details = col_scores[cid]['details']
        short_details = col_scores[cid]['short_details']
        
        req_char_names = [f"{char_map[rc]['name']}(造价{char_map[rc]['cost']})" for rc in req_chars if rc in char_map]
        col_output.append({
            'name': cname,
            'req_cids': req_chars,
            'req_chars': req_char_names,
            'total_score': c_score,
            'details': details,
            'short_details': short_details,
            'allocations': [],
            'set_name': None
        })
        
    all_plans = []
    limited_chars = []  # 在分支外初始化，消除 IDE 未定义警告（algo 1/2 会重新赋值）
    
    if args.algo == 1:
        # Algorithm 1: Independent sharing
        for col in col_output:
            c_score = col['total_score']
            req_chars = col['req_cids']
            total_cost = 0.0
            for rc in req_chars:
                if rc in char_map:
                    total_cost += char_map[rc]['cost']
            
            if total_cost > 0:
                for rc in req_chars:
                    if rc in char_map and char_map[rc]['cost'] > 0:
                        portion = char_map[rc]['cost'] / total_cost
                        alloc = c_score * portion
                        char_map[rc]['earned_score'] += alloc
                        col['allocations'].append(f"{char_map[rc]['name']}: 分得 {alloc:.1f}")
                        
        limited_chars = [c for c in char_map.values() if c['is_limited'] and c['cost'] > 0]
        for c in limited_chars:
            c['earned_score'] += level_cap_bonus_per_char
            c['ce'] = c['earned_score'] / c['cost']
            
    elif args.algo == 2 or args.algo == 3:
        limited_cids = [cid for cid, c in char_map.items() if c['cost'] > 0]
        
        # Build adjacency list
        adj = {cid: set() for cid in limited_cids}
        for col in col_output:
            req_lims = [rc for rc in col['req_cids'] if rc in adj]
            for i in range(len(req_lims)):
                for j in range(i+1, len(req_lims)):
                    adj[req_lims[i]].add(req_lims[j])
                    adj[req_lims[j]].add(req_lims[i])
                    
        # Find connected components
        visited = set()
        components = []
        for cid in limited_cids:
            if cid not in visited:
                comp = []
                q = [cid]
                visited.add(cid)
                while q:
                    curr = q.pop(0)
                    comp.append(curr)
                    for nxt in adj[curr]:
                        if nxt not in visited:
                            visited.add(nxt)
                            q.append(nxt)
                components.append(comp)
                
        if args.algo == 2:
            # Algorithm 2: Set-based CE calculation (per component)
            for comp in components:
                set_cost = sum(char_map[c]['cost'] for c in comp)
                set_score = level_cap_bonus_per_char * len(comp)
                
                comp_set = set(comp)
                comp_cols = []
                for col in col_output:
                    req_set = set(col['req_cids'])
                    if req_set & comp_set:
                        set_score += col['total_score']
                        comp_cols.append(col)
                        
                set_ce = set_score / set_cost if set_cost > 0 else 0.0
                
                comp_names = [char_map[c]['name'] for c in comp]
                set_name = "套装: [" + ", ".join(comp_names) + "]"
                
                for cid in comp:
                    char_map[cid]['ce'] = set_ce
                    char_map[cid]['earned_score'] = set_ce * char_map[cid]['cost']
                    
                for col in comp_cols:
                    col['set_name'] = set_name
                    for rc in col['req_cids']:
                        if rc in comp_set:
                            col['allocations'].append(f"{char_map[rc]['name']}: 计入套装总池")

            limited_chars = [c for c in char_map.values() if c['is_limited'] and c['cost'] > 0]
            
        elif args.algo == 3:
            # Algorithm 3: Plan Enumeration
            for comp in components:
                comp_set = set(comp)
                comp_cols = []
                for col in col_output:
                    req_lims = set(rc for rc in col['req_cids'] if rc in limited_ids)
                    if req_lims and (req_lims & comp_set):
                        comp_cols.append({
                            'col': col,
                            'req_lims': frozenset(req_lims)
                        })
                        
                if not comp_cols:
                    continue

                unique_plans = {}

                n = len(comp_cols)
                for r in range(1, n + 1):
                    for subset in itertools.combinations(comp_cols, r):
                        plan_chars = frozenset().union(*(item['req_lims'] for item in subset))
                        
                        if plan_chars not in unique_plans:
                            plan_cost = sum(char_map[c]['cost'] for c in plan_chars)
                            plan_score = level_cap_bonus_per_char * len(plan_chars)
                            activated_cols = []
                            activated_details = []
                            if level_cap_bonus_per_char > 0:
                                activated_cols.append(f"等级上限+{(len(plan_chars)*5)}")
                                
                            for item in comp_cols:
                                if item['req_lims'].issubset(plan_chars):
                                    plan_score += item['col']['total_score']
                                    activated_cols.append(item['col']['name'])
                                    activated_details.extend(item['col']['short_details'])
                                    
                            plan_ce = plan_score / plan_cost if plan_cost > 0 else 0
                            
                            unique_plans[plan_chars] = {
                                'chars': plan_chars,
                                'cost': plan_cost,
                                'score': plan_score,
                                'ce': plan_ce,
                                'activated': activated_cols,
                                'details': activated_details
                            }
                
                for p_chars, p_data in unique_plans.items():
                    marginal_ce = p_data['ce']
                    bottleneck_plan_name = "无(整体)"
                    
                    for s_chars, s_data in unique_plans.items():
                        if s_chars < p_chars:
                            cost_diff = p_data['cost'] - s_data['cost']
                            if cost_diff > 0:
                                score_diff = p_data['score'] - s_data['score']
                                ce_diff = score_diff / cost_diff
                                if ce_diff < marginal_ce:
                                    marginal_ce = ce_diff
                                    s_char_names = [char_map[c]['name'] for c in s_chars]
                                    bottleneck_plan_name = " + ".join(s_char_names)
                                    
                    p_data['marginal_ce'] = marginal_ce
                    p_data['bottleneck'] = bottleneck_plan_name
                    
                    char_names = [char_map[c]['name'] for c in p_data['chars']]
                    p_data['plan_name'] = " + ".join(char_names)
                    all_plans.append(p_data)
                    
            all_plans.sort(key=lambda x: x['marginal_ce'], reverse=True)

    if args.algo in (1, 2):
        limited_chars.sort(key=lambda x: x['ce'], reverse=True)
    
    # Output to markdown
    output_path = os.path.join(MYSTERIUM_DIR, 'output', 'character_value_ranking.md')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('# 角色抽取与秘仪性价比分析报告\n\n')
        
        if args.algo == 1:
            algo_desc = "算法1 - 独立分摊法（每个秘仪单独切分，同一角色的不同秘仪分开计算）"
        elif args.algo == 2:
            algo_desc = "算法2 - 成套绑定法（将有关联的角色与秘仪全部打包为一个大套装计算统一性价比）"
        else:
            algo_desc = "算法3 - 方案枚举法（穷举连通网络内的所有最小有效抽取组合）"
            
        f.write(f'> [!NOTE]\n> 当前采用的核算算法：**{algo_desc}**\n\n')
        
        if args.algo in (1, 2):
            f.write('## 1. 角色抽取性价比排行榜\n\n')
            f.write('按照“性价比”从高到低排序，性价比 = 总获取价值 / 抽取成本。\n\n')
            f.write('| 排名 | 角色名称 | 抽取成本 | 总获取价值 | 性价比(每单位成本) |\n')
            f.write('| :---: | :--- | :---: | :---: | :---: |\n')
            for i, c in enumerate(limited_chars, 1):
                f.write(f"| {i} | {c['name']} | {c['cost']} | {c['earned_score']:.1f} | **{c['ce']:.1f}** |\n")
        elif args.algo == 3:
            f.write('## 1. 抽取方案性价比排行榜\n\n')
            f.write('自动滤除了“单抽无法点亮任何新秘仪”的无效方案，列出所有性价比优解。\n')
            f.write('**排序规则**：按照“边际性价比”从高到低排序，以排除“高价值角色强行带飞低价值角色”的虚高方案。\n\n')
            f.write('| 排名 | 抽取方案 | 总成本 | 秘仪总分 | 绝对性价比 | 边际性价比 | 短板分析(基底方案) | 方案解锁的秘仪 | 秘仪加成内容 |\n')
            f.write('| :---: | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- |\n')
            for i, p in enumerate(all_plans, 1):
                activated_str = ", ".join(p['activated'])
                details_str = ", ".join(p['details'])
                bottleneck_str = f"基于 {p['bottleneck']}" if p['bottleneck'] != "无(整体)" else "-"
                f.write(f"| {i} | **{p['plan_name']}** | {p['cost']} | {p['score']:.1f} | {p['ce']:.1f} | **{p['marginal_ce']:.1f}** | {bottleneck_str} | {activated_str} | {details_str} |\n")


if __name__ == '__main__':
    main()
