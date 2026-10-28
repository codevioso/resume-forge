/// The product's identity, in one place.
///
/// The app name reaches the user from four directions — the home header, the
/// About screen, the splash wordmark, the leave prompt — and before this file
/// existed it was spelled independently in two of them. A rename that misses
/// one is not a compile error; it is a screen that still says the old name.
///
/// **What is deliberately *not* here.** The Dart package is `resume_forge`,
/// the repository directory is `resume-forge`, and the application id is
/// `com.codevioso.paperplane`. The first two are import paths and the third is
/// the app's identity to Android, iOS and Play — none of them is user-visible,
/// and none of them should be derived from this string. The id happens to match
/// the name today; it was changed alongside the rename only because nothing had
/// been uploaded to a store yet, and after the first upload it never changes.
library;

/// What the product is called, wherever a user can read it.
///
/// The same product as the web app (src/constants/brand.ts in the repository
/// root); the two are spelled identically on purpose.
const appName = 'Paperplane';

/// Where the part of the name the brand colours begins: "plane", the word the
/// logo pairs with its paper plane. The accent runs to the end of the name.
///
/// Held as an index into [appName] rather than as separate string literals, so
/// the name is still spelled exactly once. `test/screens/about_screen_test.dart`
/// asserts the rendered wordmark reads back as [appName], which is what keeps
/// the slicing honest.
const appNameAccentStart = 5;

/// Exactly how the developer is credited: one spelling, lowercase as given.
///
/// Lives here beside the product name because the About screen, the terms and
/// the privacy policy all name it, and three copies of a name is how one of
/// them ends up spelled differently.
const developerName = 'codevioso';
