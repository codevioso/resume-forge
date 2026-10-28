import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' show lerpDouble;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';

import '../brand.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';
import 'about_screen.dart' show BrandWordmark;

/// How long the splash entrance runs.
///
/// This is also the app's **only** minimum display time, and it is expressed
/// as "do not leave mid-beat" rather than as a delay: [SplashScreen] reports
/// when its entrance finishes, storage opens underneath it on its own
/// schedule, and `main.dart` hands off when *both* are done. Storage that takes
/// longer than this holds the splash for exactly as long as it needs and not a
/// frame more; storage that opens in 20ms — the normal case for a local Hive
/// box — costs the user this much and nothing else.
///
/// 520ms because the entrance has four staggered beats — the plane winding up
/// and flying out of the native splash's pose, its dotted trail drawing in
/// behind it, the wordmark, the privacy line — and a flight needs a little
/// longer than a fade to read as travel rather than as a jump: the flight is
/// 70% of this, 364ms, including the wind-up and the settle. The page mark
/// this replaced ran 460ms. Android's own splash-screen API caps an icon
/// animation at 1000ms, which is the ceiling this has to sit comfortably
/// under.
const splashEntrance = Duration(milliseconds: 520);

/// Crossfade from the splash to the app.
///
/// Only the *content* crossfades — see `_Handoff` in `main.dart`, which parks
/// an opaque surface behind both screens so the two identical backgrounds
/// cannot dip toward black halfway through.
const splashHandoff = Duration(milliseconds: 200);

/// Height of the plane on the splash's first frame, in logical pixels.
///
/// **This is the contract with the native splash.** The plane is drawn in the
/// favicon's 160 x 100 coordinate space (see below), and this is the on-screen
/// height of that 100-unit space — so 1 unit is 1dp and the plane is 140dp
/// nose to wing tip. `assets/brand/generate_brand.py` draws both native splash
/// images at exactly that size (`SPLASH_UNIT`), and the Flutter splash opens
/// the plane at exactly that size on every device, whatever the layout later
/// grows or shrinks it to — so the OS's splash and Flutter's first frame show
/// the same plane, at the same size, in the same place.
/// `test/brand/brand_assets_test.dart` holds the two ends together.
const splashPlaneHeight = 100.0;

// --- the plane ---------------------------------------------------------------
//
// Mirrored from `assets/brand/generate_brand.py`, which bakes the same drawing
// into the launcher icon and the native splash; if one moves, both move. Every
// point is in the coordinate space of the web app's favicon
// (public/favicon.svg, viewBox 0 0 160 100, y down), so a point can be copied
// between the three files without conversion.

/// Where all three panels meet.
const _nose = Offset(150, 5);

/// The far end of the upper wing.
const _wingTip = Offset(10, 42);

/// Where the upper wing's trailing edge meets the keel; the outer end of the
/// upper crease.
const _wingRoot = Offset(40, 57);

/// The bottom of the fold.
const _keel = Offset(45, 90);

/// The inner corner of the notch under the plane; the outer end of the lower
/// crease, which runs from here to the nose and is the plane's spine.
const _foldRoot = Offset(63, 72);

/// The trailing corner of the right panel.
const _tail = Offset(98, 90);

/// The centre of the plane's bounding box (10..150, 5..90). Its area centroid
/// is four units right of this and level with it, so this is also the optical
/// centre — the point the plane is centred on everywhere it is drawn.
const _planeCentre = Offset(80, 47.5);

/// Nose to wing tip, in units: the plane's width.
const _planeSpan = 140.0;

/// Width of each crease where it reaches the plane's edge, in units; zero at
/// the nose.
///
/// The favicon separates its panels with a navy outline, which measures 1.19:1
/// on this app's base — invisible. Stroking that outline in the base colour
/// instead would cut the nose back by 16 to 33 units, because the panels meet
/// there in wedges of 10 to 21 degrees; tapered creases keep the nose exactly
/// where the favicon has it. See `assets/brand/generate_brand.py`.
const _crease = 7.5;

