"""アプリのアイコンとスプラッシュ画像を作る。

鳥居の形は src/components/shrine.tsx の Torii と同じ比率、色は src/theme.ts に合わせている。
使い方: python scripts/make-icons.py  （Pillow が必要）
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ASSETS = Path(__file__).resolve().parent.parent / "assets"
SCALE = 4  # 大きく描いてから縮小し、ふちをなめらかにする

SHU = (255, 92, 122)
SHU_DEEP = (226, 62, 95)
KASAGI = (59, 39, 102)
SAKURA = (255, 179, 209)
WHITE = (255, 255, 255)
COVER = [(255, 154, 203), (185, 162, 255), (143, 227, 240)]


def gradient(size, stops):
    """左上から右下へのグラデーション"""
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = (x + y) / (w + h - 2)
            seg = min(int(t * (len(stops) - 1)), len(stops) - 2)
            local = t * (len(stops) - 1) - seg
            a, b = stops[seg], stops[seg + 1]
            px[x, y] = tuple(round(a[i] + (b[i] - a[i]) * local) for i in range(3))
    return img


def rounded(draw, box, radius, fill):
    x0, y0, x1, y1 = box
    draw.rounded_rectangle((x0, y0, x1, y1), radius=max(0, min(radius, (x1 - x0) / 2, (y1 - y0) / 2)), fill=fill)


def torii(draw, cx, top, w, mono=None):
    """横幅 w の鳥居を、中心 cx・上端 top に描く。mono を渡すと単色で描く"""
    h = w * 0.86
    left = cx - w / 2
    c = lambda color: mono or color  # noqa: E731

    def beam(t, inset, height, color):
        rounded(draw, (left + w * inset, top + w * t, left + w - w * inset, top + w * (t + height)), w * height, c(color))

    for side in (0.18, 1 - 0.18 - 0.1):
        rounded(draw, (left + w * side, top + w * 0.12, left + w * (side + 0.1), top + h - w * 0.05), w * 0.02, c(SHU))
    for side in (0.16, 1 - 0.16 - 0.14):
        rounded(draw, (left + w * side, top + h - w * 0.07, left + w * (side + 0.14), top + h), w * 0.02, c(KASAGI))
    beam(0.3, 0.08, 0.065, SHU)
    rounded(draw, (left + w * 0.455, top + w * 0.12, left + w * 0.545, top + w * 0.32), w * 0.015, c(SHU_DEEP))
    beam(0.075, 0.04, 0.075, SHU)
    beam(0, -0.02, 0.085, KASAGI)
    return h


def sparkle(draw, cx, cy, r, fill):
    """4方向に尖ったきらきら"""
    pts = []
    for i in range(8):
        ang = math.pi / 4 * i - math.pi / 2
        rr = r if i % 2 == 0 else r * 0.28
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    draw.polygon(pts, fill=fill)


def sakura(draw, cx, cy, r, fill):
    """5枚の花びら"""
    for i in range(5):
        ang = math.tau / 5 * i - math.pi / 2
        px, py = cx + r * 0.55 * math.cos(ang), cy + r * 0.55 * math.sin(ang)
        draw.ellipse((px - r * 0.45, py - r * 0.45, px + r * 0.45, py + r * 0.45), fill=fill)
    draw.ellipse((cx - r * 0.2, cy - r * 0.2, cx + r * 0.2, cy + r * 0.2), fill=(255, 226, 240))


def canvas(size, background=None):
    big = (size * SCALE, size * SCALE)
    if background is None:
        return Image.new("RGBA", big, (0, 0, 0, 0))
    return gradient(big, background).convert("RGBA")


def finish(img, size):
    return img.resize((size, size), Image.LANCZOS)


def glow(img, cx, cy, r):
    """鳥居の後ろの、ふんわり白い光"""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, 150))
    layer = layer.filter(ImageFilter.GaussianBlur(r * 0.35))
    return Image.alpha_composite(img, layer)


def motif(img, torii_w, with_decor=True, mono=None):
    """中央に鳥居（と、きらきら・桜）を描く。torii_w は画像の幅に対する割合"""
    s = img.size[0]
    w = s * torii_w
    h = w * 0.86
    top = (s - h) / 2 + s * 0.02
    if with_decor and mono is None:
        img = glow(img, s / 2, s / 2, s * 0.34)
    draw = ImageDraw.Draw(img)
    torii(draw, s / 2, top, w, mono)
    if with_decor and mono is None:
        sparkle(draw, s * 0.79, s * 0.24, s * 0.06, WHITE)
        sparkle(draw, s * 0.22, s * 0.3, s * 0.035, WHITE)
        sakura(draw, s * 0.2, s * 0.76, s * 0.055, SAKURA)
        sakura(draw, s * 0.82, s * 0.72, s * 0.04, WHITE)
    return img


def main():
    # iOS・ストア用（全面を塗る。角丸は OS がつける）
    finish(motif(canvas(1024, COVER), 0.56), 1024).convert("RGB").save(ASSETS / "icon.png")

    # Android のアダプティブアイコン（前景は中央 66% の安全領域に収める）
    finish(canvas(512, COVER), 512).save(ASSETS / "android-icon-background.png")
    finish(motif(canvas(512), 0.42, with_decor=False), 512).save(ASSETS / "android-icon-foreground.png")
    finish(motif(canvas(432), 0.42, with_decor=False, mono=WHITE), 432).save(ASSETS / "android-icon-monochrome.png")

    # スプラッシュ（背景色は app.json の splash の backgroundColor）
    finish(motif(canvas(1024), 0.5, with_decor=False), 1024).save(ASSETS / "splash-icon.png")

    # Web のファビコン
    finish(motif(canvas(192, COVER), 0.62, with_decor=False), 48).save(ASSETS / "favicon.png")


if __name__ == "__main__":
    main()
