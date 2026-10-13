"""Generate the original, brand-independent app icon and platform variants."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
ANDROID_RES = ROOT / "android" / "src" / "main" / "res"
GREEN = "#063c30"
GREEN_LIGHT = "#17624f"
GOLD = "#d6aa4b"
GOLD_LIGHT = "#f4d78d"
PAPER = "#fff7dd"
INK = "#224c40"
WEB_SIZES = (48, 72, 96, 144, 192, 256, 384, 512)
ANDROID_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}


def build_master(size: int = 1024) -> Image.Image:
    scale = size / 1024
    canvas = Image.new("RGBA", (size, size), GREEN)
    draw = ImageDraw.Draw(canvas)
    for inset in range(0, size // 2, max(1, size // 90)):
        ratio = inset / (size / 2)
        color = tuple(round(a + (b - a) * ratio) for a, b in zip((6, 60, 48), (3, 35, 29))) + (255,)
        draw.rounded_rectangle((inset, inset, size - inset, size - inset), radius=int(220 * scale), outline=color, width=max(2, int(16 * scale)))

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((70 * scale, 70 * scale, 954 * scale, 954 * scale), radius=190 * scale, fill=(0, 0, 0, 130))
    shadow = shadow.filter(ImageFilter.GaussianBlur(26 * scale))
    canvas.alpha_composite(shadow)
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((58 * scale, 58 * scale, 966 * scale, 966 * scale), radius=198 * scale, fill=GREEN, outline=GOLD, width=max(8, int(22 * scale)))
    draw.rounded_rectangle((88 * scale, 88 * scale, 936 * scale, 936 * scale), radius=170 * scale, outline=GOLD_LIGHT, width=max(2, int(5 * scale)))

    # A simple mosque arch frames the open book without copying another logo.
    arch = [(216, 466), (216, 318), (330, 318), (330, 250), (512, 108), (694, 250), (694, 318), (808, 318), (808, 466)]
    arch = [(int(x * scale), int(y * scale)) for x, y in arch]
    draw.line(arch, fill=GOLD, width=max(7, int(18 * scale)), joint="curve")
    draw.line([(512 * scale, 130 * scale), (512 * scale, 332 * scale)], fill=GOLD_LIGHT, width=max(2, int(5 * scale)))
    draw.ellipse((483 * scale, 132 * scale, 541 * scale, 190 * scale), fill=GOLD_LIGHT)

    # Open book: two page polygons, subtle page lines, central binding and bookmark.
    left_page = [(164, 474), (486, 410), (503, 754), (188, 816), (132, 756)]
    right_page = [(538, 410), (860, 474), (892, 756), (836, 816), (521, 754)]
    left_page = [(int(x * scale), int(y * scale)) for x, y in left_page]
    right_page = [(int(x * scale), int(y * scale)) for x, y in right_page]
    draw.polygon(left_page, fill=PAPER, outline=GOLD)
    draw.polygon(right_page, fill=PAPER, outline=GOLD)
    draw.line(left_page + [left_page[0]], fill=GOLD, width=max(4, int(12 * scale)), joint="curve")
    draw.line(right_page + [right_page[0]], fill=GOLD, width=max(4, int(12 * scale)), joint="curve")
    draw.line([(503 * scale, 754 * scale), (512 * scale, 432 * scale), (521 * scale, 754 * scale)], fill="#98702d", width=max(4, int(12 * scale)))
    for offset in range(0, 6):
        y = (518 + offset * 38) * scale
        draw.line([(210 * scale, y), (448 * scale, (y - 44 * scale))], fill=INK, width=max(2, int(7 * scale)))
        draw.line([(576 * scale, (y - 44 * scale)), (814 * scale, y)], fill=INK, width=max(2, int(7 * scale)))
    draw.polygon([(491 * scale, 748 * scale), (533 * scale, 748 * scale), (528 * scale, 888 * scale), (512 * scale, 858 * scale), (496 * scale, 888 * scale)], fill=GOLD)

    # Eight-point rosette conveys scholarship without text or third-party marks.
    cx, cy, outer, inner = 512 * scale, 310 * scale, 55 * scale, 25 * scale
    import math
    points = []
    for index in range(16):
        radius = outer if index % 2 == 0 else inner
        angle = -math.pi / 2 + index * math.pi / 8
        points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
    draw.polygon(points, fill=GOLD_LIGHT, outline=GOLD)
    return canvas


def save_png(image: Image.Image, path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.resize((size, size), Image.Resampling.LANCZOS).save(path, format="PNG", optimize=True)


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    master = build_master()
    master.save(PUBLIC / "app-icon-master.png", format="PNG", optimize=True)
    for size in WEB_SIZES:
        save_png(master, PUBLIC / f"icon-{size}.png", size)
    master.convert("RGBA").save(
        PUBLIC / "app-icon.ico",
        format="ICO",
        sizes=((16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)),
    )
    for directory, size in ANDROID_SIZES.items():
        save_png(master, ANDROID_RES / directory / "ic_launcher.png", size)
        save_png(master, ANDROID_RES / directory / "ic_launcher_round.png", size)
    save_png(master, ANDROID_RES / "drawable-nodpi" / "ic_launcher_foreground.png", 432)
    adaptive = ANDROID_RES / "mipmap-anydpi-v26"
    adaptive.mkdir(parents=True, exist_ok=True)
    xml = """<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<adaptive-icon xmlns:android=\"http://schemas.android.com/apk/res/android\">\n    <background android:drawable=\"@color/ic_launcher_background\" />\n    <foreground android:drawable=\"@drawable/ic_launcher_foreground\" />\n</adaptive-icon>\n"""
    (adaptive / "ic_launcher.xml").write_text(xml, encoding="utf-8")
    (adaptive / "ic_launcher_round.xml").write_text(xml, encoding="utf-8")
    print("Generated original app icons without embedded text or third-party marks.")


if __name__ == "__main__":
    main()