/// The fold: the logo's second tone, the face of the plane turned away.
///
/// The one colour in this widget that is not read from the theme, on purpose.
/// The app keeps exactly one accent, and this is not a second one — it appears
/// nowhere in the chrome, only inside the mark — so it lives beside the mark's
/// geometry rather than in the [ColorScheme] every screen reads. 5.21:1 on the
/// base. `generate_brand.py` bakes the same value as `FOLD`, and
/// `test/brand/brand_assets_test.dart` checks both ends.
const _foldBlue = Color(0xFF1D8FB8);

// --- the flight ----------------------------------------------------------------
//
// Splash only: the launcher icon and the native splash are the plane alone, so
// none of this is mirrored in Python.

/// How far the plane flies, in units along its heading.
///
/// The plane opens where the native splash left it — centred — and flies this
/// far up and to the right to its resting place, laying the straight end of its
/// trail behind it. 40 units — about half the plane's own height — reads as a
/// flight rather than a nudge, and is short enough that the resting plane and
/// its opening pose still share one modest box.
const _flight = 40.0;

/// From the fold root back along the spine to the trail's last dot, in units.
///
/// The spine runs out of the plane 3.3 units from the keel, 25 units back from
/// the fold root, so 36 leaves the last dot 11.2 units from the keel — clear of
/// the plane with a visible gap, close enough to read as coming out of it.
const _trailGap = 36.0;

/// The trail's shape behind the flight: it carries on back along the heading
/// until it is [_trailDrop] units below the take-off point, then bends level
/// and runs [_trailRun] units further left — a climb out of level flight.
///
/// [_trailRun] is what balances the composition. The plane is the heavy end and
/// sits up and to the right; at 40 units the resting mark's ink reaches 112
/// units left of the screen's centre and 102 right of it (measured from a
/// render), so its middle sits 5 units left of centre — which is where the eye
/// puts the middle of a shape that carries all its weight at one end.
/// Vertically it is 67 above and 70 below: level.
const _trailDrop = 22.0;
const _trailRun = 40.0;

/// The dots, measured back from the end nearest the plane: one every
/// [_dotSpacing] units, [_dotRadius] units at the plane and [_dotTaper] of that
/// smaller at the far end — a trail fading with distance, but flat: every dot
/// is one solid colour, only its size changes.
const _dotSpacing = 11.0;
const _dotRadius = 3.0;
const _dotTaper = 0.45;

/// How far, in units, the trail's drawing front has to pass a dot before the
/// dot is full size. Dots grow in rather than blinking on.
const _dotGrow = 16.0;

/// The part of the entrance the flight and the trail take.
const _flightEnd = 0.70;

/// The flight's easing: a small wind-up back along the heading, the throw, and
/// an overshoot that settles. Both swings are 9.3% of [_flight] — 3.7 units —
/// which is a paper plane being thrown rather than a sprite being moved.
const _flightCurve = Curves.easeInOutBack;

/// The furthest [_flightCurve] carries the plane past its resting place, as a
/// fraction of [_flight]. Measured from the curve, and only used to make room
/// for the overshoot in the box.
const _overshoot = 0.093;

/// Air around the resting mark inside its box, in units.
const _boxMargin = 6.0;

/// Height the mark is allowed to take — the plane's 100-unit height, in
/// logical pixels.
///
/// The upper bound is what stops a tablet from rendering a 300px logo: at 140
/// the plane is 196dp wide. The lower bound is comfortable rather than a limit,
/// since the same drawing is legible as a 48px launcher icon, where the plane
/// is 38px wide; 56 is a 78dp plane, which is what the splash's composition
/// wants rather than what the mark needs.
const _markMaxHeight = 140.0;
const _markMinHeight = 56.0;

/// Share of the viewport's width the plane may take.
///
/// 140/390: on a 390dp-wide phone the layout gives the plane exactly the 140dp
/// it opens at, so the flight is all movement and no resizing. Elsewhere the
/// plane grows or shrinks from [splashPlaneHeight] to its layout size as it
/// flies. Its box, trail and all, is 0.61 of the viewport's width.
const _planeWidthShare = 140 / 390;

