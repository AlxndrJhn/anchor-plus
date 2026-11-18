// Where to get the source of this build, as the AGPL asks of a program that
// is passed on to people.
const _repository = 'https://github.com/AlxndrJhn/anchor-plus';

/// A release's version name ends in its commit (0.18.0-g09c6c01); any
/// other build points at main.
String _refOf(String version) =>
    RegExp(r'-g([0-9a-f]{7,40})$').firstMatch(version)?.group(1) ?? 'main';

String sourceCodeUrl(String version) => '$_repository/tree/${_refOf(version)}';

String licenseUrl(String version) =>
    '$_repository/blob/${_refOf(version)}/LICENSE';

/// The apps' privacy policy, which Google Play asks to be linked from inside
/// the app.
const privacyPolicyUrl = 'https://anchor-plus.app/privacy';
