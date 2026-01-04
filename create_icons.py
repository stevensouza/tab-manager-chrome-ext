#!/usr/bin/env python3
"""
Generate Tab Manager extension icons
Orange background with white "TM" text
"""

from PIL import Image, ImageDraw, ImageFont

# Orange color (similar to duplicate badge color from styles.css)
ORANGE = (232, 113, 10)  # #E8710A
WHITE = (255, 255, 255)

def create_icon(size, output_path):
    """Create a square icon with TM text"""
    # Create image with orange background
    img = Image.new('RGB', (size, size), ORANGE)
    draw = ImageDraw.Draw(img)

    # Calculate font size (roughly 60% of icon size)
    font_size = int(size * 0.6)

    try:
        # Try to use a system font
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        # Fallback to default font
        font = ImageFont.load_default()

    # Draw "TM" text centered
    text = "TM"

    # Get text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Center the text
    x = (size - text_width) // 2 - bbox[0]
    y = (size - text_height) // 2 - bbox[1]

    # Draw white text
    draw.text((x, y), text, font=font, fill=WHITE)

    # Save as PNG
    img.save(output_path, 'PNG')
    print(f"Created {output_path} ({size}x{size})")

# Create icons in standard Chrome extension sizes
sizes = {
    16: 'icons/icon16.png',
    32: 'icons/icon32.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png'
}

for size, path in sizes.items():
    create_icon(size, path)

print("\n✅ All icons created successfully!")
print("Update manifest.json with the icon paths.")