/// Height of the wordmark, the tagline and the gaps around them at text scale
/// 1. Subtracted from the viewport before the mark is sized, so on a short
/// screen the mark gives up its space to the words instead of pushing them out.
const _copyReserve = 150.0;

/// Widest the tagline is allowed to run.
const _maxProseWidth = 380.0;

/// Addresses the mark from a test.
@visibleForTesting
const brandMarkKey = Key('brand-mark');

/// One dot of the trail: where it is, how far along the trail (from its far
/// end), and its full-grown radius — all in units.
typedef _Dot = ({Offset at, double arc, double radius});

/// The mark's geometry in units, worked out once.
///
/// Built from the constants above rather than written out, so the creases, the
/// trail and the box cannot drift from the numbers they are documented by.
class _Geometry {
  _Geometry._({
    required this.panels,
    required this.heading,
    required this.dots,
    required this.trailLength,
    required this.box,
  });

  static final instance = _build();

  /// The three panels with their creases open, and which one is the fold.
  final List<({Path path, bool fold})> panels;

  /// Unit vector from the fold root to the nose: the way the plane points.
  final Offset heading;

  /// The trail's dots, nearest the plane first.
  final List<_Dot> dots;

  /// Arc length of the whole trail, far end to the dot nearest the plane.
  final double trailLength;

  /// The mark's box, in units. Centred on the plane's *opening* position —
  /// which is what puts the native splash's plane and Flutter's first frame in
  /// the same place — and sized to hold the resting mark, overshoot and all.
  final Rect box;

  static _Geometry _build() {
    Offset slide(Offset point, Offset toward, double distance) {
      final along = toward - point;
      return point + along / along.distance * distance;
    }

    // How far to slide a crease's root along each of its two edges so the
    // crease comes out _crease wide, measured square to the nose-root line.
    // See `_crease_slide` in generate_brand.py.
    double creaseSlide(Offset root, Offset a, Offset b) {
      final spine = _nose - root;
      double sine(Offset other) {
        final edge = other - root;
        return (spine.dx * edge.dy - spine.dy * edge.dx).abs() /
            (spine.distance * edge.distance);
      }

      return _crease / (sine(a) + sine(b));
    }

    Path polygon(List<Offset> points) => Path()..addPolygon(points, true);

    final wing = creaseSlide(_wingRoot, _wingTip, _keel);
    final fold = creaseSlide(_foldRoot, _keel, _tail);
    final shapes = [
      (
        points: [_nose, _wingTip, slide(_wingRoot, _wingTip, wing)],
        fold: false,
      ),
      (
        points: [
          _nose,
          slide(_wingRoot, _keel, wing),
          _keel,
          slide(_foldRoot, _keel, fold),
        ],
        fold: true,
      ),
      (points: [_nose, slide(_foldRoot, _tail, fold), _tail], fold: false),
    ];

    final spine = _nose - _foldRoot;
    final heading = spine / spine.distance;

    // The trail, from its far end to the plane: level flight, a climb, then
    // the straight run the plane flies on screen.
    final end = _foldRoot - heading * _trailGap;
    final takeoff = end - heading * _flight;
    final bend = takeoff - heading * (_trailDrop / heading.dy.abs());
    final start = bend - const Offset(_trailRun, 0);
    final metric =
        (Path()
              ..moveTo(start.dx, start.dy)
              ..quadraticBezierTo(bend.dx, bend.dy, takeoff.dx, takeoff.dy)
              ..lineTo(end.dx, end.dy))
            .computeMetrics()
            .single;
    final length = metric.length;
    final dots = <_Dot>[
      // Measured back from the plane, so a dot always sits exactly at the
      // trail's end and the spacing is never uneven where the eye is looking.
      for (var arc = length; arc >= 0; arc -= _dotSpacing)
        (
          at: metric.getTangentForOffset(arc)!.position,
          arc: arc,
          radius: _dotRadius * (1 - _dotTaper * (1 - arc / length)),
        ),
    ];

    // Symmetric about the opening position: the box is centred on screen, so
    // its centre is where the native splash put the plane.
    final centre = _planeCentre - heading * _flight;
    var halfWidth = 0.0;
    var halfHeight = 0.0;
    void include(Offset point, [double radius = 0]) {
      halfWidth = math.max(halfWidth, (point.dx - centre.dx).abs() + radius);
      halfHeight = math.max(halfHeight, (point.dy - centre.dy).abs() + radius);
    }

    for (final shape in shapes) {
      for (final point in shape.points) {
        include(point);
        include(point + heading * (_flight * _overshoot));
      }
    }
    for (final dot in dots) {
      include(dot.at, dot.radius);
    }

    return _Geometry._(
      panels: [
        for (final shape in shapes)
          (path: polygon(shape.points), fold: shape.fold),
      ],
      heading: heading,
      dots: dots,
      trailLength: length,
      box: Rect.fromCenter(
        center: centre,
        width: (halfWidth + _boxMargin) * 2,
        height: (halfHeight + _boxMargin) * 2,
      ),
    );
  }
}

