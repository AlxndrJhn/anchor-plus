// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Polish (`pl`).
class AppLocalizationsPl extends AppLocalizations {
  AppLocalizationsPl([String locale = 'pl']) : super(locale);

  @override
  String get appName => 'Anchor Notes';

  @override
  String get commonBack => 'Wstecz';

  @override
  String get commonCancel => 'Anuluj';

  @override
  String get commonClose => 'Zamknij';

  @override
  String get commonDone => 'Gotowe';

  @override
  String get commonMenu => 'Menu';

  @override
  String get commonCloseMenu => 'Zamknij menu';

  @override
  String get commonShowPassword => 'Pokaż hasło';

  @override
  String get commonHidePassword => 'Ukryj hasło';

  @override
  String get commonSelectedNotes => 'Zaznaczone notatki';

  @override
  String get commonPlay => 'Odtwórz';

  @override
  String get commonPause => 'Wstrzymaj';

  @override
  String commonPlayItem(String name) {
    return 'Odtwórz: $name';
  }

  @override
  String commonPauseItem(String name) {
    return 'Wstrzymaj: $name';
  }

  @override
  String commonSwitchOn(String label) {
    return '$label, włączone';
  }

  @override
  String commonSwitchOff(String label) {
    return '$label, wyłączone';
  }

  @override
  String get formOffline =>
      'Jesteś offline. Połącz się z internetem, aby kontynuować.';

  @override
  String get linkInvalid => 'Nieprawidłowy link';

  @override
  String get linkCantOpen => 'Nie udało się otworzyć linku';

  @override
  String get densityDefault => 'Domyślna';

  @override
  String get densityCompact => 'Zwarta';

  @override
  String get noteFontSans => 'Bezszeryfowa';

  @override
  String get noteFontSerif => 'Szeryfowa';

  @override
  String get noteFontMono => 'Mono';

  @override
  String get textSizeSmall => 'Mały';

  @override
  String get textSizeDefault => 'Domyślny';

  @override
  String get textSizeLarge => 'Duży';

  @override
  String get lineSpacingTight => 'Ciasny';

  @override
  String get lineSpacingRelaxed => 'Luźny';

  @override
  String get errorOffline => 'Brak połączenia z internetem.';

  @override
  String get errorTimeout => 'Serwer odpowiada zbyt długo.';

  @override
  String get errorCertificate => 'Certyfikat serwera nie jest zaufany.';

  @override
  String get errorCancelled => 'Żądanie zostało anulowane.';

  @override
  String get errorSignInAgain => 'Zaloguj się ponownie, aby kontynuować.';

  @override
  String get errorForbidden => 'Nie masz uprawnień do tej czynności.';

  @override
  String get errorNotFound => 'Nie znaleziono elementu.';

  @override
  String get errorIncompatible =>
      'Ta aplikacja i Twój serwer nie są zgodne. Zaktualizuj je, aby kontynuować.';

  @override
  String get errorCheckInput => 'Sprawdź wprowadzone dane.';

  @override
  String get errorGeneric => 'Coś poszło nie tak. Spróbuj ponownie.';

  @override
  String get errorServer =>
      'Serwer napotkał problem. Spróbuj ponownie później.';

  @override
  String get commonSave => 'Zapisz';

  @override
  String get commonSaving => 'Zapisywanie…';

  @override
  String get commonUndo => 'Cofnij';

  @override
  String get fieldName => 'Imię';

  @override
  String get fieldNameHint => 'Twoje imię';

  @override
  String get fieldEmail => 'E-mail';

  @override
  String get fieldEmailHint => 'ty@example.com';

  @override
  String get fieldPassword => 'Hasło';

  @override
  String get fieldCurrentPassword => 'Obecne hasło';

  @override
  String get fieldNewPassword => 'Nowe hasło';

