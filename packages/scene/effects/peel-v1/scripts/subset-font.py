#!/usr/bin/env python3
"""Rebuilds assets/peel-mono.woff2: a subset of Iosevka Medium (SIL OFL 1.1).

Source: the npm package @fontsource/iosevka 5.3.0, file files/iosevka-latin-500-normal.woff2
(the complete font, 29,912 glyphs). Needs fonttools and brotli:
    pip install fonttools brotli
    npm pack @fontsource/iosevka@5.3.0 && tar -xzf fontsource-iosevka-5.3.0.tgz
    python3 scripts/subset-font.py package/files/iosevka-latin-500-normal.woff2
Kept: Basic Latin, Latin-1, Latin Extended-A, Greek, basic Cyrillic, general punctuation, arrows and
a few symbols. Layout features are dropped (no ligatures); advance width stays 0.5 em.
"""
import os
import sys
from fontTools import subset

RANGES = [
    (0x20, 0x7E), (0xA0, 0x17F), (0x370, 0x3FF), (0x400, 0x45F), (0x2010, 0x2015), (0x2018, 0x201E),
    (0x2020, 0x2022), (0x2026, 0x2026), (0x2030, 0x2033), (0x2039, 0x203A), (0x2190, 0x2195),
    (0x2212, 0x2212), (0x2248, 0x2248), (0x2260, 0x2260), (0x2264, 0x2265), (0x221E, 0x221E),
    (0x25A0, 0x25A1), (0x25CF, 0x25CF), (0x2713, 0x2713), (0x20AC, 0x20AC), (0x2116, 0x2116), (0x2122, 0x2122),
]

def main() -> None:
    src = sys.argv[1]
    out = os.path.join(os.path.dirname(__file__), "..", "assets", "peel-mono.woff2")
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = []
    opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    opts.notdef_outline = True
    opts.hinting = False
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=[u for a, b in RANGES for u in range(a, b + 1)])
    sub.subset(font)
    subset.save_font(font, out, opts)
    print(os.path.getsize(out), "bytes,", len(font.getGlyphOrder()), "glyphs ->", os.path.normpath(out))

if __name__ == "__main__":
    main()