/// The brand mark: the paper plane from the logo — two aqua panels and a
/// steel-blue fold, split by creases that converge at the nose — with its
/// dotted flight trail curving away behind it.
///
/// Flat throughout. Three solid polygons and a row of solid dots on the
/// surface colour; no outline, no shadow, no glow.
///
/// The plane's geometry is shared with the launcher icon (see `assets/brand`),
/// so the thing that animates in here is literally the thing on the home screen
/// the user just tapped. The trail is the one part that is not: it is motion,
/// so it only exists here, and it is absent on the frame the native splash is
/// cut from.
///
/// Every colour comes from the theme except the fold — see [_foldBlue].
///
/// [progress] runs 0..1 and drives the whole drawing. At 0 it is the plane
/// alone, centred in the box at [splashPlaneHeight] — the native splash's
/// image, exactly. Through the flight the plane winds up, flies along its
/// heading to the box's upper right and settles, growing or shrinking to
/// [height] on the way, while the trail draws in from its far end and catches
/// up behind it. At 1 it is the finished mark, which is also what
/// reduced-motion renders on the very first frame.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, required this.height, this.progress = 1.0});

  /// Height of the plane's 100-unit drawing space once it has landed — so the
  /// plane itself is 1.4 times this wide. The widget is larger than this — see
  /// [boxSizeFor] — because the trail and the flight need room.
  final double height;

  /// 0 = the native splash's frame, 1 = the finished mark.
  final double progress;

  /// The box a mark of [height] occupies.
  static Size boxSizeFor(double height) {
    final box = _Geometry.instance.box;
    return Size(box.width * height / 100, box.height * height / 100);
  }

  /// Largest mark that fits the space left after the copy is reserved.
  ///
  /// Sized from the viewport rather than fixed: a landscape phone at double
  /// text size has barely a heading's worth of height to spare, and a mark that
  /// insists on its full size there pushes the wordmark off the screen.
  static double heightFor(BoxConstraints constraints, TextScaler scaler) {
    final boxHeightRatio = _Geometry.instance.box.height / 100;
    final byHeight = constraints.maxHeight.isFinite
        ? (constraints.maxHeight - scaler.scale(_copyReserve)) / boxHeightRatio
        : double.infinity;
    final byWidth =
        constraints.maxWidth * _planeWidthShare / (_planeSpan / 100);
    return math.min(byHeight, byWidth).clamp(_markMinHeight, _markMaxHeight);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final size = boxSizeFor(height);

    // Decorative: the wordmark underneath already names the app, so a screen
    // reader announcing the drawing as well would just repeat it.
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: SizedBox(
          key: brandMarkKey,
          width: size.width,
          height: size.height,
          child: CustomPaint(
            painter: _MarkPainter(
              // The accent, straight and undiluted — the same value
              // `assets/brand/generate_brand.py` bakes into the icon, which is
              // what `test/brand/brand_assets_test.dart` checks the two ends of.
              mark: scheme.primary,
              fold: _foldBlue,
              // What the native splash drew the plane at, relative to this
              // layout. Bounded so a freak layout cannot fly a giant plane out
              // of its box; on every viewport the splash is reviewed at it is
              // between 0.71 (tablet) and 1.08 (360dp phone).
              opening: (splashPlaneHeight / height).clamp(0.5, 1.5),
              progress: progress.clamp(0.0, 1.0),
            ),
          ),
        ),
      ),
    );
  }
}