  @override
  String passwordHelp(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Co najmniej $count znaku.',
      many: 'Co najmniej $count znaków.',
      few: 'Co najmniej $count znaki.',
      one: 'Co najmniej 1 znak.',
    );
    return '$_temp0';
  }

  @override
  String get authEnterName => 'Wpisz swoje imię.';

  @override
  String get authEnterEmail => 'Wpisz swój adres e-mail.';

  @override
  String get authEnterValidEmail => 'Wpisz prawidłowy adres e-mail.';

  @override
  String get authEnterPassword => 'Wpisz swoje hasło.';

  @override
  String get authEnterCurrentPassword => 'Wpisz swoje obecne hasło.';

  @override
  String authPasswordTooShort(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Użyj co najmniej $count znaku.',
      many: 'Użyj co najmniej $count znaków.',
      few: 'Użyj co najmniej $count znaków.',
      one: 'Użyj co najmniej 1 znaku.',
    );
    return '$_temp0';
  }

  @override
  String get fieldTwoStepCode => 'Kod z aplikacji uwierzytelniającej';

  @override
  String get authTwoStepCodeHelp =>
      'Zgubiłeś telefon? Wpisz zamiast tego jeden z kodów odzyskiwania.';

  @override
  String get authEnterTwoStepCode =>
      'Wpisz kod z aplikacji uwierzytelniającej.';

  @override
  String get authWrongTwoStepCode =>
      'Ten kod jest nieprawidłowy. Sprawdź aplikację uwierzytelniającą i spróbuj ponownie.';

  @override
  String get authPasskeyOnly =>
      'To konto loguje się kluczem dostępu. Zaloguj się w przeglądarce, a potem zeskanuj kod QR w Ustawienia › Logowanie telefonu.';

  @override
  String get authSecondFactorSetup =>
      'Twój administrator wymaga logowania kluczem dostępu lub aplikacją uwierzytelniającą. Skonfiguruj jedno z nich w Anchor+ w przeglądarce, a potem zaloguj się tutaj.';

  @override
  String get authIncorrectCredentials => 'Nieprawidłowy e-mail lub hasło.';

  @override
  String get authPasswordless =>
      'To konto nie używa hasła. Zaloguj się przez swojego dostawcę.';

  @override
  String get authPendingApproval =>
      'Twoje konto czeka na zatwierdzenie przez administratora.';

  @override
  String authPasswordSignInOff(String provider) {
    return 'Logowanie e-mailem i hasłem jest wyłączone. Zaloguj się przez $provider.';
  }

  @override
  String authPasswordSignUpOff(String provider) {
    return 'Rejestracja e-mailem i hasłem jest wyłączona. Zarejestruj się przez $provider.';
  }

  @override
  String get authPasswordSignInOffHere =>
      'Logowanie e-mailem i hasłem jest wyłączone na tym serwerze.';

  @override
  String get authPasswordSignUpOffHere =>
      'Rejestracja e-mailem i hasłem jest wyłączona na tym serwerze.';

  @override
  String get authRegistrationClosed => 'Ten serwer nie przyjmuje nowych kont.';

  @override
  String get authEmailTaken => 'Konto z tym adresem e-mail już istnieje.';

  @override
  String get authWrongCurrentPassword => 'Obecne hasło jest nieprawidłowe.';

  @override
  String get authSamePassword => 'Nowe hasło musi różnić się od obecnego.';

  @override
  String get authUnreachable =>
      'Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.';

  @override
  String get authProviderNotSetUp =>
      'Logowanie przez dostawcę nie jest skonfigurowane na tym serwerze.';

  @override
  String get authProviderFailed =>
      'Nie udało się zalogować przez dostawcę. Spróbuj ponownie.';

  @override
  String authProviderFailedWith(String detail) {
    return 'Nie udało się zalogować przez dostawcę: $detail';
  }

  @override
  String get authSignIn => 'Zaloguj się';

  @override
  String get authSigningIn => 'Logowanie…';

  @override
  String authContinueWith(String provider) {
    return 'Kontynuuj przez $provider';
  }

  @override
  String authOpeningProvider(String provider) {
    return 'Otwieranie $provider…';
  }

  @override
  String get authWelcomeBack => 'Witaj ponownie';

  @override
  String get authSignInToAnchor => 'Zaloguj się, aby przejść do Anchor.';

  @override
  String authSignInTo(String server) {
    return 'Zaloguj się do $server';
  }

  @override
  String get authOfflineSignIn =>
      'Jesteś offline. Połącz się z internetem, aby się zalogować.';

  @override
  String get authNewToAnchor => 'Pierwszy raz w Anchor?';

  @override
  String get authNoAccountNeeded => 'Chcesz tylko notować?';

  @override
  String get authUseWithoutServer => 'Użyj bez serwera';

  @override
  String get authCreateAnAccount => 'Utwórz konto';

  @override
  String get authOr => 'lub';

  @override
  String get authCreateAccount => 'Utwórz konto';

  @override
  String get authCreatingAccount => 'Tworzenie konta…';

  @override
  String get authCreateYourAccount => 'Utwórz swoje konto';

  @override
  String get authApprovalNeeded =>
      'Nowe konta wymagają zatwierdzenia przez administratora, zanim się zalogujesz.';

  @override
  String get authRegisterSubtitle => 'Zacznij zapisywać swoje myśli.';

  @override
  String get authAlreadyHaveAccount => 'Masz już konto?';

  @override
  String authWelcomeName(String name) {
    return 'Witaj w Anchor, $name';
  }

  @override
  String get authWaitingTitle => 'Oczekiwanie na zatwierdzenie';

  @override
  String get authWaitingMessage =>
      'Administrator musi zatwierdzić Twoje konto, zanim się zalogujesz.';

  @override
  String get authBackToSignIn => 'Wróć do logowania';

  @override
  String get passwordTitle => 'Hasło';

  @override
  String get passwordChange => 'Zmień hasło';

  @override
  String get passwordChanging => 'Zmienianie…';

  @override
  String get passwordChanged => 'Hasło zostało zmienione';

  @override
  String get passwordOffline =>
      'Jesteś offline. Połącz się z internetem, aby zmienić hasło.';

  @override
  String get profileTitle => 'Profil';

  @override
  String get profileSaved => 'Profil zapisany';

  @override
  String get profileOffline =>
      'Jesteś offline. Połącz się z internetem, aby zmienić profil.';

  @override
  String get profilePhoto => 'Zdjęcie profilowe';

  @override
  String get profilePhotoVisible =>
      'Widzą je osoby, którym udostępniasz notatki.';

  @override
  String get profileTakePhoto => 'Zrób zdjęcie';

  @override
  String get profileChoosePhoto => 'Wybierz zdjęcie';

  @override
  String get profileRemovePhoto => 'Usuń zdjęcie';

  @override
  String get profilePhotoUpdated => 'Zdjęcie zaktualizowane';

  @override
  String get profilePhotoUpdateFailed => 'Nie udało się zaktualizować zdjęcia';

  @override
  String get profilePhotoRemoved => 'Zdjęcie usunięte';

  @override
  String get profilePhotoRemoveFailed => 'Nie udało się usunąć zdjęcia';

  @override
  String get profileEmailAdminOnly =>
      'Tylko administrator może zmienić Twój e-mail.';

  @override
  String get profileChangePhoto => 'Zmień zdjęcie profilowe';

  @override
  String get commonContinue => 'Dalej';

  @override
  String commonExpandedItem(String label) {
    return '$label, rozwinięte';
  }

  @override
  String commonCollapsedItem(String label) {
    return '$label, zwinięte';
  }

  @override
  String get serverTitle => 'Serwer';

  @override
  String get serverWelcome => 'Witaj w Anchor+';

  @override
  String get serverSubtitle =>
      'Wpisz adres swojego serwera, aby synchronizować notatki.';

  @override
  String get serverAddress => 'Adres serwera';

  @override
  String get serverAddressHint => 'notes.example.com';

  @override
  String get serverConnecting => 'Łączenie…';

  @override
  String get serverAdvanced => 'Zaawansowane';

  @override
  String get serverSelfSigned => 'Zezwalaj na certyfikaty z podpisem własnym';

  @override
  String get serverSelfSignedWarning =>
      'Używaj tylko z serwerem, którym zarządzasz. Anchor nie może zweryfikować jego tożsamości.';

  @override
  String get serverHeaders => 'Dodatkowe nagłówki';

  @override
  String get serverHeadersHint => 'CF-Access-Client-Id: …';

  @override
  String get serverHeadersHelp =>
      'Dla proxy przed Twoim serwerem, np. Cloudflare Access. Po jednym w wierszu, w formie Nazwa: wartość. Wysyłane tylko do tego serwera.';

  @override
  String serverHeaderNotNameValue(int line) {
    return 'Wiersz $line wymaga nazwy i wartości, w formie Nazwa: wartość.';
  }

  @override
  String serverHeaderBadName(int line) {
    return 'Wiersz $line: nazwa może zawierać tylko litery, cyfry oraz - _ .';
  }

  @override
  String serverHeaderBadValue(int line) {
    return 'Wiersz $line: wartość zawiera znaki, których nagłówek nie może przenosić.';
  }

  @override
  String serverHeaderReserved(int line) {
    return 'Wiersz $line: Anchor sam ustawia ten nagłówek.';
  }

  @override
  String serverHeaderRepeated(int line) {
    return 'Wiersz $line powtarza nazwę z wyżej.';
  }

  @override
  String get serverSelfHosted =>
      'Notatki z tego telefonu zostaną przeniesione na Twoje konto.';

  @override
  String get serverEnterAddress => 'Wpisz adres serwera.';

  @override
  String get serverEnterValidAddress => 'Wpisz prawidłowy adres serwera.';

  @override
  String get serverConnectFailed =>
      'Nie udało się połączyć z serwerem. Spróbuj ponownie.';

  @override
  String serverNotAnchor(String host) {
    return '$host nie jest serwerem Anchor. Sprawdź adres.';
  }

  @override
  String serverUntrusted(String host) {
    return 'Nie udało się zweryfikować certyfikatu dla $host. Jeśli ma podpis własny, włącz Zezwalaj na certyfikaty z podpisem własnym w sekcji Zaawansowane.';
  }

  @override
  String serverUnreachableNoScheme(String host) {
    return 'Nie udało się połączyć z $host. Sprawdź adres albo dodaj http://, jeśli Twój serwer nie używa https.';
  }

  @override
  String serverUnreachable(String host) {
    return 'Nie udało się połączyć z $host. Sprawdź adres i połączenie.';
  }

  @override
  String get serverConnectAnyway => 'Połącz mimo to';

  @override
  String serverLinkLabel(String host) {
    return 'Serwer $host. Zmień serwer';
  }

  @override
  String get commonMore => 'Więcej';

  @override
  String get commonCopy => 'Kopiuj';

  @override
  String get commonSelect => 'Zaznacz';

  @override
  String get commonSelectAll => 'Zaznacz wszystko';

  @override
  String get commonDeselectAll => 'Odznacz wszystko';

  @override
  String get commonStopSelecting => 'Zakończ zaznaczanie';

  @override
  String commonSelectedCount(int count) {
    return 'Zaznaczono: $count';
  }

  @override
  String get settingsTitle => 'Ustawienia';

  @override
  String settingsProfileCard(String name, String email) {
    return '$name, $email. Profil';
  }

  @override
  String get settingsAppearance => 'Wygląd';

  @override
  String get settingsLanguage => 'Język';

  @override
  String get settingsLanguageSystem => 'Język telefonu';

  @override
  String get settingsDensity => 'Gęstość';

  @override
  String get settingsDensityHelp => 'Zwarta mieści więcej notatek na ekranie.';

  @override
  String get settingsAnimations => 'Animacje';

  @override
  String get settingsAnimationsHelp =>
      'Szybkie otwierają i zamykają notatki, arkusze i menu w połowie czasu.';

  @override
  String get animationsNormal => 'Normalne';

  @override
  String get animationsFast => 'Szybkie';

  @override
  String get settingsColorScheme => 'Schemat kolorów';

  @override
  String get colorSchemeAnchor => 'Anchor+';

  @override
  String get settingsCustomTheme => 'Motyw własny';

  @override
  String get settingsCustomThemeOff => 'Brak';

  @override
  String get settingsCustomThemeOn => 'Włączony';

  @override
  String get customThemeHelp =>
      'Wklej motyw jako JSON: kolory dla trybu jasnego, ciemnego lub obu oraz styl czcionek, narożników, cieni i tekstury. Pominięte kolory zostają ze schematu kolorów, a reszta wygląda jak w Anchor. Zapisany na tym urządzeniu; ten sam JSON działa w przeglądarce.';

  @override
  String get customThemeJsonLabel => 'JSON motywu';

  @override
  String get customThemeApply => 'Zastosuj';

  @override
  String get customThemeReset => 'Resetuj';

  @override
  String get customThemeCopy => 'Kopiuj bieżący motyw jako JSON';

  @override
  String get customThemeApplied => 'Zastosowano motyw własny';

  @override
  String customThemeAppliedNamed(String name) {
    return 'Zastosowano motyw własny „$name”';
  }

  @override
  String get customThemeRemoved => 'Usunięto motyw własny';

  @override
  String get customThemeCopied => 'Skopiowano bieżący motyw jako JSON';

  @override
  String customThemeNotJson(String detail) {
    return 'Nieprawidłowy JSON: $detail';
  }

  @override
  String get customThemeNotObject =>
      'Motyw musi być obiektem JSON z kolorami \"light\" lub \"dark\" albo ze \"style\"';

  @override
  String customThemeUnknownKey(String key, String expected) {
    return '$key: nieznany klucz; oczekiwano jednego z: $expected';
  }

  @override
  String customThemeUnknownKeyGuess(String key, String guess, String expected) {
    return '$key: nieznany klucz (czy chodziło o „$guess”?); oczekiwano jednego z: $expected';
  }

  @override
  String get customThemeNameNotText => 'name: musi być ciągiem znaków';

  @override
  String customThemeModeNotObject(String mode) {
    return '$mode: musi być obiektem z kolorami';
  }

  @override
  String customThemeNotAColor(String key, String value) {
    return '$key: $value nie jest kolorem; użyj #rgb, #rrggbb lub #rrggbbaa';
  }

  @override
  String customThemeNotALineSpacing(String value) {
    return 'lineSpacing: $value nie jest jednym z \"tight\", \"default\" ani \"relaxed\"';
  }

  @override
  String get customThemeNoMode =>
      'Podaj co najmniej jedno z: \"light\", \"dark\" lub \"style\"';

  @override
  String get customThemeStyleNotObject => 'style: musi być obiektem';

  @override
  String customThemeBadStyleValue(String key, String value, String expected) {
    return '$key: $value nie jest jedną z wartości $expected';
  }

  @override
  String get customThemeRadiusNotValid =>
      'style.radius: musi być liczbą od 0 do 40 albo czterema narożnikami [x, y]';

  @override
  String customThemePatternNotObject(String key) {
    return '$key: musi być obiektem z shape, size, thickness, color i opacity';
  }

  @override
  String customThemeNotNumber(String key, String min, String max) {
    return '$key: musi być liczbą od $min do $max';
  }

  @override
  String customThemeNotStyleColor(String key, String value) {
    return '$key: $value nie jest kolorem ani nazwą koloru; użyj #rgb, #rrggbb, #rrggbbaa lub nazwy takiej jak foreground';
  }

  @override
  String get customThemeShadowNotValid =>
      'style.shadow: musi być \"none\" lub obiektem';

  @override
  String get settingsTheme => 'Motyw';

  @override
  String get themeLight => 'Jasny';

  @override
  String get themeDark => 'Ciemny';

  @override
  String get themeAutomatic => 'Automatyczny';

  @override
  String get settingsEditor => 'Edytor';

  @override
  String get settingsFont => 'Czcionka';

  @override
  String get settingsReminders => 'Przypomnienia';

  @override
  String get settingsMorning => 'Rano';

  @override
  String get settingsAfternoon => 'Po południu';

  @override
  String get settingsEvening => 'Wieczorem';

  @override
  String get settingsNight => 'W nocy';

  @override
  String get settingsWeekStart => 'Tydzień zaczyna się w';

  @override
  String get settingsTextSize => 'Rozmiar tekstu';

  @override
  String get settingsLineSpacing => 'Odstęp między wierszami';

  @override
  String get settingsLineSpacingByTheme =>
      'Ustawione przez własny motyw. Usuń z niego \"lineSpacing\", aby wybrać tutaj.';

  @override
  String get settingsMoveChecked => 'Przenoś zaznaczone pozycje na dół';

  @override
  String get settingsMoveCheckedHelp =>
      'Zaznaczone pozycje trafiają pod niezaznaczone.';

  @override
  String get settingsBurnDeleted => 'Spalaj usunięte notatki';

  @override
  String get settingsBurnDeletedHelp =>
      'Usunięta notatka spala się w miejscu, gdzie była. Po wyłączeniu po prostu znika.';

  @override
  String get settingsStrikeSparks => 'Iskry przy zderzeniu kart';

  @override
  String get settingsStrikeSparksHelp =>
      'Po usunięciu lecą iskry tam, gdzie karty uderzają w swoje nowe miejsca.';

  @override
  String get settingsPreviewTitle => 'Weekend w Lizbonie';

  @override
  String get settingsPreviewText =>
      'Pakuj się lekko. Wzgórza są strome, a tramwaje zapełniają się przed dziewiątą.';

  @override
  String get settingsAccount => 'Konto';

  @override
  String get settingsSync => 'Synchronizacja';

  @override
  String get settingsConnectServer => 'Połącz z serwerem';

  @override
  String get settingsConnectServerHelp =>
      'Synchronizuj i udostępniaj notatki na własnym serwerze Anchor. Notatki z tego telefonu zostaną przeniesione na Twoje konto po zalogowaniu.';

  @override
  String get settingsPassword => 'Hasło';

  @override
  String settingsPasswordManaged(String provider) {
    return 'Twoim hasłem zarządza $provider.';
  }

  @override
  String get settingsPasswordManagedElsewhere =>
      'Twoim hasłem zarządza Twój dostawca logowania.';

  @override
  String get settingsSignOut => 'Wyloguj się';

  @override
  String get settingsSigningOut => 'Wylogowywanie…';

  @override
  String get settingsSignOutTitle => 'Wylogować się?';

  @override
  String settingsSignOutMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count zmiany nie została jeszcze zsynchronizowana. Zostaje na tym telefonie i zsynchronizuje się po ponownym zalogowaniu.',
      many:
          '$count zmian nie zostało jeszcze zsynchronizowanych. Zostają na tym telefonie i zsynchronizują się po ponownym zalogowaniu.',
      few:
          '$count zmiany nie zostały jeszcze zsynchronizowane. Zostają na tym telefonie i zsynchronizują się po ponownym zalogowaniu.',
      one:
          '1 zmiana nie została jeszcze zsynchronizowana. Zostaje na tym telefonie i zsynchronizuje się po ponownym zalogowaniu.',
      zero:
          'Twoje notatki zostają na tym telefonie i zsynchronizują się po zalogowaniu.',
    );
    return '$_temp0';
  }

  @override
  String get settingsDevices => 'Urządzenia';

  @override
  String get devicesTitle => 'Urządzenia';

  @override
  String get devicesThisPhone => 'Ten telefon';

  @override
  String devicesSignedIn(String date) {
    return 'Zalogowano $date';
  }

  @override
  String devicesSignedInLastActive(String date, String active) {
    return 'Zalogowano $date, ostatnia aktywność $active';
  }

  @override
  String devicesSignedOut(String device) {
    return 'Wylogowano: $device';
  }

  @override
  String devicesSignOutFailed(String device) {
    return 'Nie udało się wylogować: $device';
  }

  @override
  String get devicesLoadFailed => 'Nie udało się wczytać urządzeń';

  @override
  String get devicesLoadFailedHelp => 'Sprawdź połączenie i spróbuj ponownie.';

  @override
  String get settingsSignOutOthers => 'Wyloguj inne urządzenia';

  @override
  String get settingsSignOutOthersTitle => 'Wylogować inne urządzenia?';

  @override
  String get settingsSignOutOthersMessage =>
      'W ciągu 15 minut każdy inny telefon, przeglądarka i komputer zostaną poproszone o ponowne zalogowanie. Ten telefon pozostanie zalogowany.';

  @override
  String get settingsSignOutOthersConfirm => 'Wyloguj inne';

  @override
  String get settingsSignOutOthersDone => 'Wylogowano inne urządzenia';

  @override
  String get settingsSignOutOthersFailed =>
      'Nie udało się wylogować innych urządzeń';

  @override
  String get settingsUpdates => 'Aktualizacje';

  @override
  String get settingsCheckForUpdates => 'Sprawdź aktualizacje';

  @override
  String get settingsUpdateChecking => 'Sprawdzanie…';

  @override
  String settingsUpdateBuild(int build, String repository) {
    return 'To jest kompilacja $build z $repository';
  }

  @override
  String get settingsCheckAutomatically => 'Sprawdzaj automatycznie';

  @override
  String get settingsCheckAutomaticallyHelp =>
      'Szukaj nowego wydania przy uruchomieniu Anchor';

  @override
  String get settingsPreviewReleases => 'Otrzymuj wydania podglądowe';

  @override
  String get settingsPreviewReleasesHelp =>
      'Kandydaci do wydania, gdy Twój serwer używa obrazu :preview';

  @override
  String get settingsSearch => 'Wyszukiwanie';

  @override
  String get settingsPictureSearch => 'Znajdź zdjęcia po tym, co przedstawiają';

  @override
  String get settingsPictureSearchHelp =>
      'Wyszukaj „zachód słońca nad morzem” lub „paragon” i znajdź notatki z takimi zdjęciami, w większości języków. Twój serwer jednorazowo pobiera model (około 380 MB) i analizuje każde zdjęcie; nic nie opuszcza Twojego serwera.';

  @override
  String pictureSearchDownloading(int percent) {
    return 'Pobieranie modelu obrazów… $percent%';
  }

  @override
  String get pictureSearchFailed =>
      'Nie udało się pobrać modelu obrazów. Wyłącz i włącz, aby spróbować ponownie.';

  @override
  String pictureSearchIndexing(int indexed, int total) {
    return 'Analizowanie zdjęć… $indexed z $total';
  }

  @override
  String pictureSearchReady(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Wszystkie $count zdjęcia są gotowe do wyszukiwania.',
      many: 'Wszystkie $count zdjęć jest gotowych do wyszukiwania.',
      few: 'Wszystkie $count zdjęcia są gotowe do wyszukiwania.',
      one: 'Twoje zdjęcie jest gotowe do wyszukiwania.',
      zero: 'Twoje zdjęcia będzie można wyszukiwać, gdy je dodasz.',
    );
    return '$_temp0';
  }

  @override
  String get pictureSearchChangeFailed =>
      'Nie udało się zmienić wyszukiwania zdjęć';

  @override
  String get updateAvailable => 'Dostępna aktualizacja';

  @override
  String get updateSeeWhatsNew => 'Zobacz, co nowego';

  @override
  String get updateWhatsNew => 'Co nowego';

  @override
  String updateMoreChanges(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'i $count więcej',
      many: 'i $count więcej',
      few: 'i $count więcej',
      one: 'i 1 więcej',
    );
    return '$_temp0';
  }

  @override
  String get updateInstall => 'Pobierz i zainstaluj';

  @override
  String updateInstallSize(int megabytes) {
    return 'Pobierz i zainstaluj ($megabytes MB)';
  }

  @override
  String updateDownloading(int percent) {
    return 'Pobieranie… $percent%';
  }

  @override
  String get updateViewRelease => 'Zobacz wydanie na GitHubie';

  @override
  String get updateCheckFailed => 'Nie udało się sprawdzić aktualizacji';

  @override
  String get updateDownloadFailed => 'Nie udało się pobrać aktualizacji';

  @override
  String get updateUpToDate => 'Anchor jest aktualny';

  @override
  String get settingsHelp => 'Pomoc';

  @override
  String get settingsLogs => 'Logi';

  @override
  String get settingsLogsHelp =>
      'Szczegóły aktywności do rozwiązywania problemów';

  @override
  String get settingsPrivacyPolicy => 'Polityka prywatności';

  @override
  String get settingsPrivacyPolicyHelp =>
      'Co aplikacja przechowuje na tym telefonie i wysyła na Twój serwer';

  @override
  String get settingsSourceCode => 'Kod źródłowy';

  @override
  String get settingsSourceCodeHelp =>
      'Wolne oprogramowanie na licencji GNU AGPL v3, bez gwarancji';

  @override
  String get settingsLicense => 'Licencja';

  @override
  String get settingsLicenseHelp => '© Współtwórcy Anchor i Anchor+';

  @override
  String get settingsOffline =>
      'Offline. Zmiany są zapisywane na tym telefonie.';

  @override
  String get settingsLocalOnly =>
      'Notatki są przechowywane tylko na tym telefonie.';

  @override
  String settingsSyncPaused(String reason) {
    return 'Synchronizacja wstrzymana. $reason';
  }

  @override
  String settingsCantReach(String host) {
    return 'Brak połączenia z $host';
  }

  @override
  String settingsConnectedTo(String host) {
    return 'Połączono z $host';
  }

  @override
  String settingsConnectedToVersion(String host, String version) {
    return 'Połączono z $host · Serwer $version';
  }

  @override
  String settingsAppVersion(String version) {
    return 'Anchor $version';
  }

  @override
  String get settingsAppNameShort => 'Anchor+';

  @override
  String get settingsTagline => 'Twoje myśli, bezpieczne.';

  @override
  String get logsTitle => 'Logi';

  @override
  String get logsMenuHelp =>
      'Kopiowanie i zapis obejmują też wcześniejsze sesje.';

  @override
  String get logsCopyAll => 'Kopiuj wszystko';

  @override
  String get logsSaveToFile => 'Zapisz do pliku';

  @override
  String get logsClear => 'Wyczyść logi';

  @override
  String get logsCopiedAll => 'Skopiowano logi, także z wcześniejszych sesji';

  @override
  String get logsCopiedNewest =>
      'Skopiowano najnowsze logi. Zapisz do pliku, aby uzyskać wszystkie.';

  @override
  String get logsClearTitle => 'Wyczyścić logi?';

  @override
  String get logsClearMessage =>
      'Wszystkie logi na tym telefonie zostaną usunięte. Tej czynności nie można cofnąć.';

  @override
  String get logsCleared => 'Logi wyczyszczone';

  @override
  String get logsSaveDialog => 'Zapisz logi';

  @override
  String logsSaved(String name) {
    return 'Zapisano $name';
  }

  @override
  String get logsSaveFailed => 'Nie udało się zapisać logów';

  @override
  String logsCopied(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Skopiowano $count loga',
      many: 'Skopiowano $count logów',
      few: 'Skopiowano $count logi',
      one: 'Skopiowano 1 log',
    );
    return '$_temp0';
  }

  @override
  String get logsSelectTitle => 'Zaznacz logi';

  @override
  String get logsSearch => 'Szukaj w logach';

  @override
  String get logsSelected => 'Zaznaczone logi';

  @override
  String get logsLevel => 'Poziom logów';

  @override
  String get logsAll => 'Wszystkie';

  @override
  String get logsErrors => 'Błędy';

  @override
  String get logsWarnings => 'Ostrzeżenia';

  @override
  String get logsInfo => 'Info';

  @override
  String get logsDebug => 'Debug';

  @override
  String get logsSessionNote =>
      'Widać tylko tę sesję. Kopiowanie i zapis obejmują też wcześniejsze sesje.';

  @override
  String get logsNoMatches => 'Brak pasujących logów';

  @override
  String get logsNoMatchesHelp =>
      'Spróbuj innego słowa lub pokaż wszystkie poziomy.';

  @override
  String get logsEmpty => 'Brak logów';

  @override
  String get logsEmptyHelp => 'Aktywność z tej sesji pojawi się tutaj.';

  @override
  String get logLevelError => 'Błąd';

  @override
  String get logLevelWarning => 'Ostrzeżenie';

  @override
  String get logLevelInfo => 'Info';

  @override
  String get logLevelDebug => 'Debug';

  @override
  String get commonToday => 'Dziś';

  @override
  String get commonTomorrow => 'Jutro';

  @override
  String get commonNotNow => 'Nie teraz';

  @override
  String get commonLater => 'Później';

  @override
  String get commonOk => 'OK';

  @override
  String get commonOpenSettings => 'Otwórz ustawienia';

  @override
  String get reminderTitle => 'Przypomnienie';

  @override
  String get reminderSheetSubtitle =>
      'Otrzymasz powiadomienie na tym telefonie.';

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
    return 'Przypomnienie: $when';
  }

  @override
  String reminderSpokenLate(String when) {
    return 'Spóźnione przypomnienie: $when';
  }

  @override
  String get reminderLaterToday => 'Później dziś';

  @override
  String get reminderThisAfternoon => 'Dziś po południu';

  @override
  String get reminderTonight => 'Dziś w nocy';

  @override
  String get reminderTomorrowNight => 'Jutro w nocy';

  @override
  String get reminderTomorrowMorning => 'Jutro rano';

  @override
  String get reminderTomorrowAfternoon => 'Jutro po południu';

  @override
  String get reminderTomorrowEvening => 'Jutro wieczorem';

  @override
  String get reminderThisEvening => 'Dziś wieczorem';

  @override
  String get reminderNextWeek => 'Za tydzień';

  @override
  String get reminderWeekend => 'W weekend';

  @override
  String get reminderNextMonth => 'Za miesiąc';

  @override
  String get reminderNone => 'Brak przypomnienia';

  @override
  String get reminderPickTime => 'Wybierz datę i godzinę';

  @override
  String get reminderTimePassed => 'Ten czas już minął';

  @override
  String reminderInMinutes(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Za $count minuty',
      many: 'Za $count minut',
      few: 'Za $count minuty',
      one: 'Za 1 minutę',
    );
    return '$_temp0';
  }

  @override
  String reminderInHours(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Za $count godziny',
      many: 'Za $count godzin',
      few: 'Za $count godziny',
      one: 'Za 1 godzinę',
    );
    return '$_temp0';
  }

  @override
  String reminderInDays(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Za $count dnia',
      many: 'Za $count dni',
      few: 'Za $count dni',
      one: 'Za 1 dzień',
    );
    return '$_temp0';
  }

  @override
  String get reminderRepeatsDaily => 'Powtarza się codziennie';

  @override
  String reminderRepeatsWeekly(String weekday) {
    return 'Powtarza się co tydzień: $weekday';
  }

  @override
  String reminderRepeatsMonthly(int day) {
    return 'Powtarza się co miesiąc, $day. dnia';
  }

  @override
  String reminderRepeatsMonthlyEnd(int day) {
    return 'Powtarza się co miesiąc, $day. dnia lub ostatniego';
  }

  @override
  String reminderRepeatsYearly(String date) {
    return 'Powtarza się co roku: $date';
  }

  @override
  String get repeatOnce => 'Raz';

  @override
  String get repeatDaily => 'Codziennie';

  @override
  String get repeatWeekly => 'Co tydzień';

  @override
  String get repeatMonthly => 'Co miesiąc';

  @override
  String get repeatYearly => 'Co rok';

  @override
  String get reminderWhen => 'Kiedy';

  @override
  String get reminderPickDate => 'Wybierz datę';

  @override
  String get reminderDate => 'Data';

  @override
  String get reminderTime => 'Godzina';

  @override
  String get reminderRepeat => 'Powtarzaj';

  @override
  String get reminderRemove => 'Usuń';

  @override
  String get reminderSetFailed => 'Nie udało się ustawić przypomnienia';

  @override
  String get reminderNotifyTitle => 'Zezwolić na powiadomienia?';

  @override
  String get reminderNotifyMessage =>
      'Anchor potrzebuje uprawnienia do wysyłania powiadomień, aby przypomnienia mogły dzwonić na tym telefonie.';

  @override
  String get reminderExactTitle => 'Zezwolić na dokładne alarmy?';

  @override
  String get reminderExactMessage =>
      'Android może opóźniać przypomnienia, aby oszczędzać baterię. Zezwól na dokładne alarmy, by dzwoniły na czas.';

  @override
  String get reminderNotificationsOff =>
      'Powiadomienia są wyłączone. Włącz je w ustawieniach telefonu.';

  @override
  String get monthPrevious => 'Poprzedni miesiąc';

  @override
  String get monthNext => 'Następny miesiąc';

  @override
  String get reminderChannelName => 'Przypomnienia';

  @override
  String get reminderChannelDescription =>
      'Przypomnienia ustawione w notatkach';

  @override
  String get reminderDone => 'Gotowe';

  @override
  String notesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count notatki',
      many: '$count notatek',
      few: '$count notatki',
      one: '1 notatka',
    );
    return '$_temp0';
  }

  @override
  String get tagsTitle => 'Tagi';

  @override
  String get tagNotesTitle => 'Otaguj notatki';

  @override
  String get tagSaveFailed => 'Nie udało się zapisać tagu';

  @override
  String get tagUpdateFailed => 'Nie udało się zaktualizować tagów';

  @override
  String tagNameTaken(String name) {
    return 'Tag o nazwie „$name” już istnieje.';
  }

  @override
  String tagCreateNamed(String name) {
    return 'Utwórz „$name”';
  }

  @override
  String tagAdded(String tag) {
    return '$tag, dodany';
  }

  @override
  String tagNotAdded(String tag) {
    return '$tag, niedodany';
  }

  @override
  String tagAddedToSome(String tag) {
    return '$tag, dodany do niektórych notatek';
  }

  @override
  String get tagSearchOrCreate => 'Szukaj lub utwórz tag';

  @override
  String get tagsEmpty => 'Brak tagów. Wpisz nazwę, aby utworzyć.';

  @override
  String tagSheetLabel(String name) {
    return 'Tag $name';
  }

  @override
  String get tagColor => 'Kolor';

  @override
  String get tagRename => 'Zmień nazwę tagu';

  @override
  String get tagDelete => 'Usuń tag';

  @override
  String tagDeleteTitle(String name) {
    return 'Usunąć tag „$name”?';
  }

  @override
  String tagDeleteMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'Tag zostanie usunięty z $count notatki. Twoje notatki nie zostaną usunięte.',
      many:
          'Tag zostanie usunięty z $count notatek. Twoje notatki nie zostaną usunięte.',
      few:
          'Tag zostanie usunięty z $count notatek. Twoje notatki nie zostaną usunięte.',
      one:
          'Tag zostanie usunięty z 1 notatki. Twoje notatki nie zostaną usunięte.',
    );
    return '$_temp0';
  }

  @override
  String get tagDeleteUnused =>
      'Ten tag nie jest przypisany do żadnej notatki.';

  @override
  String tagDeleted(String name) {
    return 'Usunięto tag „$name”';
  }

  @override
  String get tagNew => 'Nowy tag';

  @override
  String tagMove(String name) {
    return 'Przenieś $name';
  }

  @override
  String get tagOptions => 'Opcje tagu';

  @override
  String get tagNamePreview => 'nazwa tagu';

  @override
  String get tagNameHint => 'Nazwa tagu';

  @override
  String get tagCreate => 'Utwórz tag';

  @override
  String get tagRenameAction => 'Zmień nazwę';

  @override
  String get colorRed => 'Czerwony';

  @override
  String get colorPink => 'Różowy';

  @override
  String get colorPurple => 'Fioletowy';

  @override
  String get colorDeepPurple => 'Ciemnofioletowy';

  @override
  String get colorIndigo => 'Indygo';

  @override
  String get colorBlue => 'Niebieski';

  @override
  String get colorLightBlue => 'Jasnoniebieski';

  @override
  String get colorCyan => 'Cyjan';

  @override
  String get colorTeal => 'Morski';

  @override
  String get colorGreen => 'Zielony';

  @override
  String get colorLightGreen => 'Jasnozielony';

  @override
  String get colorLime => 'Limonkowy';

  @override
  String get colorAmber => 'Bursztynowy';

  @override
  String get colorOrange => 'Pomarańczowy';

  @override
  String get colorDeepOrange => 'Ciemnopomarańczowy';

  @override
  String get colorBrown => 'Brązowy';

  @override
  String get colorBlueGrey => 'Niebieskoszary';

  @override
  String get colorYellow => 'Żółty';

  @override
  String get syncSignedOutLead => 'Wylogowano.';

  @override
  String get syncSignedOutText =>
      'Zaloguj się ponownie, aby synchronizować notatki.';

  @override
  String get syncSignInAgainTitle => 'Zaloguj się ponownie';

  @override
  String get syncSignInAgainMessage =>
      'Twoje notatki zostają na tym telefonie i zsynchronizują się po zalogowaniu.';

  @override
  String get syncServerOutdatedLead => 'Zaktualizuj serwer.';

  @override
  String get syncServerOutdatedText =>
      'Jest zbyt stary, by synchronizować się z tą aplikacją.';

  @override
  String get syncServerOutdatedTitle => 'Zaktualizuj serwer';

  @override
  String get syncServerOutdatedMessage =>
      'Twój serwer Anchor jest zbyt stary, by synchronizować się z tą aplikacją. Zaktualizuj serwer, aby kontynuować.';

  @override
  String get syncAppOutdatedLead => 'Zaktualizuj Anchor.';

  @override
  String get syncAppOutdatedText =>
      'Ta aplikacja jest zbyt stara, by synchronizować się z twoim serwerem.';

  @override
  String get syncAppOutdatedTitle => 'Zaktualizuj Anchor';

  @override
  String get syncAppOutdatedMessage =>
      'Ta aplikacja jest zbyt stara, by synchronizować się z twoim serwerem Anchor. Zaktualizuj aplikację, aby kontynuować.';

  @override
  String syncPausedMessage(String reason) {
    return '$reason W międzyczasie notatki zostają na tym telefonie.';
  }

  @override
  String get reminderAdd => 'Dodaj przypomnienie';

  @override
  String get commonYesterday => 'Wczoraj';

  @override
  String peopleCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count osoby',
      many: '$count osób',
      few: '$count osoby',
      one: '1 osoba',
    );
    return '$_temp0';
  }

  @override
  String wordsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count słowa',
      many: '$count słów',
      few: '$count słowa',
      one: '1 słowo',
    );
    return '$_temp0';
  }

  @override
  String get notesBackToTop => 'Wróć na górę';

  @override
  String get notesSelectTitle => 'Wybierz notatki';

  @override
  String get noteUntitled => 'Bez tytułu';

  @override
  String namesTwo(String first, String second) {
    return '$first i $second';
  }

  @override
  String namesMore(String first, String second, int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$first, $second i jeszcze $count',
      many: '$first, $second i jeszcze $count',
      few: '$first, $second i jeszcze $count',
    );
    return '$_temp0';
  }

  @override
  String get shareOnlyYou => 'Tylko ty widzisz tę notatkę.';

  @override
  String get shareLoadFailed => 'Nie udało się wczytać osób z dostępem.';

  @override
  String shareSharedWith(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Udostępniono $count osobom.',
      many: 'Udostępniono $count osobom.',
      few: 'Udostępniono $count osobom.',
      one: 'Udostępniono 1 osobie.',
    );
    return '$_temp0';
  }

  @override
  String shareSharedWithOffline(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'Udostępniono $count osobom. Połącz się, aby zobaczyć, kto ma dostęp.',
      many:
          'Udostępniono $count osobom. Połącz się, aby zobaczyć, kto ma dostęp.',
      few:
          'Udostępniono $count osobom. Połącz się, aby zobaczyć, kto ma dostęp.',
      one: 'Udostępniono 1 osobie. Połącz się, aby zobaczyć, kto ma dostęp.',
    );
    return '$_temp0';
  }

  @override
  String shareSharedWithNames(String names) {
    return 'Udostępniono: $names';
  }

  @override
  String shareSharedWithCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Udostępniono $count osobom',
      many: 'Udostępniono $count osobom',
      few: 'Udostępniono $count osobom',
      one: 'Udostępniono 1 osobie',
    );
    return '$_temp0';
  }

  @override
  String get shareCanView => 'Może wyświetlać';

  @override
  String get shareCanEdit => 'Może edytować';

  @override
  String get shareLink => 'Link';

  @override
  String get shareLinkAnyone => 'Każdy, kto ma link';

  @override
  String get shareLinkOff => 'Wyłączony';

  @override
  String get shareLinkOffHint => 'Tylko dodane osoby mogą ją otworzyć';

  @override
  String get shareLinkViewHint => 'Każdy z linkiem może ją czytać, bez konta';

  @override
  String get shareLinkEditHint => 'Każdy z linkiem może zmieniać tytuł i tekst';

  @override
  String get shareLinkAccess => 'Dostęp przez link';

  @override
  String shareLinkChangeAccess(String access) {
    return '$access. Zmień dostęp przez link';
  }

  @override
  String get shareLinkCopy => 'Kopiuj link';

  @override
  String get shareLinkShareIt => 'Wyślij link';

  @override
  String get shareLinkCopied => 'Skopiowano link';

  @override
  String get shareLinkMade => 'Utworzono i skopiowano link';

  @override
  String get shareLinkTurnedOff => 'Link wyłączony; nie otwiera już notatki';

  @override
  String get shareLinkNowCanView => 'Każdy z linkiem może teraz wyświetlać';

  @override
  String get shareLinkNowCanEdit => 'Każdy z linkiem może teraz edytować';

  @override
  String get shareLinkFailed => 'Nie udało się zmienić linku';

  @override
  String get shareLinkLoadFailed => 'Nie udało się wczytać linku notatki.';

  @override
  String get shareLinkOpens => 'Każdy z linkiem może ją otworzyć.';

  @override
  String dayTodayAt(String time) {
    return 'Dziś o $time';
  }

  @override
  String dayYesterdayAt(String time) {
    return 'Wczoraj o $time';
  }

  @override
  String dayOnAt(String date, String time) {
    return '$date o $time';
  }

  @override
  String get editedToday => 'Edytowano dziś';

  @override
  String get editedYesterday => 'Edytowano wczoraj';

  @override
  String editedOn(String date) {
    return 'Edytowano $date';
  }

  @override
  String get editedJustNow => 'Edytowano przed chwilą';

  @override
  String editedMinutesAgo(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Edytowano $count min temu',
      many: 'Edytowano $count min temu',
      few: 'Edytowano $count min temu',
      one: 'Edytowano 1 min temu',
    );
    return '$_temp0';
  }

  @override
  String editedTodayAt(String time) {
    return 'Edytowano dziś o $time';
  }

  @override
  String editedYesterdayAt(String time) {
    return 'Edytowano wczoraj o $time';
  }

  @override
  String editedOnAt(String date, String time) {
    return 'Edytowano $date o $time';
  }

  @override
  String trashRule(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Notatki tutaj są usuwane po $count dniach.',
      many: 'Notatki tutaj są usuwane po $count dniach.',
      few: 'Notatki tutaj są usuwane po $count dniach.',
      one: 'Notatki tutaj są usuwane po 1 dniu.',
    );
    return '$_temp0';
  }

  @override
  String trashEmpty(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Usunięte notatki zostają tutaj przez $count dnia.',
      many: 'Usunięte notatki zostają tutaj przez $count dni.',
      few: 'Usunięte notatki zostają tutaj przez $count dni.',
      one: 'Usunięte notatki zostają tutaj przez 1 dzień.',
    );
    return '$_temp0';
  }

  @override
  String trashDaysLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Pozostało $count dnia',
      many: 'Pozostało $count dni',
      few: 'Pozostały $count dni',
      one: 'Pozostał 1 dzień',
    );
    return '$_temp0';
  }

  @override
  String trashDeletesOn(String date) {
    return 'Zostanie usunięta $date.';
  }

  @override
  String trashDeletesAfter(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Zostanie usunięta po $count dniach.',
      many: 'Zostanie usunięta po $count dniach.',
      few: 'Zostanie usunięta po $count dniach.',
      one: 'Zostanie usunięta po 1 dniu.',
    );
    return '$_temp0';
  }

  @override
  String historyKept(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'Wersja jest zapisywana przy każdej zmianie notatki i przechowywana przez $count dnia.',
      many:
          'Wersja jest zapisywana przy każdej zmianie notatki i przechowywana przez $count dni.',
      few:
          'Wersja jest zapisywana przy każdej zmianie notatki i przechowywana przez $count dni.',
      one:
          'Wersja jest zapisywana przy każdej zmianie notatki i przechowywana przez 1 dzień.',
    );
    return '$_temp0';
  }

  @override
  String historyLimit(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Zmiany starsze niż $count dnia są usuwane.',
      many: 'Zmiany starsze niż $count dni są usuwane.',
      few: 'Zmiany starsze niż $count dni są usuwane.',
      one: 'Zmiany starsze niż 1 dzień są usuwane.',
    );
    return '$_temp0';
  }

  @override
  String get historyEarlier => 'Wcześniejsza wersja';

  @override
  String get historyNotSaved => 'Niezapisana';

  @override
  String get historyBeforeRestore => 'Przed przywróceniem';

  @override
  String get historySomeone => 'Ktoś';

  @override
  String get historyYou => 'Ty';

  @override
  String get navNotes => 'Notatki';

  @override
  String get navArchive => 'Archiwum';

  @override
  String get navTrash => 'Kosz';

  @override
  String drawerAccount(String name) {
    return '$name, Ustawienia';
  }

  @override
  String shareNowCanView(String person) {
    return '$person może teraz wyświetlać';
  }

  @override
  String shareNowCanEdit(String person) {
    return '$person może teraz edytować';
  }

  @override
  String get revisionComparedCurrent => 'Porównano z bieżącą wersją';

  @override
  String revisionComparedTodayAt(String time) {
    return 'Porównano z wersją z dziś o $time';
  }

  @override
  String revisionComparedYesterdayAt(String time) {
    return 'Porównano z wersją z wczoraj o $time';
  }

  @override
  String revisionComparedOnAt(String date, String time) {
    return 'Porównano z wersją z $date o $time';
  }

  @override
  String get listArchiveLine => 'Ukryte w Notatkach';

  @override
  String listTrashLine(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Usuwane po $count dniach',
      many: 'Usuwane po $count dniach',
      few: 'Usuwane po $count dniach',
      one: 'Usuwane po 1 dniu',
    );
    return '$_temp0';
  }

  @override
  String get listOfflineSaved => 'Offline · zmiany zapisane na tym telefonie';

  @override
  String listOfflineChanges(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Offline · $count zmiany do synchronizacji',
      many: 'Offline · $count zmian do synchronizacji',
      few: 'Offline · $count zmiany do synchronizacji',
      one: 'Offline · 1 zmiana do synchronizacji',
    );
    return '$_temp0';
  }

  @override
  String get listSyncFailed => 'Nie udało się zsynchronizować';

  @override
  String listTitleMenu(String title) {
    return '$title, otwórz menu';
  }

  @override
  String get searchNotes => 'Szukaj notatek';

  @override
  String get searchArchive => 'Szukaj w archiwum';

  @override
  String get searchTrash => 'Szukaj w koszu';

  @override
  String get actionTag => 'Tag';

  @override
  String get actionPin => 'Przypnij';

  @override
  String get actionUnpin => 'Odepnij';

  @override
  String get actionColor => 'Kolor';

  @override
  String get actionSend => 'Wyślij';

  @override
  String get actionMakeCopy => 'Utwórz kopię';

  @override
  String get actionPrint => 'Drukuj';

  @override
  String get notePrintEmpty => 'Nie ma jeszcze nic do wydrukowania';

  @override
  String get notePrintLocked => 'Ta notatka jest zablokowana.';

  @override
  String get notePrintFailed => 'Nie udało się wydrukować';

  @override
  String get noteSendEmpty => 'Nie ma jeszcze nic do wysłania';

  @override
  String get noteCopyMade => 'To twoja kopia';

  @override
  String get noteCopyFailed =>
      'Nie udało się utworzyć kopii. Potrzebne jest połączenie z serwerem.';

  @override
  String notesColorChanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Zmieniono kolor $count notatki',
      many: 'Zmieniono kolor $count notatek',
      few: 'Zmieniono kolor $count notatek',
      one: 'Zmieniono kolor 1 notatki',
    );
    return '$_temp0';
  }

  @override
  String notesColorChangedExcept(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'Zmieniono kolor. $count notatki udostępnione ci tylko do wyświetlania pozostają bez zmian',
      many:
          'Zmieniono kolor. $count notatek udostępnionych ci tylko do wyświetlania pozostaje bez zmian',
      few:
          'Zmieniono kolor. $count notatki udostępnione ci tylko do wyświetlania pozostają bez zmian',
      one:
          'Zmieniono kolor. 1 notatka udostępniona ci tylko do wyświetlania pozostaje bez zmian',
    );
    return '$_temp0';
  }

  @override
  String notesColorUnchanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'Te notatki są udostępnione ci tylko do wyświetlania, więc nie można zmienić ich koloru',
      many:
          'Te notatki są udostępnione ci tylko do wyświetlania, więc nie można zmienić ich koloru',
      few:
          'Te notatki są udostępnione ci tylko do wyświetlania, więc nie można zmienić ich koloru',
      one:
          'Ta notatka jest udostępniona ci tylko do wyświetlania, więc nie można zmienić jej koloru',
    );
    return '$_temp0';
  }

  @override
  String get actionShare => 'Udostępnij';

  @override
  String get actionHistory => 'Historia wersji';

  @override
  String get actionUncheckAll => 'Odznacz wszystko';

  @override
  String get actionSortByName => 'Sortuj od A do Z';

  @override
  String get actionDeleteChecked => 'Usuń zaznaczone pozycje';

  @override
  String get actionShowCheckboxes => 'Pokaż pola wyboru';

  @override
  String get actionHideCheckboxes => 'Ukryj pola wyboru';

  @override
  String get actionArchive => 'Archiwizuj';

  @override
  String get actionUnarchive => 'Przywróć z archiwum';

  @override
  String get actionDelete => 'Usuń';

  @override
  String get actionRemove => 'Usuń';

  @override
  String get actionRestore => 'Przywróć';

  @override
  String get actionDeletePermanently => 'Usuń na zawsze';

  @override
  String notesPinned(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count notatki przypięte',
      many: '$count notatek przypiętych',
      few: '$count notatki przypięte',
      one: 'Notatka przypięta',
    );
    return '$_temp0';
  }

  @override
  String notesUnpinned(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count notatki odpięte',
      many: '$count notatek odpiętych',
      few: '$count notatki odpięte',
      one: 'Notatka odpięta',
    );
    return '$_temp0';
  }

  @override
  String notesArchived(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count notatki zarchiwizowane',
      many: '$count notatek zarchiwizowanych',
      few: '$count notatki zarchiwizowane',
      one: 'Notatka zarchiwizowana',
    );
    return '$_temp0';
  }

  @override
  String notesUnarchived(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count notatki przywrócone z archiwum',
      many: '$count notatek przywróconych z archiwum',
      few: '$count notatki przywrócone z archiwum',
      one: 'Notatka przywrócona z archiwum',
    );
    return '$_temp0';
  }

  @override
  String itemsUnchecked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Odznaczono $count pozycji',
      many: 'Odznaczono $count pozycji',
      few: 'Odznaczono $count pozycje',
      one: 'Odznaczono 1 pozycję',
    );
    return '$_temp0';
  }

  @override
  String checkboxesShown(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Dodano $count pola wyboru',
      many: 'Dodano $count pól wyboru',
      few: 'Dodano $count pola wyboru',
      one: 'Dodano 1 pole wyboru',
    );
    return '$_temp0';
  }

  @override
  String checkboxesHidden(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Usunięto $count pola wyboru',
      many: 'Usunięto $count pól wyboru',
      few: 'Usunięto $count pola wyboru',
      one: 'Usunięto 1 pole wyboru',
    );
    return '$_temp0';
  }

  @override
  String itemsSortedByName(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Posortowano $count pozycji od A do Z',
      many: 'Posortowano $count pozycji od A do Z',
      few: 'Posortowano $count pozycje od A do Z',
      one: 'Posortowano 1 pozycję od A do Z',
    );
    return '$_temp0';
  }

  @override
  String get itemsAlreadySorted => 'Już w kolejności od A do Z';

  @override
  String checkedItemsDeleted(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Usunięto $count zaznaczonych pozycji',
      many: 'Usunięto $count zaznaczonych pozycji',
      few: 'Usunięto $count zaznaczone pozycje',
      one: 'Usunięto 1 zaznaczoną pozycję',
    );
    return '$_temp0';
  }

  @override
  String notesRestored(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count notatki przywrócone',
      many: '$count notatek przywróconych',
      few: '$count notatki przywrócone',
      one: 'Notatka przywrócona',
    );
    return '$_temp0';
  }

  @override
  String get noteRestoredFollow => 'Przejdź do niej';

  @override
  String notesDeletedForever(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count notatki usunięte na zawsze',
      many: '$count notatek usuniętych na zawsze',
      few: '$count notatki usunięte na zawsze',
      one: 'Notatka usunięta na zawsze',
    );
    return '$_temp0';
  }

  @override
  String notesMovedToTrash(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count notatki przeniesione do kosza',
      many: '$count notatek przeniesionych do kosza',
      few: '$count notatki przeniesione do kosza',
      one: 'Notatka przeniesiona do kosza',
    );
    return '$_temp0';
  }

  @override
  String notesRemovedFromYours(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count notatki usunięte z twoich notatek',
      many: '$count notatek usuniętych z twoich notatek',
      few: '$count notatki usunięte z twoich notatek',
      one: 'Notatka usunięta z twoich notatek',
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
      other: '$count notatki przeniesione do kosza.',
      many: '$count notatek przeniesionych do kosza.',
      few: '$count notatki przeniesione do kosza.',
      one: '1 notatka przeniesiona do kosza.',
    );
    return '$_temp0';
  }

  @override
  String notesRemovedPart(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count usunięte z twoich notatek.',
      many: '$count usuniętych z twoich notatek.',
      few: '$count usunięte z twoich notatek.',
      one: '1 usunięta z twoich notatek.',
    );
    return '$_temp0';
  }

  @override
  String get notesRemoveSharedTitle => 'Usunąć tę notatkę z twoich notatek?';

  @override
  String get notesRemoveSharedMessage =>
      'Aby zobaczyć ją ponownie, jej właściciel musi ci ją znów udostępnić.';

  @override
  String notesDeleteTitle(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Usunąć $count notatki?',
      many: 'Usunąć $count notatek?',
      few: 'Usunąć $count notatki?',
      one: 'Usunąć 1 notatkę?',
    );
    return '$_temp0';
  }

  @override
  String notesDeleteSharedMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count notatki udostępnione ci zostaną usunięte z twoich notatek. Aby zobaczyć je ponownie, ich właściciele muszą ci je znów udostępnić.',
      many:
          '$count notatek udostępnionych ci zostanie usuniętych z twoich notatek. Aby zobaczyć je ponownie, ich właściciele muszą ci je znów udostępnić.',
      few:
          '$count notatki udostępnione ci zostaną usunięte z twoich notatek. Aby zobaczyć je ponownie, ich właściciele muszą ci je znów udostępnić.',
      one:
          'Notatka udostępniona ci zostanie usunięta z twoich notatek. Aby zobaczyć ją ponownie, jej właściciel musi ci ją znów udostępnić.',
    );
    return '$_temp0';
  }

  @override
  String get notesDeleteForeverOneTitle => 'Usunąć tę notatkę na zawsze?';

  @override
  String notesDeleteFailed(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Nie udało się usunąć notatek',
      many: 'Nie udało się usunąć notatek',
      few: 'Nie udało się usunąć notatek',
      one: 'Nie udało się usunąć notatki',
    );
    return '$_temp0';
  }

  @override
  String notesDeleteForeverTitle(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Usunąć na zawsze $count notatki?',
      many: 'Usunąć na zawsze $count notatek?',
      few: 'Usunąć na zawsze $count notatki?',
      one: 'Usunąć na zawsze 1 notatkę?',
    );
    return '$_temp0';
  }

  @override
  String notesDeleteForeverMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'Tej czynności nie można cofnąć. Osoby, którym je udostępniono, też stracą dostęp.',
      many:
          'Tej czynności nie można cofnąć. Osoby, którym je udostępniono, też stracą dostęp.',
      few:
          'Tej czynności nie można cofnąć. Osoby, którym je udostępniono, też stracą dostęp.',
      one:
          'Tej czynności nie można cofnąć. Osoby, którym ją udostępniono, też stracą dostęp.',
    );
    return '$_temp0';
  }

  @override
  String get trashEmptyAction => 'Opróżnij kosz';

  @override
  String get trashNothing => 'Nic do usunięcia';

  @override
  String get trashEmptyTitle => 'Opróżnić kosz?';

  @override
  String trashEmptyMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count notatki zostaną usunięte na zawsze. Tej czynności nie można cofnąć.',
      many:
          '$count notatek zostanie usuniętych na zawsze. Tej czynności nie można cofnąć.',
      few:
          '$count notatki zostaną usunięte na zawsze. Tej czynności nie można cofnąć.',
      one:
          '1 notatka zostanie usunięta na zawsze. Tej czynności nie można cofnąć.',
    );
    return '$_temp0';
  }

  @override
  String get trashEmptied => 'Kosz opróżniony';

  @override
  String get listSelectNotes => 'Wybierz notatki';

  @override
  String get listViewOptions => 'Opcje widoku';

  @override
  String get listPressBackAgainToExit => 'Naciśnij wstecz ponownie, aby wyjść';

  @override
  String searchTag(String tag) {
    return 'Szukaj #$tag';
  }

  @override
  String get syncOverwroteLead => 'Zmieniono w dwóch miejscach';

  @override
  String syncOverwroteText(String title) {
    return 'Twoje zmiany w „$title” zastąpiły te wprowadzone gdzie indziej. Dotknij, aby zobaczyć je w historii notatki.';
  }

  @override
  String syncOverwroteManyText(int count) {
    return 'Twoje zmiany w $count notatkach zastąpiły te wprowadzone gdzie indziej. Dotknij, aby zobaczyć historię pierwszej.';
  }

  @override
  String searchNoResults(String query) {
    return 'Brak wyników dla „$query”';
  }

  @override
  String get searchNoResultsHelp => 'Sprawdź pisownię lub spróbuj innych słów.';

  @override
  String get searchRegexInvalidHelp =>
      'To nie jest poprawne wyrażenie regularne, więc wyszukano tekst tak, jak go wpisano. Sprawdź wzorzec lub wyłącz Wyrażenie regularne.';

  @override
  String get archiveEmptyTitle => 'Brak zarchiwizowanych notatek';

  @override
  String get archiveEmptyHelp =>
      'Archiwizuj notatki, które chcesz zachować, ale nie potrzebujesz ich widzieć na co dzień.';

  @override
  String get trashEmptyStateTitle => 'Kosz jest pusty';

  @override
  String tagEmptyTitle(String tag) {
    return 'Brak notatek z tagiem #$tag';
  }

  @override
  String get tagEmptyHelp => 'Nowe notatki utworzone tutaj dostaną ten tag.';

  @override
  String get notesLoading => 'Wczytywanie notatek';

  @override
  String get notesEmptyTitle => 'Brak notatek';

  @override
  String get notesEmptyHelp => 'Dotknij Nowa notatka, aby napisać pierwszą.';

  @override
  String get notesLoadFailedTitle => 'Nie udało się wczytać notatek';

  @override
  String get notesLoadFailedHelp => 'Sprawdź połączenie i spróbuj ponownie.';

  @override
  String get notesLoadPausedHelp =>
      'Twoje notatki pojawią się tutaj po synchronizacji.';

  @override
  String get noteNewList => 'Nowa lista';

  @override
  String get noteNew => 'Nowa notatka';

  @override
  String get noteNewKinds => 'Nowa lista lub notatka z aparatu';

  @override
  String get cardNotSynced => 'Jeszcze nie zsynchronizowano';

  @override
  String cardPictures(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count zdjęcia',
      many: '$count zdjęć',
      few: '$count zdjęcia',
      one: '1 zdjęcie',
    );
    return '$_temp0';
  }

  @override
  String cardTickItem(String item) {
    return 'Zaznacz $item';
  }

  @override
  String cardUntickItem(String item) {
    return 'Odznacz $item';
  }

  @override
  String cardOpenPicture(int number) {
    return 'Otwórz zdjęcie $number';
  }

  @override
  String shareSharedBy(String name) {
    return 'Udostępnia $name';
  }

  @override
  String get actionSharing => 'Udostępnianie';

  @override
  String get actionMoveToTrash => 'Przenieś do kosza';

  @override
  String get actionRemoveFromMine => 'Usuń z moich notatek';

  @override
  String get readOnlyInTrash => 'W koszu.';

  @override
  String get readOnlyViewOnly => 'Tylko do odczytu.';

  @override
  String get readOnlyOwnerEdits => 'Tylko właściciel może ją edytować.';

  @override
  String readOnlySharedBy(String name) {
    return 'Udostępnia $name.';
  }

  @override
  String get noteArchived => 'Zarchiwizowana';

  @override
  String get tagAdd => 'Dodaj tag';

  @override
  String tagRemoveNamed(String tag) {
    return 'Usuń $tag';
  }

  @override
  String get starterList => 'Lista';

  @override
  String get starterAttachment => 'Zdjęcie lub dźwięk';

  @override
  String get attachmentPictureDeleted => 'Zdjęcie usunięte';

  @override
  String get attachmentVoiceDeleted => 'Notatka głosowa usunięta';

  @override
  String get attachmentAddLabel => 'Dodaj zdjęcie, nagranie lub plik';

  @override
  String get attachmentAdd => 'Dodaj';

  @override
  String get pullOffline =>
      'Jesteś offline. Zmiany są zapisane na tym telefonie.';

  @override
  String get pullNoServer => 'Brak serwera, wszystko aktualne';

  @override
  String get pullSyncing => 'Synchronizowanie…';

  @override
  String get pullUpToDate => 'Aktualne';

  @override
  String get pullFailed =>
      'Nie udało się zsynchronizować. Zmiany są zapisane na tym telefonie.';

  @override
  String get searchClear => 'Wyczyść wyszukiwanie';

  @override
  String get searchFilter => 'Filtruj notatki';

  @override
  String searchFiltersOn(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Filtruj notatki, włączone filtry: $count',
      many: 'Filtruj notatki, włączone filtry: $count',
      few: 'Filtruj notatki, włączone filtry: $count',
      one: 'Filtruj notatki, włączony 1 filtr',
    );
    return '$_temp0';
  }

  @override
  String get searchNoMatches => 'Brak pasujących notatek';

  @override
  String get searchNoMatchesHelp =>
      'Wyłącz filtr, aby zobaczyć więcej notatek.';

  @override
  String get filterTitle => 'Filtruj notatki';

  @override
  String get filterHelp => 'Pokaż tylko pasujące notatki';

  @override
  String filterCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Włączone filtry: $count',
      many: 'Włączone filtry: $count',
      few: 'Włączone filtry: $count',
      one: 'Włączony 1 filtr',
    );
    return '$_temp0';
  }

  @override
  String get debugRecordingTitle => 'Nagranie debugowania';

  @override
  String get debugStopRecording => 'Zatrzymaj nagrywanie debugowania';

  @override
  String get debugDiscard => 'Odrzuć';

  @override
  String get debugDiscardTitle => 'Odrzucić nagranie?';

  @override
  String get debugDiscardMessage =>
      'Nagranie i zaznaczone problemy zostaną utracone.';

  @override
  String get debugShareFile => 'Udostępnij plik';

  @override
  String get debugPlay => 'Odtwórz';

  @override
  String get debugPause => 'Wstrzymaj';

  @override
  String debugProblemHere(String time) {
    return 'Problem tutaj ($time)';
  }

  @override
  String debugProblemAt(String time) {
    return 'Problem w $time';
  }

  @override
  String get debugExpectation => 'Oczekiwanie';

  @override
  String get debugExpectationHint => 'Co powinno się stać?';

  @override
  String get debugAdd => 'Dodaj';

  @override
  String get debugNoExpectation => '(brak oczekiwania)';

  @override
  String get debugProblemsHint =>
      'Przejdź do miejsca, w którym coś poszło nie tak, i dotknij Problem tutaj.\nNa wideo tekst i zdjęcia są zaszarzone; raport pomija wpisany tekst.';

  @override
  String get debugCreateIssue => 'Utwórz zgłoszenie';

  @override
  String get debugSaveReport => 'Zapisz raport debugowania';

  @override
  String get debugBuilding => 'Tworzenie raportu…';

  @override
  String get debugShareFailed => 'Nie udało się udostępnić raportu';

  @override
  String get debugGithubFailed => 'Nie udało się otworzyć GitHuba';

  @override
  String get debugBuildFailed => 'Nie udało się utworzyć raportu';

  @override
  String get actionMerge => 'Scal';

  @override
  String notesMerged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Scalono $count notatki',
      many: 'Scalono $count notatek',
      few: 'Scalono $count notatki',
      one: 'Scalono 1 notatkę',
    );
    return '$_temp0';
  }

  @override
  String notesMergedKeptPictures(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'Scalono $count notatki; zdjęcia zostają przy swoich notatkach w koszu',
      many:
          'Scalono $count notatek; zdjęcia zostają przy swoich notatkach w koszu',
      few:
          'Scalono $count notatki; zdjęcia zostają przy swoich notatkach w koszu',
      one: 'Scalono 1 notatkę; zdjęcia zostają przy swoich notatkach w koszu',
    );
    return '$_temp0';
  }

  @override
  String get notesMergePickTwo =>
      'Wybierz co najmniej dwie notatki do scalenia';

  @override
  String get notesMergeOwnOnly => 'Można scalać tylko własne notatki';

  @override
  String get notesMergeFrozen =>
      'Najpierw odmroź zamrożone notatki, potem je scal';

  @override
  String get notesMergeLocked =>
      'Najpierw otwórz zablokowane notatki, potem je scal';

  @override
  String get notesMergeFailed => 'Nie udało się scalić notatek';

  @override
  String get filterSecrets => 'Sekrety';

  @override
  String get filterSecretsHelp => 'Klucze, tokeny, identyfikatory i hasła';

  @override
  String get filterSearch => 'Wyszukiwanie';

  @override
  String get filterRegex => 'Wyrażenie regularne';

  @override
  String get filterMatchCase => 'Uwzględnij wielkość liter';

  @override
  String get searchHintRegex => 'Szukaj regexem';

  @override
  String get searchHintMatchCase => 'Szukaj z uwzględnieniem wielkości liter';

  @override
  String get searchHintRegexMatchCase =>
      'Regex, z uwzględnieniem wielkości liter';

  @override
  String get searchRegexIncomplete =>
      'To jeszcze nie jest pełne wyrażenie regularne: szukam tekstu tak, jak go wpisano';

  @override
  String get filterHas => 'Zawiera';

  @override
  String get filterPictures => 'Zdjęcia';

  @override
  String get filterChecklists => 'Listy kontrolne';

  @override
  String get filterReminders => 'Przypomnienia';

  @override
  String get filterTag => 'Tag';

  @override
  String get filterClear => 'Wyczyść filtry';

  @override
  String get lineText => 'Tekst';

  @override
  String get lineH1 => 'Nagłówek 1';

  @override
  String get lineH2 => 'Nagłówek 2';

  @override
  String get lineH3 => 'Nagłówek 3';

  @override
  String get lineChecklist => 'Lista kontrolna';

  @override
  String get lineBullet => 'Lista punktowana';

  @override
  String get lineNumbered => 'Lista numerowana';

  @override
  String get lineQuote => 'Cytat';

  @override
  String get lineCode => 'Blok kodu';

  @override
  String get editorLink => 'Link';

  @override
  String get slashWordsChecklist =>
      'todo to-do task checkbox list zadanie lista kontrolna';

  @override
  String get slashWordsH1 => 'h1 title tytuł nagłówek';

  @override
  String get slashWordsH2 => 'h2 subtitle subheading podtytuł';

  @override
  String get slashWordsH3 => 'h3 subheading podtytuł';

  @override
  String get slashWordsBullet => 'unordered ul dashes punkty myślniki';

  @override
  String get slashWordsNumbered => 'ordered ol numery';

  @override
  String get slashWordsQuote => 'blockquote citation cytat';

  @override
  String get slashWordsCode => 'pre snippet fragment kod';

  @override
  String get slashWordsText =>
      'paragraph plain normal body akapit zwykły tekst';

  @override
  String get slashDate => 'Dzisiejsza data';

  @override
  String get slashWordsDate => 'date today now day data dziś dzień';

  @override
  String get slashWordsLink => 'url web address adres strona';

  @override
  String get slashWordsAttachment =>
      'image img photo file voice recording attachment obraz zdjęcie plik nagranie załącznik';

  @override
  String get barFormatting => 'Formatowanie';

  @override
  String get barList => 'Lista';

  @override
  String get barSelected => 'Zaznaczony tekst';

  @override
  String get barStyles => 'Style tekstu';

  @override
  String get barColors => 'Kolory wyróżnienia';

  @override
  String get barLineStyles => 'Style wierszy';

  @override
  String get toolOutdent => 'Zmniejsz wcięcie';

  @override
  String get toolIndent => 'Zwiększ wcięcie';

  @override
  String get toolBold => 'Pogrubienie';

  @override
  String get toolItalic => 'Kursywa';

  @override
  String get toolUnderline => 'Podkreślenie';

  @override
  String get toolStrikethrough => 'Przekreślenie';

  @override
  String get toolHighlight => 'Wyróżnienie';

  @override
  String get toolAlignLeft => 'Wyrównaj do lewej';

  @override
  String get toolAlignCenter => 'Wyśrodkuj';

  @override
  String get toolAlignRight => 'Wyrównaj do prawej';

  @override
  String get toolAlignJustify => 'Wyjustuj';

  @override
  String get toolTextStyle => 'Kolor i czcionka';

  @override
  String get textStyleNone => 'Brak';

  @override
  String get textStyleDefault => 'Domyślny';

  @override
  String get textStyleColor => 'Kolor tekstu';

  @override
  String get textStyleFont => 'Czcionka';

  @override
  String get textFontComic => 'Comic Sans';

  @override
  String get textFontHandwriting => 'Pismo odręczne';

  @override
  String get textFontTypewriter => 'Maszyna do pisania';

  @override
  String get textFontRounded => 'Zaokrąglona';

  @override
  String get textFontSlab => 'Slab';

  @override
  String get textFontMarker => 'Marker';

  @override
  String get textStyleCustomHighlight => 'Własne wyróżnienie';

  @override
  String get textStyleCustomColor => 'Własny kolor tekstu';

  @override
  String get colorGray => 'Szary';

  @override
  String get colorPickerHue => 'Odcień';

  @override
  String get colorPickerSaturation => 'Nasycenie';

  @override
  String get colorPickerLightness => 'Jasność';

  @override
  String get colorPickerBadHex => 'Użyj #rgb lub #rrggbb';

  @override
  String get colorPickerApply => 'Zastosuj';

  @override
  String get toolRemoveHighlight => 'Usuń wyróżnienie';

  @override
  String get toolClearFormatting => 'Wyczyść formatowanie';

  @override
  String get toolRedo => 'Ponów';

  @override
  String get toolHideKeyboard => 'Ukryj klawiaturę';

  @override
  String get editorEmptyItem => 'Pusta pozycja';

  @override
  String get editorLinkCopied => 'Skopiowano link';

  @override
  String editorCheckedItems(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count zaznaczonych pozycji',
      many: '$count zaznaczonych pozycji',
      few: '$count zaznaczone pozycje',
      one: '1 zaznaczona pozycja',
    );
    return '$_temp0';
  }

  @override
  String get linkAdd => 'Dodaj link';

  @override
  String get linkEdit => 'Edytuj link';

  @override
  String get linkTextHint => 'Tekst';

  @override
  String get commonOpen => 'Otwórz';

  @override
  String get commonEdit => 'Edytuj';

  @override
  String get commonRemove => 'Usuń';

  @override
  String get editorSlashHint => 'Wpisz /, aby zobaczyć więcej';

  @override
  String get editorPastePicture => 'Wklej zdjęcie';

  @override
  String get editorPlaceholder => 'Zacznij pisać';

  @override
  String get commonTryAgain => 'Spróbuj ponownie';

  @override
  String get historyCurrent => 'Bieżąca wersja';

  @override
  String get historySavedOnPhone => 'Zapisano na tym telefonie';

  @override
  String get historyNoChanges => 'Brak zmian';

  @override
  String get historyEmptyTitle => 'Brak wcześniejszych wersji';

  @override
  String get historyFetchFailed =>
      'Nie udało się sprawdzić wersji z twoich innych urządzeń.';

  @override
  String get historyOffline =>
      'Połącz się z internetem, aby zobaczyć wersje z twoich innych urządzeń.';

  @override
  String diffAdded(int count) {
    return 'Dodano: $count';
  }

  @override
  String diffRemoved(int count) {
    return 'Usunięto: $count';
  }

  @override
  String diffChanged(int count) {
    return 'Zmieniono: $count';
  }

  @override
  String diffLinesAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Dodano $count wiersza',
      many: 'Dodano $count wierszy',
      few: 'Dodano $count wiersze',
      one: 'Dodano 1 wiersz',
    );
    return '$_temp0';
  }

  @override
  String diffLinesRemoved(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Usunięto $count wiersza',
      many: 'Usunięto $count wierszy',
      few: 'Usunięto $count wiersze',
      one: 'Usunięto 1 wiersz',
    );
    return '$_temp0';
  }

  @override
  String diffLinesChanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Zmieniono $count wiersza',
      many: 'Zmieniono $count wierszy',
      few: 'Zmieniono $count wiersze',
      one: 'Zmieniono 1 wiersz',
    );
    return '$_temp0';
  }

  @override
  String diffShowUnchanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Pokaż $count niezmienionego wiersza',
      many: 'Pokaż $count niezmienionych wierszy',
      few: 'Pokaż $count niezmienione wiersze',
      one: 'Pokaż 1 niezmieniony wiersz',
    );
    return '$_temp0';
  }

  @override
  String diffUnchanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count niezmienionego wiersza',
      many: '$count niezmienionych wierszy',
      few: '$count niezmienione wiersze',
      one: '1 niezmieniony wiersz',
    );
    return '$_temp0';
  }

  @override
  String get diffAddedMark => 'Dodano:';

  @override
  String get diffRemovedMark => 'Usunięto:';

  @override
  String get diffChangedMark => 'Zmieniono:';

  @override
  String get diffCheckedMark => 'Zaznaczone:';

  @override
  String get diffUncheckedMark => 'Niezaznaczone:';

  @override
  String get diffRemovedTitle => 'Usunięty tytuł:';

  @override
  String get diffAddedTitle => 'Dodany tytuł:';

  @override
  String get revisionNotSavedLead => 'Niezapisana.';

  @override
  String get revisionNotSavedText =>
      'Ta zmiana nie została zapisana, ponieważ notatka zmieniła się wcześniej na innym urządzeniu. Przywróć ją lub skopiuj to, czego potrzebujesz.';

  @override
  String get revisionAlreadyMatches => 'Notatka jest już zgodna z tą wersją';

  @override
  String get revisionRestoreFailed => 'Nie udało się przywrócić tej wersji';

  @override
  String get revisionRestoring => 'Przywracanie…';

  @override
  String get revisionBackToList => 'Wróć do listy wersji';

  @override
  String get revisionNewer => 'Nowsza wersja';

  @override
  String get revisionOlder => 'Starsza wersja';

  @override
  String revisionPosition(int index, int count) {
    return '$index z $count';
  }

  @override
  String get revisionGone => 'Ta wersja nie jest już dostępna.';

  @override
  String get revisionSameAsNext => 'Ten sam tekst co w kolejnej wersji.';

  @override
  String get revisionSameAsCurrent => 'Ten sam tekst co w bieżącej wersji.';

  @override
  String get revisionEmpty => 'Ta wersja jest pusta.';

  @override
  String shareFailed(String name) {
    return 'Nie udało się udostępnić: $name';
  }

  @override
  String shareAccessFor(String name) {
    return 'Dostęp dla: $name';
  }

  @override
  String shareRevoked(String name) {
    return '$name nie ma już dostępu';
  }

  @override
  String shareRevokeFailed(String name) {
    return 'Nie udało się odebrać dostępu: $name';
  }

  @override
  String shareChangeFailed(String name) {
    return 'Nie udało się zmienić dostępu: $name';
  }

  @override
  String get shareSubtitle =>
      'Dodane osoby zobaczą tę notatkę na swojej liście.';

  @override
  String get shareOffline =>
      'Połącz się z internetem, aby udostępnić tę notatkę.';

  @override
  String get shareSearchHint => 'Dodaj osoby według imienia lub e-maila';

  @override
  String get shareNoMatches =>
      'Nikogo nie znaleziono. Można dodać tylko osoby z kontem na tym serwerze.';

  @override
  String get shareRecent => 'Ostatnio udostępniono';

  @override
  String get sharePeople => 'Osoby';

  @override
  String shareAddPerson(String name) {
    return 'Dodaj: $name';
  }

  @override
  String get shareWithAccess => 'Osoby z dostępem';

  @override
  String shareYou(String name) {
    return '$name (ty)';
  }

  @override
  String get shareOwner => 'Właściciel';

  @override
  String shareChangeAccess(String permission, String name) {
    return '$permission. Zmień dostęp dla: $name';
  }

  @override
  String get commonOffline => 'Offline';

  @override
  String commonDeleteItem(String name) {
    return 'Usuń: $name';
  }

  @override
  String get commonMoveUp => 'Przesuń w górę';

  @override
  String get commonMoveDown => 'Przesuń w dół';

  @override
  String get commonMoveToTop => 'Przesuń na górę';

  @override
  String get commonMoveToBottom => 'Przesuń na dół';

  @override
  String commonPosition(int index, int count) {
    return '$index z $count';
  }

  @override
  String get addToNote => 'Dodaj do notatki';

  @override
  String get addPhotoUnsupported =>
      'Nie udało się dodać tego zdjęcia. Spróbuj JPEG lub PNG.';

  @override
  String get addMicDenied =>
      'Zezwól na dostęp do mikrofonu w Ustawieniach, aby nagrywać';

  @override
  String get addTakePhoto => 'Zrób zdjęcie';

  @override
  String get addChoosePhoto => 'Wybierz zdjęcia';

  @override
  String get addRecordAudio => 'Nagraj dźwięk';

  @override
  String get recordingTitle => 'Nagrywanie';

  @override
  String get recordingHelp =>
      'Mów normalnie. Nagranie zostaje na tym telefonie, dopóki się nie prześle.';

  @override
  String get recordingReviewTitle => 'Twoje nagranie';

  @override
  String recordingReviewHelp(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count sekundy. Odsłuchaj, potem zachowaj lub nagraj ponownie.',
      many: '$count sekund. Odsłuchaj, potem zachowaj lub nagraj ponownie.',
      few: '$count sekundy. Odsłuchaj, potem zachowaj lub nagraj ponownie.',
      one: '1 sekunda. Odsłuchaj, potem zachowaj lub nagraj ponownie.',
    );
    return '$_temp0';
  }

  @override
  String get recordingStoppedAtLimit =>
      'Zatrzymano po osiągnięciu maksymalnej długości. Odsłuchaj, potem zachowaj lub nagraj ponownie.';

  @override
  String recordingElapsed(String time) {
    return 'Nagrywanie, $time';
  }

  @override
  String get recordingStop => 'Zatrzymaj';

  @override
  String get recordingDiscard => 'Odrzuć';

  @override
  String get recordingAgain => 'Jeszcze raz';

  @override
  String get voiceOffline =>
      'Ta notatka głosowa odtworzy się, gdy wrócisz online';

  @override
  String get voiceNote => 'Notatka głosowa';

  @override
  String get voiceLoadFailed => 'Nie udało się wczytać';

  @override
  String get attachmentUploading => 'Przesyłanie…';

  @override
  String get attachmentUploadFailed => 'Nie udało się przesłać';

  @override
  String voicePosition(String name) {
    return 'Pozycja w: $name';
  }

  @override
  String audioSave(String name) {
    return 'Zapisz: $name';
  }

  @override
  String get audioSaveDialog => 'Zapisz dźwięk';

  @override
  String audioSaved(String name) {
    return 'Zapisano: $name';
  }

  @override
  String get audioSaveFailed => 'Nie udało się zapisać dźwięku';

  @override
  String get pictureAllowPhotos =>
      'Zezwól na dostęp do Zdjęć w Ustawieniach, aby zapisywać obrazy';

  @override
  String get pictureCopy => 'Kopiuj obraz';

  @override
  String get pictureCopied => 'Skopiowano obraz';

  @override
  String get pictureCopyFailed => 'Nie udało się skopiować obrazu';

  @override
  String get pictureSaved => 'Zapisano w Zdjęciach';

  @override
  String get pictureSaveFailed => 'Nie udało się zapisać obrazu';

  @override
  String get pictureOffline => 'Ten obraz pokaże się, gdy wrócisz online';

  @override
  String get pictureLoadFailed => 'Nie udało się wczytać tego obrazu';

  @override
  String get pictureShowTags => 'Pokaż wykryte tagi';

  @override
  String get pictureHideTags => 'Ukryj wykryte tagi';

  @override
  String get pictureFindingTags => 'Szukanie tagów';

  @override
  String get pictureTagsFailed => 'Nie udało się pobrać tagów';

  @override
  String get pictureTagsNotYet =>
      'Ten obraz nie został jeszcze przeanalizowany. Spróbuj ponownie wkrótce.';

  @override
  String pictureSearchTag(String tag) {
    return 'Szukaj w notatkach: $tag';
  }

  @override
  String get pictureGrabText => 'Pobierz tekst z obrazu';

  @override
  String get pictureReadingText => 'Odczytywanie tekstu z obrazu';

  @override
  String get pictureOpenNote => 'Otwórz notatkę';

  @override
  String get pictureTextAdded => 'Dodano tekst do notatki';

  @override
  String get pictureNoText => 'Nie znaleziono tekstu na tym obrazie';

  @override
  String get pictureTextFailed => 'Nie udało się odczytać tego obrazu';

  @override
  String get pictureSelectText => 'Zaznacz tekst';

  @override
  String pictureWordsSelected(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Zaznaczono $count słowa',
      many: 'Zaznaczono $count słów',
      few: 'Zaznaczono $count słowa',
      one: 'Zaznaczono 1 słowo',
    );
    return '$_temp0';
  }

  @override
  String get pictureSelectHint =>
      'Przytrzymaj słowo i przeciągnij, aby zaznaczyć tekst, albo przytrzymaj obok i przeciągnij ramkę';

  @override
  String get pictureInsertText => 'Wstaw do notatki';

  @override
  String get pictureTextCopied => 'Skopiowano tekst';

  @override
  String get pictureSaveToPhotos => 'Zapisz w Zdjęciach';

  @override
  String attachmentRetry(String name) {
    return 'Spróbuj ponownie: $name';
  }

  @override
  String pictureOpen(String name) {
    return '$name, otwórz';
  }

  @override
  String get groupPinned => 'Przypięte';

  @override
  String get groupOthers => 'Pozostałe';

  @override
  String get groupArchived => 'Zarchiwizowane';

  @override
  String get groupPictureMatches => 'Obrazy, które mogą pasować';

  @override
  String get noteBackground => 'Tło';

  @override
  String get notePattern => 'Wzór';

  @override
  String get noteColorDefault => 'Domyślny';

  @override
  String get patternDots => 'Kropki';

  @override
  String get patternGrid => 'Siatka';

  @override
  String get patternLines => 'Linie';

  @override
  String get patternWaves => 'Fale';

  @override
  String get patternGroceries => 'Zakupy';

  @override
  String get patternMusic => 'Muzyka';

  @override
  String get patternTravel => 'Podróże';

  @override
  String get patternCode => 'Kod';

  @override
  String get viewLayout => 'Układ';

  @override
  String get viewMasonry => 'Kafelki';

  @override
  String get viewGrid => 'Siatka';

  @override
  String get viewList => 'Lista';

  @override
  String get viewSortBy => 'Sortuj według';

  @override
  String get viewDateEdited => 'Data edycji';

  @override
  String get viewDateCreated => 'Data utworzenia';

  @override
  String get viewTitle => 'Tytuł';

  @override
  String get viewSize => 'Rozmiar';

  @override
  String get viewLargestFirst => 'Największe najpierw';

  @override
  String get viewSmallestFirst => 'Najmniejsze najpierw';

  @override
  String get viewAtoZ => 'A do Z';

  @override
  String get viewZtoA => 'Z do A';

  @override
  String get viewNewestFirst => 'Najnowsze';

  @override
  String get viewOldestFirst => 'Najstarsze';

  @override
  String get noteUnsynced => 'Zmiany jeszcze nie zsynchronizowane';

  @override
  String get noteOnThisPhone => 'Na tym telefonie';

  @override
  String get noteGone => 'Ta notatka nie jest już dostępna';

  @override
  String get reminderRemoved => 'Usunięto przypomnienie';

  @override
  String get versionRestored => 'Przywrócono wersję';

  @override
  String get attachmentPictureAdded => 'Dodano obraz';

  @override
  String get attachmentVoiceAdded => 'Dodano notatkę głosową';

  @override
  String get attachmentPictureAddedOffline =>
      'Dodano obraz. Prześle się, gdy wrócisz online.';

  @override
  String get attachmentVoiceAddedOffline =>
      'Dodano notatkę głosową. Prześle się, gdy wrócisz online.';

  @override
  String get attachmentPictureAddFailed => 'Nie udało się dodać obrazu';

  @override
  String get attachmentVoiceAddFailed => 'Nie udało się dodać notatki głosowej';

  @override
  String get attachmentAudioAdded => 'Dodano plik audio';

  @override
  String get attachmentAudioAddedOffline =>
      'Dodano plik audio. Prześle się, gdy wrócisz online.';

  @override
  String get attachmentAudioAddFailed => 'Nie udało się dodać pliku audio';

  @override
  String get attachmentTooBig => 'Nie można dodawać plików powyżej 50 MB.';

  @override
  String get attachmentAudioDeleted => 'Usunięto plik audio';

  @override
  String get audioFileOffline =>
      'Ten plik audio odtworzy się, gdy wrócisz online';

  @override
  String get noteTitleHint => 'Tytuł';

  @override
  String get viewOrder => 'Kolejność';

  @override
  String get viewCards => 'Karty';

  @override
  String get viewCardPictures => 'Obrazy na kartach';

  @override
  String get viewCardPicturesHelp => 'Pokazuj obrazy z notatki na jej karcie';

  @override
  String get slashMenuLabel => 'Wstaw';

  @override
  String get slashNoResults => 'Brak wyników';

  @override
  String get noteColor => 'Kolor';

  @override
  String cardChecked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count zrobione',
      many: '$count zrobionych',
      few: '$count zrobione',
      one: '1 zrobiona',
    );
    return '$_temp0';
  }

  @override
  String cardAllChecked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Wszystkie $count zrobione',
      many: 'Wszystkie $count zrobione',
      few: 'Wszystkie $count zrobione',
      one: 'Wszystko zrobione (1)',
    );
    return '$_temp0';
  }

  @override
  String get shareSheetTitle => 'Nowa notatka';

  @override
  String shareTag(String name) {
    return 'Tag $name';
  }

  @override
  String get shareSignIn =>
      'Zaloguj się do Anchor, aby zapisać to, co udostępniasz.';

  @override
  String get shareOpenApp => 'Otwórz Anchor';

  @override
  String get shareNothing => 'Nie ma tu nic, co Anchor mógłby zapisać.';

  @override
  String shareNotAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Nie udało się dodać $count pliku.',
      many: 'Nie udało się dodać $count plików.',
      few: 'Nie udało się dodać $count plików.',
      one: 'Nie udało się dodać 1 pliku.',
    );
    return '$_temp0';
  }

  @override
  String shareUnsupported(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Nie można dodać $count pliku. Anchor dodaje obrazy i dźwięk.',
      many: 'Nie można dodać $count plików. Anchor dodaje obrazy i dźwięk.',
      few: 'Nie można dodać $count plików. Anchor dodaje obrazy i dźwięk.',
      one: 'Nie można dodać 1 pliku. Anchor dodaje obrazy i dźwięk.',
    );
    return '$_temp0';
  }

  @override
  String shareTooBig(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count pliku ma ponad 50 MB, więc nie można ich dodać.',
      many: '$count plików ma ponad 50 MB, więc nie można ich dodać.',
      few: '$count pliki mają ponad 50 MB, więc nie można ich dodać.',
      one: '1 plik ma ponad 50 MB, więc nie można go dodać.',
    );
    return '$_temp0';
  }

  @override
  String get shareOverLimit => 'Dodano tylko pierwszych 20 plików.';

  @override
  String shareRemoveItem(String name) {
    return 'Usuń: $name';
  }

  @override
  String get actionLock => 'Zablokuj';

  @override
  String get actionChangeLock => 'Zmień blokadę';

  @override
  String get actionRemoveLock => 'Usuń blokadę';

  @override
  String get lockSheetTitle => 'Blokada';

  @override
  String get lockSheetChangeTitle => 'Zmień blokadę';

  @override
  String get lockSheetSubtitle => 'Co otwiera notatkę';

  @override
  String get lockKindBiometric => 'Odcisk palca lub twarz';

  @override
  String get lockKindBiometricHelp => 'Albo blokada ekranu telefonu';

  @override
  String get lockKindPin => 'PIN';

  @override
  String get lockKindPinHelp => 'Jeden PIN do wszystkich zablokowanych notatek';

  @override
  String get lockKindPattern => 'Wzór';

  @override
  String get lockKindPatternHelp =>
      'Jeden wzór do wszystkich zablokowanych notatek';

  @override
  String get lockKindTap => 'Samo dotknięcie';

  @override
  String get lockKindTapHelp => 'Ukrywa notatkę, dopóki jej nie dotkniesz';

  @override
  String noteLockedWith(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'biometric': 'Zablokowano odciskiem palca lub twarzą',
      'pin': 'Zablokowano kodem PIN',
      'pattern': 'Zablokowano wzorem',
      'other': 'Zablokowano dotknięciem',
    });
    return '$_temp0';
  }

  @override
  String noteLockChanged(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'biometric': 'Teraz zablokowano odciskiem palca lub twarzą',
      'pin': 'Teraz zablokowano kodem PIN',
      'pattern': 'Teraz zablokowano wzorem',
      'other': 'Teraz zablokowano dotknięciem',
    });
    return '$_temp0';
  }

  @override
  String get noteLockRemoved => 'Usunięto blokadę';

  @override
  String notesLocked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Zablokowano $count notatki',
      many: 'Zablokowano $count notatek',
      few: 'Zablokowano $count notatki',
      one: 'Zablokowano notatkę',
    );
    return '$_temp0';
  }

  @override
  String notesLockedSome(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'Zablokowano $count notatki. Zablokowane notatki, których nie otwierasz, zachowują swoją blokadę.',
      many:
          'Zablokowano $count notatek. Zablokowane notatki, których nie otwierasz, zachowują swoją blokadę.',
      few:
          'Zablokowano $count notatki. Zablokowane notatki, których nie otwierasz, zachowują swoją blokadę.',
      one:
          'Zablokowano 1 notatkę. Zablokowane notatki, których nie otwierasz, zachowują swoją blokadę.',
    );
    return '$_temp0';
  }

  @override
  String notesLockOpenFirst(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Otwórz te notatki, aby zmienić ich blokady',
      many: 'Otwórz te notatki, aby zmienić ich blokady',
      few: 'Otwórz te notatki, aby zmienić ich blokady',
      one: 'Otwórz tę notatkę, aby zmienić jej blokadę',
    );
    return '$_temp0';
  }

  @override
  String lockNeedsServer(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Ustawienie kodu PIN wymaga połączenia z serwerem',
      'other': 'Ustawienie wzoru wymaga połączenia z serwerem',
    });
    return '$_temp0';
  }

  @override
  String lockChangeNeedsServer(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Zmiana kodu PIN wymaga połączenia z serwerem',
      'other': 'Zmiana wzoru wymaga połączenia z serwerem',
    });
    return '$_temp0';
  }

  @override
  String get lockUntitled => 'Zablokowana notatka';

  @override
  String get lockTapToUnlock => 'Dotknij, aby odblokować';

  @override
  String get lockUnlock => 'Odblokuj';

  @override
  String get lockEnterPin => 'Wpisz swój PIN';

  @override
  String get lockDrawPattern => 'Narysuj swój wzór';

  @override
  String get lockUseBiometric =>
      'Użyj odcisku palca, twarzy lub blokady ekranu';

  @override
  String lockBiometricReason(String title) {
    return 'Odblokuj „$title”';
  }

  @override
  String get lockTooManyTries =>
      'Zbyt wiele prób. Odblokuj telefon i spróbuj ponownie.';

  @override
  String get lockCantCheck =>
      'Nie można jeszcze tego sprawdzić na tym telefonie. Połącz się z internetem i spróbuj ponownie.';

  @override
  String lockWrong(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Zły PIN',
      'other': 'Zły wzór',
    });
    return '$_temp0';
  }

  @override
  String get lockPatternGrid =>
      'Siatka wzoru. Przeciągnij przez co najmniej 4 punkty.';

  @override
  String get lockPinErase => 'Usuń cyfrę';

  @override
  String lockPinDigits(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count cyfry',
      many: '$count cyfr',
      few: '$count cyfry',
      one: '1 cyfra',
      zero: 'Brak cyfr',
    );
    return '$_temp0';
  }

  @override
  String lockSetupTitle(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN',
      'other': 'Wzór',
    });
    return '$_temp0';
  }

  @override
  String lockSetupChoose(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Wybierz PIN',
      'other': 'Narysuj wzór',
    });
    return '$_temp0';
  }

  @override
  String lockSetupChooseNew(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Wybierz nowy PIN',
      'other': 'Narysuj nowy wzór',
    });
    return '$_temp0';
  }

  @override
  String lockSetupConfirm(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Wpisz PIN jeszcze raz',
      'other': 'Narysuj wzór jeszcze raz',
    });
    return '$_temp0';
  }

  @override
  String get lockSetupCurrentHelp => 'Ten, którego teraz używasz';

  @override
  String lockSetupChooseHelp(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Od 4 do 12 cyfr. Otwiera każdą notatkę zablokowaną kodem PIN.',
      'other':
          'Połącz co najmniej 4 punkty. Otwiera każdą notatkę zablokowaną wzorem.',
    });
    return '$_temp0';
  }

  @override
  String get lockSetupConfirmHelp => 'Dla pewności';

  @override
  String lockSetupNotYours(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'To nie jest twój PIN',
      'other': 'To nie jest twój wzór',
    });
    return '$_temp0';
  }

  @override
  String lockSetupBadShape(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Użyj od 4 do 12 cyfr',
      'other': 'Połącz co najmniej 4 punkty, każdy raz',
    });
    return '$_temp0';
  }

  @override
  String lockSetupMismatch(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Kody PIN się nie zgadzają. Spróbuj ponownie.',
      'other': 'Wzory się nie zgadzają. Spróbuj ponownie.',
    });
    return '$_temp0';
  }

  @override
  String get lockSetupForgot => 'Nie pamiętasz? Użyj hasła';

  @override
  String get lockSetupPasswordTitle => 'Hasło do konta';

  @override
  String lockErrorWrongProof(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Zły PIN lub hasło',
      'other': 'Zły wzór lub hasło',
    });
    return '$_temp0';
  }

  @override
  String lockErrorInvalid(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN ma od 4 do 12 cyfr',
      'other': 'Wzór łączy co najmniej 4 punkty',
    });
    return '$_temp0';
  }

  @override
  String get lockErrorUnsupported =>
      'Twój serwer jeszcze nie obsługuje blokad notatek';

  @override
  String lockErrorOffline(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Nie udało się zapisać kodu PIN. Wymaga to połączenia z serwerem.',
      'other': 'Nie udało się zapisać wzoru. Wymaga to połączenia z serwerem.',
    });
    return '$_temp0';
  }

  @override
  String lockSaved(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Zapisano PIN',
      'other': 'Zapisano wzór',
    });
    return '$_temp0';
  }

  @override
  String get settingsNoteLocks => 'Blokady notatek';

  @override
  String settingsLockSet(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Ustaw PIN',
      'other': 'Ustaw wzór',
    });
    return '$_temp0';
  }

  @override
  String settingsLockChange(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Zmień PIN',
      'other': 'Zmień wzór',
    });
    return '$_temp0';
  }

  @override
  String settingsLockHelp(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'Otwiera notatki zablokowane kodem PIN',
      'other': 'Otwiera notatki zablokowane wzorem',
    });
    return '$_temp0';
  }

  @override
  String get cardLocked => 'Zablokowana';

  @override
  String get cardUnlocked => 'Zablokowana, otwarta do wyłączenia ekranu';

  @override
  String get settingsBackup => 'Kopia zapasowa';

  @override
  String get backupExport => 'Eksportuj kopię zapasową';

  @override
  String get backupExportHelp =>
      'Zapisz wszystkie notatki, tagi, obrazy i nagrania w pliku';

  @override
  String get backupExporting => 'Tworzenie kopii zapasowej…';

  @override
  String get backupSaveTitle => 'Zapisz kopię zapasową';

  @override
  String backupSaved(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Zapisano $count notatki w kopii zapasowej',
      many: 'Zapisano $count notatek w kopii zapasowej',
      few: 'Zapisano $count notatki w kopii zapasowej',
      one: 'Zapisano 1 notatkę w kopii zapasowej',
    );
    return '$_temp0';
  }

  @override
  String backupMissingFiles(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count załącznika nie było na tym telefonie i nie udało się ich pobrać.',
      many:
          '$count załączników nie było na tym telefonie i nie udało się ich pobrać.',
      few:
          '$count załączników nie było na tym telefonie i nie udało się ich pobrać.',
      one: '1 załącznika nie było na tym telefonie i nie udało się go pobrać.',
    );
    return '$_temp0';
  }

  @override
  String get backupExportFailed => 'Nie udało się utworzyć kopii zapasowej';

  @override
  String get backupRestore => 'Przywróć kopię zapasową';

  @override
  String get backupRestoreHelp =>
      'Przywróć notatki z pliku kopii zapasowej. Notatki, które już tu są, zostają bez zmian';

  @override
  String get backupRestoring => 'Przywracanie…';

  @override
  String get backupPickTitle => 'Wybierz kopię zapasową Anchor';

  @override
  String get backupOpenFailed => 'Nie udało się otworzyć pliku';

  @override
  String backupRestored(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Przywrócono $count notatki',
      many: 'Przywrócono $count notatek',
      few: 'Przywrócono $count notatki',
      one: 'Przywrócono 1 notatkę',
    );
    return '$_temp0';
  }

  @override
  String backupAlreadyHere(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count już tu było.',
      many: '$count już tu było.',
      few: '$count już tu były.',
      one: '1 już tu była.',
    );
    return '$_temp0';
  }

  @override
  String get backupNothingToRestore =>
      'Nie ma czego przywracać: wszystkie notatki już tu są';

  @override
  String get backupRestoreFailed => 'Nie udało się przywrócić kopii zapasowej';

  @override
  String get backupNotABackup => 'Ten plik nie jest kopią zapasową Anchor';

  @override
  String get backupDamaged => 'Ta kopia zapasowa jest uszkodzona';

  @override
  String get backupTooNew =>
      'Ta kopia zapasowa pochodzi z nowszej wersji Anchor. Zaktualizuj aplikację, aby ją przywrócić.';

  @override
  String get attachmentFileAdded => 'Dodano plik';

  @override
  String get attachmentFileAddedOffline =>
      'Dodano plik. Prześle się, gdy wrócisz online.';

  @override
  String get attachmentFileAddFailed => 'Nie udało się dodać pliku';

  @override
  String get attachmentFileDeleted => 'Usunięto plik';

  @override
  String attachmentsAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Dodano $count załącznika',
      many: 'Dodano $count załączników',
      few: 'Dodano $count załączniki',
      one: 'Dodano 1 załącznik',
    );
    return '$_temp0';
  }

  @override
  String attachmentsAddedOffline(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Dodano $count załącznika. Prześlą się, gdy wrócisz online.',
      many: 'Dodano $count załączników. Prześlą się, gdy wrócisz online.',
      few: 'Dodano $count załączniki. Prześlą się, gdy wrócisz online.',
      one: 'Dodano 1 załącznik. Prześle się, gdy wrócisz online.',
    );
    return '$_temp0';
  }

  @override
  String get pictureInTextCamera => 'Zrób zdjęcie';

  @override
  String get pictureInTextChoose => 'Wybierz zdjęcia';

  @override
  String get pictureCrop => 'Przytnij';

  @override
  String get pictureCropReset => 'Resetuj';

  @override
  String get cameraFlashOff => 'Flesz wyłączony';

  @override
  String get cameraFlashOn => 'Flesz włączony';

  @override
  String get cameraNone => 'Nie znaleziono aparatu';

  @override
  String get cameraNoPermission =>
      'Anchor potrzebuje uprawnienia do aparatu, aby robić zdjęcia';

  @override
  String get cameraFailed => 'Nie udało się uruchomić aparatu';

  @override
  String get cameraSwitch => 'Przełącz aparat';

  @override
  String get cameraShutter => 'Zrób zdjęcie';

  @override
  String cameraTaken(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Zrobiono $count zdjęcia',
      many: 'Zrobiono $count zdjęć',
      few: 'Zrobiono $count zdjęcia',
      one: 'Zrobiono 1 zdjęcie',
    );
    return '$_temp0';
  }

  @override
  String cameraPicturesAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Dodano $count zdjęcia',
      many: 'Dodano $count zdjęć',
      few: 'Dodano $count zdjęcia',
      one: 'Dodano 1 zdjęcie',
    );
    return '$_temp0';
  }

  @override
  String get inlinePicture => 'Obraz';

  @override
  String get inlinePictureRetake => 'Zrób ponownie';

  @override
  String get inlinePictureMirrorHorizontally => 'Odbij w poziomie';

  @override
  String get inlinePictureMirrorVertically => 'Odbij w pionie';

  @override
  String get inlinePictureAddCaption => 'Dodaj podpis';

  @override
  String get inlinePictureEditCaption => 'Edytuj podpis';

  @override
  String get inlinePictureCaptionHint => 'Podpis';

  @override
  String get inlinePictureChangeFailed => 'Nie udało się zmienić obrazu';

  @override
  String get inlinePictureResize => 'Zmień rozmiar obrazu';

  @override
  String get fileOffline => 'Ten plik otworzy się, gdy wrócisz online';

  @override
  String get fileLoadFailed => 'Nie udało się wczytać pliku';

  @override
  String get fileNoApp =>
      'Żadna aplikacja na tym telefonie go nie otwiera. Zapisz go zamiast tego.';

  @override
  String get fileSaveDialog => 'Zapisz plik';

  @override
  String fileSaved(String name) {
    return 'Zapisano: $name';
  }

  @override
  String get fileSaveFailed => 'Nie udało się zapisać pliku';

  @override
  String fileOpen(String name) {
    return 'Otwórz: $name';
  }

  @override
  String fileSave(String name) {
    return 'Zapisz: $name';
  }

  @override
  String get addTakeSeveral => 'Zrób kilka';

  @override
  String get addFiles => 'Pliki';

  @override
  String get addFolder => 'Folder';

  @override
  String get addFolderFailed => 'Nie udało się odczytać tego folderu';

  @override
  String get addFolderEmpty => 'Ten folder jest pusty';

  @override
  String get actionAddImage => 'Dodaj obraz';

  @override
  String get actionTakePicture => 'Zrób zdjęcie';

  @override
  String get actionTakeSeveral => 'Zrób kilka';

  @override
  String get actionFreeze => 'Zamroź';

  @override
  String get actionUnfreeze => 'Odmroź';

  @override
  String get noteFreezeHelp =>
      'Nikt nie może jej zmienić ani usunąć, dopóki jej nie odmrozisz';

  @override
  String get noteFreezeFailed =>
      'Nie udało się zamrozić. Wymaga to połączenia z serwerem.';

  @override
  String get noteUnfreezeFailed =>
      'Nie udało się odmrozić. Wymaga to połączenia z serwerem.';

  @override
  String notesFrozen(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Zamrożono $count notatki',
      many: 'Zamrożono $count notatek',
      few: 'Zamrożono $count notatki',
      one: 'Zamrożono notatkę',
    );
    return '$_temp0';
  }

  @override
  String notesUnfrozen(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Odmrożono $count notatki',
      many: 'Odmrożono $count notatek',
      few: 'Odmrożono $count notatki',
      one: 'Odmrożono notatkę',
    );
    return '$_temp0';
  }

  @override
  String notesFrozenStay(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Zamrożonych notatek nie można usunąć. Najpierw je odmroź.',
      many: 'Zamrożonych notatek nie można usunąć. Najpierw je odmroź.',
      few: 'Zamrożonych notatek nie można usunąć. Najpierw je odmroź.',
      one: 'Zamrożonej notatki nie można usunąć. Najpierw ją odmroź.',
    );
    return '$_temp0';
  }

  @override
  String get notesLockOrFreeze => 'Zablokuj lub zamroź';

  @override
  String get readOnlyFrozenByOwner =>
      'Jej właściciel ją zamroził, więc nie można jej zmienić.';

  @override
  String get notePublicCanView => 'Publiczna: każdy z linkiem może wyświetlać';

  @override
  String get notePublicCanEdit => 'Publiczna: każdy z linkiem może edytować';

  @override
  String get cardFrozen => 'Zamrożona';

  @override
  String get noteNewCamera => 'Notatka z aparatu';

  @override
  String get actionReminder => 'Przypomnienie';

  @override
  String get actionCheckboxes => 'Pola wyboru';

  @override
  String get actionModifyQuickActions => 'Zmień szybkie akcje';

  @override
  String get settingsQuickActions => 'Szybkie akcje';

  @override
  String get settingsQuickActionsHelp =>
      'Na górnym pasku notatki, w tej kolejności. Mieści się do 5. Przeciągnij, aby zmienić kolejność.';

  @override
  String get settingsQuickActionsEmpty => 'Brak. Wszystko jest w menu Więcej.';

  @override
  String get settingsMoreActions => 'W menu Więcej';

  @override
  String get settingsMoreActionsHelp =>
      'Wyłącz akcję, aby nie była nigdzie dostępna. Stuknij +, aby dodać ją do górnego paska.';

  @override
  String get settingsQuickActionsReset => 'Resetuj szybkie akcje';

  @override
  String settingsAddToBar(String action) {
    return 'Dodaj do górnego paska: $action';
  }

  @override
  String settingsMoveAction(String action) {
    return 'Przenieś: $action';
  }

  @override
  String settingsRemoveFromBar(String action) {
    return 'Zdejmij z górnego paska: $action';
  }

  @override
  String get settingsCopySetup => 'Kopiuj układ';

  @override
  String get settingsPasteSetup => 'Wklej układ';

  @override
  String get settingsSetupCopied => 'Skopiowano szybkie akcje';

  @override
  String get settingsSetupPasted => 'Wklejono szybkie akcje';

  @override
  String get settingsSetupPasteFailed =>
      'Schowek nie zawiera skopiowanych szybkich akcji';

  @override
  String get authMagicCodeUsed =>
      'Ten kod QR lub magiczny link wygasł. Utwórz nowy w Ustawieniach w wersji webowej.';

  @override
  String get magicLoginScan => 'Zeskanuj kod QR';

  @override
  String get magicLoginScanTitle => 'Zeskanuj kod QR magicznego logowania';

  @override
  String get magicLoginScanHint =>
      'W wersji webowej otwórz Ustawienia i stuknij Pokaż kod QR w sekcji Zaloguj się na telefonie. Potem skieruj na niego aparat.';

  @override
  String get magicLoginNotOurs =>
      'Ten kod QR nie jest magicznym logowaniem. Użyj kodu z Ustawień w wersji webowej.';

  @override
  String get magicLoginNoPermission =>
      'Anchor potrzebuje uprawnienia do aparatu, aby zeskanować kod QR';

  @override
  String get magicLoginSigningIn => 'Logowanie…';

  @override
  String get magicLoginAlreadySignedIn =>
      'Jesteś już zalogowany. Najpierw się wyloguj, aby użyć magicznego linku.';

  @override
  String liveImageConnecting(String device) {
    return 'Łączenie z: $device…';
  }

  @override
  String liveImageWaiting(String device) {
    return 'Czekanie na: $device. Otwórz tam Anchor, aby to pokazać.';
  }

  @override
  String liveImageScreenPaused(String device) {
    return '$device nie udostępnia teraz ekranu.';
  }

  @override
  String liveImageCameraPaused(String device) {
    return '$device nie może teraz pokazać aparatu.';
  }

  @override
  String get liveImageSomeDevice => 'urządzenie, które to dodało';

  @override
  String get liveImageBadge => 'Na żywo';

  @override
  String get liveImageCamera => 'Aparat na żywo';

  @override
  String get liveImageScreen => 'Ekran na żywo';

  @override
  String get liveImageSoundOn => 'Włącz dźwięk';

  @override
  String get liveImageSoundOff => 'Wyłącz dźwięk';

  @override
  String get liveImageMicMuted => 'Mikrofon wyciszony';

  @override
  String liveImageViewers(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Ogląda $count',
      many: 'Ogląda $count',
      few: 'Oglądają $count',
      one: 'Ogląda 1',
      zero: 'Nikt nie ogląda',
    );
    return '$_temp0';
  }

  @override
  String get liveImageStillKept => 'Klatka dodana do załączników';

  @override
  String get liveImageStillFailed =>
      'Nie udało się zachować klatki obrazu na żywo';

  @override
  String get liveImageCameraOff => 'Twój aparat jest wyłączony.';

  @override
  String get liveImageTurnCameraOn => 'Włącz aparat';

  @override
  String get liveImageCameraFailed => 'Nie udało się włączyć aparatu';

  @override
  String get liveImageMute => 'Wycisz mikrofon';

  @override
  String get liveImageUnmute => 'Wyłącz wyciszenie mikrofonu';

  @override
  String get addLiveCamera => 'Aparat na żywo';

  @override
  String get liveCameraTitle => 'Aparat na żywo';

  @override
  String get liveCameraSubtitle =>
      'Pokazuje aparat tego telefonu w notatce na żywo, na każdym urządzeniu, które ją otworzy, dopóki Anchor jest tu otwarty.';

  @override
  String get liveCameraFront => 'Przedni';

  @override
  String get liveCameraBack => 'Tylny';

  @override
  String get liveCameraMic => 'Mikrofon';

  @override
  String get liveCameraMicHint =>
      'Wysyła też dźwięk z tego telefonu; możesz go wyciszyć podczas transmisji.';

  @override
  String get liveCameraAdd => 'Dodaj do notatki';

  @override
  String get liveCameraNoCamera => 'Nie udało się włączyć żadnego aparatu.';

  @override
  String get flowchart => 'Schemat blokowy';

  @override
  String get slashWordsFlowchart =>
      'diagram schemat przepływ proces pola strzałki decyzja flowchart';

  @override
  String get flowchartNew => 'Nowy schemat blokowy';

  @override
  String get flowchartEdit => 'Edytuj schemat blokowy';

  @override
  String get flowchartAdd => 'Dodaj';

  @override
  String get flowchartStep => 'Krok';

  @override
  String get flowchartDecision => 'Decyzja';

  @override
  String get flowchartEnd => 'Koniec';

  @override
  String get flowchartStartOrEnd => 'Start lub koniec';

  @override
  String get flowchartWrite => 'Napisz';

  @override
  String get flowchartNextStep => 'Następny krok';

  @override
  String get flowchartFit => 'Pokaż całość';

  @override
  String get flowchartRemove => 'Usuń schemat';

  @override
  String get flowchartBoxText => 'Tekst w polu';

  @override
  String get flowchartArrowText => 'Tekst na strzałce';

  @override
  String get flowchartArrowHint => 'Etykieta, np. tak';

  @override
  String get flowchartDiscardTitle => 'Odrzucić zmiany?';

  @override
  String get flowchartDiscardMessage =>
      'Zmiany w tym schemacie blokowym nie zostały zapisane.';

  @override
  String get flowchartDiscard => 'Odrzuć';

  @override
  String get flowchartRemoveTitle => 'Usunąć schemat blokowy?';

  @override
  String get flowchartRemoveMessage =>
      'Schemat zostanie usunięty z notatki. Cofnij w notatce, aby go przywrócić.';

  @override
  String flowchartCanvas(int boxes, int arrows) {
    return 'Schemat blokowy z liczbą pól: $boxes i liczbą strzałek: $arrows. Stuknij pole, aby je wybrać, stuknij ponownie, aby pisać.';
  }

  @override
  String flowchartLabel(String name) {
    return 'Schemat blokowy: $name';
  }

  @override
  String get flowchartOpenHint => 'Otwiera schemat blokowy do edycji';

  @override
  String get pageScanTitle => 'Skanuj stronę';

  @override
  String get pageScanStraighten => 'Wyprostuj';

  @override
  String get pageScanWhole => 'Cały obraz';

  @override
  String get pageScanFinding => 'Szukanie strony…';

  @override
  String get pageScanFound => 'Przeciągnij róg, aby dopasować do strony.';

  @override
  String get pageScanNotFound =>
      'Nie znaleziono strony. Przeciągnij rogi na rogi strony.';

  @override
  String get pageScanCorner => 'Róg strony';

  @override
  String get inlinePictureStraighten => 'Wyprostuj stronę';

  @override
  String get scanTitle => 'Skan';

  @override
  String get scanNew => 'Nowy skan';

  @override
  String get scanAdd => 'Dodaj';

  @override
  String get scanDocument => 'Zeskanuj dokument';

  @override
  String get scanPage => 'Strona';

  @override
  String scanPageNumber(int number, int count) {
    return 'Strona $number z $count';
  }

  @override
  String scanPageNumberShort(int number) {
    return 'Strona $number';
  }

  @override
  String scanPages(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count strony',
      many: '$count stron',
      few: '$count strony',
      one: '1 strona',
    );
    return '$_temp0';
  }

  @override
  String get scanBrightness => 'Jasność';

  @override
  String get scanContrast => 'Kontrast';

  @override
  String get scanCleanup => 'Wyrównaj';

  @override
  String get scanThreshold => 'Tusz';

  @override
  String get scanCorners => 'Rogi';

  @override
  String get scanTurnLeft => 'Obróć w lewo';

  @override
  String get scanTurnRight => 'Obróć w prawo';

  @override
  String get scanProfileBw => 'Czarno-biały';

  @override
  String get scanProfileWhiteboard => 'Tablica';

  @override
  String get scanProfileText => 'Kolorowy tekst';

  @override
  String get scanProfileColor => 'Pełny kolor';

  @override
  String get scanLookForAll => 'Użyj dla wszystkich stron';

  @override
  String get scanMovePage => 'Przenieś stronę';

  @override
  String get scanDeletePage => 'Usuń stronę';

  @override
  String get scanNameHint => 'Nazwa pliku PDF';

  @override
  String get scanPhotoMissing =>
      'Niektórych zdjęć nie ma jeszcze na tym telefonie. Spróbuj ponownie za chwilę.';

  @override
  String get scanPdfFailed => 'Nie udało się utworzyć pliku PDF.';

  @override
  String get scanSharePdf => 'Udostępnij PDF';

  @override
  String get scanSavePdf => 'Zapisz PDF';

  @override
  String get scanMakingPdf => 'Tworzenie PDF…';

  @override
  String get scanPdfSaved => 'Zapisano PDF';

  @override
  String get scanNoPages => 'Brak stron. Zrób lub wybierz zdjęcia stron.';

  @override
  String get scanTakePhotos => 'Zrób zdjęcia';

  @override
  String get scanPdfPaper => 'Papier';

  @override
  String get scanPaperLetter => 'Letter';

  @override
  String get scanPaperFit => 'Rozmiar obrazu';

  @override
  String get scanPdfMargin => 'Margines';

  @override
  String get scanMarginNone => 'Brak';

  @override
  String scanMarginMm(int mm) {
    return '$mm mm';
  }

  @override
  String get scanPdfQuality => 'Jakość';

  @override
  String get scanQualitySmall => 'Mała';

  @override
  String get scanQualityStandard => 'Standardowa';

  @override
  String get scanQualityHigh => 'Wysoka';

  @override
  String get scanRemove => 'Usuń skan';

  @override
  String get scanOpenHint => 'Otwiera skan do zmiany';

  @override
  String get scanFromGallery => 'Z galerii';

  @override
  String get settingsServer => 'Serwer';

  @override
  String get settingsServerAddresses => 'Adresy';

  @override
  String settingsServerAddressInUse(String address) {
    return 'W użyciu: $address';
  }

  @override
  String get serverAddressesTitle => 'Adresy serwera';

  @override
  String get serverAddressesOrder => 'Sprawdzane w tej kolejności';

  @override
  String get serverAddressesHelp =>
      'Dodaj więcej adresów tego samego serwera, na przykład jego adres w domu i adres przez VPN na czas, gdy jesteś poza domem. Aplikacja sprawdza je po kolei i używa pierwszego, który odpowie. Twoje notatki i konto są takie same pod każdym adresem.';

  @override
  String get serverAddressesMain => 'Adres główny';

  @override
  String get serverAddressesInUse => 'W użyciu';

  @override
  String get serverAddressesMainInUse => 'Adres główny · W użyciu';

  @override
  String serverAddressesMoveUp(String address) {
    return 'Przesuń $address w górę';
  }

  @override
  String serverAddressesMoveDown(String address) {
    return 'Przesuń $address w dół';
  }

  @override
  String serverAddressesRemove(String address) {
    return 'Usuń $address';
  }

  @override
  String get serverAddressesAdd => 'Dodaj adres';

  @override
  String get serverAddressesAddHint => 'http://192.168.1.20:3000';

  @override
  String get serverAddressesAlreadyAdded => 'Ten adres jest już na liście';

  @override
  String get serverAddressesCheck => 'Sprawdź adresy teraz';

  @override
  String get serverAddressesChecking => 'Sprawdzanie…';

  @override
  String serverAddressesUsing(String address) {
    return 'Używany: $address';
  }

  @override
  String serverAddressesNoneAnswered(String address) {
    return 'Żaden adres nie odpowiedział. Nadal używany: $address';
  }

  @override
  String get serverAddressesNone => 'Brak połączonego serwera.';

  @override
  String get regularServerCrumb => 'Zwykły serwer Anchor';

  @override
  String get regularServerCrumbLabel =>
      'Zwykły serwer Anchor: niektóre funkcje Anchor+ są wyłączone. Pokaż które';

  @override
  String get regularServerTitle => 'Zwykły serwer Anchor';

  @override
  String regularServerTitleHost(String host) {
    return '$host to zwykły serwer Anchor';
  }

  @override
  String get regularServerMessage =>
      'Notatki, tagi, przypomnienia, udostępnianie osobom i kopie zapasowe działają jak zwykle. Własne funkcje Anchor+ wymagają serwera Anchor+, więc są wyłączone: blokowanie, zamrażanie i kopiowanie notatek, wspólna edycja na żywo, obrazy na żywo, linki publiczne, wyszukiwanie obrazów, zalogowane urządzenia oraz przeciąganie notatek we własnej kolejności.';

  @override
  String get regularServerConnect => 'Połącz';

  @override
  String magicLoginNeedsPlus(String host) {
    return '$host to zwykły serwer Anchor, który nie obsługuje logowania kodem. Zaloguj się hasłem.';
  }
}
