from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 960, 540
ASSETS_DIR = Path('docs/assets/screenshots')
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
font = ImageFont.load_default()


def create_canvas(bg='#050b14'):
    img = Image.new('RGB', (WIDTH, HEIGHT), bg)
    draw = ImageDraw.Draw(img)
    return img, draw


def base_panel(draw):
    draw.rounded_rectangle((40, 40, 920, 500), radius=30, fill='#0c1627')


def add_label(draw, label, y):
    bbox = draw.textbbox((0, 0), label, font=font)
    w = bbox[2] - bbox[0]
    draw.text(((WIDTH - w) / 2, y), label, fill='#94c6ff', font=font)


def draw_skeleton():
    img, draw = create_canvas()
    base_panel(draw)
    draw.rounded_rectangle((80, 90, 880, 150), radius=16, fill='#1f2b3f')
    bars = [
        (80, 180, 760, 220),
        (80, 230, 740, 270),
        (80, 280, 680, 320),
        (80, 330, 600, 370),
        (80, 380, 520, 420),
    ]
    for x1, y1, x2, y2 in bars:
        draw.rounded_rectangle((x1, y1, x2, y2), radius=8, fill='#15203c')
    small = [(80, 210, 220, 230), (80, 360, 220, 380)]
    for x1, y1, x2, y2 in small:
        draw.rounded_rectangle((x1, y1, x2, y2), radius=8, fill='#1c2942')
    draw.rounded_rectangle((240, 190, 320, 210), radius=4, fill='#94c6ff')
    add_label(draw, 'Rooms loading skeleton', HEIGHT - 30)
    img.save(ASSETS_DIR / 'rooms-loading-skeleton.png')


def draw_toast():
    img, draw = create_canvas(bg='#040810')
    base_panel(draw)
    draw.rounded_rectangle((80, 120, 780, 190), radius=12, fill='#1c2b41')
    draw.rounded_rectangle((90, 140, 770, 180), radius=8, fill='#15203c')
    draw.rounded_rectangle((80, 200, 880, 420), radius=14, fill='#0f1726')
    draw.rectangle((90, 210, 240, 250), fill='#94c6ff')
    draw.text((120, 218), 'Recap published', fill='#000814', font=font)
    draw.rounded_rectangle((90, 260, 640, 340), radius=10, fill='#0c1320')
    draw.text((110, 275), 'Live room timeline keeps moving while you publish updates.', fill='#c5d5ff', font=font)
    add_label(draw, 'Room page with toast “Recap published”', HEIGHT - 30)
    img.save(ASSETS_DIR / 'room-page-toast.png')


def draw_error_boundary():
    img, draw = create_canvas(bg='#03070f')
    base_panel(draw)
    draw.rounded_rectangle((420, 140, 880, 480), radius=18, fill='#111b2d')
    draw.ellipse((520, 170, 760, 410), fill='#15253f')
    draw.ellipse((590, 240, 690, 340), fill='#94c6ff')
    draw.text((460, 420), 'Retry', fill='#94c6ff', font=font)
    draw.rounded_rectangle((120, 200, 400, 360), radius=18, fill='#111b2d')
    draw.text((150, 230), 'Something went sideways.', fill='#c5d5ff', font=font)
    draw.text((150, 260), 'Try again or head back home.', fill='#8aa1c6', font=font)
    draw.rounded_rectangle((140, 295, 260, 335), radius=12, fill='#5ff9d2')
    draw.text((150, 302), 'Retry', fill='#03131b', font=font)
    add_label(draw, 'Error boundary page with retry UI', HEIGHT - 30)
    img.save(ASSETS_DIR / 'error-boundary.png')


def main():
    draw_skeleton()
    draw_toast()
    draw_error_boundary()


if __name__ == '__main__':
    main()