class _MarkPainter extends CustomPainter {
  const _MarkPainter({
    required this.mark,
    required this.fold,
    required this.opening,
    required this.progress,
  });

  final Color mark;
  final Color fold;
  final double opening;
  final double progress;

  /// Eased slice of [progress] between [begin] and [end]. Can leave 0..1 when
  /// [curve] overshoots, which the flight's does on purpose.
  double _at(double begin, double end, Curve curve) =>
      curve.transform(((progress - begin) / (end - begin)).clamp(0.0, 1.0));

  @override
  void paint(Canvas canvas, Size size) {
    final geometry = _Geometry.instance;
    final box = geometry.box;
    final heading = geometry.heading;
    final markPaint = Paint()..color = mark;

    // Everything below is drawn in favicon units.
    canvas
      ..save()
      ..scale(size.height / box.height)
      ..translate(-box.left, -box.top);

    // How much of the flight is done. Dips below 0 for the wind-up and passes
    // 1 for the overshoot; exactly 0 on frame zero and exactly 1 at rest.
    final flown = _at(0, _flightEnd, _flightCurve);

    // Beat one, underneath: the trail draws in from its far end.
    //
    // The front sweeps the whole trail while the plane covers only its last
    // straight stretch, so it starts well behind and catches up as the plane
    // settles. [carried] is how far along the trail the plane's tail has got;
    // no dot ever appears ahead of it, so the trail can never be drawn through
    // or in front of the plane, whatever the timing does.
    final carried = geometry.trailLength - _flight * (1 - flown);
    final front =
        (geometry.trailLength + _dotGrow) *
        _at(0, _flightEnd, Curves.easeInOutSine);
    for (final dot in geometry.dots) {
      if (dot.arc > carried) continue;
      final grown = ((front - dot.arc) / _dotGrow).clamp(0.0, 1.0);
      if (grown <= 0) continue;
      canvas.drawCircle(dot.at, dot.radius * grown, markPaint);
    }

    // Beat two: the plane flies.
    //
    // Deliberately opaque, centred and at [splashPlaneHeight] on the very
    // first frame. `assets/brand/splash_logo.png` is this exact drawing — the
    // plane alone, no trail — at that size, and the box is centred on screen
    // on the point the plane opens at, so the OS's splash and Flutter's first
    // frame show the same object in the same place. A plane that faded in, or
    // started anywhere else, would mean the mark vanished or jumped at the
    // handoff, which is the flicker this whole arrangement exists to avoid.
    final scale = lerpDouble(
      opening,
      1,
      _at(0, _flightEnd, Curves.easeInOutCubic),
    )!;
    final position = _planeCentre - heading * (_flight * (1 - flown));
    canvas
      ..translate(position.dx, position.dy)
      ..scale(scale)
      ..translate(-_planeCentre.dx, -_planeCentre.dy);

    final foldPaint = Paint()..color = fold;
    for (final panel in geometry.panels) {
      canvas.drawPath(panel.path, panel.fold ? foldPaint : markPaint);
    }

    canvas.restore();
  }

  @override
  bool shouldRepaint(_MarkPainter old) =>
      old.progress != progress ||
      old.mark != mark ||
      old.fold != fold ||
      old.opening != opening;
}

