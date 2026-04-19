# Resources

Drop the following icon files here before building a release:

- `icon.png` — 1024x1024 PNG (used for macOS / Linux)
- `icon.ico` — multi-resolution ICO (16/32/48/128/256, used for Windows)
- `tray-icon.png` — 32x32 PNG (system tray icon, will be resized to 16x16)

Quick way to generate from a single 1024x1024 source PNG:

```bash
# On Linux/macOS — install ImageMagick, then:
convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
convert icon.png -resize 32x32 tray-icon.png
```

Until real icons are provided, electron-builder will fall back to its
default icon and the tray will show as a blank/transparent square.
