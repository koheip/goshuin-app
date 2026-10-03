"""アプリで使う大きなイラストを、軽い JPEG にして assets/optimized/ に書き出す。

使い方：python scripts/optimize-images.py（Pillow が必要）

元の PNG は1枚 2〜3MB あり、図鑑の表示に時間がかかっていた。透明な部分のない絵だけを対象にする
（透明のある絵やドット絵は PNG のまま使う）。元の PNG は作り直し用に assets/ に残し、アプリからは
assets/optimized/ のほうを読み込む。絵を差し替えたら、このスクリプトを実行し直す。
"""

from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).resolve().parent.parent / "assets"
OUT = ASSETS / "optimized"
QUALITY = 86

# 画面いっぱいに出す絵。大きさはそのまま、形式だけ変える
FULL = [
    "blessing-amaterasu",
    "blessing-susanoo",
    "blessing-okuninushi",
    "blessing-inari",
    "home-guide-susanoo-soft-v3",
    "home-guide-okuninushi-soft-v3",
    "home-guide-inari-soft-v3",
    "kami-megu-home-hero",
    "kami-catalog-amaterasu-front-v1",
    "kami-catalog-amaterasu-card-v5",
    "kami-catalog-susanoo-card-v5",
    "kami-catalog-okuninushi-card-v5",
    "kami-catalog-inari-card-v5",
]

# 図鑑の一覧の小さなカード用（画面の半分ほどの幅）。-thumb を付けて書き出す
THUMB = [name for name in FULL if name.startswith("kami-catalog-") and name.endswith("-card-v5")]
THUMB_EDGE = 640


def save(image: Image.Image, name: str) -> int:
    path = OUT / f"{name}.jpg"
    image.convert("RGB").save(path, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    return path.stat().st_size


# おとものドット絵。2×2 に4柱が並んだ1枚の絵を、1柱ずつに切り分ける（透明があるので PNG のまま）。
# 1枚のまま使うと、表示のたびに4柱ぶんを読み込むことになり、表示が遅かった
SPRITE = "kami-guide-pixel-soft-v2"
SPRITE_CELLS = {"amaterasu": (0, 0), "susanoo": (1, 0), "okuninushi": (0, 1), "inari": (1, 1)}


def split_sprite() -> None:
    image = Image.open(ASSETS / f"{SPRITE}.png").convert("RGBA")
    width, height = image.size[0] // 2, image.size[1] // 2
    for name, (column, row) in SPRITE_CELLS.items():
        cell = image.crop((column * width, row * height, (column + 1) * width, (row + 1) * height))
        cell.save(OUT / f"guide-pixel-{name}.png", "PNG", optimize=True)
    print(f"おとものドット絵を {len(SPRITE_CELLS)} 枚に切り分けました")


def main() -> None:
    OUT.mkdir(exist_ok=True)
    split_sprite()
    before = after = 0
    for name in FULL:
        source = ASSETS / f"{name}.png"
        image = Image.open(source)
        if image.mode in ("RGBA", "LA", "P") and image.convert("RGBA").getchannel("A").getextrema()[0] < 255:
            raise SystemExit(f"{name}.png には透明な部分があるので、JPEG にできません")
        before += source.stat().st_size
        after += save(image, name)
        if name in THUMB:
            small = image.copy()
            small.thumbnail((THUMB_EDGE, THUMB_EDGE), Image.LANCZOS)
            after += save(small, f"{name}-thumb")
    print(f"{len(FULL)} 枚（一覧用 {len(THUMB)} 枚を追加）: {before / 1e6:.1f}MB → {after / 1e6:.1f}MB")


if __name__ == "__main__":
    main()
