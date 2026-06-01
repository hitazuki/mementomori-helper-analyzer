# Markdown 长图生成器
#
# 【用途】
#   将指定的 .md 文件渲染为带样式的 HTML，
#   再截图为 PNG 长图，并自动裁剪底部多余空白。
#
# 【支持的输出文件】
#   mysterium/output/mysterium_classification.png
#   mysterium/output/character_value_ranking.png
#
# 【使用方法】
#   # 生成全部图片
#   python mysterium/scripts/md_to_img.py
#
#   # 仅生成指定图片（可选值：classification / ranking）
#   python mysterium/scripts/md_to_img.py classification
#   python mysterium/scripts/md_to_img.py ranking
#
# 【前置条件】
#   - 需先运行对应的生成脚本以产生 .md 源文件
#   - 需安装依赖：pip install markdown html2image Pillow
#   - html2image 依赖 Chrome/Chromium 浏览器，请确保已安装

import markdown
from html2image import Html2Image
from PIL import Image, ImageChops
import os
import sys

OUTPUT_DIR = r"d:\VSCProject\mmth-analyzer\mysterium\output"

# ──────────────────────────────────────────────
# 公共 CSS 样式
# ──────────────────────────────────────────────
BASE_CSS = """
    html, body {
        background-color: #f8f9fa;
        min-height: 100vh;
        margin: 0;
    }
    body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                     "Helvetica Neue", Arial, "Noto Sans SC", sans-serif;
        line-height: 1.5;
        padding: 40px;
        color: #333;
        width: 100%;
        margin: 0;
        zoom: 0.75;
    }
    h1 {
        color: #2c3e50;
        border-bottom: 2px solid #3498db;
        padding-bottom: 10px;
    }
    h2 {
        color: #e74c3c;
        margin-top: 30px;
        border-bottom: 1px solid #ddd;
        padding-bottom: 5px;
    }
    h3 {
        color: #8e44ad;
        margin-top: 20px;
    }
    ul {
        padding-left: 20px;
    }
    li {
        margin-bottom: 8px;
    }
    strong {
        color: #2980b9;
    }
    p {
        margin-bottom: 15px;
    }
    /* 表格样式 */
    table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 20px;
        font-size: 0.9em;
    }
    th {
        background-color: #2c3e50;
        color: #fff;
        padding: 6px 8px;
        text-align: left;
        border: 1px solid #bdc3c7;
    }
    td {
        padding: 5px 8px;
        border: 1px solid #ddd;
        vertical-align: top;
    }
    tr:nth-child(even) td {
        background-color: #ecf0f1;
    }
    tr:nth-child(odd) td {
        background-color: #fff;
    }
    /* GitHub 风格 blockquote / Alert */
    blockquote {
        margin: 16px 0;
        padding: 12px 16px;
        border-left: 4px solid #3498db;
        background-color: #eaf4fb;
        color: #2c3e50;
        border-radius: 4px;
    }
    blockquote p {
        margin: 0;
    }
"""


def build_html(md_text: str, width: int = 900) -> str:
    """将 Markdown 文本转换为完整 HTML 字符串。"""
    # 启用 tables 扩展以支持 GFM 表格
    html_content = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code"],
    )
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body {{ width: {width}px; }}
{BASE_CSS}
</style>
</head>
<body>
<div id="content">
{html_content}
</div>
</body>
</html>"""


def render_md_to_png(md_path: str, img_name: str, page_width: int = 980) -> None:
    """
    将 Markdown 文件渲染为 PNG 长图。

    参数：
        md_path     - Markdown 文件的绝对路径
        img_name    - 输出图片文件名（仅文件名，不含路径）
        page_width  - 截图宽度（像素）
    """
    img_path = os.path.join(OUTPUT_DIR, img_name)

    if not os.path.exists(md_path):
        print(f"[跳过] 找不到 Markdown 文件：{md_path}")
        return

    print(f"[开始] 处理：{os.path.basename(md_path)} -> {img_name}")

    with open(md_path, "r", encoding="utf-8") as f:
        text = f.read()

    full_html = build_html(text, width=page_width - 80)  # 减去 padding

    # 使用 16000 高度，避免 Chrome 超过 16384px 时出现内存溢出和花屏噪点
    hti = Html2Image(output_path=OUTPUT_DIR, size=(page_width, 16000))
    try:
        hti.screenshot(html_str=full_html, save_as=img_name)
        print(f"  截图完成，正在裁剪空白...")

        img = Image.open(img_path)
        # 使用左上角空白区域（由于有 padding:40px，这里必定是背景色）作为参考
        bg_color = img.getpixel((10, 10))
        if not isinstance(bg_color, tuple):
            raise RuntimeError("图像必须是 RGB 或 RGBA 格式")
        
        pixels = img.load()
        if pixels is None:
            raise RuntimeError("无法加载图像像素数据")
            
        new_bottom = img.height
        # 从底部向上扫描，每次跳过 10 行以加快速度
        for y in range(img.height - 1, -1, -10):
            has_content = False
            # 避开右侧 40px 防止滚动条干扰
            for x in range(0, img.width - 40, 20):
                p = pixels[x, y]
                if not isinstance(p, tuple) or len(p) < 3:
                    continue
                # 计算与自定义背景色和纯白色的色差（因为 Chrome 可能以纯白填充下方空白）
                dist1 = abs(p[0] - bg_color[0]) + abs(p[1] - bg_color[1]) + abs(p[2] - bg_color[2])
                dist2 = abs(p[0] - 255) + abs(p[1] - 255) + abs(p[2] - 255)
                if dist1 > 10 and dist2 > 10:
                    has_content = True
                    break
            
            if has_content:
                new_bottom = min(img.height, y + 60)
                break
                
        if new_bottom < img.height:
            img_cropped = img.crop((0, 0, img.width, new_bottom))
            img_cropped.save(img_path)
            print(f"  [OK] 完成：{img.width}x{new_bottom}px -> {img_path}")
        else:
            print(f"  [OK] 无需裁剪：{img.width}x{img.height}px -> {img_path}")

    except Exception as e:
        print(f"  [ERROR] 生成失败：{e}")


# ──────────────────────────────────────────────
# 任务定义
# ──────────────────────────────────────────────
TASKS = {
    "classification": {
        "md_path": os.path.join(OUTPUT_DIR, "mysterium_classification.md"),
        "img_name": "mysterium_classification.png",
    },
    "ranking": {
        "md_path": os.path.join(OUTPUT_DIR, "character_value_ranking.md"),
        "img_name": "character_value_ranking.png",
        "page_width": 1200,  # 表格较宽，使用更大的页面宽度
    },
}


def main() -> None:
    # 解析命令行参数，决定执行哪些任务
    args = sys.argv[1:]
    if args:
        selected = []
        for arg in args:
            if arg in TASKS:
                selected.append(arg)
            else:
                print(f"未知任务名称：{arg}，可选值：{list(TASKS.keys())}")
                sys.exit(1)
    else:
        selected = list(TASKS.keys())  # 默认全部执行

    for key in selected:
        task = TASKS[key]
        render_md_to_png(
            md_path=task["md_path"],
            img_name=task["img_name"],
            page_width=task.get("page_width", 980),
        )


if __name__ == "__main__":
    main()