/// The animated brand frame shown while local storage opens.
///
/// It does no work of its own beyond drawing: no plugins, no channels, no I/O,
/// nothing that can hang. Startup runs in `main.dart` underneath it and this
/// screen only reports, through [onEntranceComplete], that it has finished
/// saying what it has to say.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key, this.onEntranceComplete});

  /// Fired once the entrance has played out — or, when the platform asks for
  /// reduced motion, after the first frame of the static mark. Never fired
  /// synchronously from a build.
  final VoidCallback? onEntranceComplete;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: splashEntrance,
  );

  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;

    // Reduced motion is a MediaQuery, so this is the earliest it can be read —
    // initState has no inherited widgets yet.
    if (MediaQuery.disableAnimationsOf(context)) {
      // Straight to the resting frame. The controller is never started, so
      // nothing ticks and there is no animation to interrupt. Set before the
      // listener is attached, because assigning `value` fires a status change
      // and handing off from inside didChangeDependencies would call setState
      // on an ancestor mid-build.
      _controller.value = 1;
      SchedulerBinding.instance.addPostFrameCallback((_) {
        if (mounted) widget.onEntranceComplete?.call();
      });
      return;
    }

    _controller
      ..addStatusListener(_onStatus)
      ..forward();
  }

  void _onStatus(AnimationStatus status) {
    if (status == AnimationStatus.completed) {
      widget.onEntranceComplete?.call();
    }
  }

  @override
  void dispose() {
    _controller
      ..removeStatusListener(_onStatus)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tokens = context.tokens;
    // Read here, above the SafeArea, which strips it: the native splash is
    // centred on the whole window, not on the part of it clear of the bars.
    final insets = MediaQuery.paddingOf(context);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      // There is no AppBar here to publish it, and the app's very first screen
      // is the one most likely to inherit whatever the OS was showing — light
      // status-bar glyphs on this background would be invisible.
      value: AppTheme.systemOverlay,
      child: Scaffold(
        // Stated rather than inherited: this exact colour is the contract with
        // the native splash (flutter_native_splash.yaml) and with the Android
        // window background (values/colors.xml). If the three ever disagree the
        // user sees a flash of another colour at launch.
        backgroundColor: theme.colorScheme.surface,
        body: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final scaler = MediaQuery.textScalerOf(context);
              final height = BrandMark.heightFor(constraints, scaler);
              final box = BrandMark.boxSizeFor(height);
              final inset = tokens.spaceXl;

              // The mark's box is centred on the *screen*, not grouped with the
              // copy and centred as a block: the native splash's plane is in
              // the middle of the window, and the box is centred on the point
              // the plane opens at, so this is what makes the handoff land in
              // place. The copy hangs below it.
              //
              // On a screen too short for that — a landscape phone, where the
              // mark is already sized to leave only the copy's room — the lead
              // gives way first and the block simply starts at the top.
              final screenCentre =
                  constraints.maxHeight / 2 + (insets.bottom - insets.top) / 2;
              final room =
                  constraints.maxHeight -
                  inset * 2 -
                  box.height -
                  scaler.scale(_copyReserve);
              final lead = (screenCentre - box.height / 2 - inset)
                  .clamp(0.0, math.max(0.0, room))
                  .toDouble();

              // Never overflows, and only actually scrolls in the cases that
              // cannot fit at all — a landscape phone at double text size.
              return SingleChildScrollView(
                padding: EdgeInsets.all(inset),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: math.max(0, constraints.maxHeight - inset * 2),
                  ),
                  child: Align(
                    alignment: Alignment.topCenter,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(height: lead),
                        AnimatedBuilder(
                          animation: _controller,
                          builder: (context, _) => _Content(
                            progress: _controller.value,
                            markHeight: height,
                            tokens: tokens,
                            theme: theme,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

/// One frame of the splash at a given [progress].
class _Content extends StatelessWidget {
  const _Content({
    required this.progress,
    required this.markHeight,
    required this.tokens,
    required this.theme,
  });

  final double progress;
  final double markHeight;
  final AppTokens tokens;
  final ThemeData theme;

  static double _at(double value, double begin, double end) => Curves.easeOut
      .transform(((value - begin) / (end - begin)).clamp(0.0, 1.0));

  @override
  Widget build(BuildContext context) {
    // The words arrive as the plane is landing, not after it: the wordmark
    // starts while it is still in the air and the privacy line once it has
    // touched down, so the entrance reads as one movement.
    final wordmark = _at(progress, 0.45, 0.82);
    final tagline = _at(progress, 0.60, 1.0);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        BrandMark(height: markHeight, progress: progress),
        SizedBox(height: tokens.spaceLg),
        Opacity(
          opacity: wordmark,
          // Rises the last few pixels into place under the mark.
          child: Transform.translate(
            offset: Offset(0, tokens.spaceSm * (1 - wordmark)),
            // A wordmark is a graphic, not a paragraph, so it is never allowed
            // to wrap. "ResumeForge" needed this at the sizes this app is
            // reviewed at: at 2x text on a 360dp phone it broke to
            // "ResumeForg / e". "Paperplane" is one unbreakable word again,
            // and on that same phone — 312dp of room once the 24dp inset is
            // taken off both sides — it fits at 1x and 2x; scaleDown only ever
            // shrinks, so up to that point the wordmark still grows with text
            // scale exactly as the user asked, and past it it shrinks rather
            // than breaking the word in half.
            child: FittedBox(
              fit: BoxFit.scaleDown,
              // The same wordmark as the home screen and the About screen,
              // with "plane" in the accent — which is also the colour of the
              // plane above it, so the word and the drawing read as one logo.
              child: BrandWordmark(
                maxLines: 1,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.4,
                ),
              ),
            ),
          ),
        ),
        SizedBox(height: tokens.spaceSm),
        Opacity(
          opacity: tagline,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: _maxProseWidth),
            child: Text(
              'Everything stays on this device',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Shown when local storage will not open.
///
/// The splash must never be a place the user gets stuck: `main.dart` puts a
/// watchdog on startup, and anything that throws or runs long lands here with
/// something to read and something to press, rather than on a mark that
/// animates forever.
class StartupFailureScreen extends StatelessWidget {
  const StartupFailureScreen({
    super.key,
    required this.error,
    required this.onRetry,
  });

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tokens = context.tokens;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: AppTheme.systemOverlay,
      child: Scaffold(
        backgroundColor: theme.colorScheme.surface,
        body: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final inset = tokens.spaceXl;
              return SingleChildScrollView(
                padding: EdgeInsets.all(inset),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: math.max(0, constraints.maxHeight - inset * 2),
                  ),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(
                        maxWidth: _maxProseWidth,
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: tokens.minTouchTarget * 1.5,
                            height: tokens.minTouchTarget * 1.5,
                            decoration: BoxDecoration(
                              color: theme.colorScheme.errorContainer,
                              borderRadius: BorderRadius.circular(
                                tokens.radiusLg,
                              ),
                            ),
                            child: Icon(
                              Icons.error_outline,
                              size: tokens.spaceXxl,
                              color: theme.colorScheme.onErrorContainer,
                            ),
                          ),
                          SizedBox(height: tokens.spaceLg),
                          Text(
                            'Could not open your saved resumes',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          SizedBox(height: tokens.spaceSm),
                          Text(
                            '$appName keeps everything on this device, and its '
                            'local storage did not open. Nothing has been '
                            'lost — it just cannot be read yet.',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                          SizedBox(height: tokens.spaceSm),
                          // The technical detail, in the small print. Useless to
                          // most people and the only useful thing in the world to
                          // whoever gets the bug report.
                          Text(
                            _detail(error),
                            textAlign: TextAlign.center,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                          SizedBox(height: tokens.spaceXl),
                          FilledButton.icon(
                            onPressed: onRetry,
                            icon: const Icon(Icons.refresh),
                            label: const Text('Try again'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  /// A timeout has a message nobody can act on, so it gets said in words.
  static String _detail(Object error) =>
      error is TimeoutException ? 'Storage did not respond.' : error.toString();
}
