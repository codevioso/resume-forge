#!/usr/bin/env python3
"""Regenerate the Paperplane brand raster assets in assets/brand/.

The mark is the **paper plane** from the logo (public/logo/logo.png in the
repository root), drawn from the exact vector the web app's favicon uses
(public/favicon.svg): three flat panels meeting at the nose — the upper wing and
the right-hand panel in aqua, the fold between them in steel blue — split apart
by two creases that run from the nose out to the plane's edge.

Flat on purpose. Nothing here blends two colours into each other: the palette is
a matte near-black base carrying solid, unmixed colour, and the plane is three
solid polygons on it. Measured against the base, the aqua panels are 13.63:1 and
the steel-blue fold is 5.21:1, so every panel is legible on its own at 48px.

Every colour here is a copy of a value that lives in Dart. They are duplicated
because a PNG cannot read `ColorScheme` at build time, so if the palette moves,
*this file has to move with it* and the assets have to be regenerated:

    assets/brand/generate_brand.py   Dart source of truth
    -------------------------------  ---------------------------------------
    BASE      #0E0E10                AppTheme.colorScheme.surface
    MARK      #0EF0F8                AppTheme.colorScheme.primary
    FOLD      #1D8FB8                `_foldBlue` in lib/screens/splash_screen.dart
    MONO_INK  #FFFFFF                (not a theme colour — see below)

FOLD is not a theme colour, and should not become one. It is the logo's second
tone, it appears nowhere in the app's chrome, and the app keeps exactly one
accent; so it lives beside the mark's geometry, in the one widget that draws the
mark, rather than in the ColorScheme every screen reads.

MONO_INK is deliberately *not* from the palette: Android 13 recolours the
monochrome layer to the user's wallpaper and only reads its alpha, so the
silhouette is flat white and stays flat white whatever the accent does.

`test/brand/brand_assets_test.dart` samples the generated PNGs, the native
splash config and the Android window colour, and fails if any of them drift
away from the Dart values, so the duplication is checked rather than merely
documented.

The geometry constants below are mirrored in `lib/screens/splash_screen.dart`
so the animated splash draws the same plane the launcher icon does.

--- how the reference logo was translated -----------------------------------

The favicon draws the three panels with a navy (#151C48) outline 6 units wide,
for a white page. This app is matte near-black, and that outline measures
**1.19:1** against #0E0E10 — on the app's ground it is simply not there, and
without it nothing marks the fold except the colour change between the panels.

The obvious translation — keep the outline but stroke it in the base colour, so
it becomes a knockout gap — was measured and rejected, because of where the
panels meet. All three come to a point at the nose, and they arrive as very
narrow wedges: 10.5 degrees for the upper wing, 12.3 for the fold, 20.9 for the
right panel. A gap of constant width g cuts a wedge of angle a back by
(g/2)/sin(a/2), so the favicon's own 6-unit stroke would shorten them by 33, 28
and 16.5 units of a 140-unit plane. The nose — the one part of a paper plane
everybody draws — dissolves into three blunt spikes of different lengths.

So the creases are **tapered**: each is a thin wedge from the nose to the edge
of the plane, zero wide at the nose and CREASE wide where it reaches the
silhouette, which is also how a real paper plane's folds look — they converge
at the point. The nose stays exactly the favicon's nose, and the silhouette
stays exactly the favicon's silhouette apart from the two notches where the
creases come out. There is no outline around the outside at all: on this ground
the base itself is the outline.

Geometrically, a tapered crease is two silhouette vertices slid apart along
their own edges (see `_panels`), so every panel stays a plain polygon of the
favicon's points — nothing is subtracted, nothing is stroked, and the Dart side
mirrors it in a handful of lines.

The crease width was chosen at 48px, not at splash size. At CREASE 7.5 the
creases are 2.0px wide where they leave the plane on a 48px launcher icon —
enough to read as two folds in the flat-white monochrome icon, where there is
no colour change to help. Rendered side by side at 48px, 5 units (1.4px) left
the monochrome creases visible only near their roots, where they were already
grey with antialiasing; 10 units bought nothing more at 48px and, at splash
size, where the plane is 140dp wide, began to read as gaps between three loose
pieces rather than folds in one sheet.

The dotted flight trail from the logo is **not** in the icon. At the icon's
scale a trail dot would be under 2px across on a 48px launcher icon — a speck
of dirt beside the plane rather than a trail — and reserving room for it would
shrink the plane itself by a third. The trail is motion; it belongs to the
animated splash, which draws it in behind the plane.

Usage:
    pip install pillow
    python assets/brand/generate_brand.py
"""

from __future__ import annotations

import math
import os
import sys

from PIL import Image, ImageDraw

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# --- palette (see the table in the module docstring) -----------------------

