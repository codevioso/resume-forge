import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:resume_forge/brand.dart';
import 'package:resume_forge/screens/about_screen.dart';
import 'package:resume_forge/screens/splash_screen.dart';
import 'package:resume_forge/theme/app_theme.dart';

// --- the mark's geometry, mirrored -------------------------------------------
//
// Copied from `lib/screens/splash_screen.dart` and, for the plane's points,
// from `test/brand/brand_assets_test.dart`, which asks the same questions of
// the baked PNGs. Duplicated rather than shared because these tests assert that
// two independent drawings — one in Python, one in Dart — agree, and a shared
// constant would let them agree by construction. All in the favicon's units
// (public/favicon.svg, viewBox 0 0 160 100).

const _planeCentre = Offset(80, 47.5);
const _nose = Offset(150, 5);
const _foldRoot = Offset(63, 72);

/// How far the plane flies, and how far behind the fold root the trail ends.
const _flight = 40.0;
const _trailGap = 36.0;

final _heading = (_nose - _foldRoot) / (_nose - _foldRoot).distance;

/// The trail's last dot, nearest the plane, at rest.
final _trailEnd = _foldRoot - _heading * _trailGap;

/// Inside the two aqua panels, inside the fold, inside each crease and outside
/// the plane altogether. Measured clearances are documented in
/// `test/brand/brand_assets_test.dart`.
const _aquaPoints = <Offset>[
  Offset(65, 35),
  Offset(100, 22.5),
  Offset(105, 57),
  Offset(90, 75),
];
const _foldPoints = <Offset>[Offset(55, 70), Offset(85, 47)];
const _creasePoints = <Offset>[Offset(51.1, 52.1), Offset(73.8, 68.0)];
const _outsidePoints = <Offset>[Offset(70, 86), Offset(25, 60)];

/// The fold's steel blue: the logo's second tone and the one colour of the
/// mark that is not in the theme. Mirrors `_foldBlue` in the splash and `FOLD`
/// in the generator.
const _foldBlue = Color(0xFF1D8FB8);

/// The viewports every screen in this app is reviewed at, plus a landscape
/// phone, which is the one that runs out of height first.
const _viewports = <String, Size>{
  'phone small': Size(360, 800),
  'phone normal': Size(390, 844),
  'phone large': Size(430, 932),
  'tablet': Size(768, 1024),
  'landscape phone': Size(800, 360),
};

Widget _harness(
  Widget child, {
  bool reducedMotion = false,
  double textScale = 1.0,
}) {
  return MediaQuery(
    data: MediaQueryData(
      disableAnimations: reducedMotion,
      textScaler: TextScaler.linear(textScale),
    ),
    child: MaterialApp(theme: AppTheme.build(), home: child),
  );
}

Future<void> _resize(
  WidgetTester tester,
  Size size, {
  double pixelRatio = 1.0,
  EdgeInsets insets = EdgeInsets.zero,
}) async {
  tester.view.physicalSize = size * pixelRatio;
  tester.view.devicePixelRatio = pixelRatio;
  tester.view.padding = FakeViewPadding(
    top: insets.top * pixelRatio,
    bottom: insets.bottom * pixelRatio,
  );
  addTearDown(tester.view.reset);
}

BrandMark _mark(WidgetTester tester) =>
    tester.widget<BrandMark>(find.byType(BrandMark));

double _markProgress(WidgetTester tester) => _mark(tester).progress;

/// The mark, rasterised, so what it *paints* can be asserted rather than what
/// it was handed.
///
/// The mark is a `CustomPainter` with a private painter, so its colours are not
/// reachable through the widget tree at all. They are, however, the contract
/// with `assets/brand/generate_brand.py` — the launcher icon is baked from the
/// same values — so they are worth rendering to check. The RepaintBoundary
/// this reads back is already in the tree for performance; this borrows it.
class _MarkPixels {
  const _MarkPixels(this._bytes, this._width, this._centre, this.unit);

  final ByteData _bytes;
  final int _width;

