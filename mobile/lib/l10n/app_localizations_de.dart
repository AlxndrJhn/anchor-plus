// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for German (`de`).
class AppLocalizationsDe extends AppLocalizations {
  AppLocalizationsDe([String locale = 'de']) : super(locale);

  @override
  String get appName => 'Anchor Notes';

  @override
  String get commonBack => 'Zurück';

  @override
  String get commonCancel => 'Abbrechen';

  @override
  String get commonClose => 'Schließen';

  @override
  String get commonDone => 'Fertig';

  @override
  String get commonMenu => 'Menü';

  @override
  String get commonCloseMenu => 'Menü schließen';

  @override
  String get commonShowPassword => 'Passwort anzeigen';

  @override
  String get commonHidePassword => 'Passwort verbergen';

  @override
  String get commonSelectedNotes => 'Ausgewählte Notizen';

  @override
  String get commonPlay => 'Abspielen';

  @override
  String get commonPause => 'Pause';

  @override
  String commonPlayItem(String name) {
    return '$name abspielen';
  }

  @override
  String commonPauseItem(String name) {
    return '$name pausieren';
  }

  @override
  String commonSwitchOn(String label) {
    return '$label, an';
  }

  @override
  String commonSwitchOff(String label) {
    return '$label, aus';
  }

  @override
  String get formOffline =>
      'Du bist offline. Verbinde dich mit dem Internet, um fortzufahren.';

  @override
  String get linkInvalid => 'Ungültiger Link';

  @override
  String get linkCantOpen => 'Link konnte nicht geöffnet werden';

  @override
  String get densityDefault => 'Standard';

  @override
  String get densityCompact => 'Kompakt';

  @override
  String get noteFontSans => 'Sans';

  @override
  String get noteFontSerif => 'Serif';

  @override
  String get noteFontMono => 'Mono';

  @override
  String get textSizeSmall => 'Klein';

  @override
  String get textSizeDefault => 'Standard';

  @override
  String get textSizeLarge => 'Groß';

  @override
  String get lineSpacingTight => 'Eng';

  @override
  String get lineSpacingRelaxed => 'Weit';

  @override
  String get errorOffline => 'Keine Internetverbindung.';

  @override
  String get errorTimeout => 'Der Server hat zu lange nicht geantwortet.';

  @override
  String get errorCertificate =>
      'Dem Zertifikat des Servers wird nicht vertraut.';

  @override
  String get errorCancelled => 'Die Anfrage wurde abgebrochen.';

  @override
  String get errorSignInAgain => 'Melde dich erneut an, um fortzufahren.';

  @override
  String get errorForbidden => 'Dafür hast du keine Berechtigung.';

  @override
  String get errorNotFound => 'Der Eintrag wurde nicht gefunden.';

  @override
  String get errorIncompatible =>
      'App und Server sind nicht kompatibel. Aktualisiere beide, um fortzufahren.';

  @override
  String get errorCheckInput => 'Prüfe deine Eingaben.';

  @override
  String get errorGeneric =>
      'Etwas ist schiefgelaufen. Versuch es noch einmal.';

  @override
  String get errorServer =>
      'Auf dem Server ist ein Problem aufgetreten. Versuch es später noch einmal.';

  @override
  String get commonSave => 'Speichern';

  @override
  String get commonSaving => 'Wird gespeichert…';

  @override
  String get commonUndo => 'Rückgängig';

  @override
  String get fieldName => 'Name';

  @override
  String get fieldNameHint => 'Dein Name';

  @override
  String get fieldEmail => 'E-Mail';

  @override
  String get fieldEmailHint => 'du@example.com';

  @override
  String get fieldPassword => 'Passwort';

  @override
  String get fieldCurrentPassword => 'Aktuelles Passwort';

  @override
  String get fieldNewPassword => 'Neues Passwort';