# Matte near-black. Neutral by measurement, not by intent: R and G are equal and
# B is two steps up, which is the most blue this is allowed to carry before it
# starts reading as a navy again.
BASE = (0x0E, 0x0E, 0x10)

# The logo's aqua, and the app's one accent. The upper wing and the right
# panel — the two faces of the plane that catch the light.
MARK = (0x0E, 0xF0, 0xF8)

# The logo's steel blue: the fold, the face of the plane turned away. 5.21:1 on
# the base, so it is a shape in its own right at 48px rather than a shadow; and
# only 2.62:1 against the aqua beside it, which is exactly why the creases are
# there — at launcher-icon size a 2.6:1 colour step alone does not draw a line.
FOLD = (0x1D, 0x8F, 0xB8)

MONO_INK = (0xFF, 0xFF, 0xFF)

# --- geometry (mirrored in lib/screens/splash_screen.dart) -----------------
#
# Everything is in the favicon's own coordinate space — public/favicon.svg,
# viewBox 0 0 160 100, y pointing down — so a point can be copied between that
# file, this one and the Dart painter without conversion. "Units" below are
# units of that viewBox.

NOSE = (150.0, 5.0)        # where all three panels meet
WING_TIP = (10.0, 42.0)    # the far end of the upper wing
WING_ROOT = (40.0, 57.0)   # where the upper wing's trailing edge meets the keel
KEEL = (45.0, 90.0)        # the bottom of the fold
FOLD_ROOT = (63.0, 72.0)   # the inner corner of the notch under the plane
TAIL = (98.0, 90.0)        # the trailing corner of the right panel

# The plane is centred on its bounding box, (10..150, 5..90). Its area centroid
# measures (83.9, 47.5) — four units right of this and level with it — so the
# box centre is also the optical one, and it is a number anyone can check.
CENTRE = (80.0, 47.5)

# Distance from CENTRE to the nose: the farthest ink in the mark, so the one
# number every size limit below is set against.
REACH = math.dist(CENTRE, NOSE)  # 81.9

# Width of each crease where it reaches the silhouette, in units. Zero at the
# nose. See the docstring for how it was chosen.
CREASE = 7.5

# Size, per output, as the nose's distance from the canvas centre in fractions
# of the canvas. The nose is the farthest point from the centre, so this is the
# mark's radius.
#
# ADAPTIVE is the tight one: of a 108dp adaptive layer only the inner 72dp is
# ever shown, and only the inner 66dp circle is *guaranteed* to survive masking.
# At 0.31 the nose sits 0.02 of the layer — 1.4px at a 48px launcher icon —
# inside that circle, and the wing tip, the next-farthest point, at 0.266.
# The plane is then 38px wide on a 48px launcher icon.
# Checked at 48px under circle, squircle, rounded-square and full-square masks.
NOSE_ADAPTIVE = 0.31
# The legacy square icon and every iOS size show this canvas edge to edge, so
# it *is* the visible icon rather than a layer cropped to two thirds of itself.
# 0.40 puts the plane at 68% of the canvas wide with 16% clear either side, and
# keeps the nose — which points toward the top-right corner — clear of the
# corner rounding iOS applies: it sits 0.29 of the canvas below the top edge,
# lower than the 0.22 that rounding reaches down.
NOSE_MASTER = 0.40

# The native splash images draw the plane at **1 unit = 1dp**: its 100-unit
# viewBox height is 100dp and it is 140dp nose to wing tip. That is the plane's
# size on Flutter's first frame too — lib/screens/splash_screen.dart opens the
# plane at `splashPlaneHeight` (100dp) whatever the device, and grows or shrinks
# it to the layout's size during the flight — so nothing jumps at the handoff.
#
# Both platforms treat these sources as the 4x asset, so 1dp is 4px.
SPLASH_UNIT = 4.0
# The pre-12 Android and iOS splash: 640px, i.e. 160dp, which clears the
# plane's 140 x 85dp box on every side.
SPLASH_CANVAS = 640
# Android 12's splash icon window is a fixed 288dp, masked to a 192dp circle.
# The nose is the plane's farthest point from its centre at 81.9dp, inside the
# 96dp radius with room to spare.
ANDROID12_CANVAS = 1152

SUPERSAMPLE = 4


def _slide(point, toward, distance):
    """`point` moved `distance` units along the straight line to `toward`."""
    length = math.dist(point, toward)
    return (
        point[0] + (toward[0] - point[0]) / length * distance,
        point[1] + (toward[1] - point[1]) / length * distance,
    )