  /// The box's centre, in image pixels. From the box's logical size rather
  /// than from the image's, which is rounded to whole pixels.
  final Offset _centre;

  /// Image pixels per favicon unit once the plane has landed.
  final double unit;

  int get _height => _bytes.lengthInBytes ~/ (_width * 4);

  /// Premultiplied, as `rawRgba` returns it — identical to straight colour
  /// wherever the mark is opaque, which is everywhere a colour is asserted.
  Color at(Offset offset) {
    final index = (offset.dy.round() * _width + offset.dx.round()) * 4;
    return Color.fromARGB(
      _bytes.getUint8(index + 3),
      _bytes.getUint8(index),
      _bytes.getUint8(index + 1),
      _bytes.getUint8(index + 2),
    );
  }

  /// Where favicon point [point] of the *resting* mark lands. The box is
  /// centred on the plane's opening position, `_flight` units back along its
  /// heading from where it rests.
  Offset atRest(Offset point) =>
      _centre + (point - (_planeCentre - _heading * _flight)) * unit;

  /// Where favicon point [point] of the plane lands on *frame zero*: centred
  /// in the box, at [splashPlaneHeight] whatever the layout, scaled by
  /// [pixelRatio] into image pixels.
  Offset atOpening(Offset point, {double pixelRatio = 1.0}) =>
      _centre + (point - _planeCentre) * (splashPlaneHeight / 100 * pixelRatio);
}

Future<_MarkPixels> _rasterise(
  WidgetTester tester, {
  double pixelRatio = 1.0,
}) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.descendant(
      of: find.byType(BrandMark),
      matching: find.byType(RepaintBoundary),
    ),
  );
  late final int width;
  final bytes = await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: pixelRatio);
    width = image.width;
    final data = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
    image.dispose();
    return data;
  });
  return _MarkPixels(
    bytes!,
    width,
    boundary.size.center(Offset.zero) * pixelRatio,
    _mark(tester).height / 100 * pixelRatio,
  );
}

