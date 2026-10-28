import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:resume_forge/screens/splash_screen.dart';
import 'package:resume_forge/theme/app_theme.dart';

/// The brand rasters cannot read `ColorScheme` at build time, so the palette is
/// copied into `assets/brand/generate_brand.py`, into the native splash config,
/// and into the Android window colour. These tests are what stop those copies
/// from rotting: change the theme without regenerating, and the first group
/// below fails naming the value that moved.
///
/// Everything after that group is asserted against the *baked* literals rather
/// than against `AppTheme`, so a palette change produces two precise failures
/// ("the icon is still the old colour") instead of twenty vague ones.

/// The colours baked into the rasters. Copied by hand from the table at the top
/// of `assets/brand/generate_brand.py`; that file is the thing that actually
/// painted the pixels, this is the assertion that it painted the right ones.
const _base = Color(0xFF0E0E10); // BASE — matte near-black
const _mark = Color(0xFF0EF0F8); // MARK — the logo's aqua
const _fold = Color(0xFF1D8FB8); // FOLD — the logo's steel blue

/// Mirrored from the generator and from `lib/screens/splash_screen.dart`: the
/// centre of the plane's bounding box and its nose, in the favicon's units
/// (public/favicon.svg, viewBox 0 0 160 100).
const _centre = (x: 80.0, y: 47.5);
const _nose = (x: 150.0, y: 5.0);

/// Distance from the centre to the nose — the farthest ink, so every size in
/// the generator is set as a fraction of it.
final _reach = math.sqrt(
  math.pow(_nose.x - _centre.x, 2) + math.pow(_nose.y - _centre.y, 2),
);

/// Px per favicon unit for a canvas of [size] with the nose [nose] of the
/// canvas out from the centre — `_unit_for` in the generator.
double _unitFor(int size, double nose) => size * nose / _reach;

/// The native splash sources draw 1 unit as 4px, the 4x asset of 1dp.
const _splashUnit = 4.0;

/// Every generated image that carries the coloured plane, with the scale
/// `assets/brand/generate_brand.py` drew it at.
final _sources = <({String path, int canvas, double unit})>[
  (
    path: 'assets/brand/icon_foreground.png',
    canvas: 1024,
    unit: _unitFor(1024, 0.31),
  ),
  (
    path: 'assets/brand/icon_master.png',
    canvas: 1024,
    unit: _unitFor(1024, 0.40),
  ),
  (path: 'assets/brand/splash_logo.png', canvas: 640, unit: _splashUnit),
  (path: 'assets/brand/splash_android12.png', canvas: 1152, unit: _splashUnit),
];

/// The two native splash sources, which are the Flutter splash's *first frame*.
final _splashSources = _sources.where((s) => s.unit == _splashUnit).toList();

String _hex(Color color) {
  String part(double channel) =>
      (channel * 255).round().toRadixString(16).padLeft(2, '0');
  return '#${part(color.r)}${part(color.g)}${part(color.b)}'.toUpperCase();
}

img.Image _load(String path) {
  final file = File(path);
  expect(
    file.existsSync(),
    isTrue,
    reason: '$path is missing — run `python assets/brand/generate_brand.py`',
  );
  final decoded = img.decodePng(file.readAsBytesSync());
  expect(decoded, isNotNull, reason: '$path is not a readable PNG');
  return decoded!;
}

/// Pixel coordinates of favicon point ([ux], [uy]) on a square [canvas] that
/// carries the plane centred at [unit] px per unit — the geometry every
/// generated image shares.
({int x, int y}) _at(int canvas, double unit, ({double x, double y}) point) => (
  x: (canvas / 2 + (point.x - _centre.x) * unit).round(),
  y: (canvas / 2 + (point.y - _centre.y) * unit).round(),
);

/// Points inside the two aqua panels: two on the upper wing (its thick root
/// and its thin outer half) and two on the right panel. Each was measured at
/// least 4 units clear of every panel edge, so an antialiased edge cannot be
/// what makes them pass, and they span the plane widely enough that a gradient
/// across it could not hold one value at all four.
const _aquaPoints = <({double x, double y})>[
  (x: 65, y: 35),
  (x: 100, y: 22.5),
  (x: 105, y: 57),
  (x: 90, y: 75),
];

/// Points inside the fold, 7 units clear of its edges.
const _foldPoints = <({double x, double y})>[(x: 55, y: 70), (x: 85, y: 47)];

/// Inside each crease, 90% of the way from the nose to the edge of the plane:
/// the widest point of each crease that is still unmistakably *in* it rather
/// than in the notch it opens into. 3.3 and 2.6 units from the nearest panel.
const _creasePoints = <({double x, double y})>[
  (x: 51.1, y: 52.1), // between the upper wing and the fold
  (x: 73.8, y: 68.0), // between the fold and the right panel: the spine
];