def _crease_slide(root, side_a, side_b):
    """How far to slide `root` along each of its two edges for a CREASE gap.

    Sliding both of the root's neighbours a distance d along their own edges
    opens a gap, measured square to the nose-root line, of d*(sin a + sin b),
    where a and b are the angles those edges make with that line. Solving for d
    rather than picking it means both creases come out the same width, although
    the two roots are very differently shaped: the keel's edge runs within 7.4
    degrees of the nose-to-fold line, so almost all of that crease is taken from
    the right panel.
    """
    ux, uy = NOSE[0] - root[0], NOSE[1] - root[1]
    length = math.hypot(ux, uy)

    def sine(other):
        vx, vy = other[0] - root[0], other[1] - root[1]
        return abs(ux * vy - uy * vx) / (length * math.hypot(vx, vy))

    return CREASE / (sine(side_a) + sine(side_b))


def _panels():
    """The three panels as polygons, creases already open.

    Each crease is a straight wedge from the nose to a root vertex on the
    silhouette. Opening it is nothing more than replacing that root, in each of
    the two panels that share it, with a point slid a little way along that
    panel's own outer edge — so the wedge's sides run from the nose to those two
    points and its width grows linearly from nothing at the nose to CREASE at
    the edge.
    """
    wing = _crease_slide(WING_ROOT, WING_TIP, KEEL)
    fold = _crease_slide(FOLD_ROOT, KEEL, TAIL)
    return [
        # Upper wing.
        ([NOSE, WING_TIP, _slide(WING_ROOT, WING_TIP, wing)], MARK),
        # The fold.
        (
            [
                NOSE,
                _slide(WING_ROOT, KEEL, wing),
                KEEL,
                _slide(FOLD_ROOT, KEEL, fold),
            ],
            FOLD,
        ),
        # Right panel.
        ([NOSE, _slide(FOLD_ROOT, TAIL, fold), TAIL], MARK),
    ]


def _plane_layer(size: int, unit: float, mono: bool = False) -> Image.Image:
    """The plane on transparency, `unit` px per favicon unit, centred.

    Drawn at SUPERSAMPLE and reduced, which Pillow does on premultiplied alpha
    for an RGBA image, so the two colours cannot bleed a dark fringe into each
    other or into the creases. Every panel interior is its colour to the bit;
    only the antialiased edges are blends.
    """
    big = size * SUPERSAMPLE
    scale = unit * SUPERSAMPLE
    layer = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    def place(point):
        return (
            big / 2 + (point[0] - CENTRE[0]) * scale,
            big / 2 + (point[1] - CENTRE[1]) * scale,
        )

    for polygon, colour in _panels():
        fill = MONO_INK if mono else colour
        draw.polygon([place(p) for p in polygon], fill=(*fill, 255))
    return layer.resize((size, size), Image.LANCZOS)


def _unit_for(size: int, nose: float) -> float:
    """Px per unit that puts the nose `nose` of the canvas from its centre."""
    return size * nose / REACH


def _backdrop(size: int) -> Image.Image:
    """The matte base, flat edge to edge.

    Nothing is blended into it — no centre lift, no bloom under the plane. A
    matte surface that brightens toward the middle is a gradient wearing a
    different name, and it is exactly what the palette moved away from.
    """
    return Image.new('RGB', (size, size), BASE)


def _write(image: Image.Image, name: str) -> None:
    path = os.path.join(OUT_DIR, name)
    image.save(path)
    print(f'  {name}  {image.width}x{image.height}  {os.path.getsize(path) / 1024:.1f} KB')


def main() -> int:
    print('brand assets ->', OUT_DIR)

    backdrop = _backdrop(1024)

    master = backdrop.convert('RGBA')
    master.alpha_composite(_plane_layer(1024, _unit_for(1024, NOSE_MASTER)))
    # iOS rejects an alpha channel in an app icon, and the master is opaque
    # anyway, so it is flattened here rather than left for the generator.
    _write(master.convert('RGB'), 'icon_master.png')

    adaptive = _unit_for(1024, NOSE_ADAPTIVE)
    _write(backdrop, 'icon_background.png')
    _write(_plane_layer(1024, adaptive), 'icon_foreground.png')
    # Themed icons: Android tints the opaque parts and shows the theme
    # background through the creases, so the mark is a flat silhouette with its
    # folds cut into it.
    _write(_plane_layer(1024, adaptive, mono=True), 'icon_monochrome.png')

    # Both splash images are the plane alone, at 1 unit = 1dp: the animated
    # Flutter splash opens on exactly this frame — no trail, no wordmark — and
    # flies the plane out of it, so nothing visible changes hands at the
    # native-to-Flutter handoff.
    _write(_plane_layer(SPLASH_CANVAS, SPLASH_UNIT), 'splash_logo.png')
    _write(_plane_layer(ANDROID12_CANVAS, SPLASH_UNIT), 'splash_android12.png')
    return 0


if __name__ == '__main__':
    sys.exit(main())