void main() {
  group('SplashScreen', () {
    testWidgets('renders the mark and the wordmark', (tester) async {
      await tester.pumpWidget(_harness(const SplashScreen()));
      await tester.pump();

      expect(find.byType(BrandMark), findsOneWidget);
      expect(find.byKey(brandMarkKey), findsOneWidget);
      // The shared wordmark, "plane" in the accent — not a plain-text copy of
      // the name that could drift from the home screen's and the About page's.
      expect(find.byType(BrandWordmark), findsOneWidget);
      expect(find.text(appName), findsOneWidget);
      expect(find.text('Everything stays on this device'), findsOneWidget);
    });

    testWidgets('paints the colour the native splash hands off on', (
      tester,
    ) async {
      await tester.pumpWidget(_harness(const SplashScreen()));
      await tester.pump();

      final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
      expect(
        scaffold.backgroundColor,
        AppTheme.colorScheme.surface,
        reason:
            'flutter_native_splash.yaml and values/colors.xml both paint the '
            'matte base; a different Flutter background is a visible flash. '
            'test/brand/brand_assets_test.dart checks the other three copies',
      );
    });

    testWidgets('paints the plane in flat colour, its creases cut through', (
      tester,
    ) async {
      await tester.pumpWidget(_harness(const SplashScreen()));
      await tester.pumpAndSettle();

      final pixels = await _rasterise(tester);
      const scheme = AppTheme.colorScheme;

      // Points spread over both aqua panels. A gradient could not hold one
      // value across all of them — which is the property
      // `assets/brand/generate_brand.py` bakes into the icon, and this is the
      // Dart end of that agreement. Same points as
      // test/brand/brand_assets_test.dart, so the two ends are asked the same
      // question.
      for (final point in _aquaPoints) {
        expect(
          pixels.at(pixels.atRest(point)),
          scheme.primary,
          reason:
              'the upper wing and right panel are the accent; $point is not',
        );
      }
      for (final point in _foldPoints) {
        expect(
          pixels.at(pixels.atRest(point)),
          _foldBlue,
          reason: 'the fold is the logo\'s steel blue; $point is not',
        );
      }

      // The creases are not painted at all — the surface behind the mark shows
      // through them, exactly as the backdrop does through the icon's.
      for (final point in [..._creasePoints, ..._outsidePoints]) {
        expect(
          pixels.at(pixels.atRest(point)).a,
          0,
          reason:
              '$point is a crease or outside the plane: a painted pixel here '
              'means the Flutter plane and the launcher icon have drifted '
              'apart',
        );
      }

      // The trail ends just behind the plane, in the accent.
      expect(
        pixels.at(pixels.atRest(_trailEnd)),
        scheme.primary,
        reason: 'the resting mark carries its dotted trail behind the plane',
      );
    });

    testWidgets('frame zero is the plane alone, as the native splash has it', (
      tester,
    ) async {
      await tester.pumpWidget(_harness(const SplashScreen()));
      await tester.pump();
      expect(_markProgress(tester), 0.0);

      final pixels = await _rasterise(tester);
      const scheme = AppTheme.colorScheme;

      // Centred in the box and at splashPlaneHeight, not at the layout's size:
      // the default test view lays the mark out at 140, so a plane drawn at
      // its resting size would put every one of these points somewhere else.
      for (final point in _aquaPoints) {
        expect(
          pixels.at(pixels.atOpening(point)),
          scheme.primary,
          reason:
              'frame zero must draw the plane where and as large as '
              'assets/brand/splash_logo.png does; $point is off it',
        );
      }
      for (final point in _foldPoints) {
        expect(pixels.at(pixels.atOpening(point)), _foldBlue);
      }

      // No trail yet, and nothing where the plane will come to rest: the
      // native image is the plane alone, so anything else on this frame would
      // flicker at the handoff.
      for (final point in [_trailEnd, _nose]) {
        expect(
          pixels.at(pixels.atRest(point)).a,
          0,
          reason:
              'nothing may be drawn at the resting $point on frame zero — '
              'the trail and the landed plane arrive after the handoff',
        );
      }
    });

    testWidgets('frame zero matches the native splash image, pixel for pixel', (
      tester,
    ) async {
      // The handoff itself: a 390dp phone with status and navigation bars, at
      // 4x so one image pixel of the 4x native source is one pixel here.
      const size = Size(390, 844);
      const ratio = 4.0;
      await _resize(
        tester,
        size,
        pixelRatio: ratio,
        insets: const EdgeInsets.only(top: 24, bottom: 16),
      );
      await tester.pumpWidget(_harness(const SplashScreen()));
      await tester.pump();

      // The box is centred on the *screen* — the native splash is centred on
      // the whole window, bars and all — not on the safe area.
      final box = tester.getRect(find.byKey(brandMarkKey));
      expect(box.center.dx, closeTo(size.width / 2, 0.5));
      expect(box.center.dy, closeTo(size.height / 2, 0.5));

      final pixels = await _rasterise(tester, pixelRatio: ratio);
      final native = img.decodePng(
        File('assets/brand/splash_logo.png').readAsBytesSync(),
      )!;
      final base = AppTheme.colorScheme.surface;

      // Both composited over the base, as the user sees them: the native
      // image is straight alpha, the raster premultiplied.
      double over(num straight, double alpha, double base) =>
          straight * alpha + base * 255 * (1 - alpha);
      double overPremultiplied(double premultiplied, double alpha, double b) =>
          premultiplied * 255 + b * 255 * (1 - alpha);

      var ink = 0;
      var off = 0;
      final nativeCentre = Offset(native.width / 2, native.height / 2);
      for (var y = 0; y < native.height; y++) {
        for (var x = 0; x < native.width; x++) {
          // Pixel centres, mapped from the native image into the raster.
          final position =
              pixels._centre + Offset(x + 0.5, y + 0.5) - nativeCentre;
          final row = position.dy - 0.5;
          if (row < 0 || row > pixels._height - 1) continue;
          final n = native.getPixel(x, y);
          final na = n.a / 255;
          final f = pixels.at(Offset(position.dx - 0.5, row));
          if (na == 0 && f.a == 0) continue;
          ink++;
          final worst = [
            (over(n.r, na, base.r) - overPremultiplied(f.r, f.a, base.r)),
            (over(n.g, na, base.g) - overPremultiplied(f.g, f.a, base.g)),
            (over(n.b, na, base.b) - overPremultiplied(f.b, f.a, base.b)),
          ].map((d) => d.abs()).reduce((a, b) => a > b ? a : b);
          if (worst > 64) off++;
        }
      }

      expect(ink, greaterThan(70000), reason: 'the plane must be there');
      // Two different rasterisers antialias an edge differently, so the
      // edges are allowed to disagree by a step; nothing else is. Measured at
      // 0.23% when this was written.
      expect(
        off / ink,
        lessThan(0.01),
        reason:
            '$off of $ink plane pixels differ from the native splash by '
            'more than an antialiasing step — the plane would visibly '
            'change at the handoff',
      );
    });

    testWidgets('animates from the native frame to the resting mark', (
      tester,
    ) async {
      await tester.pumpWidget(_harness(const SplashScreen()));
      await tester.pump();

      expect(_markProgress(tester), 0.0, reason: 'nothing moved on frame one');

      await tester.pump(splashEntrance ~/ 2);
      final midway = _markProgress(tester);
      expect(midway, greaterThan(0.0));
      expect(midway, lessThan(1.0));

      await tester.pumpAndSettle();
      expect(_markProgress(tester), 1.0);
    });

    testWidgets('reports its entrance exactly once, when it finishes', (
      tester,
    ) async {
      var completions = 0;
      await tester.pumpWidget(
        _harness(SplashScreen(onEntranceComplete: () => completions++)),
      );
      await tester.pump();
      expect(completions, 0);

      await tester.pump(splashEntrance ~/ 2);
      expect(completions, 0, reason: 'it must not leave mid-beat');

      await tester.pumpAndSettle();
      expect(completions, 1);

      await tester.pump(const Duration(seconds: 1));
      expect(completions, 1);
    });

    testWidgets('respects reduced motion: static frame, no ticking', (
      tester,
    ) async {
      var completions = 0;
      await tester.pumpWidget(
        _harness(
          SplashScreen(onEntranceComplete: () => completions++),
          reducedMotion: true,
        ),
      );
      await tester.pump();

      expect(
        _markProgress(tester),
        1.0,
        reason: 'the very first frame is the resting mark, not frame zero',
      );
      expect(
        SchedulerBinding.instance.transientCallbackCount,
        0,
        reason: 'no controller may be ticking when animations are disabled',
      );
      expect(
        tester.binding.hasScheduledFrame,
        isFalse,
        reason: 'a static frame schedules no more frames',
      );
      expect(
        completions,
        1,
        reason:
            'it hands off after one frame rather than after the '
            '${splashEntrance.inMilliseconds}ms entrance',
      );
    });

    testWidgets('disposes its controller when it leaves the tree', (
      tester,
    ) async {
      await tester.pumpWidget(_harness(const SplashScreen()));
      // Mid-animation, which is the case that leaks: a completed controller is
      // not ticking, a running one is.
      await tester.pump(splashEntrance ~/ 3);
      expect(SchedulerBinding.instance.transientCallbackCount, greaterThan(0));

      await tester.pumpWidget(_harness(const SizedBox.shrink()));
      await tester.pump();

      expect(find.byType(BrandMark), findsNothing);
      expect(
        SchedulerBinding.instance.transientCallbackCount,
        0,
        reason: 'the ticker must stop when the splash is gone',
      );
      // flutter_test asserts at teardown that no ticker outlived its state, so
      // a missing dispose() fails this test even without the check above.
    });

    for (final entry in _viewports.entries) {
      for (final scale in const [1.0, 2.0]) {
        testWidgets('${entry.key} at ${scale}x text does not overflow', (
          tester,
        ) async {
          await _resize(tester, entry.value);
          await tester.pumpWidget(
            _harness(const SplashScreen(), textScale: scale),
          );
          await tester.pumpAndSettle();

          expect(tester.takeException(), isNull);
          expect(find.text(appName), findsOneWidget);

          final mark = tester.getSize(find.byKey(brandMarkKey));
          expect(mark.height, greaterThan(0));
          expect(
            mark.width,
            lessThanOrEqualTo(entry.value.width),
            reason: 'the mark must never be wider than the screen',
          );

          // The copy is on screen, not pushed below it: where the mark cannot
          // be centred and still leave the words room, centring gives way.
          final tagline = tester.getRect(
            find.text('Everything stays on this device'),
          );
          expect(tagline.bottom, lessThanOrEqualTo(entry.value.height));
        });
      }
    }

    for (final entry in _viewports.entries) {
      if (entry.value.width > entry.value.height) continue;
      testWidgets('${entry.key}: the mark is centred where the native '
          'splash puts its plane', (tester) async {
        // An iPhone's bars, deliberately lopsided: the native splash is
        // centred on the whole window, so the safe area's centre — 6.5dp
        // lower — would be the wrong place.
        await _resize(
          tester,
          entry.value,
          insets: const EdgeInsets.only(top: 47, bottom: 34),
        );
        await tester.pumpWidget(_harness(const SplashScreen()));
        await tester.pump();

        final box = tester.getRect(find.byKey(brandMarkKey));
        expect(box.center.dx, closeTo(entry.value.width / 2, 0.5));
        expect(
          box.center.dy,
          closeTo(entry.value.height / 2, 0.5),
          reason:
              'frame zero\'s plane is the centre of the box; anywhere but '
              'the centre of the screen is a jump at the handoff',
        );
      });
    }

    testWidgets('the mark keeps its proportions as it is resized', (
      tester,
    ) async {
      final aspect = BrandMark.boxSizeFor(100).aspectRatio;
      for (final size in const [Size(360, 800), Size(768, 1024)]) {
        await _resize(tester, size);
        await tester.pumpWidget(_harness(const SplashScreen()));
        await tester.pumpAndSettle();

        final box = tester.getSize(find.byKey(brandMarkKey));
        expect(box.aspectRatio, closeTo(aspect, 0.01));
        expect(
          box,
          BrandMark.boxSizeFor(_mark(tester).height),
          reason: 'the widget is exactly the box it reports',
        );
      }
    });
  });

  group('StartupFailureScreen', () {
    testWidgets('says what happened and offers a way out', (tester) async {
      var retries = 0;
      await tester.pumpWidget(
        _harness(
          StartupFailureScreen(
            error: StateError('box is locked'),
            onRetry: () => retries++,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Could not open your saved resumes'), findsOneWidget);
      expect(find.textContaining('box is locked'), findsOneWidget);

      await tester.tap(find.text('Try again'));
      await tester.pump();
      expect(retries, 1);
    });

    testWidgets('renders a timeout in words rather than in exception text', (
      tester,
    ) async {
      await tester.pumpWidget(
        _harness(
          StartupFailureScreen(
            error: TimeoutException('Future not completed'),
            onRetry: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Storage did not respond.'), findsOneWidget);
      expect(find.textContaining('TimeoutException'), findsNothing);
    });

    for (final entry in _viewports.entries) {
      testWidgets('${entry.key} at 2x text does not overflow', (tester) async {
        await _resize(tester, entry.value);
        await tester.pumpWidget(
          _harness(
            StartupFailureScreen(
              error: StateError(
                'a rather long failure message that keeps '
                'going well past any reasonable width, as real exception '
                'text tends to',
              ),
              onRetry: () {},
            ),
            textScale: 2.0,
          ),
        );
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull);
        expect(find.text('Try again'), findsOneWidget);
      });
    }
  });
}