/// Outside the plane: the notch under it, and the pocket under the wing.
const _outsidePoints = <({double x, double y})>[(x: 70, y: 86), (x: 25, y: 60)];

/// Exact-match assertion. Not approximate on purpose: the plane is three flat
/// colours over a flat backdrop, so every interior pixel is its colour to the
/// bit. Only the antialiased edges are blends, and nothing here samples one.
void _expectPixel(
  img.Image image,
  ({int x, int y}) at,
  Color want, {
  required String reason,
}) {
  final pixel = image.getPixel(at.x, at.y);
  String part(num channel) => channel.toInt().toRadixString(16).padLeft(2, '0');
  final got = '#${part(pixel.r)}${part(pixel.g)}${part(pixel.b)}'.toUpperCase();
  expect(
    got,
    _hex(want),
    reason: '$reason (at ${at.x},${at.y}; alpha ${pixel.a})',
  );
}

void main() {
  group('the baked palette still matches Dart', () {
    // The assertions the whole file exists for. If one fails, the app has been
    // re-toned and `assets/brand/generate_brand.py` has not been: update its
    // table, rerun it, then rerun `dart run flutter_launcher_icons` and
    // `dart run flutter_native_splash:create`.
    test('the base is AppTheme.colorScheme.surface', () {
      expect(
        _hex(AppTheme.colorScheme.surface),
        _hex(_base),
        reason:
            'the icon backdrop, the native splash and the Android window are '
            'all baked at ${_hex(_base)}; a different Dart surface is a '
            'visible flash at launch',
      );
    });

    test('the plane is AppTheme.colorScheme.primary', () {
      expect(
        _hex(AppTheme.colorScheme.primary),
        _hex(_mark),
        reason:
            'the launcher icon and both native splash images are baked at '
            '${_hex(_mark)}; the Flutter splash paints the plane in '
            'colorScheme.primary, so the icon the user taps and the mark that '
            'animates in must be the same colour',
      );
    });

    test('the native splash draws the plane at splashPlaneHeight', () {
      // generate_brand.py draws both native images at SPLASH_UNIT px per unit
      // as 4x assets; the Flutter splash opens its plane's 100-unit height at
      // splashPlaneHeight. If these disagree the plane jumps in size at the
      // handoff.
      expect(
        _splashUnit / 4 * 100,
        splashPlaneHeight,
        reason:
            'the native splash plane would not be the size the Flutter '
            'splash opens at',
      );
    });
  });

  group('splash colour handoff', () {
    test('flutter_native_splash paints the matte base, everywhere', () {
      final config = File('flutter_native_splash.yaml').readAsStringSync();
      final colours = RegExp(
        r'^\s*(?:color|color_dark):\s*"([^"]+)"',
        multiLine: true,
      ).allMatches(config).map((m) => m.group(1)!.toUpperCase()).toList();

      expect(
        colours,
        hasLength(4),
        reason: 'light, dark, and the same pair again in the android_12 block',
      );
      for (final colour in colours) {
        expect(
          colour,
          _hex(_base),
          reason:
              'the native splash and the Flutter splash must be the same '
              'colour or the user sees a flash between them',
        );
      }
    });

    test('the Android window background matches too', () {
      // NormalTheme's windowBackground is what shows between the launch window
      // closing and Flutter's first frame. Left at ?android:colorBackground it
      // resolves to near-white in light mode.
      final colours = File(
        'android/app/src/main/res/values/colors.xml',
      ).readAsStringSync();
      expect(
        RegExp(
          r'name="window_background">([^<]+)<',
        ).firstMatch(colours)?.group(1)?.toUpperCase(),
        _hex(_base),
      );

      for (final path in const [
        'android/app/src/main/res/values/styles.xml',
        'android/app/src/main/res/values-night/styles.xml',
        'android/app/src/main/res/values-v31/styles.xml',
        'android/app/src/main/res/values-night-v31/styles.xml',
      ]) {
        expect(
          File(path).readAsStringSync(),
          contains('@color/window_background'),
          reason:
              '$path still falls back to the platform background colour — '
              'the splash generators rewrite LaunchTheme in these files and '
              'this line has to survive that',
        );
      }
    });
  });

  group('generated icon layers', () {
    test('the adaptive background is the matte base, flat to the edges', () {
      final background = _load('assets/brand/icon_background.png');
      expect(background.width, 1024);
      expect(background.height, 1024);

      // Corners, edge midpoints and the centre. Sampled this widely because
      // "flat" is the requirement: a backdrop that lifted toward a panel tint
      // in the middle or bloomed the accent under the mark would be a gradient,
      // and a single corner sample would not notice either coming back.
      for (final at in const [
        (x: 0, y: 0),
        (x: 1023, y: 0),
        (x: 0, y: 1023),
        (x: 1023, y: 1023),
        (x: 512, y: 4),
        (x: 4, y: 512),
        (x: 512, y: 512),
        (x: 300, y: 700),
      ]) {
        _expectPixel(
          background,
          at,
          _base,
          reason: 'the backdrop must be one flat matte colour, no gradient',
        );
      }
      expect(background.getPixel(0, 0).a, 255, reason: 'and opaque');
    });

    test('the master icon carries no alpha channel', () {
      // An iOS app icon with an alpha channel is rejected at submission.
      final master = _load('assets/brand/icon_master.png');
      expect(master.numChannels, 3);
      expect(master.width, 1024);
    });

    test(
      'the panels are flat aqua and steel blue, on every coloured layer',
      () {
        for (final source in _sources) {
          final image = _load(source.path);
          for (final point in _aquaPoints) {
            _expectPixel(
              image,
              _at(source.canvas, source.unit, point),
              _mark,
              reason:
                  '${source.path}: the upper wing and the right panel are one '
                  'flat aqua; (${point.x},${point.y}) is not it',
            );
          }
          for (final point in _foldPoints) {
            _expectPixel(
              image,
              _at(source.canvas, source.unit, point),
              _fold,
              reason:
                  '${source.path}: the fold is one flat steel blue; '
                  '(${point.x},${point.y}) is not it',
            );
          }
        }
      },
    );

    test('the creases and the notch are cut through on every layer', () {
      // The creases are what make three flat shapes read as one folded sheet
      // on a dark ground, where the favicon's navy outline does not show. They
      // are holes, not paint: on the transparent layers the layer behind shows
      // through them, and on the flattened master that is the backdrop.
      for (final source in _sources) {
        final image = _load(source.path);
        for (final point in [..._creasePoints, ..._outsidePoints]) {
          final at = _at(source.canvas, source.unit, point);
          if (source.path.endsWith('icon_master.png')) {
            _expectPixel(
              image,
              at,
              _base,
              reason:
                  'the flattened master must show the backdrop at '
                  '(${point.x},${point.y})',
            );
          } else {
            expect(
              image.getPixel(at.x, at.y).a,
              lessThan(16),
              reason:
                  '${source.path} is painted at (${point.x},${point.y}), which '
                  'is a crease or outside the plane — the creases must be '
                  'cut through, not drawn in a dark colour',
            );
          }
        }
      }
    });

    test('the monochrome layer is a flat silhouette with its creases cut', () {
      final mono = _load('assets/brand/icon_monochrome.png');
      final unit = _unitFor(1024, 0.31);

      // Flat white whatever the accent does: Android 13 reads only this
      // layer's alpha and recolours it to the user's wallpaper palette, so it
      // deliberately does *not* follow the palette — and the fold's second
      // colour cannot survive that, which is why the creases carry the folds.
      for (final point in [..._aquaPoints, ..._foldPoints]) {
        final at = _at(1024, unit, point);
        final ink = mono.getPixel(at.x, at.y);
        expect(ink.a, greaterThan(200), reason: 'every panel is opaque');
        expect(ink.r, ink.g, reason: 'and flat white, for the system to tint');
        expect(ink.g, ink.b);
        expect(ink.r, greaterThan(250));
      }

      for (final point in [..._creasePoints, ..._outsidePoints]) {
        final at = _at(1024, unit, point);
        expect(
          mono.getPixel(at.x, at.y).a,
          lessThan(16),
          reason:
              'the creases are holes, so the theme shows through them '
              '(${point.x},${point.y})',
        );
      }
    });

    test('the adaptive foreground keeps the plane inside the safe circle', () {
      final foreground = _load('assets/brand/icon_foreground.png');
      const size = 1024;
      // Android guarantees only the inner 66% circle survives masking.
      const safeRadius = size * 0.66 / 2;
      final centre = (size - 1) / 2;

      var painted = 0;
      var outside = 0;
      for (var y = 0; y < size; y += 2) {
        for (var x = 0; x < size; x += 2) {
          if (foreground.getPixel(x, y).a < 16) continue;
          painted++;
          final dx = x - centre;
          final dy = y - centre;
          if (dx * dx + dy * dy > safeRadius * safeRadius) outside++;
        }
      }

      expect(painted, greaterThan(0), reason: 'the layer must not be blank');
      expect(
        outside,
        0,
        reason:
            '$outside sampled pixels of the plane sit outside the 66% safe '
            'circle and would be clipped by a launcher mask',
      );
    });
  });

  group('native splash source images', () {
    test('they are the plane alone, centred — the splash\'s frame 0', () {
      // The animated splash opens on the plane alone and draws the trail in
      // behind it as it flies. A trail here would mean it appeared, vanished
      // for a beat, then animated back in at the native-to-Flutter handoff; an
      // off-centre plane would jump. So the ink must be exactly the plane's
      // own box — 10..150 x 5..90 units — centred, and nothing else.
      for (final source in _splashSources) {
        final image = _load(source.path);
        expect(image.width, source.canvas);

        var left = source.canvas, top = source.canvas, right = -1, bottom = -1;
        for (var y = 0; y < image.height; y++) {
          for (var x = 0; x < image.width; x++) {
            if (image.getPixel(x, y).a < 16) continue;
            left = math.min(left, x);
            right = math.max(right, x);
            top = math.min(top, y);
            bottom = math.max(bottom, y);
          }
        }
        final topLeft = _at(source.canvas, source.unit, (x: 10, y: 5));
        final bottomRight = _at(source.canvas, source.unit, (x: 150, y: 90));
        for (final (got, want) in [
          (left, topLeft.x),
          (top, topLeft.y),
          (right, bottomRight.x),
          (bottom, bottomRight.y),
        ]) {
          expect(
            (got - want).abs(),
            lessThanOrEqualTo(4),
            reason:
                '${source.path}: ink spans ($left,$top)-($right,$bottom), '
                'not the plane\'s own box (${topLeft.x},${topLeft.y})-'
                '(${bottomRight.x},${bottomRight.y})',
          );
        }
      }
    });
  });

  group('platform icon output', () {
    test('every Android density has all three adaptive layers', () {
      for (final density in const [
        'mdpi',
        'hdpi',
        'xhdpi',
        'xxhdpi',
        'xxxhdpi',
      ]) {
        for (final layer in const [
          'ic_launcher_background',
          'ic_launcher_foreground',
          'ic_launcher_monochrome',
        ]) {
          final path = 'android/app/src/main/res/drawable-$density/$layer.png';
          expect(File(path).existsSync(), isTrue, reason: '$path is missing');
        }
        expect(
          File(
            'android/app/src/main/res/mipmap-$density/ic_launcher.png',
          ).existsSync(),
          isTrue,
        );
      }
    });

    test('the generated Android icon carries the current mark', () {
      // The end of the pipeline, not the start: this is the file the launcher
      // actually reads, so it catches a regenerate that was never run.
      final launcher = _load(
        'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
      );
      final unit = _unitFor(launcher.width, 0.40);
      _expectPixel(
        launcher,
        (x: 2, y: 2),
        _base,
        reason: 'the shipped mipmap still has the old backdrop',
      );
      _expectPixel(
        launcher,
        _at(launcher.width, unit, _aquaPoints.first),
        _mark,
        reason: 'the shipped mipmap still has the old mark colour',
      );
      // Two things only the plane has, so a stale mipmap left over from a
      // previous drawing fails here rather than passing on the colour alone.
      _expectPixel(
        launcher,
        _at(launcher.width, unit, _foldPoints.first),
        _fold,
        reason: 'the shipped mipmap has not been regenerated with the fold',
      );
      _expectPixel(
        launcher,
        _at(launcher.width, unit, _creasePoints.first),
        _base,
        reason: 'the shipped mipmap has not been regenerated with the creases',
      );
    });

    test('the adaptive icon xml wires the monochrome layer with no inset', () {
      final xml = File(
        'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
      ).readAsStringSync();

      expect(xml, contains('@drawable/ic_launcher_background'));
      expect(xml, contains('@drawable/ic_launcher_foreground'));
      expect(
        xml,
        contains('@drawable/ic_launcher_monochrome'),
        reason: 'Android 13 themed icons need a monochrome layer',
      );
      expect(
        xml,
        isNot(contains('android:inset="16%"')),
        reason:
            'the art already respects the safe zone; a second inset shrinks '
            'the plane to a third of the layer',
      );
    });

    test('the native splash images landed on both platforms', () {
      for (final path in const [
        'android/app/src/main/res/drawable-xxxhdpi/splash.png',
        'android/app/src/main/res/drawable-xxxhdpi/android12splash.png',
        'android/app/src/main/res/drawable-night-xxxhdpi/splash.png',
        'ios/Runner/Assets.xcassets/LaunchImage.imageset/LaunchImage@3x.png',
      ]) {
        expect(File(path).existsSync(), isTrue, reason: '$path is missing');
      }
    });
  });
}
