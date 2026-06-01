# 常驻角色查询工具
#
# 【用途】
#   从 CharacterMB.json 中筛选出 CharacterType == 0 的角色，
#   列出所有"常驻"角色名单（即未出现在命运池追加名单中的角色）。
#   结果同时打印到控制台并写入文件，可用于校验常驻/限定判断逻辑。
#
# 【输出】
#   mysterium/output/perm_chars.txt
#
# 【使用方法】
#   python mysterium/scripts/query_perm_chars.py
#
# 【注意】
#   此脚本仅供辅助校验，排行榜计算脚本已内置限定角色判断逻辑，
#   无需依赖本脚本的输出文件。

import json
import os

data_dir = r'd:\VSCProject\mmth-analyzer\data\Master'
chars = json.load(open(os.path.join(data_dir, 'CharacterMB.json'), encoding='utf-8'))
texts = json.load(open(os.path.join(data_dir, 'TextResourceZhCnMB.json'), encoding='utf-8'))
text_map = {t['StringKey']: t['Text'] for t in texts}

perm_chars = []
for c in chars:
    if c.get('IsIgnore'): continue
    if c.get('CharacterType', 0) == 0:
        cname = text_map.get(c['NameKey'], f"未知({c['Id']})")
        perm_chars.append(cname)

print('常驻角色总数:', len(perm_chars))
print(', '.join(perm_chars))

with open(r'd:\VSCProject\mmth-analyzer\mysterium\output\perm_chars.txt', 'w', encoding='utf-8') as out:
    out.write('常驻角色总数: ' + str(len(perm_chars)) + '\n')
    out.write(', '.join(perm_chars))