  @override
  String passwordHelp(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Mindestens $count Zeichen.',
      one: 'Mindestens 1 Zeichen.',
    );
    return '$_temp0';
  }

  @override
  String get authEnterName => 'Gib deinen Namen ein.';

  @override
  String get authEnterEmail => 'Gib deine E-Mail-Adresse ein.';

  @override
  String get authEnterValidEmail => 'Gib eine gültige E-Mail-Adresse ein.';

  @override
  String get authEnterPassword => 'Gib dein Passwort ein.';

  @override
  String get authEnterCurrentPassword => 'Gib dein aktuelles Passwort ein.';

  @override
  String authPasswordTooShort(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Verwende mindestens $count Zeichen.',
      one: 'Verwende mindestens 1 Zeichen.',
    );
    return '$_temp0';
  }

  @override
  String get fieldTwoStepCode => 'Code aus deiner Authenticator-App';

  @override
  String get authTwoStepCodeHelp =>
      'Handy verloren? Gib stattdessen einen deiner Wiederherstellungscodes ein.';

  @override
  String get authEnterTwoStepCode =>
      'Gib den Code aus deiner Authenticator-App ein.';

  @override
  String get authWrongTwoStepCode =>
      'Dieser Code ist nicht richtig. Prüfe deine Authenticator-App und versuch es noch einmal.';

  @override
  String get authPasskeyOnly =>
      'Dieses Konto meldet sich mit einem Passkey an. Melde dich im Web an und scanne dann den QR-Code unter Einstellungen › Anmeldung am Handy.';

  @override
  String get authSecondFactorSetup =>
      'Dein Admin verlangt von allen die Anmeldung mit einem Passkey oder einer Authenticator-App. Richte eines davon in Anchor+ im Web ein und melde dich dann hier an.';

  @override
  String get authIncorrectCredentials => 'E-Mail oder Passwort ist falsch.';

  @override
  String get authPasswordless =>
      'Dieses Konto verwendet kein Passwort. Melde dich stattdessen über deinen Anbieter an.';

  @override
  String get authPendingApproval =>
      'Dein Konto wartet auf die Freigabe durch einen Admin.';

  @override
  String authPasswordSignInOff(String provider) {
    return 'Die Anmeldung mit E-Mail und Passwort ist ausgeschaltet. Melde dich mit $provider an.';
  }

  @override
  String authPasswordSignUpOff(String provider) {
    return 'Die Registrierung mit E-Mail und Passwort ist ausgeschaltet. Registriere dich mit $provider.';
  }

  @override
  String get authPasswordSignInOffHere =>
      'Die Anmeldung mit E-Mail und Passwort ist auf diesem Server ausgeschaltet.';

  @override
  String get authPasswordSignUpOffHere =>
      'Die Registrierung mit E-Mail und Passwort ist auf diesem Server ausgeschaltet.';

  @override
  String get authRegistrationClosed =>
      'Dieser Server nimmt keine neuen Konten an.';

  @override
  String get authEmailTaken =>
      'Ein Konto mit dieser E-Mail-Adresse existiert bereits.';

  @override
  String get authWrongCurrentPassword => 'Dein aktuelles Passwort ist falsch.';

  @override
  String get authSamePassword =>
      'Dein neues Passwort muss sich vom aktuellen unterscheiden.';

  @override
  String get authUnreachable =>
      'Dein Server ist nicht erreichbar. Prüfe deine Verbindung und versuch es noch einmal.';

  @override
  String get authProviderNotSetUp =>
      'Die Anmeldung über einen Anbieter ist auf diesem Server nicht eingerichtet.';

  @override
  String get authProviderFailed =>
      'Anmeldung über deinen Anbieter fehlgeschlagen. Versuch es noch einmal.';

  @override
  String authProviderFailedWith(String detail) {
    return 'Anmeldung über deinen Anbieter fehlgeschlagen: $detail';
  }

  @override
  String get authSignIn => 'Anmelden';

  @override
  String get authSigningIn => 'Anmeldung läuft…';

  @override
  String authContinueWith(String provider) {
    return 'Weiter mit $provider';
  }

  @override
  String authOpeningProvider(String provider) {
    return '$provider wird geöffnet…';
  }

  @override
  String get authWelcomeBack => 'Willkommen zurück';

  @override
  String get authSignInToAnchor =>
      'Melde dich an, um mit Anchor weiterzumachen.';

  @override
  String authSignInTo(String server) {
    return 'Bei $server anmelden';
  }

  @override
  String get authOfflineSignIn =>
      'Du bist offline. Verbinde dich mit dem Internet, um dich anzumelden.';

  @override
  String get authNewToAnchor => 'Neu bei Anchor?';

  @override
  String get authNoAccountNeeded => 'Nur Notizen machen?';

  @override
  String get authUseWithoutServer => 'Ohne Server nutzen';

  @override
  String get authCreateAnAccount => 'Konto erstellen';

  @override
  String get authOr => 'oder';

  @override
  String get authCreateAccount => 'Konto erstellen';

  @override
  String get authCreatingAccount => 'Konto wird erstellt…';

  @override
  String get authCreateYourAccount => 'Erstelle dein Konto';

  @override
  String get authApprovalNeeded =>
      'Neue Konten müssen von einem Admin freigegeben werden, bevor du dich anmelden kannst.';

  @override
  String get authRegisterSubtitle => 'Halte deine Gedanken fest.';

  @override
  String get authAlreadyHaveAccount => 'Du hast schon ein Konto?';

  @override
  String authWelcomeName(String name) {
    return 'Willkommen bei Anchor, $name';
  }

  @override
  String get authWaitingTitle => 'Warten auf Freigabe';

  @override
  String get authWaitingMessage =>
      'Ein Admin muss dein Konto freigeben, bevor du dich anmelden kannst.';

  @override
  String get authBackToSignIn => 'Zurück zur Anmeldung';

  @override
  String get passwordTitle => 'Passwort';

  @override
  String get passwordChange => 'Passwort ändern';

  @override
  String get passwordChanging => 'Wird geändert…';

  @override
  String get passwordChanged => 'Passwort geändert';

  @override
  String get passwordOffline =>
      'Du bist offline. Verbinde dich mit dem Internet, um dein Passwort zu ändern.';

  @override
  String get profileTitle => 'Profil';

  @override
  String get profileSaved => 'Profil gespeichert';

  @override
  String get profileOffline =>
      'Du bist offline. Verbinde dich mit dem Internet, um dein Profil zu ändern.';

  @override
  String get profilePhoto => 'Profilbild';

  @override
  String get profilePhotoVisible =>
      'Personen, mit denen du Notizen teilst, können es sehen.';

  @override
  String get profileTakePhoto => 'Foto aufnehmen';

  @override
  String get profileChoosePhoto => 'Foto auswählen';

  @override
  String get profileRemovePhoto => 'Foto entfernen';

  @override
  String get profilePhotoUpdated => 'Foto aktualisiert';

  @override
  String get profilePhotoUpdateFailed =>
      'Foto konnte nicht aktualisiert werden';

  @override
  String get profilePhotoRemoved => 'Foto entfernt';

  @override
  String get profilePhotoRemoveFailed => 'Foto konnte nicht entfernt werden';

  @override
  String get profileEmailAdminOnly =>
      'Nur ein Admin kann deine E-Mail-Adresse ändern.';

  @override
  String get profileChangePhoto => 'Profilbild ändern';

  @override
  String get commonContinue => 'Weiter';

  @override
  String commonExpandedItem(String label) {
    return '$label, aufgeklappt';
  }

  @override
  String commonCollapsedItem(String label) {
    return '$label, zugeklappt';
  }

  @override
  String get serverTitle => 'Server';

  @override
  String get serverWelcome => 'Willkommen bei Anchor+';

  @override
  String get serverSubtitle =>
      'Gib deine Serveradresse ein, um deine Notizen zu synchronisieren.';

  @override
  String get serverAddress => 'Serveradresse';

  @override
  String get serverAddressHint => 'notes.example.com';

  @override
  String get serverConnecting => 'Verbindung wird hergestellt…';

  @override
  String get serverAdvanced => 'Erweitert';

  @override
  String get serverSelfSigned => 'Selbstsignierte Zertifikate erlauben';

  @override
  String get serverSelfSignedWarning =>
      'Nutze das nur mit einem Server, den du selbst verwaltest. Anchor kann seine Identität nicht prüfen.';

  @override
  String get serverHeaders => 'Zusätzliche Header';

  @override
  String get serverHeadersHint => 'CF-Access-Client-Id: …';

  @override
  String get serverHeadersHelp =>
      'Für einen Proxy vor deinem Server, etwa Cloudflare Access. Einer pro Zeile, als Name: Wert. Wird nur an diesen Server gesendet.';

  @override
  String serverHeaderNotNameValue(int line) {
    return 'Zeile $line braucht einen Namen und einen Wert, als Name: Wert.';
  }

  @override
  String serverHeaderBadName(int line) {
    return 'Zeile $line: Der Name darf nur Buchstaben, Ziffern und - _ . enthalten.';
  }

  @override
  String serverHeaderBadValue(int line) {
    return 'Zeile $line: Der Wert enthält Zeichen, die ein Header nicht übertragen kann.';
  }

  @override
  String serverHeaderReserved(int line) {
    return 'Zeile $line: Diesen Header setzt Anchor selbst.';
  }

  @override
  String serverHeaderRepeated(int line) {
    return 'Zeile $line wiederholt einen Namen von weiter oben.';
  }

  @override
  String get serverSelfHosted =>
      'Notizen auf diesem Handy werden in dein Konto übernommen.';

  @override
  String get serverEnterAddress => 'Gib eine Serveradresse ein.';

  @override
  String get serverEnterValidAddress => 'Gib eine gültige Serveradresse ein.';

  @override
  String get serverConnectFailed =>
      'Verbindung zum Server fehlgeschlagen. Versuch es noch einmal.';

  @override
  String serverNotAnchor(String host) {
    return '$host ist kein Anchor-Server. Prüfe die Adresse.';
  }

  @override
  String serverUntrusted(String host) {
    return 'Das Zertifikat von $host konnte nicht geprüft werden. Wenn es selbstsigniert ist, schalte unter Erweitert „Selbstsignierte Zertifikate erlauben“ ein.';
  }

  @override
  String serverUnreachableNoScheme(String host) {
    return '$host ist nicht erreichbar. Prüfe die Adresse oder ergänze http://, falls dein Server kein https verwendet.';
  }

  @override
  String serverUnreachable(String host) {
    return '$host ist nicht erreichbar. Prüfe die Adresse und deine Verbindung.';
  }

  @override
  String get serverConnectAnyway => 'Trotzdem verbinden';

  @override
  String serverLinkLabel(String host) {
    return 'Server $host. Server ändern';
  }

  @override
  String get commonMore => 'Mehr';

  @override
  String get commonCopy => 'Kopieren';

  @override
  String get commonSelect => 'Auswählen';

  @override
  String get commonSelectAll => 'Alle auswählen';

  @override
  String get commonDeselectAll => 'Alle abwählen';

  @override
  String get commonStopSelecting => 'Auswahl beenden';

  @override
  String commonSelectedCount(int count) {
    return '$count ausgewählt';
  }

  @override
  String get settingsTitle => 'Einstellungen';

  @override
  String settingsProfileCard(String name, String email) {
    return '$name, $email. Profil';
  }

  @override
  String get settingsAppearance => 'Darstellung';

  @override
  String get settingsLanguage => 'Sprache';

  @override
  String get settingsLanguageSystem => 'Sprache des Handys';

  @override
  String get settingsDensity => 'Dichte';

  @override
  String get settingsDensityHelp =>
      'Kompakt zeigt mehr Notizen auf dem Bildschirm.';

  @override
  String get settingsAnimations => 'Animationen';

  @override
  String get settingsAnimationsHelp =>
      'Bei „Schnell“ öffnen und schließen sich Notizen, Sheets und Menüs in der halben Zeit.';

  @override
  String get animationsNormal => 'Normal';

  @override
  String get animationsFast => 'Schnell';

  @override
  String get settingsColorScheme => 'Farbschema';

  @override
  String get colorSchemeAnchor => 'Anchor+';

  @override
  String get settingsCustomTheme => 'Eigenes Design';

  @override
  String get settingsCustomThemeOff => 'Keins';

  @override
  String get settingsCustomThemeOn => 'An';

  @override
  String get customThemeHelp =>
      'Füge ein Design als JSON ein: Farben für Hell, Dunkel oder beides und einen Stil für Schriften, Ecken, Schatten und Struktur. Was fehlt, behält die Farbe des Farbschemas und Anchors Aussehen. Wird auf diesem Gerät gespeichert; dasselbe JSON funktioniert im Web.';

  @override
  String get customThemeJsonLabel => 'Design-JSON';

  @override
  String get customThemeApply => 'Anwenden';

  @override
  String get customThemeReset => 'Zurücksetzen';

  @override
  String get customThemeCopy => 'Aktuelles Design als JSON kopieren';

  @override
  String get customThemeApplied => 'Eigenes Design angewendet';

  @override
  String customThemeAppliedNamed(String name) {
    return 'Eigenes Design „$name“ angewendet';
  }

  @override
  String get customThemeRemoved => 'Eigenes Design entfernt';

  @override
  String get customThemeCopied => 'Aktuelles Design als JSON kopiert';

  @override
  String customThemeNotJson(String detail) {
    return 'Kein gültiges JSON: $detail';
  }

  @override
  String get customThemeNotObject =>
      'Das Design muss ein JSON-Objekt mit \"light\"- oder \"dark\"-Farben oder einem \"style\" sein';

  @override
  String customThemeUnknownKey(String key, String expected) {
    return '$key: unbekannter Schlüssel; erwartet wird einer von $expected';
  }

  @override
  String customThemeUnknownKeyGuess(String key, String guess, String expected) {
    return '$key: unbekannter Schlüssel (meintest du „$guess“?); erwartet wird einer von $expected';
  }

  @override
  String get customThemeNameNotText => 'name: muss ein String sein';

  @override
  String customThemeModeNotObject(String mode) {
    return '$mode: muss ein Objekt mit Farben sein';
  }

  @override
  String customThemeNotAColor(String key, String value) {
    return '$key: $value ist keine Farbe; verwende #rgb, #rrggbb oder #rrggbbaa';
  }

  @override
  String customThemeNotALineSpacing(String value) {
    return 'lineSpacing: $value ist nicht \"tight\", \"default\" oder \"relaxed\"';
  }

  @override
  String get customThemeNoMode =>
      'Gib mindestens \"light\", \"dark\" oder \"style\" an';

  @override
  String get customThemeStyleNotObject => 'style: muss ein Objekt sein';

  @override
  String customThemeBadStyleValue(String key, String value, String expected) {
    return '$key: $value ist keiner der Werte $expected';
  }

  @override
  String get customThemeRadiusNotValid =>
      'style.radius: muss eine Zahl von 0 bis 40 oder vier [x, y]-Ecken sein';

  @override
  String customThemePatternNotObject(String key) {
    return '$key: muss ein Objekt mit shape, size, thickness, color und opacity sein';
  }

  @override
  String customThemeNotNumber(String key, String min, String max) {
    return '$key: muss eine Zahl von $min bis $max sein';
  }

  @override
  String customThemeNotStyleColor(String key, String value) {
    return '$key: $value ist keine Farbe und kein Farbname; nimm #rgb, #rrggbb, #rrggbbaa oder einen Namen wie foreground';
  }

  @override
  String get customThemeShadowNotValid =>
      'style.shadow: muss \"none\" oder ein Objekt sein';

  @override
  String get settingsTheme => 'Design';

  @override
  String get themeLight => 'Hell';

  @override
  String get themeDark => 'Dunkel';

  @override
  String get themeAutomatic => 'Automatisch';

  @override
  String get settingsEditor => 'Editor';

  @override
  String get settingsFont => 'Schrift';

  @override
  String get settingsReminders => 'Erinnerungen';

  @override
  String get settingsMorning => 'Morgen';

  @override
  String get settingsAfternoon => 'Nachmittag';

  @override
  String get settingsEvening => 'Abend';

  @override
  String get settingsNight => 'Nacht';

  @override
  String get settingsWeekStart => 'Woche beginnt am';

  @override
  String get settingsTextSize => 'Textgröße';

  @override
  String get settingsLineSpacing => 'Zeilenabstand';

  @override
  String get settingsLineSpacingByTheme =>
      'Vom eigenen Theme festgelegt. Nimm \"lineSpacing\" dort heraus, um hier zu wählen.';

  @override
  String get settingsMoveChecked => 'Erledigte Einträge nach unten schieben';

  @override
  String get settingsMoveCheckedHelp =>
      'Erledigte Einträge rutschen unter die offenen.';

  @override
  String get settingsBurnDeleted => 'Gelöschte Notizen verbrennen';

  @override
  String get settingsBurnDeletedHelp =>
      'Eine gelöschte Notiz verbrennt an ihrer Stelle. Ausgeschaltet verschwindet sie einfach.';

  @override
  String get settingsPreviewTitle => 'Wochenende in Lissabon';

  @override
  String get settingsPreviewText =>
      'Reise mit leichtem Gepäck. Die Hügel sind steil, und die Straßenbahnen sind schon um neun voll.';

  @override
  String get settingsAccount => 'Konto';

  @override
  String get settingsSync => 'Synchronisierung';

  @override
  String get settingsConnectServer => 'Mit einem Server verbinden';

  @override
  String get settingsConnectServerHelp =>
      'Synchronisiere und teile deine Notizen mit deinem eigenen Anchor-Server. Die Notizen auf diesem Handy werden beim Anmelden in dein Konto übernommen.';

  @override
  String get settingsPassword => 'Passwort';

  @override
  String settingsPasswordManaged(String provider) {
    return 'Dein Passwort wird von $provider verwaltet.';
  }

  @override
  String get settingsPasswordManagedElsewhere =>
      'Dein Passwort wird von deinem Anmeldeanbieter verwaltet.';

  @override
  String get settingsSignOut => 'Abmelden';

  @override
  String get settingsSigningOut => 'Abmeldung läuft…';

  @override
  String get settingsSignOutTitle => 'Abmelden?';

  @override
  String settingsSignOutMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count Änderungen sind noch nicht synchronisiert. Sie bleiben auf diesem Handy und werden bei der nächsten Anmeldung synchronisiert.',
      one:
          '1 Änderung ist noch nicht synchronisiert. Sie bleibt auf diesem Handy und wird bei der nächsten Anmeldung synchronisiert.',
      zero:
          'Deine Notizen bleiben auf diesem Handy und werden beim Anmelden wieder synchronisiert.',
    );
    return '$_temp0';
  }

  @override
  String get settingsDevices => 'Geräte';

  @override
  String get devicesTitle => 'Geräte';

  @override
  String get devicesThisPhone => 'Dieses Handy';

  @override
  String devicesSignedIn(String date) {
    return 'Angemeldet am $date';
  }

  @override
  String devicesSignedInLastActive(String date, String active) {
    return 'Angemeldet am $date, zuletzt aktiv $active';
  }

  @override
  String devicesSignedOut(String device) {
    return '$device abgemeldet';
  }

  @override
  String devicesSignOutFailed(String device) {
    return '$device konnte nicht abgemeldet werden';
  }

  @override
  String get devicesLoadFailed => 'Deine Geräte konnten nicht geladen werden';

  @override
  String get devicesLoadFailedHelp =>
      'Prüfe deine Verbindung und versuch es noch einmal.';

  @override
  String get settingsSignOutOthers => 'Andere Geräte abmelden';

  @override
  String get settingsSignOutOthersTitle => 'Deine anderen Geräte abmelden?';

  @override
  String get settingsSignOutOthersMessage =>
      'Innerhalb von 15 Minuten müssen sich alle anderen Handys, Browser und Computer neu anmelden. Dieses Handy bleibt angemeldet.';

  @override
  String get settingsSignOutOthersConfirm => 'Andere abmelden';

  @override
  String get settingsSignOutOthersDone =>
      'Deine anderen Geräte wurden abgemeldet';

  @override
  String get settingsSignOutOthersFailed =>
      'Deine anderen Geräte konnten nicht abgemeldet werden';

  @override
  String get settingsUpdates => 'Updates';

  @override
  String get settingsCheckForUpdates => 'Nach Updates suchen';

  @override
  String get settingsUpdateChecking => 'Suche läuft…';

  @override
  String settingsUpdateBuild(int build, String repository) {
    return 'Das ist Build $build von $repository';
  }

  @override
  String get settingsCheckAutomatically => 'Automatisch suchen';

  @override
  String get settingsCheckAutomaticallyHelp =>
      'Beim Start von Anchor nach einer neuen Version suchen';

  @override
  String get settingsPreviewReleases => 'Vorabversionen erhalten';

  @override
  String get settingsPreviewReleasesHelp =>
      'Release Candidates, wenn dein Server das :preview-Image nutzt';

  @override
  String get settingsSearch => 'Suche';

  @override
  String get settingsPictureSearch => 'Bilder nach ihrem Inhalt finden';

  @override
  String get settingsPictureSearchHelp =>
      'Suche nach „Sonnenuntergang am Meer“ oder „Kassenbon“ und finde Notizen mit solchen Bildern, in den meisten Sprachen. Dein Server lädt einmalig ein Modell herunter (etwa 380 MB) und sieht sich jedes Bild an; nichts verlässt deinen Server.';

  @override
  String pictureSearchDownloading(int percent) {
    return 'Bildmodell wird heruntergeladen… $percent %';
  }

  @override
  String get pictureSearchFailed =>
      'Das Bildmodell konnte nicht heruntergeladen werden. Schalte die Funktion aus und wieder ein, um es erneut zu versuchen.';

  @override
  String pictureSearchIndexing(int indexed, int total) {
    return 'Deine Bilder werden angesehen… $indexed von $total';
  }

  @override
  String pictureSearchReady(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Alle $count Bilder sind bereit für die Suche.',
      one: 'Dein Bild ist bereit für die Suche.',
      zero: 'Deine Bilder sind durchsuchbar, sobald du sie hinzufügst.',
    );
    return '$_temp0';
  }

  @override
  String get pictureSearchChangeFailed =>
      'Bildsuche konnte nicht geändert werden';

  @override
  String get updateAvailable => 'Update verfügbar';

  @override
  String get updateSeeWhatsNew => 'Neuerungen ansehen';

  @override
  String get updateWhatsNew => 'Neuerungen';

  @override
  String updateMoreChanges(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'und $count weitere',
      one: 'und 1 weitere',
    );
    return '$_temp0';
  }

  @override
  String get updateInstall => 'Herunterladen und installieren';

  @override
  String updateInstallSize(int megabytes) {
    return 'Herunterladen und installieren ($megabytes MB)';
  }

  @override
  String updateDownloading(int percent) {
    return 'Wird heruntergeladen… $percent %';
  }

  @override
  String get updateViewRelease => 'Release auf GitHub ansehen';

  @override
  String get updateCheckFailed => 'Suche nach Updates fehlgeschlagen';

  @override
  String get updateDownloadFailed =>
      'Das Update konnte nicht heruntergeladen werden';

  @override
  String get updateUpToDate => 'Anchor ist auf dem neuesten Stand';

  @override
  String get settingsHelp => 'Hilfe';

  @override
  String get settingsLogs => 'Protokolle';

  @override
  String get settingsLogsHelp => 'Aktivitätsdetails zur Fehlersuche';

  @override
  String get settingsSourceCode => 'Quellcode';

  @override
  String get settingsSourceCodeHelp =>
      'Freie Software unter der GNU AGPL v3, ohne Gewährleistung';

  @override
  String get settingsLicense => 'Lizenz';

  @override
  String get settingsLicenseHelp => '© Die Anchor- und Anchor+-Mitwirkenden';

  @override
  String get settingsOffline =>
      'Offline. Änderungen werden auf diesem Handy gespeichert.';

  @override
  String get settingsLocalOnly =>
      'Notizen werden nur auf diesem Handy gespeichert.';

  @override
  String settingsSyncPaused(String reason) {
    return 'Synchronisierung pausiert. $reason';
  }

  @override
  String settingsCantReach(String host) {
    return '$host nicht erreichbar';
  }

  @override
  String settingsConnectedTo(String host) {
    return 'Verbunden mit $host';
  }

  @override
  String settingsConnectedToVersion(String host, String version) {
    return 'Verbunden mit $host · Server $version';
  }

  @override
  String settingsAppVersion(String version) {
    return 'Anchor $version';
  }

  @override
  String get settingsAppNameShort => 'Anchor+';

  @override
  String get settingsTagline => 'Deine Gedanken, sicher.';

  @override
  String get logsTitle => 'Protokolle';

  @override
  String get logsMenuHelp =>
      'Kopieren und Speichern enthalten auch frühere Sitzungen.';

  @override
  String get logsCopyAll => 'Alle kopieren';

  @override
  String get logsSaveToFile => 'In Datei speichern';

  @override
  String get logsClear => 'Protokolle löschen';

  @override
  String get logsCopiedAll =>
      'Protokolle kopiert, inklusive früherer Sitzungen';

  @override
  String get logsCopiedNewest =>
      'Neueste Protokolle kopiert. Speichere sie in eine Datei, um alle zu erhalten.';

  @override
  String get logsClearTitle => 'Protokolle löschen?';

  @override
  String get logsClearMessage =>
      'Alle Protokolle auf diesem Handy werden gelöscht. Das lässt sich nicht rückgängig machen.';

  @override
  String get logsCleared => 'Protokolle gelöscht';

  @override
  String get logsSaveDialog => 'Protokolle speichern';

  @override
  String logsSaved(String name) {
    return '$name gespeichert';
  }

  @override
  String get logsSaveFailed => 'Protokolle konnten nicht gespeichert werden';

  @override
  String logsCopied(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Protokolle kopiert',
      one: '1 Protokoll kopiert',
    );
    return '$_temp0';
  }

  @override
  String get logsSelectTitle => 'Protokolle auswählen';

  @override
  String get logsSearch => 'Protokolle durchsuchen';

  @override
  String get logsSelected => 'Ausgewählte Protokolle';

  @override
  String get logsLevel => 'Protokollstufe';

  @override
  String get logsAll => 'Alle';

  @override
  String get logsErrors => 'Fehler';

  @override
  String get logsWarnings => 'Warnungen';

  @override
  String get logsInfo => 'Info';

  @override
  String get logsDebug => 'Debug';

  @override
  String get logsSessionNote =>
      'Nur diese Sitzung wird angezeigt. Kopieren und Speichern enthalten auch frühere Sitzungen.';

  @override
  String get logsNoMatches => 'Keine passenden Protokolle';

  @override
  String get logsNoMatchesHelp =>
      'Versuch ein anderes Wort oder zeige alle Stufen an.';

  @override
  String get logsEmpty => 'Noch keine Protokolle';

  @override
  String get logsEmptyHelp => 'Aktivitäten dieser Sitzung erscheinen hier.';

  @override
  String get logLevelError => 'Fehler';

  @override
  String get logLevelWarning => 'Warnung';

  @override
  String get logLevelInfo => 'Info';

  @override
  String get logLevelDebug => 'Debug';

  @override
  String get commonToday => 'Heute';

  @override
  String get commonTomorrow => 'Morgen';

  @override
  String get commonNotNow => 'Nicht jetzt';

  @override
  String get commonLater => 'Später';

  @override
  String get commonOk => 'OK';

  @override
  String get commonOpenSettings => 'Einstellungen öffnen';

  @override
  String get reminderTitle => 'Erinnerung';

  @override
  String get reminderSheetSubtitle =>
      'Du erhältst eine Benachrichtigung auf diesem Handy.';

  @override
  String reminderDayTime(String day, String time) {
    return '$day, $time';
  }

  @override
  String reminderWithRepeat(String when, String repeat) {
    return '$when · $repeat';
  }

  @override
  String reminderSpoken(String when) {
    return 'Erinnerung: $when';
  }

  @override
  String reminderSpokenLate(String when) {
    return 'Überfällige Erinnerung: $when';
  }

  @override
  String get reminderLaterToday => 'Später heute';

  @override
  String get reminderThisAfternoon => 'Heute Nachmittag';

  @override
  String get reminderTonight => 'Heute Nacht';

  @override
  String get reminderTomorrowNight => 'Morgen Nacht';

  @override
  String get reminderTomorrowMorning => 'Morgen früh';

  @override
  String get reminderTomorrowAfternoon => 'Morgen Nachmittag';

  @override
  String get reminderTomorrowEvening => 'Morgen Abend';

  @override
  String get reminderThisEvening => 'Heute Abend';

  @override
  String get reminderNextWeek => 'Nächste Woche';

  @override
  String get reminderWeekend => 'Am Wochenende';

  @override
  String get reminderNextMonth => 'Nächsten Monat';

  @override
  String get reminderNone => 'Keine Erinnerung';

  @override
  String get reminderPickTime => 'Datum und Uhrzeit wählen';

  @override
  String get reminderTimePassed => 'Dieser Zeitpunkt ist schon vorbei';

  @override
  String reminderInMinutes(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'In $count Minuten',
      one: 'In 1 Minute',
    );
    return '$_temp0';
  }

  @override
  String reminderInHours(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'In $count Stunden',
      one: 'In 1 Stunde',
    );
    return '$_temp0';
  }

  @override
  String reminderInDays(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'In $count Tagen',
      one: 'In 1 Tag',
    );
    return '$_temp0';
  }

  @override
  String get reminderRepeatsDaily => 'Wiederholt sich täglich';

  @override
  String reminderRepeatsWeekly(String weekday) {
    return 'Wiederholt sich jeden $weekday';
  }

  @override
  String reminderRepeatsMonthly(int day) {
    return 'Wiederholt sich monatlich am $day.';
  }

  @override
  String reminderRepeatsMonthlyEnd(int day) {
    return 'Wiederholt sich monatlich am $day. oder am letzten Tag';
  }

  @override
  String reminderRepeatsYearly(String date) {
    return 'Wiederholt sich jährlich am $date';
  }

  @override
  String get repeatOnce => 'Einmal';

  @override
  String get repeatDaily => 'Täglich';

  @override
  String get repeatWeekly => 'Wöchentlich';

  @override
  String get repeatMonthly => 'Monatlich';

  @override
  String get repeatYearly => 'Jährlich';

  @override
  String get reminderWhen => 'Wann';

  @override
  String get reminderPickDate => 'Datum wählen';

  @override
  String get reminderDate => 'Datum';

  @override
  String get reminderTime => 'Uhrzeit';

  @override
  String get reminderRepeat => 'Wiederholen';

  @override
  String get reminderRemove => 'Entfernen';

  @override
  String get reminderSetFailed => 'Erinnerung konnte nicht gesetzt werden';

  @override
  String get reminderNotifyTitle => 'Benachrichtigungen erlauben?';

  @override
  String get reminderNotifyMessage =>
      'Anchor braucht die Erlaubnis, Benachrichtigungen zu senden, damit deine Erinnerungen auf diesem Handy klingeln können.';

  @override
  String get reminderExactTitle => 'Exakte Alarme erlauben?';

  @override
  String get reminderExactMessage =>
      'Android kann Erinnerungen verzögern, um Akku zu sparen. Erlaube exakte Alarme, damit sie pünktlich klingeln.';

  @override
  String get reminderNotificationsOff =>
      'Benachrichtigungen sind aus. Schalte sie in den Einstellungen deines Handys ein.';

  @override
  String get monthPrevious => 'Vorheriger Monat';

  @override
  String get monthNext => 'Nächster Monat';

  @override
  String get reminderChannelName => 'Erinnerungen';

  @override
  String get reminderChannelDescription =>
      'Erinnerungen, die du für deine Notizen setzt';

  @override
  String get reminderDone => 'Fertig';

  @override
  String notesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen',
      one: '1 Notiz',
    );
    return '$_temp0';
  }

  @override
  String get tagsTitle => 'Tags';

  @override
  String get tagNotesTitle => 'Notizen taggen';

  @override
  String get tagSaveFailed => 'Tag konnte nicht gespeichert werden';

  @override
  String get tagUpdateFailed => 'Tags konnten nicht aktualisiert werden';

  @override
  String tagNameTaken(String name) {
    return 'Ein Tag namens „$name“ existiert bereits.';
  }

  @override
  String tagCreateNamed(String name) {
    return '„$name“ erstellen';
  }

  @override
  String tagAdded(String tag) {
    return '$tag, hinzugefügt';
  }

  @override
  String tagNotAdded(String tag) {
    return '$tag, nicht hinzugefügt';
  }

  @override
  String tagAddedToSome(String tag) {
    return '$tag, zu einigen Notizen hinzugefügt';
  }

  @override
  String get tagSearchOrCreate => 'Tag suchen oder erstellen';

  @override
  String get tagsEmpty =>
      'Noch keine Tags. Gib einen Namen ein, um einen zu erstellen.';

  @override
  String tagSheetLabel(String name) {
    return 'Tag $name';
  }

  @override
  String get tagColor => 'Farbe';

  @override
  String get tagRename => 'Tag umbenennen';

  @override
  String get tagDelete => 'Tag löschen';

  @override
  String tagDeleteTitle(String name) {
    return 'Tag „$name“ löschen?';
  }

  @override
  String tagDeleteMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'Der Tag wird von $count Notizen entfernt. Deine Notizen werden nicht gelöscht.',
      one:
          'Der Tag wird von 1 Notiz entfernt. Deine Notizen werden nicht gelöscht.',
    );
    return '$_temp0';
  }

  @override
  String get tagDeleteUnused => 'Dieser Tag ist an keiner Notiz.';

  @override
  String tagDeleted(String name) {
    return 'Tag „$name“ gelöscht';
  }

  @override
  String get tagNew => 'Neuer Tag';

  @override
  String tagMove(String name) {
    return '$name verschieben';
  }

  @override
  String get tagOptions => 'Tag-Optionen';

  @override
  String get tagNamePreview => 'tag-name';

  @override
  String get tagNameHint => 'Tag-Name';

  @override
  String get tagCreate => 'Tag erstellen';

  @override
  String get tagRenameAction => 'Umbenennen';

  @override
  String get colorRed => 'Rot';

  @override
  String get colorPink => 'Pink';

  @override
  String get colorPurple => 'Lila';

  @override
  String get colorDeepPurple => 'Dunkellila';

  @override
  String get colorIndigo => 'Indigo';

  @override
  String get colorBlue => 'Blau';

  @override
  String get colorLightBlue => 'Hellblau';

  @override
  String get colorCyan => 'Cyan';

  @override
  String get colorTeal => 'Petrol';

  @override
  String get colorGreen => 'Grün';

  @override
  String get colorLightGreen => 'Hellgrün';

  @override
  String get colorLime => 'Limette';

  @override
  String get colorAmber => 'Bernstein';

  @override
  String get colorOrange => 'Orange';

  @override
  String get colorDeepOrange => 'Dunkelorange';

  @override
  String get colorBrown => 'Braun';

  @override
  String get colorBlueGrey => 'Blaugrau';

  @override
  String get colorYellow => 'Gelb';

  @override
  String get syncSignedOutLead => 'Abgemeldet.';

  @override
  String get syncSignedOutText =>
      'Melde dich erneut an, um deine Notizen zu synchronisieren.';

  @override
  String get syncSignInAgainTitle => 'Erneut anmelden';

  @override
  String get syncSignInAgainMessage =>
      'Deine Notizen bleiben auf diesem Handy und werden synchronisiert, sobald du dich anmeldest.';

  @override
  String get syncServerOutdatedLead => 'Aktualisiere deinen Server.';

  @override
  String get syncServerOutdatedText =>
      'Er ist zu alt, um mit dieser App zu synchronisieren.';

  @override
  String get syncServerOutdatedTitle => 'Server aktualisieren';

  @override
  String get syncServerOutdatedMessage =>
      'Dein Anchor-Server ist zu alt, um mit dieser App zu synchronisieren. Aktualisiere den Server, um fortzufahren.';

  @override
  String get syncAppOutdatedLead => 'Aktualisiere Anchor.';

  @override
  String get syncAppOutdatedText =>
      'Diese App ist zu alt, um mit deinem Server zu synchronisieren.';

  @override
  String get syncAppOutdatedTitle => 'Anchor aktualisieren';

  @override
  String get syncAppOutdatedMessage =>
      'Diese App ist zu alt, um mit deinem Anchor-Server zu synchronisieren. Aktualisiere die App, um fortzufahren.';

  @override
  String syncPausedMessage(String reason) {
    return '$reason Deine Notizen bleiben in der Zwischenzeit auf diesem Handy.';
  }

  @override
  String get reminderAdd => 'Erinnerung hinzufügen';

  @override
  String get commonYesterday => 'Gestern';

  @override
  String peopleCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Personen',
      one: '1 Person',
    );
    return '$_temp0';
  }

  @override
  String wordsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Wörter',
      one: '1 Wort',
    );
    return '$_temp0';
  }

  @override
  String get notesBackToTop => 'Nach oben';

  @override
  String get notesSelectTitle => 'Notizen auswählen';

  @override
  String get noteUntitled => 'Ohne Titel';

  @override
  String namesTwo(String first, String second) {
    return '$first und $second';
  }

  @override
  String namesMore(String first, String second, int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$first, $second und $count weitere',
    );
    return '$_temp0';
  }

  @override
  String get shareOnlyYou => 'Nur du kannst diese Notiz sehen.';

  @override
  String get shareLoadFailed =>
      'Die Personen mit Zugriff konnten nicht geladen werden.';

  @override
  String shareSharedWith(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Mit $count Personen geteilt.',
      one: 'Mit 1 Person geteilt.',
    );
    return '$_temp0';
  }

  @override
  String shareSharedWithOffline(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'Mit $count Personen geteilt. Verbinde dich, um zu sehen, wer Zugriff hat.',
      one: 'Mit 1 Person geteilt. Verbinde dich, um zu sehen, wer Zugriff hat.',
    );
    return '$_temp0';
  }

  @override
  String shareSharedWithNames(String names) {
    return 'Geteilt mit $names';
  }

  @override
  String shareSharedWithCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Mit $count Personen geteilt',
      one: 'Mit 1 Person geteilt',
    );
    return '$_temp0';
  }

  @override
  String get shareCanView => 'Darf ansehen';

  @override
  String get shareCanEdit => 'Darf bearbeiten';

  @override
  String get shareLink => 'Link';

  @override
  String get shareLinkAnyone => 'Alle mit dem Link';

  @override
  String get shareLinkOff => 'Aus';

  @override
  String get shareLinkOffHint =>
      'Nur Personen, die du hinzufügst, können sie öffnen';

  @override
  String get shareLinkViewHint =>
      'Alle mit dem Link können sie ohne Konto lesen';

  @override
  String get shareLinkEditHint =>
      'Alle mit dem Link können Titel und Text ändern';

  @override
  String get shareLinkAccess => 'Zugriff über den Link';

  @override
  String shareLinkChangeAccess(String access) {
    return '$access. Zugriff über den Link ändern';
  }

  @override
  String get shareLinkCopy => 'Link kopieren';

  @override
  String get shareLinkShareIt => 'Link senden';

  @override
  String get shareLinkCopied => 'Link kopiert';

  @override
  String get shareLinkMade => 'Link erstellt und kopiert';

  @override
  String get shareLinkTurnedOff =>
      'Link ausgeschaltet; er öffnet die Notiz nicht mehr';

  @override
  String get shareLinkNowCanView => 'Alle mit dem Link können jetzt ansehen';

  @override
  String get shareLinkNowCanEdit => 'Alle mit dem Link können jetzt bearbeiten';

  @override
  String get shareLinkFailed => 'Link konnte nicht geändert werden';

  @override
  String get shareLinkLoadFailed =>
      'Der Link der Notiz konnte nicht geladen werden.';

  @override
  String get shareLinkOpens => 'Alle mit dem Link können sie öffnen.';

  @override
  String dayTodayAt(String time) {
    return 'Heute um $time';
  }

  @override
  String dayYesterdayAt(String time) {
    return 'Gestern um $time';
  }

  @override
  String dayOnAt(String date, String time) {
    return '$date um $time';
  }

  @override
  String get editedToday => 'Heute bearbeitet';

  @override
  String get editedYesterday => 'Gestern bearbeitet';

  @override
  String editedOn(String date) {
    return 'Bearbeitet am $date';
  }

  @override
  String get editedJustNow => 'Gerade eben bearbeitet';

  @override
  String editedMinutesAgo(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Vor $count Min. bearbeitet',
      one: 'Vor 1 Min. bearbeitet',
    );
    return '$_temp0';
  }

  @override
  String editedTodayAt(String time) {
    return 'Heute um $time bearbeitet';
  }

  @override
  String editedYesterdayAt(String time) {
    return 'Gestern um $time bearbeitet';
  }

  @override
  String editedOnAt(String date, String time) {
    return 'Bearbeitet am $date um $time';
  }

  @override
  String trashRule(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Notizen hier werden nach $count Tagen gelöscht.',
      one: 'Notizen hier werden nach 1 Tag gelöscht.',
    );
    return '$_temp0';
  }

  @override
  String trashEmpty(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Gelöschte Notizen bleiben hier $count Tage lang.',
      one: 'Gelöschte Notizen bleiben hier 1 Tag lang.',
    );
    return '$_temp0';
  }

  @override
  String trashDaysLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Noch $count Tage',
      one: 'Noch 1 Tag',
    );
    return '$_temp0';
  }

  @override
  String trashDeletesOn(String date) {
    return 'Wird am $date gelöscht.';
  }

  @override
  String trashDeletesAfter(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Wird nach $count Tagen gelöscht.',
      one: 'Wird nach 1 Tag gelöscht.',
    );
    return '$_temp0';
  }

  @override
  String historyKept(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'Bei jeder Änderung der Notiz wird eine Version gespeichert und $count Tage lang aufbewahrt.',
      one:
          'Bei jeder Änderung der Notiz wird eine Version gespeichert und 1 Tag lang aufbewahrt.',
    );
    return '$_temp0';
  }

  @override
  String historyLimit(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Änderungen, die älter als $count Tage sind, werden entfernt.',
      one: 'Änderungen, die älter als 1 Tag sind, werden entfernt.',
    );
    return '$_temp0';
  }

  @override
  String get historyEarlier => 'Frühere Version';

  @override
  String get historyNotSaved => 'Nicht gespeichert';

  @override
  String get historyBeforeRestore => 'Vor einer Wiederherstellung';

  @override
  String get historySomeone => 'Jemand';

  @override
  String get historyYou => 'Du';

  @override
  String get navNotes => 'Notizen';

  @override
  String get navArchive => 'Archiv';

  @override
  String get navTrash => 'Papierkorb';

  @override
  String drawerAccount(String name) {
    return '$name, Einstellungen';
  }

  @override
  String shareNowCanView(String person) {
    return '$person darf jetzt ansehen';
  }

  @override
  String shareNowCanEdit(String person) {
    return '$person darf jetzt bearbeiten';
  }

  @override
  String get revisionComparedCurrent => 'Verglichen mit der aktuellen Version';

  @override
  String revisionComparedTodayAt(String time) {
    return 'Verglichen mit heute um $time';
  }

  @override
  String revisionComparedYesterdayAt(String time) {
    return 'Verglichen mit gestern um $time';
  }

  @override
  String revisionComparedOnAt(String date, String time) {
    return 'Verglichen mit $date um $time';
  }

  @override
  String get listArchiveLine => 'In Notizen ausgeblendet';

  @override
  String listTrashLine(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Gelöscht nach $count Tagen',
      one: 'Gelöscht nach 1 Tag',
    );
    return '$_temp0';
  }

  @override
  String get listOfflineSaved =>
      'Offline · Änderungen werden auf diesem Handy gespeichert';

  @override
  String listOfflineChanges(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Offline · $count Änderungen zu synchronisieren',
      one: 'Offline · 1 Änderung zu synchronisieren',
    );
    return '$_temp0';
  }

  @override
  String get listSyncFailed => 'Synchronisieren fehlgeschlagen';

  @override
  String listTitleMenu(String title) {
    return '$title, Menü öffnen';
  }

  @override
  String get searchNotes => 'Notizen durchsuchen';

  @override
  String get searchArchive => 'Archiv durchsuchen';

  @override
  String get searchTrash => 'Papierkorb durchsuchen';

  @override
  String get actionTag => 'Tag';

  @override
  String get actionPin => 'Anheften';

  @override
  String get actionUnpin => 'Loslösen';

  @override
  String get actionColor => 'Farbe';

  @override
  String get actionSend => 'Senden';

  @override
  String get actionMakeCopy => 'Kopie erstellen';

  @override
  String get actionPrint => 'Drucken';

  @override
  String get notePrintEmpty => 'Es gibt noch nichts zu drucken';

  @override
  String get notePrintLocked => 'Diese Notiz ist gesperrt.';

  @override
  String get notePrintFailed => 'Drucken fehlgeschlagen';

  @override
  String get noteSendEmpty => 'Es gibt noch nichts zu senden';

  @override
  String get noteCopyMade => 'Das ist deine Kopie';

  @override
  String get noteCopyFailed =>
      'Kopie konnte nicht erstellt werden. Dafür ist eine Verbindung zum Server nötig.';

  @override
  String notesColorChanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Farbe von $count Notizen geändert',
      one: 'Farbe von 1 Notiz geändert',
    );
    return '$_temp0';
  }

  @override
  String notesColorChangedExcept(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'Farbe geändert. $count Notizen, die nur zum Ansehen mit dir geteilt wurden, bleiben unverändert',
      one:
          'Farbe geändert. 1 Notiz, die nur zum Ansehen mit dir geteilt wurde, bleibt unverändert',
    );
    return '$_temp0';
  }

  @override
  String notesColorUnchanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'Diese Notizen wurden nur zum Ansehen mit dir geteilt, daher kann ihre Farbe nicht geändert werden',
      one:
          'Diese Notiz wurde nur zum Ansehen mit dir geteilt, daher kann ihre Farbe nicht geändert werden',
    );
    return '$_temp0';
  }

  @override
  String get actionShare => 'Teilen';

  @override
  String get actionHistory => 'Versionsverlauf';

  @override
  String get actionUncheckAll => 'Alle abwählen';

  @override
  String get actionSortByName => 'A bis Z sortieren';

  @override
  String get actionDeleteChecked => 'Erledigte Einträge löschen';

  @override
  String get actionShowCheckboxes => 'Kontrollkästchen anzeigen';

  @override
  String get actionHideCheckboxes => 'Kontrollkästchen ausblenden';

  @override
  String get actionArchive => 'Archivieren';

  @override
  String get actionUnarchive => 'Aus dem Archiv holen';

  @override
  String get actionDelete => 'Löschen';

  @override
  String get actionRemove => 'Entfernen';

  @override
  String get actionRestore => 'Wiederherstellen';

  @override
  String get actionDeletePermanently => 'Endgültig löschen';

  @override
  String notesPinned(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen angeheftet',
      one: 'Notiz angeheftet',
    );
    return '$_temp0';
  }

  @override
  String notesUnpinned(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen losgelöst',
      one: 'Notiz losgelöst',
    );
    return '$_temp0';
  }

  @override
  String notesArchived(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen archiviert',
      one: 'Notiz archiviert',
    );
    return '$_temp0';
  }

  @override
  String notesUnarchived(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen aus dem Archiv geholt',
      one: 'Notiz aus dem Archiv geholt',
    );
    return '$_temp0';
  }

  @override
  String itemsUnchecked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Einträge abgewählt',
      one: 'Eintrag abgewählt',
    );
    return '$_temp0';
  }

  @override
  String checkboxesShown(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Kontrollkästchen hinzugefügt',
      one: 'Kontrollkästchen hinzugefügt',
    );
    return '$_temp0';
  }

  @override
  String checkboxesHidden(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Kontrollkästchen entfernt',
      one: 'Kontrollkästchen entfernt',
    );
    return '$_temp0';
  }

  @override
  String itemsSortedByName(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Einträge von A bis Z sortiert',
      one: 'Eintrag von A bis Z sortiert',
    );
    return '$_temp0';
  }

  @override
  String get itemsAlreadySorted => 'Bereits von A bis Z sortiert';

  @override
  String checkedItemsDeleted(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count erledigte Einträge gelöscht',
      one: 'Erledigter Eintrag gelöscht',
    );
    return '$_temp0';
  }

  @override
  String notesRestored(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen wiederhergestellt',
      one: 'Notiz wiederhergestellt',
    );
    return '$_temp0';
  }

  @override
  String get noteRestoredFollow => 'Hinfolgen';

  @override
  String notesDeletedForever(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen endgültig gelöscht',
      one: 'Notiz endgültig gelöscht',
    );
    return '$_temp0';
  }

  @override
  String notesMovedToTrash(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen in den Papierkorb verschoben',
      one: 'Notiz in den Papierkorb verschoben',
    );
    return '$_temp0';
  }

  @override
  String notesRemovedFromYours(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen aus deinen Notizen entfernt',
      one: 'Notiz aus deinen Notizen entfernt',
    );
    return '$_temp0';
  }

  @override
  String notesTrashedMixed(String moved, String removed) {
    return '$moved $removed';
  }

  @override
  String notesMovedToTrashPart(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen in den Papierkorb verschoben.',
      one: '1 Notiz in den Papierkorb verschoben.',
    );
    return '$_temp0';
  }

  @override
  String notesRemovedPart(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count aus deinen Notizen entfernt.',
      one: '1 aus deinen Notizen entfernt.',
    );
    return '$_temp0';
  }

  @override
  String get notesRemoveSharedTitle =>
      'Diese Notiz aus deinen Notizen entfernen?';

  @override
  String get notesRemoveSharedMessage =>
      'Um sie wieder zu sehen, muss der Eigentümer sie erneut mit dir teilen.';

  @override
  String notesDeleteTitle(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen löschen?',
      one: '1 Notiz löschen?',
    );
    return '$_temp0';
  }

  @override
  String notesDeleteSharedMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count mit dir geteilte Notizen werden aus deinen Notizen entfernt. Um sie wieder zu sehen, müssen die Eigentümer sie erneut mit dir teilen.',
      one:
          'Eine mit dir geteilte Notiz wird aus deinen Notizen entfernt. Um sie wieder zu sehen, muss der Eigentümer sie erneut mit dir teilen.',
    );
    return '$_temp0';
  }

  @override
  String get notesDeleteForeverOneTitle => 'Diese Notiz endgültig löschen?';

  @override
  String notesDeleteFailed(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Notizen konnten nicht gelöscht werden',
      one: 'Notiz konnte nicht gelöscht werden',
    );
    return '$_temp0';
  }

  @override
  String notesDeleteForeverTitle(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen endgültig löschen?',
      one: '1 Notiz endgültig löschen?',
    );
    return '$_temp0';
  }

  @override
  String notesDeleteForeverMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'Das kann nicht rückgängig gemacht werden. Personen, mit denen du sie geteilt hast, verlieren ebenfalls den Zugriff.',
      one:
          'Das kann nicht rückgängig gemacht werden. Personen, mit denen du sie geteilt hast, verlieren ebenfalls den Zugriff.',
    );
    return '$_temp0';
  }

  @override
  String get trashEmptyAction => 'Papierkorb leeren';

  @override
  String get trashNothing => 'Nichts zu löschen';

  @override
  String get trashEmptyTitle => 'Papierkorb leeren?';

  @override
  String trashEmptyMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count Notizen werden endgültig gelöscht. Das kann nicht rückgängig gemacht werden.',
      one:
          '1 Notiz wird endgültig gelöscht. Das kann nicht rückgängig gemacht werden.',
    );
    return '$_temp0';
  }

  @override
  String get trashEmptied => 'Papierkorb geleert';

  @override
  String get listSelectNotes => 'Notizen auswählen';

  @override
  String get listViewOptions => 'Ansichtsoptionen';

  @override
  String get listPressBackAgainToExit =>
      'Noch einmal „Zurück“ drücken, um zu beenden';

  @override
  String searchTag(String tag) {
    return '#$tag durchsuchen';
  }

  @override
  String get syncOverwroteLead => 'An zwei Stellen geändert';

  @override
  String syncOverwroteText(String title) {
    return 'Deine Änderungen an „$title“ haben anderswo gemachte Änderungen ersetzt. Tippe, um sie im Verlauf zu sehen.';
  }

  @override
  String syncOverwroteManyText(int count) {
    return 'Deine Änderungen an $count Notizen haben anderswo gemachte Änderungen ersetzt. Tippe, um den Verlauf der ersten zu sehen.';
  }

  @override
  String searchNoResults(String query) {
    return 'Keine Ergebnisse für „$query“';
  }

  @override
  String get searchNoResultsHelp =>
      'Prüfe die Schreibweise oder versuche andere Wörter.';

  @override
  String get searchRegexInvalidHelp =>
      'Das ist kein gültiger regulärer Ausdruck, daher wurde nach dem eingegebenen Text gesucht. Prüfe das Muster oder schalte „Regulärer Ausdruck“ aus.';

  @override
  String get archiveEmptyTitle => 'Keine archivierten Notizen';

  @override
  String get archiveEmptyHelp =>
      'Archiviere Notizen, die du behalten, aber nicht jeden Tag sehen möchtest.';

  @override
  String get trashEmptyStateTitle => 'Der Papierkorb ist leer';

  @override
  String tagEmptyTitle(String tag) {
    return 'Keine Notizen mit #$tag';
  }

  @override
  String get tagEmptyHelp =>
      'Neue Notizen, die du hier erstellst, bekommen diesen Tag.';

  @override
  String get notesLoading => 'Notizen werden geladen';

  @override
  String get notesEmptyTitle => 'Noch keine Notizen';

  @override
  String get notesEmptyHelp =>
      'Tippe auf „Neue Notiz“, um deine erste zu schreiben.';

  @override
  String get notesLoadFailedTitle =>
      'Deine Notizen konnten nicht geladen werden';

  @override
  String get notesLoadFailedHelp =>
      'Prüfe deine Verbindung und versuche es dann erneut.';

  @override
  String get notesLoadPausedHelp =>
      'Deine Notizen erscheinen hier, sobald sie synchronisiert sind.';

  @override
  String get noteNewList => 'Neue Liste';

  @override
  String get noteNew => 'Neue Notiz';

  @override
  String get noteNewKinds => 'Neue Liste oder Kameranotiz';

  @override
  String get cardNotSynced => 'Noch nicht synchronisiert';

  @override
  String cardPictures(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Bilder',
      one: '1 Bild',
    );
    return '$_temp0';
  }

  @override
  String cardTickItem(String item) {
    return '$item abhaken';
  }

  @override
  String cardUntickItem(String item) {
    return 'Haken bei $item entfernen';
  }

  @override
  String cardOpenPicture(int number) {
    return 'Bild $number öffnen';
  }

  @override
  String shareSharedBy(String name) {
    return 'Geteilt von $name';
  }

  @override
  String get actionSharing => 'Freigabe';

  @override
  String get actionMoveToTrash => 'In den Papierkorb';

  @override
  String get actionRemoveFromMine => 'Aus meinen Notizen entfernen';

  @override
  String get readOnlyInTrash => 'Im Papierkorb.';

  @override
  String get readOnlyViewOnly => 'Nur ansehen.';

  @override
  String get readOnlyOwnerEdits => 'Nur der Eigentümer kann sie bearbeiten.';

  @override
  String readOnlySharedBy(String name) {
    return 'Geteilt von $name.';
  }

  @override
  String get noteArchived => 'Archiviert';

  @override
  String get tagAdd => 'Tag hinzufügen';

  @override
  String tagRemoveNamed(String tag) {
    return '$tag entfernen';
  }

  @override
  String get starterList => 'Liste';

  @override
  String get starterAttachment => 'Bild oder Audio';

  @override
  String get attachmentPictureDeleted => 'Bild gelöscht';

  @override
  String get attachmentVoiceDeleted => 'Sprachnotiz gelöscht';

  @override
  String get attachmentAddLabel => 'Bild, Aufnahme oder Datei hinzufügen';

  @override
  String get attachmentAdd => 'Hinzufügen';

  @override
  String get pullOffline =>
      'Du bist offline. Deine Änderungen werden auf diesem Handy gespeichert.';

  @override
  String get pullNoServer => 'Kein Server, bereits aktuell';

  @override
  String get pullSyncing => 'Wird synchronisiert …';

  @override
  String get pullUpToDate => 'Aktuell';

  @override
  String get pullFailed =>
      'Synchronisieren fehlgeschlagen. Deine Änderungen sind auf diesem Handy gespeichert.';

  @override
  String get searchClear => 'Suche löschen';

  @override
  String get searchFilter => 'Notizen filtern';

  @override
  String searchFiltersOn(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Notizen filtern, $count Filter aktiv',
      one: 'Notizen filtern, 1 Filter aktiv',
    );
    return '$_temp0';
  }

  @override
  String get searchNoMatches => 'Keine passenden Notizen';

  @override
  String get searchNoMatchesHelp =>
      'Schalte einen Filter aus, um mehr Notizen zu sehen.';

  @override
  String get filterTitle => 'Notizen filtern';

  @override
  String get filterHelp => 'Nur passende Notizen anzeigen';

  @override
  String filterCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Filter aktiv',
      one: '1 Filter aktiv',
    );
    return '$_temp0';
  }

  @override
  String get debugRecordingTitle => 'Debug-Aufnahme';

  @override
  String get debugStopRecording => 'Debug-Aufnahme beenden';

  @override
  String get debugDiscard => 'Verwerfen';

  @override
  String get debugDiscardTitle => 'Aufnahme verwerfen?';

  @override
  String get debugDiscardMessage =>
      'Die Aufnahme und die markierten Probleme gehen verloren.';

  @override
  String get debugShareFile => 'Datei teilen';

  @override
  String get debugPlay => 'Abspielen';

  @override
  String get debugPause => 'Pause';

  @override
  String debugProblemHere(String time) {
    return 'Problem hier ($time)';
  }

  @override
  String debugProblemAt(String time) {
    return 'Problem bei $time';
  }

  @override
  String get debugExpectation => 'Erwartung';

  @override
  String get debugExpectationHint => 'Was hätte passieren sollen?';

  @override
  String get debugAdd => 'Hinzufügen';

  @override
  String get debugNoExpectation => '(keine Erwartung)';

  @override
  String get debugProblemsHint =>
      'Gehe zu der Stelle, an der es schiefging, und tippe auf „Problem hier“.\nIm Video werden Text und Bilder ausgegraut; der Bericht lässt weg, was du geschrieben hast.';

  @override
  String get debugCreateIssue => 'Issue erstellen';

  @override
  String get debugSaveReport => 'Debug-Bericht speichern';

  @override
  String get debugBuilding => 'Bericht wird erstellt …';

  @override
  String get debugShareFailed => 'Bericht konnte nicht geteilt werden';

  @override
  String get debugGithubFailed => 'GitHub konnte nicht geöffnet werden';

  @override
  String get debugBuildFailed => 'Bericht konnte nicht erstellt werden';

  @override
  String get actionMerge => 'Zusammenführen';

  @override
  String notesMerged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen zusammengeführt',
      one: '1 Notiz zusammengeführt',
    );
    return '$_temp0';
  }

  @override
  String notesMergedKeptPictures(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count Notizen zusammengeführt; Bilder bleiben bei ihren Notizen im Papierkorb',
      one:
          '1 Notiz zusammengeführt; Bilder bleiben bei ihren Notizen im Papierkorb',
    );
    return '$_temp0';
  }

  @override
  String get notesMergePickTwo =>
      'Wähle mindestens zwei Notizen zum Zusammenführen';

  @override
  String get notesMergeOwnOnly =>
      'Nur deine eigenen Notizen können zusammengeführt werden';

  @override
  String get notesMergeFrozen =>
      'Gib die eingefrorenen Notizen zuerst frei und führe sie dann zusammen';

  @override
  String get notesMergeLocked =>
      'Öffne die gesperrten Notizen zuerst und führe sie dann zusammen';

  @override
  String get notesMergeFailed => 'Notizen konnten nicht zusammengeführt werden';

  @override
  String get filterSecrets => 'Geheimnisse';

  @override
  String get filterSecretsHelp => 'Schlüssel, Tokens, IDs und Passwörter';

  @override
  String get filterSearch => 'Suche';

  @override
  String get filterRegex => 'Regulärer Ausdruck';

  @override
  String get filterMatchCase => 'Groß-/Kleinschreibung';

  @override
  String get searchHintRegex => 'Mit Regex suchen';

  @override
  String get searchHintMatchCase => 'Suchen, Groß-/Kleinschreibung beachten';

  @override
  String get searchHintRegexMatchCase =>
      'Regex, Groß-/Kleinschreibung beachten';

  @override
  String get searchRegexIncomplete =>
      'Noch kein vollständiger regulärer Ausdruck: Es wird nach dem eingegebenen Text gesucht';

  @override
  String get filterHas => 'Enthält';

  @override
  String get filterPictures => 'Bilder';

  @override
  String get filterChecklists => 'Checklisten';

  @override
  String get filterReminders => 'Erinnerungen';

  @override
  String get filterTag => 'Tag';

  @override
  String get filterClear => 'Filter löschen';

  @override
  String get lineText => 'Text';

  @override
  String get lineH1 => 'Überschrift 1';

  @override
  String get lineH2 => 'Überschrift 2';

  @override
  String get lineH3 => 'Überschrift 3';

  @override
  String get lineChecklist => 'Checkliste';

  @override
  String get lineBullet => 'Aufzählung';

  @override
  String get lineNumbered => 'Nummerierte Liste';

  @override
  String get lineQuote => 'Zitat';

  @override
  String get lineCode => 'Codeblock';

  @override
  String get editorLink => 'Link';

  @override
  String get slashWordsChecklist =>
      'todo to-do task checkbox list aufgabe kästchen liste';

  @override
  String get slashWordsH1 => 'h1 title titel überschrift';

  @override
  String get slashWordsH2 =>
      'h2 subtitle subheading untertitel zwischenüberschrift';

  @override
  String get slashWordsH3 => 'h3 subheading zwischenüberschrift';

  @override
  String get slashWordsBullet =>
      'unordered ul dashes aufzählung striche punkte';

  @override
  String get slashWordsNumbered => 'ordered ol nummeriert nummern';

  @override
  String get slashWordsQuote => 'blockquote citation zitat';

  @override
  String get slashWordsCode => 'pre snippet code quelltext';

  @override
  String get slashWordsText => 'paragraph plain normal body absatz text';

  @override
  String get slashDate => 'Heutiges Datum';

  @override
  String get slashWordsDate => 'date today now day datum heute jetzt tag';

  @override
  String get slashWordsLink => 'url web address adresse verweis';

  @override
  String get slashWordsAttachment =>
      'image img photo file voice recording attachment bild foto datei sprachnotiz aufnahme anhang';

  @override
  String get barFormatting => 'Formatierung';

  @override
  String get barList => 'Liste';

  @override
  String get barSelected => 'Ausgewählter Text';

  @override
  String get barStyles => 'Textstile';

  @override
  String get barColors => 'Hervorhebungsfarben';

  @override
  String get barLineStyles => 'Zeilenstile';

  @override
  String get toolOutdent => 'Ausrücken';

  @override
  String get toolIndent => 'Einrücken';

  @override
  String get toolBold => 'Fett';

  @override
  String get toolItalic => 'Kursiv';

  @override
  String get toolUnderline => 'Unterstrichen';

  @override
  String get toolStrikethrough => 'Durchgestrichen';

  @override
  String get toolHighlight => 'Hervorheben';

  @override
  String get toolAlignLeft => 'Linksbündig';

  @override
  String get toolAlignCenter => 'Zentriert';

  @override
  String get toolAlignRight => 'Rechtsbündig';

  @override
  String get toolAlignJustify => 'Blocksatz';

  @override
  String get toolTextStyle => 'Farbe und Schrift';

  @override
  String get textStyleNone => 'Keine';

  @override
  String get textStyleDefault => 'Standard';

  @override
  String get textStyleColor => 'Textfarbe';

  @override
  String get textStyleFont => 'Schrift';

  @override
  String get textFontComic => 'Comic Sans';

  @override
  String get textFontHandwriting => 'Handschrift';

  @override
  String get textFontTypewriter => 'Schreibmaschine';

  @override
  String get textFontRounded => 'Abgerundet';

  @override
  String get textFontSlab => 'Slab';

  @override
  String get textFontMarker => 'Marker';

  @override
  String get textStyleCustomHighlight => 'Eigene Hervorhebung';

  @override
  String get textStyleCustomColor => 'Eigene Textfarbe';

  @override
  String get colorGray => 'Grau';

  @override
  String get colorPickerHue => 'Farbton';

  @override
  String get colorPickerSaturation => 'Sättigung';

  @override
  String get colorPickerLightness => 'Helligkeit';

  @override
  String get colorPickerBadHex => 'Verwende #rgb oder #rrggbb';

  @override
  String get colorPickerApply => 'Anwenden';

  @override
  String get toolRemoveHighlight => 'Hervorhebung entfernen';

  @override
  String get toolClearFormatting => 'Formatierung entfernen';

  @override
  String get toolRedo => 'Wiederholen';

  @override
  String get toolHideKeyboard => 'Tastatur ausblenden';

  @override
  String get editorEmptyItem => 'Leerer Eintrag';

  @override
  String get editorLinkCopied => 'Link kopiert';

  @override
  String editorCheckedItems(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count erledigte Einträge',
      one: '1 erledigter Eintrag',
    );
    return '$_temp0';
  }

  @override
  String get linkAdd => 'Link hinzufügen';

  @override
  String get linkEdit => 'Link bearbeiten';

  @override
  String get linkTextHint => 'Text';

  @override
  String get commonOpen => 'Öffnen';

  @override
  String get commonEdit => 'Bearbeiten';

  @override
  String get commonRemove => 'Entfernen';

  @override
  String get editorSlashHint => 'Tippe / für mehr';

  @override
  String get editorPastePicture => 'Bild einfügen';

  @override
  String get editorPlaceholder => 'Schreib los';

  @override
  String get commonTryAgain => 'Erneut versuchen';

  @override
  String get historyCurrent => 'Aktuelle Version';

  @override
  String get historySavedOnPhone => 'Auf diesem Handy gespeichert';

  @override
  String get historyNoChanges => 'Keine Änderungen';

  @override
  String get historyEmptyTitle => 'Noch keine früheren Versionen';

  @override
  String get historyFetchFailed =>
      'Versionen von deinen anderen Geräten konnten nicht abgerufen werden.';

  @override
  String get historyOffline =>
      'Verbinde dich mit dem Internet, um Versionen von deinen anderen Geräten zu sehen.';

  @override
  String diffAdded(int count) {
    return '$count hinzugefügt';
  }

  @override
  String diffRemoved(int count) {
    return '$count entfernt';
  }

  @override
  String diffChanged(int count) {
    return '$count geändert';
  }

  @override
  String diffLinesAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Zeilen hinzugefügt',
      one: '1 Zeile hinzugefügt',
    );
    return '$_temp0';
  }

  @override
  String diffLinesRemoved(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Zeilen entfernt',
      one: '1 Zeile entfernt',
    );
    return '$_temp0';
  }

  @override
  String diffLinesChanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Zeilen geändert',
      one: '1 Zeile geändert',
    );
    return '$_temp0';
  }

  @override
  String diffShowUnchanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count unveränderte Zeilen anzeigen',
      one: '1 unveränderte Zeile anzeigen',
    );
    return '$_temp0';
  }

  @override
  String diffUnchanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count unveränderte Zeilen',
      one: '1 unveränderte Zeile',
    );
    return '$_temp0';
  }

  @override
  String get diffAddedMark => 'Hinzugefügt:';

  @override
  String get diffRemovedMark => 'Entfernt:';

  @override
  String get diffChangedMark => 'Geändert:';

  @override
  String get diffCheckedMark => 'Erledigt:';

  @override
  String get diffUncheckedMark => 'Nicht erledigt:';

  @override
  String get diffRemovedTitle => 'Titel entfernt:';

  @override
  String get diffAddedTitle => 'Titel hinzugefügt:';

  @override
  String get revisionNotSavedLead => 'Nicht gespeichert.';

  @override
  String get revisionNotSavedText =>
      'Diese Änderung wurde nicht gespeichert, weil die Notiz zuvor auf einem anderen Gerät geändert wurde. Stelle sie wieder her oder kopiere, was du brauchst.';

  @override
  String get revisionAlreadyMatches =>
      'Die Notiz entspricht bereits dieser Version';

  @override
  String get revisionRestoreFailed =>
      'Diese Version konnte nicht wiederhergestellt werden';

  @override
  String get revisionRestoring => 'Wird wiederhergestellt …';

  @override
  String get revisionBackToList => 'Zurück zur Versionsliste';

  @override
  String get revisionNewer => 'Neuere Version';

  @override
  String get revisionOlder => 'Ältere Version';

  @override
  String revisionPosition(int index, int count) {
    return '$index von $count';
  }

  @override
  String get revisionGone => 'Diese Version ist nicht mehr verfügbar.';

  @override
  String get revisionSameAsNext =>
      'Gleicher Text wie die darauffolgende Version.';

  @override
  String get revisionSameAsCurrent => 'Gleicher Text wie die aktuelle Version.';

  @override
  String get revisionEmpty => 'Diese Version ist leer.';

  @override
  String shareFailed(String name) {
    return 'Teilen mit $name fehlgeschlagen';
  }

  @override
  String shareAccessFor(String name) {
    return 'Zugriff für $name';
  }

  @override
  String shareRevoked(String name) {
    return '$name hat keinen Zugriff mehr';
  }

  @override
  String shareRevokeFailed(String name) {
    return 'Zugriff für $name konnte nicht entfernt werden';
  }

  @override
  String shareChangeFailed(String name) {
    return 'Zugriff für $name konnte nicht geändert werden';
  }

  @override
  String get shareSubtitle =>
      'Personen, die du hinzufügst, sehen diese Notiz in ihrer Liste.';

  @override
  String get shareOffline =>
      'Verbinde dich mit dem Internet, um diese Notiz zu teilen.';

  @override
  String get shareSearchHint => 'Personen per Name oder E-Mail hinzufügen';

  @override
  String get shareNoMatches =>
      'Niemand gefunden. Nur Personen mit einem Konto auf diesem Server können hinzugefügt werden.';

  @override
  String get shareRecent => 'Zuletzt geteilt mit';

  @override
  String get sharePeople => 'Personen';

  @override
  String shareAddPerson(String name) {
    return '$name hinzufügen';
  }

  @override
  String get shareWithAccess => 'Personen mit Zugriff';

  @override
  String shareYou(String name) {
    return '$name (du)';
  }

  @override
  String get shareOwner => 'Eigentümer';

  @override
  String shareChangeAccess(String permission, String name) {
    return '$permission. Zugriff für $name ändern';
  }

  @override
  String get commonOffline => 'Offline';

  @override
  String commonDeleteItem(String name) {
    return '$name löschen';
  }

  @override
  String get commonMoveUp => 'Nach oben';

  @override
  String get commonMoveDown => 'Nach unten';

  @override
  String get commonMoveToTop => 'Ganz nach oben';

  @override
  String get commonMoveToBottom => 'Ganz nach unten';

  @override
  String commonPosition(int index, int count) {
    return '$index von $count';
  }

  @override
  String get addToNote => 'Zur Notiz hinzufügen';

  @override
  String get addPhotoUnsupported =>
      'Dieses Foto konnte nicht hinzugefügt werden. Probier es mit JPEG oder PNG.';

  @override
  String get addMicDenied =>
      'Erlaube in den Einstellungen den Mikrofonzugriff, um aufzunehmen';

  @override
  String get addTakePhoto => 'Foto aufnehmen';

  @override
  String get addChoosePhoto => 'Fotos auswählen';

  @override
  String get addRecordAudio => 'Audio aufnehmen';

  @override
  String get recordingTitle => 'Aufnahme';

  @override
  String get recordingHelp =>
      'Sprich ganz normal. Die Aufnahme bleibt auf diesem Handy, bis sie hochgeladen ist.';

  @override
  String get recordingReviewTitle => 'Deine Aufnahme';

  @override
  String recordingReviewHelp(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count Sekunden. Hör sie dir an, dann behalte sie oder nimm sie neu auf.',
      one: '1 Sekunde. Hör sie dir an, dann behalte sie oder nimm sie neu auf.',
    );
    return '$_temp0';
  }

  @override
  String get recordingStoppedAtLimit =>
      'Bei der maximalen Länge gestoppt. Hör sie dir an, dann behalte sie oder nimm sie neu auf.';

  @override
  String recordingElapsed(String time) {
    return 'Aufnahme läuft, $time';
  }

  @override
  String get recordingStop => 'Stopp';

  @override
  String get recordingDiscard => 'Verwerfen';

  @override
  String get recordingAgain => 'Neu';

  @override
  String get voiceOffline =>
      'Diese Sprachnotiz wird abgespielt, sobald du wieder online bist';

  @override
  String get voiceNote => 'Sprachnotiz';

  @override
  String get voiceLoadFailed => 'Konnte nicht laden';

  @override
  String get attachmentUploading => 'Wird hochgeladen…';

  @override
  String get attachmentUploadFailed => 'Hochladen fehlgeschlagen';

  @override
  String voicePosition(String name) {
    return 'Position in $name';
  }

  @override
  String audioSave(String name) {
    return '$name speichern';
  }

  @override
  String get audioSaveDialog => 'Audio speichern';

  @override
  String audioSaved(String name) {
    return '$name gespeichert';
  }

  @override
  String get audioSaveFailed => 'Audio konnte nicht gespeichert werden';

  @override
  String get pictureAllowPhotos =>
      'Erlaube in den Einstellungen den Zugriff auf Fotos, um Bilder zu speichern';

  @override
  String get pictureCopy => 'Bild kopieren';

  @override
  String get pictureCopied => 'Bild kopiert';

  @override
  String get pictureCopyFailed => 'Bild konnte nicht kopiert werden';

  @override
  String get pictureSaved => 'In Fotos gespeichert';

  @override
  String get pictureSaveFailed => 'Bild konnte nicht gespeichert werden';

  @override
  String get pictureOffline =>
      'Dieses Bild wird angezeigt, sobald du wieder online bist';

  @override
  String get pictureLoadFailed => 'Dieses Bild konnte nicht geladen werden';

  @override
  String get pictureShowTags => 'Erkannte Tags anzeigen';

  @override
  String get pictureHideTags => 'Erkannte Tags ausblenden';

  @override
  String get pictureFindingTags => 'Tags werden gesucht';

  @override
  String get pictureTagsFailed => 'Tags konnten nicht abgerufen werden';

  @override
  String get pictureTagsNotYet =>
      'Dieses Bild wurde noch nicht analysiert. Versuch es bald noch einmal.';

  @override
  String pictureSearchTag(String tag) {
    return 'Deine Notizen nach $tag durchsuchen';
  }

  @override
  String get pictureGrabText => 'Bildtext übernehmen';

  @override
  String get pictureReadingText => 'Text im Bild wird gelesen';

  @override
  String get pictureOpenNote => 'Notiz öffnen';

  @override
  String get pictureTextAdded => 'Text zur Notiz hinzugefügt';

  @override
  String get pictureNoText => 'Kein Text in diesem Bild gefunden';

  @override
  String get pictureTextFailed => 'Dieses Bild konnte nicht gelesen werden';

  @override
  String get pictureSelectText => 'Text auswählen';

  @override
  String pictureWordsSelected(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Wörter ausgewählt',
      one: '1 Wort ausgewählt',
    );
    return '$_temp0';
  }

  @override
  String get pictureSelectHint =>
      'Halte ein Wort gedrückt und zieh, um Text auszuwählen, oder halte daneben gedrückt und zieh einen Rahmen auf';

  @override
  String get pictureInsertText => 'In Notiz einfügen';

  @override
  String get pictureTextCopied => 'Text kopiert';

  @override
  String get pictureSaveToPhotos => 'In Fotos speichern';

  @override
  String attachmentRetry(String name) {
    return 'Erneut versuchen, $name';
  }

  @override
  String pictureOpen(String name) {
    return '$name, öffnen';
  }

  @override
  String get groupPinned => 'Angeheftet';

  @override
  String get groupOthers => 'Weitere';

  @override
  String get groupArchived => 'Archiviert';

  @override
  String get groupPictureMatches => 'Bilder, die passen könnten';

  @override
  String get noteBackground => 'Hintergrund';

  @override
  String get notePattern => 'Muster';

  @override
  String get noteColorDefault => 'Standard';

  @override
  String get patternDots => 'Punkte';

  @override
  String get patternGrid => 'Raster';

  @override
  String get patternLines => 'Linien';

  @override
  String get patternWaves => 'Wellen';

  @override
  String get patternGroceries => 'Einkauf';

  @override
  String get patternMusic => 'Musik';

  @override
  String get patternTravel => 'Reisen';

  @override
  String get patternCode => 'Code';

  @override
  String get viewLayout => 'Layout';

  @override
  String get viewMasonry => 'Mauerwerk';

  @override
  String get viewGrid => 'Raster';

  @override
  String get viewList => 'Liste';

  @override
  String get viewSortBy => 'Sortieren nach';

  @override
  String get viewDateEdited => 'Bearbeitungsdatum';

  @override
  String get viewDateCreated => 'Erstellungsdatum';

  @override
  String get viewTitle => 'Titel';

  @override
  String get viewSize => 'Größe';

  @override
  String get viewLargestFirst => 'Größte zuerst';

  @override
  String get viewSmallestFirst => 'Kleinste zuerst';

  @override
  String get viewAtoZ => 'A bis Z';

  @override
  String get viewZtoA => 'Z bis A';

  @override
  String get viewNewestFirst => 'Neueste zuerst';

  @override
  String get viewOldestFirst => 'Älteste zuerst';

  @override
  String get noteUnsynced => 'Änderungen noch nicht synchronisiert';

  @override
  String get noteOnThisPhone => 'Auf diesem Handy';

  @override
  String get noteGone => 'Diese Notiz ist nicht mehr verfügbar';

  @override
  String get reminderRemoved => 'Erinnerung entfernt';

  @override
  String get versionRestored => 'Version wiederhergestellt';

  @override
  String get attachmentPictureAdded => 'Bild hinzugefügt';

  @override
  String get attachmentVoiceAdded => 'Sprachnotiz hinzugefügt';

  @override
  String get attachmentPictureAddedOffline =>
      'Bild hinzugefügt. Es wird hochgeladen, sobald du wieder online bist.';

  @override
  String get attachmentVoiceAddedOffline =>
      'Sprachnotiz hinzugefügt. Sie wird hochgeladen, sobald du wieder online bist.';

  @override
  String get attachmentPictureAddFailed =>
      'Bild konnte nicht hinzugefügt werden';

  @override
  String get attachmentVoiceAddFailed =>
      'Sprachnotiz konnte nicht hinzugefügt werden';

  @override
  String get attachmentAudioAdded => 'Audiodatei hinzugefügt';

  @override
  String get attachmentAudioAddedOffline =>
      'Audiodatei hinzugefügt. Sie wird hochgeladen, sobald du wieder online bist.';

  @override
  String get attachmentAudioAddFailed =>
      'Audiodatei konnte nicht hinzugefügt werden';

  @override
  String get attachmentTooBig =>
      'Dateien über 50 MB können nicht hinzugefügt werden.';

  @override
  String get attachmentAudioDeleted => 'Audiodatei gelöscht';

  @override
  String get audioFileOffline =>
      'Diese Audiodatei wird abgespielt, sobald du wieder online bist';

  @override
  String get noteTitleHint => 'Titel';

  @override
  String get viewOrder => 'Reihenfolge';

  @override
  String get viewCards => 'Karten';

  @override
  String get viewCardPictures => 'Bilder auf Karten';

  @override
  String get viewCardPicturesHelp =>
      'Bilder einer Notiz auf ihrer Karte zeigen';

  @override
  String get slashMenuLabel => 'Einfügen';

  @override
  String get slashNoResults => 'Keine Ergebnisse';

  @override
  String get noteColor => 'Farbe';

  @override
  String cardChecked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count erledigt',
      one: '1 erledigt',
    );
    return '$_temp0';
  }

  @override
  String cardAllChecked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Alle $count erledigt',
      one: 'Alle 1 erledigt',
    );
    return '$_temp0';
  }

  @override
  String get shareSheetTitle => 'Neue Notiz';

  @override
  String shareTag(String name) {
    return 'Tag $name';
  }

  @override
  String get shareSignIn =>
      'Melde dich bei Anchor an, um zu speichern, was du teilst.';

  @override
  String get shareOpenApp => 'Anchor öffnen';

  @override
  String get shareNothing => 'Hier gibt es nichts, was Anchor speichern kann.';

  @override
  String shareNotAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Dateien konnten nicht hinzugefügt werden.',
      one: '1 Datei konnte nicht hinzugefügt werden.',
    );
    return '$_temp0';
  }

  @override
  String shareUnsupported(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count Dateien können nicht hinzugefügt werden. Anchor nimmt Bilder und Audio auf.',
      one:
          '1 Datei kann nicht hinzugefügt werden. Anchor nimmt Bilder und Audio auf.',
    );
    return '$_temp0';
  }

  @override
  String shareTooBig(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count Dateien sind größer als 50 MB und können nicht hinzugefügt werden.',
      one: '1 Datei ist größer als 50 MB und kann nicht hinzugefügt werden.',
    );
    return '$_temp0';
  }

  @override
  String get shareOverLimit => 'Nur die ersten 20 Dateien werden hinzugefügt.';

  @override
  String shareRemoveItem(String name) {
    return '$name entfernen';
  }

  @override
  String get actionLock => 'Sperren';

  @override
  String get actionChangeLock => 'Sperre ändern';

  @override
  String get actionRemoveLock => 'Sperre entfernen';

  @override
  String get lockSheetTitle => 'Sperren';

  @override
  String get lockSheetChangeTitle => 'Sperre ändern';

  @override
  String get lockSheetSubtitle => 'Womit sich die Notiz öffnet';

  @override
  String get lockKindBiometric => 'Fingerabdruck oder Gesicht';

  @override
  String get lockKindBiometricHelp => 'Oder die Displaysperre deines Handys';

  @override
  String get lockKindPin => 'PIN';

  @override
  String get lockKindPinHelp => 'Eine PIN für alle gesperrten Notizen';

  @override
  String get lockKindPattern => 'Muster';

  @override
  String get lockKindPatternHelp => 'Ein Muster für alle gesperrten Notizen';

  @override
  String get lockKindTap => 'Nur ein Tipp';

  @override
  String get lockKindTapHelp => 'Verbirgt die Notiz, bis du tippst';

  @override
  String noteLockedWith(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'biometric': 'Mit Fingerabdruck oder Gesicht gesperrt',
      'pin': 'Mit deiner PIN gesperrt',
      'pattern': 'Mit deinem Muster gesperrt',
      'other': 'Mit einem Tipp gesperrt',
    });
    return '$_temp0';
  }

  @override
  String noteLockChanged(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'biometric': 'Jetzt mit Fingerabdruck oder Gesicht gesperrt',
      'pin': 'Jetzt mit deiner PIN gesperrt',
      'pattern': 'Jetzt mit deinem Muster gesperrt',
      'other': 'Jetzt mit einem Tipp gesperrt',
    });
    return '$_temp0';
  }

  @override
  String get noteLockRemoved => 'Sperre entfernt';

  @override
  String notesLocked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen gesperrt',
      one: 'Notiz gesperrt',
    );
    return '$_temp0';
  }

  @override
  String notesLockedSome(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count Notizen gesperrt. Gesperrte Notizen, die du nicht geöffnet hast, behalten ihre Sperre.',
      one:
          '1 Notiz gesperrt. Gesperrte Notizen, die du nicht geöffnet hast, behalten ihre Sperre.',
    );
    return '$_temp0';
  }

  @override
  String notesLockOpenFirst(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Öffne diese Notizen, um ihre Sperren zu ändern',
      one: 'Öffne diese Notiz, um ihre Sperre zu ändern',
    );
    return '$_temp0';
  }

  @override
  String lockNeedsServer(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Zum Festlegen einer PIN ist eine Verbindung zum Server nötig',
      'other':
          'Zum Festlegen eines Musters ist eine Verbindung zum Server nötig',
    });
    return '$_temp0';
  }

  @override
  String lockChangeNeedsServer(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Zum Ändern der PIN ist eine Verbindung zum Server nötig',
      'other': 'Zum Ändern des Musters ist eine Verbindung zum Server nötig',
    });
    return '$_temp0';
  }

  @override
  String get lockUntitled => 'Gesperrte Notiz';

  @override
  String get lockTapToUnlock => 'Zum Entsperren tippen';

  @override
  String get lockUnlock => 'Entsperren';

  @override
  String get lockEnterPin => 'PIN eingeben';

  @override
  String get lockDrawPattern => 'Muster zeichnen';

  @override
  String get lockUseBiometric =>
      'Nutze Fingerabdruck, Gesicht oder Displaysperre';

  @override
  String lockBiometricReason(String title) {
    return '„$title“ entsperren';
  }

  @override
  String get lockTooManyTries =>
      'Zu viele Versuche. Entsperre dein Handy und versuch es dann noch einmal.';

  @override
  String get lockCantCheck =>
      'Auf diesem Handy noch nicht prüfbar. Verbinde dich mit dem Internet und versuch es noch einmal.';

  @override
  String lockWrong(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Falsche PIN',
      'other': 'Falsches Muster',
    });
    return '$_temp0';
  }

  @override
  String get lockPatternGrid => 'Mustergitter. Zieh über mindestens 4 Punkte.';

  @override
  String get lockPinErase => 'Ziffer löschen';

  @override
  String lockPinDigits(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Ziffern',
      one: '1 Ziffer',
      zero: 'Keine Ziffern',
    );
    return '$_temp0';
  }

  @override
  String lockSetupTitle(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN',
      'other': 'Muster',
    });
    return '$_temp0';
  }

  @override
  String lockSetupChoose(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN wählen',
      'other': 'Muster zeichnen',
    });
    return '$_temp0';
  }

  @override
  String lockSetupChooseNew(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Neue PIN wählen',
      'other': 'Neues Muster zeichnen',
    });
    return '$_temp0';
  }

  @override
  String lockSetupConfirm(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN erneut eingeben',
      'other': 'Muster erneut zeichnen',
    });
    return '$_temp0';
  }

  @override
  String get lockSetupCurrentHelp => 'Die, die du gerade nutzt';

  @override
  String lockSetupChooseHelp(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin':
          '4 bis 12 Ziffern. Sie öffnet jede Notiz, die du mit einer PIN sperrst.',
      'other':
          'Verbinde mindestens 4 Punkte. Es öffnet jede Notiz, die du mit einem Muster sperrst.',
    });
    return '$_temp0';
  }

  @override
  String get lockSetupConfirmHelp => 'Zur Sicherheit';

  @override
  String lockSetupNotYours(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Das ist nicht deine PIN',
      'other': 'Das ist nicht dein Muster',
    });
    return '$_temp0';
  }

  @override
  String lockSetupBadShape(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Nutze 4 bis 12 Ziffern',
      'other': 'Verbinde mindestens 4 Punkte, jeden nur einmal',
    });
    return '$_temp0';
  }

  @override
  String lockSetupMismatch(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Die PINs stimmen nicht überein. Versuch es noch einmal.',
      'other': 'Die Muster stimmen nicht überein. Versuch es noch einmal.',
    });
    return '$_temp0';
  }

  @override
  String get lockSetupForgot => 'Vergessen? Nutze dein Passwort';

  @override
  String get lockSetupPasswordTitle => 'Dein Kontopasswort';

  @override
  String lockErrorWrongProof(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Falsche PIN oder falsches Passwort',
      'other': 'Falsches Muster oder falsches Passwort',
    });
    return '$_temp0';
  }

  @override
  String lockErrorInvalid(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Eine PIN hat 4 bis 12 Ziffern',
      'other': 'Ein Muster verbindet mindestens 4 Punkte',
    });
    return '$_temp0';
  }

  @override
  String get lockErrorUnsupported =>
      'Dein Server unterstützt noch keine Notizsperren';

  @override
  String lockErrorOffline(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin':
          'PIN konnte nicht gespeichert werden. Es ist eine Verbindung zum Server nötig.',
      'other':
          'Muster konnte nicht gespeichert werden. Es ist eine Verbindung zum Server nötig.',
    });
    return '$_temp0';
  }

  @override
  String lockSaved(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN gespeichert',
      'other': 'Muster gespeichert',
    });
    return '$_temp0';
  }

  @override
  String get settingsNoteLocks => 'Notizsperren';

  @override
  String settingsLockSet(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN festlegen',
      'other': 'Muster festlegen',
    });
    return '$_temp0';
  }

  @override
  String settingsLockChange(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN ändern',
      'other': 'Muster ändern',
    });
    return '$_temp0';
  }

  @override
  String settingsLockHelp(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Öffnet die Notizen, die du mit einer PIN sperrst',
      'other': 'Öffnet die Notizen, die du mit einem Muster sperrst',
    });
    return '$_temp0';
  }

  @override
  String get cardLocked => 'Gesperrt';

  @override
  String get cardUnlocked => 'Gesperrt, geöffnet bis das Display ausgeht';

  @override
  String get settingsBackup => 'Backup';

  @override
  String get backupExport => 'Backup exportieren';

  @override
  String get backupExportHelp =>
      'Alle Notizen, Tags, Bilder und Aufnahmen in einer Datei speichern';

  @override
  String get backupExporting => 'Backup wird erstellt…';

  @override
  String get backupSaveTitle => 'Backup speichern';

  @override
  String backupSaved(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen im Backup gespeichert',
      one: '1 Notiz im Backup gespeichert',
    );
    return '$_temp0';
  }

  @override
  String backupMissingFiles(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count Anhänge waren nicht auf diesem Handy und konnten nicht abgerufen werden.',
      one:
          '1 Anhang war nicht auf diesem Handy und konnte nicht abgerufen werden.',
    );
    return '$_temp0';
  }

  @override
  String get backupExportFailed => 'Backup konnte nicht erstellt werden';

  @override
  String get backupRestore => 'Backup wiederherstellen';

  @override
  String get backupRestoreHelp =>
      'Notizen aus einer Backup-Datei zurückholen. Bereits vorhandene Notizen bleiben unverändert';

  @override
  String get backupRestoring => 'Wird wiederhergestellt…';

  @override
  String get backupPickTitle => 'Anchor-Backup auswählen';

  @override
  String get backupOpenFailed => 'Datei konnte nicht geöffnet werden';

  @override
  String backupRestored(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen wiederhergestellt',
      one: '1 Notiz wiederhergestellt',
    );
    return '$_temp0';
  }

  @override
  String backupAlreadyHere(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count waren schon vorhanden.',
      one: '1 war schon vorhanden.',
    );
    return '$_temp0';
  }

  @override
  String get backupNothingToRestore =>
      'Nichts wiederherzustellen: Alle Notizen sind schon da';

  @override
  String get backupRestoreFailed =>
      'Backup konnte nicht wiederhergestellt werden';

  @override
  String get backupNotABackup => 'Diese Datei ist kein Anchor-Backup';

  @override
  String get backupDamaged => 'Dieses Backup ist beschädigt';

  @override
  String get backupTooNew =>
      'Dieses Backup stammt von einer neueren Anchor-Version. Aktualisiere die App, um es wiederherzustellen.';

  @override
  String get attachmentFileAdded => 'Datei hinzugefügt';

  @override
  String get attachmentFileAddedOffline =>
      'Datei hinzugefügt. Sie wird hochgeladen, sobald du wieder online bist.';

  @override
  String get attachmentFileAddFailed => 'Datei konnte nicht hinzugefügt werden';

  @override
  String get attachmentFileDeleted => 'Datei gelöscht';

  @override
  String attachmentsAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Anhänge hinzugefügt',
      one: '1 Anhang hinzugefügt',
    );
    return '$_temp0';
  }

  @override
  String attachmentsAddedOffline(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count Anhänge hinzugefügt. Sie werden hochgeladen, sobald du wieder online bist.',
      one:
          '1 Anhang hinzugefügt. Er wird hochgeladen, sobald du wieder online bist.',
    );
    return '$_temp0';
  }

  @override
  String get pictureInTextCamera => 'Bild aufnehmen';

  @override
  String get pictureInTextChoose => 'Bilder auswählen';

  @override
  String get pictureCrop => 'Zuschneiden';

  @override
  String get pictureCropReset => 'Zurücksetzen';

  @override
  String get cameraFlashOff => 'Blitz aus';

  @override
  String get cameraFlashOn => 'Blitz an';

  @override
  String get cameraNone => 'Keine Kamera gefunden';

  @override
  String get cameraNoPermission =>
      'Anchor braucht die Kameraberechtigung, um Bilder aufzunehmen';

  @override
  String get cameraFailed => 'Kamera konnte nicht gestartet werden';

  @override
  String get cameraSwitch => 'Kamera wechseln';

  @override
  String get cameraShutter => 'Bild aufnehmen';

  @override
  String cameraTaken(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Bilder aufgenommen',
      one: '1 Bild aufgenommen',
    );
    return '$_temp0';
  }

  @override
  String cameraPicturesAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Bilder hinzugefügt',
      one: '1 Bild hinzugefügt',
    );
    return '$_temp0';
  }

  @override
  String get inlinePicture => 'Bild';

  @override
  String get inlinePictureRetake => 'Neu aufnehmen';

  @override
  String get inlinePictureMirrorHorizontally => 'Horizontal spiegeln';

  @override
  String get inlinePictureMirrorVertically => 'Vertikal spiegeln';

  @override
  String get inlinePictureAddCaption => 'Bildunterschrift hinzufügen';

  @override
  String get inlinePictureEditCaption => 'Bildunterschrift bearbeiten';

  @override
  String get inlinePictureCaptionHint => 'Bildunterschrift';

  @override
  String get inlinePictureChangeFailed => 'Bild konnte nicht geändert werden';

  @override
  String get inlinePictureResize => 'Bildgröße ändern';

  @override
  String get fileOffline =>
      'Diese Datei lässt sich öffnen, sobald du wieder online bist';

  @override
  String get fileLoadFailed => 'Datei konnte nicht geladen werden';

  @override
  String get fileNoApp =>
      'Keine App auf diesem Handy kann sie öffnen. Speichere sie stattdessen.';

  @override
  String get fileSaveDialog => 'Datei speichern';

  @override
  String fileSaved(String name) {
    return '$name gespeichert';
  }

  @override
  String get fileSaveFailed => 'Datei konnte nicht gespeichert werden';

  @override
  String fileOpen(String name) {
    return '$name öffnen';
  }

  @override
  String fileSave(String name) {
    return '$name speichern';
  }

  @override
  String get addTakeSeveral => 'Mehrere aufnehmen';

  @override
  String get addFiles => 'Dateien';

  @override
  String get addFolder => 'Ordner';

  @override
  String get addFolderFailed => 'Dieser Ordner konnte nicht gelesen werden';

  @override
  String get addFolderEmpty => 'Dieser Ordner ist leer';

  @override
  String get actionAddImage => 'Bild hinzufügen';

  @override
  String get actionTakePicture => 'Bild aufnehmen';

  @override
  String get actionTakeSeveral => 'Mehrere aufnehmen';

  @override
  String get actionFreeze => 'Einfrieren';

  @override
  String get actionUnfreeze => 'Auftauen';

  @override
  String get noteFreezeHelp =>
      'Niemand kann sie ändern oder löschen, bis du sie auftaust';

  @override
  String get noteFreezeFailed =>
      'Einfrieren fehlgeschlagen. Es ist eine Verbindung zum Server nötig.';

  @override
  String get noteUnfreezeFailed =>
      'Auftauen fehlgeschlagen. Es ist eine Verbindung zum Server nötig.';

  @override
  String notesFrozen(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen eingefroren',
      one: 'Notiz eingefroren',
    );
    return '$_temp0';
  }

  @override
  String notesUnfrozen(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Notizen aufgetaut',
      one: 'Notiz aufgetaut',
    );
    return '$_temp0';
  }

  @override
  String notesFrozenStay(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'Eingefrorene Notizen können nicht gelöscht werden. Taue sie zuerst auf.',
      one:
          'Eine eingefrorene Notiz kann nicht gelöscht werden. Taue sie zuerst auf.',
    );
    return '$_temp0';
  }

  @override
  String get notesLockOrFreeze => 'Sperren oder einfrieren';

  @override
  String get readOnlyFrozenByOwner =>
      'Der Eigentümer hat sie eingefroren, daher kann sie nicht geändert werden.';

  @override
  String get notePublicCanView =>
      'Öffentlich: Jeder mit dem Link kann sie ansehen';

  @override
  String get notePublicCanEdit =>
      'Öffentlich: Jeder mit dem Link kann sie bearbeiten';

  @override
  String get cardFrozen => 'Eingefroren';

  @override
  String get noteNewCamera => 'Kameranotiz';

  @override
  String get actionReminder => 'Erinnerung';

  @override
  String get actionCheckboxes => 'Kontrollkästchen';

  @override
  String get actionModifyQuickActions => 'Schnellaktionen anpassen';

  @override
  String get settingsQuickActions => 'Schnellaktionen';

  @override
  String get settingsQuickActionsHelp =>
      'In der oberen Leiste einer Notiz, in dieser Reihenfolge. Bis zu 5 passen hinein. Zum Sortieren ziehen.';

  @override
  String get settingsQuickActionsEmpty => 'Keine. Alles ist unter Mehr.';

  @override
  String get settingsMoreActions => 'Unter Mehr';

  @override
  String get settingsMoreActionsHelp =>
      'Schalte eine aus, um sie nirgends anzubieten. Tippe auf +, um sie in die obere Leiste zu setzen.';

  @override
  String get settingsQuickActionsReset => 'Schnellaktionen zurücksetzen';

  @override
  String settingsAddToBar(String action) {
    return '$action in die obere Leiste setzen';
  }

  @override
  String settingsMoveAction(String action) {
    return '$action verschieben';
  }

  @override
  String settingsRemoveFromBar(String action) {
    return '$action aus der oberen Leiste nehmen';
  }

  @override
  String get settingsCopySetup => 'Einrichtung kopieren';

  @override
  String get settingsPasteSetup => 'Einrichtung einfügen';

  @override
  String get settingsSetupCopied => 'Schnellaktionen kopiert';

  @override
  String get settingsSetupPasted => 'Schnellaktionen eingefügt';

  @override
  String get settingsSetupPasteFailed =>
      'Die Zwischenablage enthält keine kopierten Schnellaktionen';

  @override
  String get authMagicCodeUsed =>
      'Dieser QR-Code oder Magic Link ist abgelaufen. Erstelle in den Einstellungen im Web einen neuen.';

  @override
  String get magicLoginScan => 'QR-Code scannen';

  @override
  String get magicLoginScanTitle => 'Magic-Login-QR-Code scannen';

  @override
  String get magicLoginScanHint =>
      'Öffne im Web die Einstellungen und tippe unter „Auf dem Handy anmelden“ auf „QR-Code anzeigen“. Richte dann die Kamera darauf.';

  @override
  String get magicLoginNotOurs =>
      'Dieser QR-Code ist kein Magic Login. Nutze den aus den Einstellungen im Web.';

  @override
  String get magicLoginNoPermission =>
      'Anchor braucht die Kameraberechtigung, um den QR-Code zu scannen';

  @override
  String get magicLoginSigningIn => 'Anmeldung läuft…';

  @override
  String get magicLoginAlreadySignedIn =>
      'Du bist schon angemeldet. Melde dich zuerst ab, um einen Magic Link zu nutzen.';

  @override
  String liveImageConnecting(String device) {
    return 'Verbindung zu $device wird hergestellt…';
  }

  @override
  String liveImageWaiting(String device) {
    return 'Warte auf $device. Öffne dort Anchor, um es anzuzeigen.';
  }

  @override
  String liveImageScreenPaused(String device) {
    return '$device teilt gerade den Bildschirm nicht.';
  }

  @override
  String liveImageCameraPaused(String device) {
    return '$device kann gerade seine Kamera nicht zeigen.';
  }

  @override
  String get liveImageSomeDevice => 'das Gerät, das es hinzugefügt hat';

  @override
  String get liveImageBadge => 'Live';

  @override
  String get liveImageCamera => 'Live-Kamera';

  @override
  String get liveImageScreen => 'Live-Bildschirm';

  @override
  String get liveImageSoundOn => 'Ton einschalten';

  @override
  String get liveImageSoundOff => 'Ton ausschalten';

  @override
  String get liveImageMicMuted => 'Mikrofon stummgeschaltet';

  @override
  String liveImageViewers(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Zuschauer',
      one: '1 Zuschauer',
      zero: 'Niemand schaut zu',
    );
    return '$_temp0';
  }

  @override
  String get liveImageStillKept => 'Standbild zu den Anhängen hinzugefügt';

  @override
  String get liveImageStillFailed =>
      'Standbild des Live-Bilds konnte nicht gespeichert werden';

  @override
  String get liveImageCameraOff => 'Deine Kamera ist aus.';

  @override
  String get liveImageTurnCameraOn => 'Kamera einschalten';

  @override
  String get liveImageCameraFailed =>
      'Kamera konnte nicht eingeschaltet werden';

  @override
  String get liveImageMute => 'Mikrofon stummschalten';

  @override
  String get liveImageUnmute => 'Stummschaltung aufheben';

  @override
  String get addLiveCamera => 'Live-Kamera';

  @override
  String get liveCameraTitle => 'Live-Kamera';

  @override
  String get liveCameraSubtitle =>
      'Zeigt die Kamera dieses Handys live in der Notiz, auf jedem Gerät, das sie öffnet, solange Anchor hier geöffnet ist.';

  @override
  String get liveCameraFront => 'Vorne';

  @override
  String get liveCameraBack => 'Hinten';

  @override
  String get liveCameraMic => 'Mikrofon';

  @override
  String get liveCameraMicHint =>
      'Sendet auch den Ton dieses Handys; du kannst ihn während der Übertragung stummschalten.';

  @override
  String get liveCameraAdd => 'Zur Notiz hinzufügen';

  @override
  String get liveCameraNoCamera =>
      'Es konnte keine Kamera eingeschaltet werden.';

  @override
  String get flowchart => 'Flussdiagramm';

  @override
  String get slashWordsFlowchart =>
      'diagramm ablauf fluss prozess kästchen pfeile entscheidung flowchart';

  @override
  String get flowchartNew => 'Neues Flussdiagramm';

  @override
  String get flowchartEdit => 'Flussdiagramm bearbeiten';

  @override
  String get flowchartAdd => 'Hinzufügen';

  @override
  String get flowchartStep => 'Schritt';

  @override
  String get flowchartDecision => 'Entscheidung';

  @override
  String get flowchartEnd => 'Ende';

  @override
  String get flowchartStartOrEnd => 'Start oder Ende';

  @override
  String get flowchartWrite => 'Schreiben';

  @override
  String get flowchartNextStep => 'Nächster Schritt';

  @override
  String get flowchartFit => 'Alles zeigen';

  @override
  String get flowchartRemove => 'Diagramm entfernen';

  @override
  String get flowchartBoxText => 'Text im Kästchen';

  @override
  String get flowchartArrowText => 'Text am Pfeil';

  @override
  String get flowchartArrowHint => 'Beschriftung, z. B. ja';

  @override
  String get flowchartDiscardTitle => 'Änderungen verwerfen?';

  @override
  String get flowchartDiscardMessage =>
      'Die Änderungen an diesem Flussdiagramm wurden nicht gespeichert.';

  @override
  String get flowchartDiscard => 'Verwerfen';

  @override
  String get flowchartRemoveTitle => 'Flussdiagramm entfernen?';

  @override
  String get flowchartRemoveMessage =>
      'Das Diagramm wird aus der Notiz entfernt. Mit „Rückgängig“ in der Notiz holst du es zurück.';

  @override
  String flowchartCanvas(int boxes, int arrows) {
    return 'Flussdiagramm mit $boxes Kästchen und $arrows Pfeilen. Tippe auf ein Kästchen, um es auszuwählen, und noch einmal, um zu schreiben.';
  }

  @override
  String flowchartLabel(String name) {
    return 'Flussdiagramm: $name';
  }

  @override
  String get flowchartOpenHint => 'Öffnet das Flussdiagramm zum Bearbeiten';

  @override
  String get pageScanTitle => 'Seite scannen';

  @override
  String get pageScanStraighten => 'Begradigen';

  @override
  String get pageScanWhole => 'Ganzes Bild';

  @override
  String get pageScanFinding => 'Seite wird gesucht…';

  @override
  String get pageScanFound =>
      'Zieh eine Ecke, um den Rahmen an die Seite anzupassen.';

  @override
  String get pageScanNotFound =>
      'Keine Seite gefunden. Zieh die Ecken auf die Ecken der Seite.';

  @override
  String get pageScanCorner => 'Seitenecke';

  @override
  String get inlinePictureStraighten => 'Seite begradigen';

  @override
  String get scanTitle => 'Scan';

  @override
  String get scanNew => 'Neuer Scan';

  @override
  String get scanAdd => 'Hinzufügen';

  @override
  String get scanDocument => 'Dokument scannen';

  @override
  String get scanPage => 'Seite';

  @override
  String scanPageNumber(int number, int count) {
    return 'Seite $number von $count';
  }

  @override
  String scanPageNumberShort(int number) {
    return 'Seite $number';
  }

  @override
  String scanPages(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Seiten',
      one: '1 Seite',
    );
    return '$_temp0';
  }

  @override
  String get scanBrightness => 'Helligkeit';

  @override
  String get scanContrast => 'Kontrast';

  @override
  String get scanCleanup => 'Angleichen';

  @override
  String get scanThreshold => 'Tinte';

  @override
  String get scanCorners => 'Ecken';

  @override
  String get scanTurnLeft => 'Nach links drehen';

  @override
  String get scanTurnRight => 'Nach rechts drehen';

  @override
  String get scanProfileBw => 'S/W';

  @override
  String get scanProfileWhiteboard => 'Whiteboard';

  @override
  String get scanProfileText => 'Farbiger Text';

  @override
  String get scanProfileColor => 'Volle Farbe';

  @override
  String get scanLookForAll => 'Für alle Seiten verwenden';

  @override
  String get scanMovePage => 'Seite verschieben';

  @override
  String get scanDeletePage => 'Seite löschen';

  @override
  String get scanNameHint => 'Name für das PDF';

  @override
  String get scanPhotoMissing =>
      'Einige Fotos sind noch nicht auf diesem Handy. Versuch es gleich noch einmal.';

  @override
  String get scanPdfFailed => 'Das PDF konnte nicht erstellt werden.';

  @override
  String get scanSharePdf => 'PDF teilen';

  @override
  String get scanSavePdf => 'PDF speichern';

  @override
  String get scanMakingPdf => 'PDF wird erstellt…';

  @override
  String get scanPdfSaved => 'PDF gespeichert';

  @override
  String get scanNoPages =>
      'Noch keine Seiten. Fotografiere die Seiten oder wähle Fotos aus.';

  @override
  String get scanTakePhotos => 'Fotos aufnehmen';

  @override
  String get scanPdfPaper => 'Papier';

  @override
  String get scanPaperLetter => 'Letter';

  @override
  String get scanPaperFit => 'Bildgröße';

  @override
  String get scanPdfMargin => 'Rand';

  @override
  String get scanMarginNone => 'Keiner';

  @override
  String scanMarginMm(int mm) {
    return '$mm mm';
  }

  @override
  String get scanPdfQuality => 'Qualität';

  @override
  String get scanQualitySmall => 'Klein';

  @override
  String get scanQualityStandard => 'Standard';

  @override
  String get scanQualityHigh => 'Hoch';

  @override
  String get scanRemove => 'Scan entfernen';

  @override
  String get scanOpenHint => 'Öffnet den Scan zum Bearbeiten';

  @override
  String get scanFromGallery => 'Aus Galerie';

  @override
  String get settingsServer => 'Server';

  @override
  String get settingsServerAddresses => 'Adressen';

  @override
  String settingsServerAddressInUse(String address) {
    return 'Verwendet: $address';
  }

  @override
  String get serverAddressesTitle => 'Serveradressen';

  @override
  String get serverAddressesOrder => 'In dieser Reihenfolge versucht';

  @override
  String get serverAddressesHelp =>
      'Füge weitere Adressen für denselben Server hinzu, etwa seine Adresse zu Hause und eine über ein VPN für unterwegs. Die App versucht sie der Reihe nach und nimmt die erste, die antwortet. Deine Notizen und dein Konto sind unter jeder Adresse dieselben.';

  @override
  String get serverAddressesMain => 'Hauptadresse';

  @override
  String get serverAddressesInUse => 'Verwendet';

  @override
  String get serverAddressesMainInUse => 'Hauptadresse · Verwendet';

  @override
  String serverAddressesMoveUp(String address) {
    return '$address nach oben';
  }

  @override
  String serverAddressesMoveDown(String address) {
    return '$address nach unten';
  }

  @override
  String serverAddressesRemove(String address) {
    return '$address entfernen';
  }

  @override
  String get serverAddressesAdd => 'Adresse hinzufügen';

  @override
  String get serverAddressesAddHint => 'http://192.168.1.20:3000';

  @override
  String get serverAddressesAlreadyAdded =>
      'Diese Adresse ist schon in der Liste';

  @override
  String get serverAddressesCheck => 'Adressen jetzt prüfen';

  @override
  String get serverAddressesChecking => 'Wird geprüft…';

  @override
  String serverAddressesUsing(String address) {
    return 'Verwendet jetzt $address';
  }

  @override
  String serverAddressesNoneAnswered(String address) {
    return 'Keine Adresse hat geantwortet. Weiterhin $address';
  }

  @override
  String get serverAddressesNone => 'Kein Server verbunden.';

  @override
  String get regularServerCrumb => 'Normaler Anchor-Server';

  @override
  String get regularServerCrumbLabel =>
      'Normaler Anchor-Server: Einige Anchor+-Funktionen sind aus. Zeigen, welche';

  @override
  String get regularServerTitle => 'Ein normaler Anchor-Server';

  @override
  String regularServerTitleHost(String host) {
    return '$host ist ein normaler Anchor-Server';
  }

  @override
  String get regularServerMessage =>
      'Notizen, Tags, Erinnerungen, Teilen mit Personen und Backups funktionieren wie gewohnt. Die eigenen Funktionen von Anchor+ brauchen einen Anchor+-Server und sind daher aus: Notizen sperren, einfrieren und kopieren, gemeinsam live bearbeiten, Live-Bilder, öffentliche Links, Bildersuche, angemeldete Geräte und Notizen in eine eigene Reihenfolge ziehen.';

  @override
  String get regularServerConnect => 'Verbinden';

  @override
  String magicLoginNeedsPlus(String host) {
    return '$host ist ein normaler Anchor-Server, der keine Anmeldung per Code kennt. Melde dich stattdessen mit deinem Passwort an.';
  }
}
