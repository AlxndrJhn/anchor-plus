// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String get appName => 'Anchor 笔记';

  @override
  String get commonBack => '返回';

  @override
  String get commonCancel => '取消';

  @override
  String get commonClose => '关闭';

  @override
  String get commonDone => '完成';

  @override
  String get commonMenu => '菜单';

  @override
  String get commonCloseMenu => '关闭菜单';

  @override
  String get commonShowPassword => '显示密码';

  @override
  String get commonHidePassword => '隐藏密码';

  @override
  String get commonSelectedNotes => '已选笔记';

  @override
  String get commonPlay => '播放';

  @override
  String get commonPause => '暂停';

  @override
  String commonPlayItem(String name) {
    return '播放 $name';
  }

  @override
  String commonPauseItem(String name) {
    return '暂停 $name';
  }

  @override
  String commonSwitchOn(String label) {
    return '$label，已开启';
  }

  @override
  String commonSwitchOff(String label) {
    return '$label，已关闭';
  }

  @override
  String get formOffline => '你处于离线状态。请连接网络后继续。';

  @override
  String get linkInvalid => '链接无效';

  @override
  String get linkCantOpen => '无法打开链接';

  @override
  String get densityDefault => '默认';

  @override
  String get densityCompact => '紧凑';

  @override
  String get noteFontSans => '无衬线';

  @override
  String get noteFontSerif => '衬线';

  @override
  String get noteFontMono => '等宽';

  @override
  String get textSizeSmall => '小';

  @override
  String get textSizeDefault => '默认';

  @override
  String get textSizeLarge => '大';

  @override
  String get lineSpacingTight => '紧凑';

  @override
  String get lineSpacingRelaxed => '宽松';

  @override
  String get errorOffline => '没有网络连接。';

  @override
  String get errorTimeout => '服务器响应超时。';

  @override
  String get errorCertificate => '服务器证书不受信任。';

  @override
  String get errorCancelled => '请求已取消。';

  @override
  String get errorSignInAgain => '请重新登录后继续。';

  @override
  String get errorForbidden => '你没有执行此操作的权限。';

  @override
  String get errorNotFound => '找不到该项目。';

  @override
  String get errorIncompatible => '此应用与你的服务器不兼容，请更新后继续。';

  @override
  String get errorCheckInput => '请检查你填写的信息。';

  @override
  String get errorGeneric => '出了点问题，请重试。';

  @override
  String get errorServer => '服务器出现问题，请稍后再试。';

  @override
  String get commonSave => '保存';

  @override
  String get commonSaving => '正在保存…';

  @override
  String get commonUndo => '撤销';

  @override
  String get fieldName => '姓名';

  @override
  String get fieldNameHint => '你的名字';

  @override
  String get fieldEmail => '邮箱';

  @override
  String get fieldEmailHint => 'you@example.com';

  @override
  String get fieldPassword => '密码';

  @override
  String get fieldCurrentPassword => '当前密码';

  @override
  String get fieldNewPassword => '新密码';

  @override
  String passwordHelp(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '至少 $count 个字符。',
    );
    return '$_temp0';
  }

  @override
  String get authEnterName => '请输入你的名字。';

  @override
  String get authEnterEmail => '请输入你的邮箱地址。';

  @override
  String get authEnterValidEmail => '请输入有效的邮箱地址。';

  @override
  String get authEnterPassword => '请输入你的密码。';

  @override
  String get authEnterCurrentPassword => '请输入当前密码。';

  @override
  String authPasswordTooShort(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '请至少使用 $count 个字符。',
    );
    return '$_temp0';
  }

  @override
  String get fieldTwoStepCode => '身份验证器应用中的验证码';

  @override
  String get authTwoStepCodeHelp => '手机丢了？请改为输入一个恢复码。';

  @override
  String get authEnterTwoStepCode => '请输入身份验证器应用中的验证码。';

  @override
  String get authWrongTwoStepCode => '验证码不正确。请检查你的身份验证器应用后重试。';

  @override
  String get authPasskeyOnly => '此账户使用通行密钥登录。请先在网页版登录，然后扫描“设置 › 手机登录”中的二维码。';

  @override
  String get authSecondFactorSetup =>
      '管理员要求所有人使用通行密钥或身份验证器应用登录。请先在 Anchor+ 网页版中设置其中一种，然后在这里登录。';

  @override
  String get authIncorrectCredentials => '邮箱或密码不正确。';

  @override
  String get authPasswordless => '此账户不使用密码，请改用你的登录服务商登录。';

  @override
  String get authPendingApproval => '你的账户正在等待管理员批准。';

  @override
  String authPasswordSignInOff(String provider) {
    return '邮箱和密码登录已关闭，请使用 $provider 登录。';
  }

  @override
  String authPasswordSignUpOff(String provider) {
    return '邮箱和密码注册已关闭，请使用 $provider 注册。';
  }

  @override
  String get authPasswordSignInOffHere => '此服务器已关闭邮箱和密码登录。';

  @override
  String get authPasswordSignUpOffHere => '此服务器已关闭邮箱和密码注册。';

  @override
  String get authRegistrationClosed => '此服务器不接受新账户。';

  @override
  String get authEmailTaken => '该邮箱已注册账户。';

  @override
  String get authWrongCurrentPassword => '当前密码不正确。';

  @override
  String get authSamePassword => '新密码必须与当前密码不同。';

  @override
  String get authUnreachable => '无法连接你的服务器，请检查网络后重试。';

  @override
  String get authProviderNotSetUp => '此服务器未设置登录服务商。';

  @override
  String get authProviderFailed => '无法通过你的服务商登录，请重试。';

  @override
  String authProviderFailedWith(String detail) {
    return '无法通过你的服务商登录：$detail';
  }

  @override
  String get authSignIn => '登录';

  @override
  String get authSigningIn => '正在登录…';

  @override
  String authContinueWith(String provider) {
    return '使用 $provider 继续';
  }

  @override
  String authOpeningProvider(String provider) {
    return '正在打开 $provider…';
  }

  @override
  String get authWelcomeBack => '欢迎回来';

  @override
  String get authSignInToAnchor => '登录以继续使用 Anchor。';

  @override
  String authSignInTo(String server) {
    return '登录 $server';
  }

  @override
  String get authOfflineSignIn => '你处于离线状态，请连接网络后登录。';

  @override
  String get authNewToAnchor => '第一次使用 Anchor？';

  @override
  String get authNoAccountNeeded => '只是记笔记？';

  @override
  String get authUseWithoutServer => '不使用服务器';

  @override
  String get authCreateAnAccount => '创建账户';

  @override
  String get authOr => '或';

  @override
  String get authCreateAccount => '创建账户';

  @override
  String get authCreatingAccount => '正在创建账户…';

  @override
  String get authCreateYourAccount => '创建你的账户';

  @override
  String get authApprovalNeeded => '新账户需要管理员批准后才能登录。';

  @override
  String get authRegisterSubtitle => '开始记录你的想法。';

  @override
  String get authAlreadyHaveAccount => '已有账户？';

  @override
  String authWelcomeName(String name) {
    return '欢迎使用 Anchor，$name';
  }

  @override
  String get authWaitingTitle => '等待批准';

  @override
  String get authWaitingMessage => '管理员批准你的账户后即可登录。';

  @override
  String get authBackToSignIn => '返回登录';

  @override
  String get passwordTitle => '密码';

  @override
  String get passwordChange => '修改密码';

  @override
  String get passwordChanging => '正在修改…';

  @override
  String get passwordChanged => '密码已修改';

  @override
  String get passwordOffline => '你处于离线状态，请连接网络后修改密码。';

  @override
  String get profileTitle => '个人资料';

  @override
  String get profileSaved => '个人资料已保存';

  @override
  String get profileOffline => '你处于离线状态，请连接网络后修改个人资料。';

  @override
  String get profilePhoto => '头像';

  @override
  String get profilePhotoVisible => '与你共享笔记的人可以看到。';

  @override
  String get profileTakePhoto => '拍照';

  @override
  String get profileChoosePhoto => '选择照片';

  @override
  String get profileRemovePhoto => '移除照片';

  @override
  String get profilePhotoUpdated => '照片已更新';

  @override
  String get profilePhotoUpdateFailed => '无法更新你的照片';

  @override
  String get profilePhotoRemoved => '照片已移除';

  @override
  String get profilePhotoRemoveFailed => '无法移除你的照片';

  @override
  String get profileEmailAdminOnly => '只有管理员可以修改你的邮箱。';

  @override
  String get profileChangePhoto => '更换头像';

  @override
  String get commonContinue => '继续';

  @override
  String commonExpandedItem(String label) {
    return '$label，已展开';
  }

  @override
  String commonCollapsedItem(String label) {
    return '$label，已折叠';
  }

  @override
  String get serverTitle => '服务器';

  @override
  String get serverWelcome => '欢迎使用 Anchor+';

  @override
  String get serverSubtitle => '输入你的服务器地址以同步笔记。';

  @override
  String get serverAddress => '服务器地址';

  @override
  String get serverAddressHint => 'notes.example.com';

  @override
  String get serverConnecting => '正在连接…';

  @override
  String get serverAdvanced => '高级';

  @override
  String get serverSelfSigned => '允许自签名证书';

  @override
  String get serverSelfSignedWarning => '仅用于你自行管理的服务器，Anchor 无法验证其身份。';

  @override
  String get serverHeaders => '额外请求头';

  @override
  String get serverHeadersHint => 'CF-Access-Client-Id: …';

  @override
  String get serverHeadersHelp =>
      '用于服务器前置的代理，例如 Cloudflare Access。每行一个，格式为 Name: value。仅发送到此服务器。';

  @override
  String serverHeaderNotNameValue(int line) {
    return '第 $line 行需要名称和值，格式为 Name: value。';
  }

  @override
  String serverHeaderBadName(int line) {
    return '第 $line 行：名称只能包含字母、数字和 - _ .';
  }

  @override
  String serverHeaderBadValue(int line) {
    return '第 $line 行：值包含请求头无法携带的字符。';
  }

  @override
  String serverHeaderReserved(int line) {
    return '第 $line 行：此请求头由 Anchor 自行设置。';
  }

  @override
  String serverHeaderRepeated(int line) {
    return '第 $line 行与上方的名称重复。';
  }

  @override
  String get serverSelfHosted => '这台手机上的笔记会移入你的账户。';

  @override
  String get serverEnterAddress => '请输入服务器地址。';

  @override
  String get serverEnterValidAddress => '请输入有效的服务器地址。';

  @override
  String get serverConnectFailed => '无法连接到服务器，请重试。';

  @override
  String serverNotAnchor(String host) {
    return '$host 不是 Anchor 服务器，请检查地址。';
  }

  @override
  String serverUntrusted(String host) {
    return '无法验证 $host 的证书。如果是自签名证书，请在“高级”中开启“允许自签名证书”。';
  }

  @override
  String serverUnreachableNoScheme(String host) {
    return '无法连接 $host。请检查地址；如果你的服务器不使用 https，请在地址前加上 http://。';
  }

  @override
  String serverUnreachable(String host) {
    return '无法连接 $host，请检查地址和网络连接。';
  }

  @override
  String get serverConnectAnyway => '仍然连接';

  @override
  String serverLinkLabel(String host) {
    return '服务器 $host。更换服务器';
  }

  @override
  String get commonMore => '更多';

  @override
  String get commonCopy => '复制';

  @override
  String get commonSelect => '选择';

  @override
  String get commonSelectAll => '全选';

  @override
  String get commonDeselectAll => '取消全选';

  @override
  String get commonStopSelecting => '退出选择';

  @override
  String commonSelectedCount(int count) {
    return '已选择 $count 项';
  }

  @override
  String get settingsTitle => '设置';

  @override
  String settingsProfileCard(String name, String email) {
    return '$name，$email。个人资料';
  }

  @override
  String get settingsAppearance => '外观';

  @override
  String get settingsLanguage => '语言';

  @override
  String get settingsLanguageSystem => '跟随手机语言';

  @override
  String get settingsDensity => '密度';

  @override
  String get settingsDensityHelp => '紧凑模式可在屏幕上显示更多笔记。';

  @override
  String get settingsAnimations => '动画';

  @override
  String get settingsAnimationsHelp => '“快速”会让笔记、面板和菜单的打开与关闭只用一半时间。';

  @override
  String get animationsNormal => '正常';

  @override
  String get animationsFast => '快速';

  @override
  String get settingsColorScheme => '配色方案';

  @override
  String get settingsMaterialYou => 'Material You';

  @override
  String get settingsMaterialYouHelp => '使用壁纸的颜色，以及 Material 的形状和涟漪效果。将替代配色方案。';

  @override
  String get colorSchemeAnchor => 'Anchor+';

  @override
  String get settingsCustomTheme => '自定义主题';

  @override
  String get settingsCustomThemeOff => '无';

  @override
  String get settingsCustomThemeOn => '开启';

  @override
  String get customThemeHelp =>
      '以 JSON 粘贴主题：为浅色、深色或两者设置颜色，并可设置字体、圆角、阴影和纹理的样式。未提供的部分将保留配色方案的颜色和 Anchor 的外观。仅保存在此设备上；同样的 JSON 也适用于网页版。';

  @override
  String get customThemeJsonLabel => '主题 JSON';

  @override
  String get customThemeApply => '应用';

  @override
  String get customThemeReset => '重置';

  @override
  String get customThemeCopy => '将当前主题复制为 JSON';

  @override
  String get customThemeApplied => '已应用自定义主题';

  @override
  String customThemeAppliedNamed(String name) {
    return '已应用自定义主题“$name”';
  }

  @override
  String get customThemeRemoved => '已移除自定义主题';

  @override
  String get customThemeCopied => '已将当前主题复制为 JSON';

  @override
  String customThemeNotJson(String detail) {
    return '不是有效的 JSON：$detail';
  }

  @override
  String get customThemeNotObject =>
      '主题必须是包含 \"light\" 或 \"dark\" 颜色或 \"style\" 的 JSON 对象';

  @override
  String customThemeUnknownKey(String key, String expected) {
    return '$key：未知的键；应为以下之一：$expected';
  }

  @override
  String customThemeUnknownKeyGuess(String key, String guess, String expected) {
    return '$key：未知的键（你是不是想输入 \"$guess\"？）；应为以下之一：$expected';
  }

  @override
  String get customThemeNameNotText => 'name：必须是字符串';

  @override
  String customThemeModeNotObject(String mode) {
    return '$mode：必须是颜色对象';
  }

  @override
  String customThemeNotAColor(String key, String value) {
    return '$key：$value 不是颜色；请使用 #rgb、#rrggbb 或 #rrggbbaa';
  }

  @override
  String customThemeNotALineSpacing(String value) {
    return 'lineSpacing：$value 不是 \"tight\"、\"default\" 或 \"relaxed\" 之一';
  }

  @override
  String get customThemeNoMode => '请至少提供 \"light\"、\"dark\" 或 \"style\" 之一';

  @override
  String get customThemeStyleNotObject => 'style：必须是对象';

  @override
  String customThemeBadStyleValue(String key, String value, String expected) {
    return '$key：$value 不是以下之一：$expected';
  }

  @override
  String get customThemeRadiusNotValid =>
      'style.radius：必须是 0 到 40 之间的数字，或四个 [x, y] 圆角';

  @override
  String customThemePatternNotObject(String key) {
    return '$key：必须是包含 shape、size、thickness、color 和 opacity 的对象';
  }

  @override
  String customThemeNotNumber(String key, String min, String max) {
    return '$key：必须是 $min 到 $max 之间的数字';
  }

  @override
  String customThemeNotStyleColor(String key, String value) {
    return '$key：$value 不是颜色或颜色键；请使用 #rgb、#rrggbb、#rrggbbaa 或 foreground 等键';
  }

  @override
  String get customThemeShadowNotValid => 'style.shadow：必须是 \"none\" 或对象';

  @override
  String get settingsTheme => '主题';

  @override
  String get themeLight => '浅色';

  @override
  String get themeDark => '深色';

  @override
  String get themeAutomatic => '自动';

  @override
  String get settingsEditor => '编辑器';

  @override
  String get settingsFont => '字体';

  @override
  String get settingsReminders => '提醒';

  @override
  String get settingsMorning => '早上';

  @override
  String get settingsAfternoon => '下午';

  @override
  String get settingsEvening => '傍晚';

  @override
  String get settingsNight => '晚上';

  @override
  String get settingsWeekStart => '每周开始于';

  @override
  String get settingsTextSize => '文字大小';

  @override
  String get settingsLineSpacing => '行距';

  @override
  String get settingsLineSpacingByTheme =>
      '由你的自定义主题设置。从中移除 \"lineSpacing\" 后即可在此选择。';

  @override
  String get settingsMoveChecked => '将已勾选项目移至底部';

  @override
  String get settingsMoveCheckedHelp => '已勾选的条目会移到未勾选的条目下方。';

  @override
  String get settingsBurnDeleted => '焚烧已删除的笔记';

  @override
  String get settingsBurnDeletedHelp => '删除的笔记会在原处燃烧消失。关闭时则直接消失。';

  @override
  String get settingsStrikeSparks => '卡片碰撞时迸出火花';

  @override
  String get settingsStrikeSparksHelp => '删除后，其余卡片移到新位置相撞时会迸出火花。';

  @override
  String get settingsPreviewTitle => '里斯本周末';

  @override
  String get settingsPreviewText => '轻装出行。山路陡峭，电车到九点就挤满了。';

  @override
  String get settingsAccount => '账户';

  @override
  String get settingsSync => '同步';

  @override
  String get settingsConnectServer => '连接服务器';

  @override
  String get settingsConnectServerHelp =>
      '通过你自己的 Anchor 服务器同步和共享笔记。登录后，这台手机上的笔记会移入你的账户。';

  @override
  String get settingsPassword => '密码';

  @override
  String settingsPasswordManaged(String provider) {
    return '你的密码由 $provider 管理。';
  }

  @override
  String get settingsPasswordManagedElsewhere => '你的密码由登录服务商管理。';

  @override
  String get settingsSignOut => '退出登录';

  @override
  String get settingsSigningOut => '正在退出…';

  @override
  String get settingsSignOutTitle => '退出登录？';

  @override
  String settingsSignOutMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 项更改尚未同步，它们会留在这台手机上，登录后再次同步。',
    );
    return '$_temp0';
  }

  @override
  String get settingsDevices => '设备';

  @override
  String get devicesTitle => '设备';

  @override
  String get devicesThisPhone => '这台手机';

  @override
  String devicesSignedIn(String date) {
    return '登录于 $date';
  }

  @override
  String devicesSignedInLastActive(String date, String active) {
    return '登录于 $date，最近活动 $active';
  }

  @override
  String devicesSignedOut(String device) {
    return '已退出 $device';
  }

  @override
  String devicesSignOutFailed(String device) {
    return '无法退出 $device';
  }

  @override
  String get devicesLoadFailed => '无法加载你的设备';

  @override
  String get devicesLoadFailedHelp => '请检查网络连接后重试。';

  @override
  String get settingsSignOutOthers => '退出其他设备';

  @override
  String get settingsSignOutOthersTitle => '退出你的其他设备？';

  @override
  String get settingsSignOutOthersMessage =>
      '15 分钟内，其他所有手机、浏览器和电脑都会被要求重新登录。这台手机保持登录。';

  @override
  String get settingsSignOutOthersConfirm => '退出其他设备';

  @override
  String get settingsSignOutOthersDone => '已退出你的其他设备';

  @override
  String get settingsSignOutOthersFailed => '无法退出你的其他设备';

  @override
  String get settingsUpdates => '更新';

  @override
  String get settingsCheckForUpdates => '检查更新';

  @override
  String get settingsUpdateChecking => '正在检查…';

  @override
  String settingsUpdateBuild(int build, String repository) {
    return '这是 $repository 的第 $build 版构建';
  }

  @override
  String get settingsCheckAutomatically => '自动检查';

  @override
  String get settingsCheckAutomaticallyHelp => 'Anchor 启动时检查新版本';

  @override
  String get settingsPreviewReleases => '接收预览版';

  @override
  String get settingsPreviewReleasesHelp => '候选版本，需你的服务器运行 :preview 镜像';

  @override
  String get settingsSearch => '搜索';

  @override
  String get settingsPictureSearch => '按图片内容查找';

  @override
  String get settingsPictureSearchHelp =>
      '搜索“海边日落”或“收据”，即可找到含有此类图片的笔记，支持大多数语言。你的服务器会下载一次模型（约 380 MB）并查看每张图片；所有内容都不会离开你的服务器。';

  @override
  String pictureSearchDownloading(int percent) {
    return '正在下载图片模型… $percent%';
  }

  @override
  String get pictureSearchFailed => '无法下载图片模型。请关闭后重新开启以重试。';

  @override
  String pictureSearchIndexing(int indexed, int total) {
    return '正在查看你的图片… $indexed/$total';
  }

  @override
  String pictureSearchReady(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '全部 $count 张图片已可搜索。',
      one: '你的图片已可搜索。',
      zero: '你添加的图片将可被搜索。',
    );
    return '$_temp0';
  }

  @override
  String get pictureSearchChangeFailed => '无法更改图片搜索';

  @override
  String get updateAvailable => '有可用更新';

  @override
  String get updateSeeWhatsNew => '查看新功能';

  @override
  String get updateWhatsNew => '新功能';

  @override
  String updateMoreChanges(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '还有 $count 项',
      one: '还有 1 项',
    );
    return '$_temp0';
  }

  @override
  String get updateInstall => '下载并安装';

  @override
  String updateInstallSize(int megabytes) {
    return '下载并安装（$megabytes MB）';
  }

  @override
  String updateDownloading(int percent) {
    return '正在下载… $percent%';
  }

  @override
  String get updateViewRelease => '在 GitHub 上查看此版本';

  @override
  String get updateCheckFailed => '无法检查更新';

  @override
  String get updateDownloadFailed => '无法下载更新';

  @override
  String get updateUpToDate => 'Anchor 已是最新版本';

  @override
  String get settingsHelp => '帮助';

  @override
  String get settingsLogs => '日志';

  @override
  String get settingsLogsHelp => '用于排查问题的活动详情';

  @override
  String get settingsPrivacyPolicy => '隐私政策';

  @override
  String get settingsPrivacyPolicyHelp => '应用在这台手机上保存及发送到你服务器的内容';

  @override
  String get settingsSourceCode => '源代码';

  @override
  String get settingsSourceCodeHelp => '基于 GNU AGPL v3 的自由软件，不提供任何担保';

  @override
  String get settingsLicense => '许可证';

  @override
  String get settingsLicenseHelp => '© Anchor 和 Anchor+ 贡献者';

  @override
  String get settingsOffline => '离线。更改已保存在这台手机上。';

  @override
  String get settingsLocalOnly => '笔记仅保存在这台手机上。';

  @override
  String settingsSyncPaused(String reason) {
    return '同步已暂停。$reason';
  }

  @override
  String settingsCantReach(String host) {
    return '无法连接 $host';
  }

  @override
  String settingsConnectedTo(String host) {
    return '已连接到 $host';
  }

  @override
  String settingsConnectedToVersion(String host, String version) {
    return '已连接到 $host · 服务器 $version';
  }

  @override
  String settingsAppVersion(String version) {
    return 'Anchor $version';
  }

  @override
  String get settingsAppNameShort => 'Anchor+';

  @override
  String get settingsTagline => '你的想法，安全保存。';

  @override
  String get logsTitle => '日志';

  @override
  String get logsMenuHelp => '复制和保存也会包含更早的会话。';

  @override
  String get logsCopyAll => '全部复制';

  @override
  String get logsSaveToFile => '保存到文件';

  @override
  String get logsClear => '清除日志';

  @override
  String get logsCopiedAll => '日志已复制，包括更早的会话';

  @override
  String get logsCopiedNewest => '已复制最新的日志。如需全部日志，请保存到文件。';

  @override
  String get logsClearTitle => '清除日志？';

  @override
  String get logsClearMessage => '这台手机上的所有日志都将被删除，此操作无法撤销。';

  @override
  String get logsCleared => '日志已清除';

  @override
  String get logsSaveDialog => '保存日志';

  @override
  String logsSaved(String name) {
    return '已保存 $name';
  }

  @override
  String get logsSaveFailed => '无法保存日志';

  @override
  String logsCopied(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已复制 $count 条日志',
    );
    return '$_temp0';
  }

  @override
  String get logsSelectTitle => '选择日志';

  @override
  String get logsSearch => '搜索日志';

  @override
  String get logsSelected => '已选日志';

  @override
  String get logsLevel => '日志级别';

  @override
  String get logsAll => '全部';

  @override
  String get logsErrors => '错误';

  @override
  String get logsWarnings => '警告';

  @override
  String get logsInfo => '信息';

  @override
  String get logsDebug => '调试';

  @override
  String get logsSessionNote => '仅显示本次会话。复制和保存也会包含更早的会话。';

  @override
  String get logsNoMatches => '没有匹配的日志';

  @override
  String get logsNoMatchesHelp => '换个关键词，或显示所有级别。';

  @override
  String get logsEmpty => '还没有日志';

  @override
  String get logsEmptyHelp => '本次会话的活动会显示在这里。';

  @override
  String get logLevelError => '错误';

  @override
  String get logLevelWarning => '警告';

  @override
  String get logLevelInfo => '信息';

  @override
  String get logLevelDebug => '调试';

  @override
  String get commonToday => '今天';

  @override
  String get commonTomorrow => '明天';

  @override
  String get commonNotNow => '暂不';

  @override
  String get commonLater => '以后';

  @override
  String get commonOk => '好';

  @override
  String get commonOpenSettings => '打开设置';

  @override
  String get reminderTitle => '提醒';

  @override
  String get reminderSheetSubtitle => '你会在这台手机上收到通知。';

  @override
  String reminderDayTime(String day, String time) {
    return '$day $time';
  }

  @override
  String reminderWithRepeat(String when, String repeat) {
    return '$when · $repeat';
  }

  @override
  String reminderSpoken(String when) {
    return '提醒：$when';
  }

  @override
  String reminderSpokenLate(String when) {
    return '已过期的提醒：$when';
  }

  @override
  String get reminderLaterToday => '今天晚些时候';

  @override
  String get reminderThisAfternoon => '今天下午';

  @override
  String get reminderTonight => '今晚';

  @override
  String get reminderTomorrowNight => '明天晚上';

  @override
  String get reminderTomorrowMorning => '明天早上';

  @override
  String get reminderTomorrowAfternoon => '明天下午';

  @override
  String get reminderTomorrowEvening => '明天傍晚';

  @override
  String get reminderThisEvening => '今天傍晚';

  @override
  String get reminderNextWeek => '下周';

  @override
  String get reminderWeekend => '周末';

  @override
  String get reminderNextMonth => '下个月';

  @override
  String get reminderNone => '无提醒';

  @override
  String get reminderPickTime => '选择日期和时间';

  @override
  String get reminderTimePassed => '此时间已过';

  @override
  String reminderInMinutes(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 分钟后',
    );
    return '$_temp0';
  }

  @override
  String reminderInHours(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 小时后',
    );
    return '$_temp0';
  }

  @override
  String reminderInDays(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 天后',
    );
    return '$_temp0';
  }

  @override
  String get reminderRepeatsDaily => '每天重复';

  @override
  String reminderRepeatsWeekly(String weekday) {
    return '每$weekday重复';
  }

  @override
  String reminderRepeatsMonthly(int day) {
    return '每月 $day 日重复';
  }

  @override
  String reminderRepeatsMonthlyEnd(int day) {
    return '每月 $day 日或月末重复';
  }

  @override
  String reminderRepeatsYearly(String date) {
    return '每年 $date 重复';
  }

  @override
  String get repeatOnce => '一次';

  @override
  String get repeatDaily => '每天';

  @override
  String get repeatWeekly => '每周';

  @override
  String get repeatMonthly => '每月';

  @override
  String get repeatYearly => '每年';

  @override
  String get reminderWhen => '时间';

  @override
  String get reminderPickDate => '选择日期';

  @override
  String get reminderDate => '日期';

  @override
  String get reminderTime => '时间';

  @override
  String get reminderRepeat => '重复';

  @override
  String get reminderRemove => '移除';

  @override
  String get reminderSetFailed => '无法设置提醒';

  @override
  String get reminderNotifyTitle => '允许通知？';

  @override
  String get reminderNotifyMessage => 'Anchor 需要通知权限，你的提醒才能在这台手机上响起。';

  @override
  String get reminderExactTitle => '允许精确闹钟？';

  @override
  String get reminderExactMessage => 'Android 可能会为省电而延迟提醒。请允许精确闹钟，让提醒准时响起。';

  @override
  String get reminderNotificationsOff => '通知已关闭，请在手机设置中开启。';

  @override
  String get monthPrevious => '上个月';

  @override
  String get monthNext => '下个月';

  @override
  String get reminderChannelName => '提醒';

  @override
  String get reminderChannelDescription => '你在笔记中设置的提醒';

  @override
  String get reminderDone => '完成';

  @override
  String notesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 条笔记',
    );
    return '$_temp0';
  }

  @override
  String get tagsTitle => '标签';

  @override
  String get tagNotesTitle => '给笔记打标签';

  @override
  String get tagSaveFailed => '无法保存标签';

  @override
  String get tagUpdateFailed => '无法更新标签';

  @override
  String tagNameTaken(String name) {
    return '名为“$name”的标签已存在。';
  }

  @override
  String tagCreateNamed(String name) {
    return '创建“$name”';
  }

  @override
  String tagAdded(String tag) {
    return '$tag，已添加';
  }

  @override
  String tagNotAdded(String tag) {
    return '$tag，未添加';
  }

  @override
  String tagAddedToSome(String tag) {
    return '$tag，已添加到部分笔记';
  }

  @override
  String get tagSearchOrCreate => '搜索或创建标签';

  @override
  String get tagsEmpty => '还没有标签。输入名称即可创建。';

  @override
  String tagSheetLabel(String name) {
    return '标签 $name';
  }

  @override
  String get tagColor => '颜色';

  @override
  String get tagRename => '重命名标签';

  @override
  String get tagDelete => '删除标签';

  @override
  String tagDeleteTitle(String name) {
    return '删除标签“$name”？';
  }

  @override
  String tagDeleteMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '该标签将从 $count 条笔记中移除，笔记本身不会被删除。',
    );
    return '$_temp0';
  }

  @override
  String get tagDeleteUnused => '此标签未用于任何笔记。';

  @override
  String tagDeleted(String name) {
    return '标签“$name”已删除';
  }

  @override
  String get tagNew => '新建标签';

  @override
  String tagMove(String name) {
    return '移动 $name';
  }

  @override
  String get tagOptions => '标签选项';

  @override
  String get tagNamePreview => '标签名';

  @override
  String get tagNameHint => '标签名称';

  @override
  String get tagCreate => '创建标签';

  @override
  String get tagRenameAction => '重命名';

  @override
  String get colorRed => '红色';

  @override
  String get colorPink => '粉色';

  @override
  String get colorPurple => '紫色';

  @override
  String get colorDeepPurple => '深紫色';

  @override
  String get colorIndigo => '靛蓝色';

  @override
  String get colorBlue => '蓝色';

  @override
  String get colorLightBlue => '浅蓝色';

  @override
  String get colorCyan => '青色';

  @override
  String get colorTeal => '蓝绿色';

  @override
  String get colorGreen => '绿色';

  @override
  String get colorLightGreen => '浅绿色';

  @override
  String get colorLime => '黄绿色';

  @override
  String get colorAmber => '琥珀色';

  @override
  String get colorOrange => '橙色';

  @override
  String get colorDeepOrange => '深橙色';

  @override
  String get colorBrown => '棕色';

  @override
  String get colorBlueGrey => '蓝灰色';

  @override
  String get colorYellow => '黄色';

  @override
  String get syncSignedOutLead => '已退出登录。';

  @override
  String get syncSignedOutText => '请重新登录以同步笔记。';

  @override
  String get syncSignInAgainTitle => '重新登录';

  @override
  String get syncSignInAgainMessage => '你的笔记会留在这台手机上，登录后即可同步。';

  @override
  String get syncServerOutdatedLead => '请更新服务器。';

  @override
  String get syncServerOutdatedText => '服务器版本太旧，无法与此应用同步。';

  @override
  String get syncServerOutdatedTitle => '更新服务器';

  @override
  String get syncServerOutdatedMessage =>
      '你的 Anchor 服务器版本太旧，无法与此应用同步。请更新服务器后继续。';

  @override
  String get syncAppOutdatedLead => '请更新 Anchor。';

  @override
  String get syncAppOutdatedText => '此应用版本太旧，无法与你的服务器同步。';

  @override
  String get syncAppOutdatedTitle => '更新 Anchor';

  @override
  String get syncAppOutdatedMessage => '此应用版本太旧，无法与你的 Anchor 服务器同步。请更新应用后继续。';

  @override
  String syncPausedMessage(String reason) {
    return '$reason 在此期间，你的笔记会留在这台手机上。';
  }

  @override
  String get reminderAdd => '添加提醒';

  @override
  String get commonYesterday => '昨天';

  @override
  String peopleCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 人',
    );
    return '$_temp0';
  }

  @override
  String wordsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 个词',
    );
    return '$_temp0';
  }

  @override
  String get notesBackToTop => '回到顶部';

  @override
  String get notesSelectTitle => '选择笔记';

  @override
  String get noteUntitled => '无标题';

  @override
  String namesTwo(String first, String second) {
    return '$first 和 $second';
  }

  @override
  String namesMore(String first, String second, int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$first、$second 以及另外 $count 人',
    );
    return '$_temp0';
  }

  @override
  String get shareOnlyYou => '只有你可以看到这条笔记。';

  @override
  String get shareLoadFailed => '无法加载有访问权限的人。';

  @override
  String shareSharedWith(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已共享给 $count 人。',
    );
    return '$_temp0';
  }

  @override
  String shareSharedWithOffline(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已共享给 $count 人。连接网络后可查看具体是谁。',
    );
    return '$_temp0';
  }

  @override
  String shareSharedWithNames(String names) {
    return '已共享给 $names';
  }

  @override
  String shareSharedWithCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已共享给 $count 人',
    );
    return '$_temp0';
  }

  @override
  String get shareCanView => '可查看';

  @override
  String get shareCanEdit => '可编辑';

  @override
  String get shareLink => '链接';

  @override
  String get shareLinkAnyone => '任何拥有链接的人';

  @override
  String get shareLinkOff => '关闭';

  @override
  String get shareLinkOffHint => '只有你添加的人可以打开';

  @override
  String get shareLinkViewHint => '任何拥有链接的人都可以阅读，无需账户';

  @override
  String get shareLinkEditHint => '任何拥有链接的人都可以修改标题和正文';

  @override
  String get shareLinkAccess => '链接访问权限';

  @override
  String shareLinkChangeAccess(String access) {
    return '$access。更改链接访问权限';
  }

  @override
  String get shareLinkCopy => '复制链接';

  @override
  String get shareLinkShareIt => '发送链接';

  @override
  String get shareLinkCopied => '链接已复制';

  @override
  String get shareLinkMade => '链接已创建并复制';

  @override
  String get shareLinkTurnedOff => '链接已关闭，无法再打开此笔记';

  @override
  String get shareLinkNowCanView => '任何拥有链接的人现在都可以查看';

  @override
  String get shareLinkNowCanEdit => '任何拥有链接的人现在都可以编辑';

  @override
  String get shareLinkFailed => '无法更改链接';

  @override
  String get shareLinkLoadFailed => '无法加载此笔记的链接。';

  @override
  String get shareLinkOpens => '任何拥有链接的人都可以打开。';

  @override
  String dayTodayAt(String time) {
    return '今天 $time';
  }

  @override
  String dayYesterdayAt(String time) {
    return '昨天 $time';
  }

  @override
  String dayOnAt(String date, String time) {
    return '$date $time';
  }

  @override
  String get editedToday => '今天编辑';

  @override
  String get editedYesterday => '昨天编辑';

  @override
  String editedOn(String date) {
    return '$date编辑';
  }

  @override
  String get editedJustNow => '刚刚编辑';

  @override
  String editedMinutesAgo(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 分钟前编辑',
    );
    return '$_temp0';
  }

  @override
  String editedTodayAt(String time) {
    return '今天 $time 编辑';
  }

  @override
  String editedYesterdayAt(String time) {
    return '昨天 $time 编辑';
  }

  @override
  String editedOnAt(String date, String time) {
    return '$date $time 编辑';
  }

  @override
  String trashRule(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '这里的笔记将在 $count 天后删除。',
    );
    return '$_temp0';
  }

  @override
  String trashEmpty(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '你删除的笔记会在这里保留 $count 天。',
    );
    return '$_temp0';
  }

  @override
  String trashDaysLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '剩余 $count 天',
    );
    return '$_temp0';
  }

  @override
  String trashDeletesOn(String date) {
    return '将于 $date 删除。';
  }

  @override
  String trashDeletesAfter(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '将在 $count 天后删除。',
    );
    return '$_temp0';
  }

  @override
  String historyKept(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '笔记每次更改都会保存一个版本，保留 $count 天。',
    );
    return '$_temp0';
  }

  @override
  String historyLimit(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '超过 $count 天的编辑记录会被移除。',
    );
    return '$_temp0';
  }

  @override
  String get historyEarlier => '较早版本';

  @override
  String get historyNotSaved => '未保存';

  @override
  String get historyBeforeRestore => '恢复前';

  @override
  String get historySomeone => '某人';

  @override
  String get historyYou => '你';

  @override
  String get navNotes => '笔记';

  @override
  String get navArchive => '归档';

  @override
  String get navTrash => '废纸篓';

  @override
  String drawerAccount(String name) {
    return '$name，设置';
  }

  @override
  String shareNowCanView(String person) {
    return '$person 现在可以查看';
  }

  @override
  String shareNowCanEdit(String person) {
    return '$person 现在可以编辑';
  }

  @override
  String get revisionComparedCurrent => '与当前版本比较';

  @override
  String revisionComparedTodayAt(String time) {
    return '与今天 $time 的版本比较';
  }

  @override
  String revisionComparedYesterdayAt(String time) {
    return '与昨天 $time 的版本比较';
  }

  @override
  String revisionComparedOnAt(String date, String time) {
    return '与 $date $time 的版本比较';
  }

  @override
  String get listArchiveLine => '已从笔记中隐藏';

  @override
  String listTrashLine(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 天后删除',
    );
    return '$_temp0';
  }

  @override
  String get listOfflineSaved => '离线 · 更改已保存在这台手机上';

  @override
  String listOfflineChanges(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '离线 · $count 项更改待同步',
    );
    return '$_temp0';
  }

  @override
  String get listSyncFailed => '同步失败';

  @override
  String listTitleMenu(String title) {
    return '$title，打开菜单';
  }

  @override
  String get searchNotes => '搜索笔记';

  @override
  String get searchArchive => '搜索归档';

  @override
  String get searchTrash => '搜索废纸篓';

  @override
  String get actionTag => '标签';

  @override
  String get actionPin => '置顶';

  @override
  String get actionUnpin => '取消置顶';

  @override
  String get actionColor => '颜色';

  @override
  String get actionSend => '发送';

  @override
  String get actionMakeCopy => '创建副本';

  @override
  String get actionPrint => '打印';

  @override
  String get notePrintEmpty => '还没有可打印的内容';

  @override
  String get notePrintLocked => '此笔记已锁定。';

  @override
  String get notePrintFailed => '无法打印';

  @override
  String get noteSendEmpty => '还没有可发送的内容';

  @override
  String get noteCopyMade => '这是你的副本';

  @override
  String get noteCopyFailed => '无法创建副本，需要连接服务器。';

  @override
  String notesColorChanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已更改 $count 条笔记的颜色',
      one: '已更改 1 条笔记的颜色',
    );
    return '$_temp0';
  }

  @override
  String notesColorChangedExcept(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '颜色已更改。$count 条仅供你查看的共享笔记保持不变',
      one: '颜色已更改。1 条仅供你查看的共享笔记保持不变',
    );
    return '$_temp0';
  }

  @override
  String notesColorUnchanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '这些笔记仅共享给你查看，无法更改颜色',
      one: '此笔记仅共享给你查看，无法更改颜色',
    );
    return '$_temp0';
  }

  @override
  String get actionShare => '共享';

  @override
  String get actionHistory => '版本历史';

  @override
  String get actionUncheckAll => '取消全部勾选';

  @override
  String get actionSortByName => '按 A 到 Z 排序';

  @override
  String get actionDeleteChecked => '删除已勾选项目';

  @override
  String get actionShowCheckboxes => '显示复选框';

  @override
  String get actionHideCheckboxes => '隐藏复选框';

  @override
  String get actionArchive => '归档';

  @override
  String get actionUnarchive => '取消归档';

  @override
  String get actionDelete => '删除';

  @override
  String get actionRemove => '移除';

  @override
  String get actionRestore => '恢复';

  @override
  String get actionDeletePermanently => '永久删除';

  @override
  String notesPinned(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已置顶 $count 条笔记',
    );
    return '$_temp0';
  }

  @override
  String notesUnpinned(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已取消置顶 $count 条笔记',
    );
    return '$_temp0';
  }

  @override
  String notesArchived(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已归档 $count 条笔记',
    );
    return '$_temp0';
  }

  @override
  String notesUnarchived(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已取消归档 $count 条笔记',
    );
    return '$_temp0';
  }

  @override
  String itemsUnchecked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已取消勾选 $count 个项目',
    );
    return '$_temp0';
  }

  @override
  String checkboxesShown(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已添加 $count 个复选框',
      one: '已添加复选框',
    );
    return '$_temp0';
  }

  @override
  String checkboxesHidden(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已移除 $count 个复选框',
      one: '已移除复选框',
    );
    return '$_temp0';
  }

  @override
  String itemsSortedByName(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已按 A 到 Z 排序 $count 个项目',
      one: '已按 A 到 Z 排序项目',
    );
    return '$_temp0';
  }

  @override
  String get itemsAlreadySorted => '已经是 A 到 Z 的顺序';

  @override
  String checkedItemsDeleted(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已删除 $count 个已勾选项目',
    );
    return '$_temp0';
  }

  @override
  String notesRestored(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已恢复 $count 条笔记',
    );
    return '$_temp0';
  }

  @override
  String get noteRestoredFollow => '前往查看';

  @override
  String notesDeletedForever(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已永久删除 $count 条笔记',
    );
    return '$_temp0';
  }

  @override
  String notesMovedToTrash(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已将 $count 条笔记移至废纸篓',
    );
    return '$_temp0';
  }

  @override
  String notesRemovedFromYours(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已从你的笔记中移除 $count 条笔记',
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
      other: '已将 $count 条笔记移至废纸篓。',
    );
    return '$_temp0';
  }

  @override
  String notesRemovedPart(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已从你的笔记中移除 $count 条。',
    );
    return '$_temp0';
  }

  @override
  String get notesRemoveSharedTitle => '要从你的笔记中移除此笔记？';

  @override
  String get notesRemoveSharedMessage => '如需再次查看，需由所有者重新共享给你。';

  @override
  String notesDeleteTitle(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '删除 $count 条笔记？',
    );
    return '$_temp0';
  }

  @override
  String notesDeleteSharedMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '与你共享的 $count 条笔记将从你的笔记中移除。如需再次查看，需由所有者重新共享给你。',
    );
    return '$_temp0';
  }

  @override
  String get notesDeleteForeverOneTitle => '永久删除此笔记？';

  @override
  String notesDeleteFailed(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '无法删除这些笔记',
      one: '无法删除此笔记',
    );
    return '$_temp0';
  }

  @override
  String notesDeleteForeverTitle(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '永久删除 $count 条笔记？',
    );
    return '$_temp0';
  }

  @override
  String notesDeleteForeverMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '此操作无法撤销。与你共享的人也将失去访问权限。',
    );
    return '$_temp0';
  }

  @override
  String get trashEmptyAction => '清空废纸篓';

  @override
  String get trashNothing => '没有可删除的内容';

  @override
  String get trashEmptyTitle => '清空废纸篓？';

  @override
  String trashEmptyMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 条笔记将被永久删除，此操作无法撤销。',
    );
    return '$_temp0';
  }

  @override
  String get trashEmptied => '废纸篓已清空';

  @override
  String get listSelectNotes => '选择笔记';

  @override
  String get listViewOptions => '视图选项';

  @override
  String get listPressBackAgainToExit => '再按一次返回键退出';

  @override
  String searchTag(String tag) {
    return '搜索 #$tag';
  }

  @override
  String get syncOverwroteLead => '两处都有更改';

  @override
  String syncOverwroteText(String title) {
    return '你对“$title”的更改覆盖了其他设备上的更改。轻点可在版本历史中查看。';
  }

  @override
  String syncOverwroteManyText(int count) {
    return '你对 $count 条笔记的更改覆盖了其他设备上的更改。轻点可查看第一条的版本历史。';
  }

  @override
  String searchNoResults(String query) {
    return '没有“$query”的结果';
  }

  @override
  String get searchNoResultsHelp => '请检查拼写，或换个关键词。';

  @override
  String get searchRegexInvalidHelp =>
      '这不是有效的正则表达式，因此已按原样搜索。请检查表达式，或关闭“正则表达式”。';

  @override
  String get archiveEmptyTitle => '没有已归档的笔记';

  @override
  String get archiveEmptyHelp => '把想保留但不必每天查看的笔记归档。';

  @override
  String get trashEmptyStateTitle => '废纸篓是空的';

  @override
  String tagEmptyTitle(String tag) {
    return '没有带 #$tag 标签的笔记';
  }

  @override
  String get tagEmptyHelp => '你在这里新建的笔记会自动带上此标签。';

  @override
  String get notesLoading => '正在加载笔记';

  @override
  String get notesEmptyTitle => '还没有笔记';

  @override
  String get notesEmptyHelp => '点按“新建笔记”写下第一条。';

  @override
  String get notesLoadFailedTitle => '无法加载你的笔记';

  @override
  String get notesLoadFailedHelp => '请检查网络连接，然后重试。';

  @override
  String get notesLoadPausedHelp => '笔记同步后会显示在这里。';

  @override
  String get noteNewList => '新建清单';

  @override
  String get noteNew => '新建笔记';

  @override
  String get noteNewKinds => '新建清单或拍照笔记';

  @override
  String get cardNotSynced => '尚未同步';

  @override
  String cardPictures(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 张图片',
    );
    return '$_temp0';
  }

  @override
  String cardTickItem(String item) {
    return '勾选 $item';
  }

  @override
  String cardUntickItem(String item) {
    return '取消勾选 $item';
  }

  @override
  String cardOpenPicture(int number) {
    return '打开第 $number 张图片';
  }

  @override
  String shareSharedBy(String name) {
    return '由 $name 共享';
  }

  @override
  String get actionSharing => '共享';

  @override
  String get actionMoveToTrash => '移至废纸篓';

  @override
  String get actionRemoveFromMine => '从我的笔记中移除';

  @override
  String get readOnlyInTrash => '位于废纸篓。';

  @override
  String get readOnlyViewOnly => '仅可查看。';

  @override
  String get readOnlyOwnerEdits => '只有所有者可以编辑。';

  @override
  String readOnlySharedBy(String name) {
    return '由 $name 共享。';
  }

  @override
  String get noteArchived => '已归档';

  @override
  String get tagAdd => '添加标签';

  @override
  String tagRemoveNamed(String tag) {
    return '移除 $tag';
  }

  @override
  String get starterList => '列表';

  @override
  String get starterAttachment => '图片或音频';

  @override
  String get attachmentPictureDeleted => '图片已删除';

  @override
  String get attachmentVoiceDeleted => '语音笔记已删除';

  @override
  String get attachmentAddLabel => '添加图片、录音或文件';

  @override
  String get attachmentAdd => '添加';

  @override
  String get pullOffline => '你处于离线状态，更改已保存在这台手机上。';

  @override
  String get pullNoServer => '没有服务器，已是最新';

  @override
  String get pullSyncing => '正在同步…';

  @override
  String get pullUpToDate => '已是最新';

  @override
  String get pullFailed => '同步失败，你的更改已保存在这台手机上。';

  @override
  String get searchClear => '清除搜索';

  @override
  String get searchFilter => '筛选笔记';

  @override
  String searchFiltersOn(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '筛选笔记，已开启 $count 个筛选条件',
      one: '筛选笔记，已开启 1 个筛选条件',
    );
    return '$_temp0';
  }

  @override
  String get searchNoMatches => '没有匹配的笔记';

  @override
  String get searchNoMatchesHelp => '关闭某个筛选条件即可查看更多笔记。';

  @override
  String get filterTitle => '筛选笔记';

  @override
  String get filterHelp => '仅显示符合条件的笔记';

  @override
  String filterCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已开启 $count 个筛选条件',
      one: '已开启 1 个筛选条件',
    );
    return '$_temp0';
  }

  @override
  String get debugRecordingTitle => '调试录像';

  @override
  String get debugStopRecording => '停止调试录像';

  @override
  String get debugDiscard => '丢弃';

  @override
  String get debugDiscardTitle => '丢弃录像？';

  @override
  String get debugDiscardMessage => '录像和你标记的问题都将丢失。';

  @override
  String get debugShareFile => '分享文件';

  @override
  String get debugPlay => '播放';

  @override
  String get debugPause => '暂停';

  @override
  String debugProblemHere(String time) {
    return '此处有问题（$time）';
  }

  @override
  String debugProblemAt(String time) {
    return '$time 处的问题';
  }

  @override
  String get debugExpectation => '预期';

  @override
  String get debugExpectationHint => '本应发生什么？';

  @override
  String get debugAdd => '添加';

  @override
  String get debugNoExpectation => '（无预期）';

  @override
  String get debugProblemsHint =>
      '移到出错的位置，然后轻点“此处有问题”。\n视频会将文字和图片变灰，报告不包含你写的内容。';

  @override
  String get debugCreateIssue => '创建 issue';

  @override
  String get debugSaveReport => '保存调试报告';

  @override
  String get debugBuilding => '正在生成报告…';

  @override
  String get debugShareFailed => '无法分享报告';

  @override
  String get debugGithubFailed => '无法打开 GitHub';

  @override
  String get debugBuildFailed => '无法生成报告';

  @override
  String get actionMerge => '合并';

  @override
  String notesMerged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已合并 $count 条笔记',
      one: '已合并 1 条笔记',
    );
    return '$_temp0';
  }

  @override
  String notesMergedKeptPictures(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已合并 $count 条笔记，图片随原笔记留在废纸篓中',
      one: '已合并 1 条笔记，图片随原笔记留在废纸篓中',
    );
    return '$_temp0';
  }

  @override
  String get notesMergePickTwo => '请选择至少两条笔记进行合并';

  @override
  String get notesMergeOwnOnly => '只能合并你自己的笔记';

  @override
  String get notesMergeFrozen => '请先解冻已冻结的笔记，再进行合并';

  @override
  String get notesMergeLocked => '请先打开已锁定的笔记，再进行合并';

  @override
  String get notesMergeFailed => '无法合并笔记';

  @override
  String get filterSecrets => '机密信息';

  @override
  String get filterSecretsHelp => '密钥、令牌、ID 和密码';

  @override
  String get filterSearch => '搜索';

  @override
  String get filterRegex => '正则表达式';

  @override
  String get filterMatchCase => '区分大小写';

  @override
  String get searchHintRegex => '使用正则表达式搜索';

  @override
  String get searchHintMatchCase => '搜索（区分大小写）';

  @override
  String get searchHintRegexMatchCase => '正则表达式，区分大小写';

  @override
  String get searchRegexIncomplete => '正则表达式尚不完整：按原样搜索文字';

  @override
  String get filterHas => '包含';

  @override
  String get filterPictures => '图片';

  @override
  String get filterChecklists => '清单';

  @override
  String get filterReminders => '提醒';

  @override
  String get filterTag => '标签';

  @override
  String get filterClear => '清除筛选';

  @override
  String get lineText => '正文';

  @override
  String get lineH1 => '标题 1';

  @override
  String get lineH2 => '标题 2';

  @override
  String get lineH3 => '标题 3';

  @override
  String get lineChecklist => '清单';

  @override
  String get lineBullet => '项目符号列表';

  @override
  String get lineNumbered => '编号列表';

  @override
  String get lineQuote => '引用';

  @override
  String get lineCode => '代码块';

  @override
  String get editorLink => '链接';

  @override
  String get slashWordsChecklist => 'todo to-do task checkbox list 待办 清单 勾选';

  @override
  String get slashWordsH1 => 'h1 title 标题 一级标题';

  @override
  String get slashWordsH2 => 'h2 subtitle subheading 副标题 二级标题';

  @override
  String get slashWordsH3 => 'h3 subheading 三级标题';

  @override
  String get slashWordsBullet => 'unordered ul dashes 无序列表 项目符号';

  @override
  String get slashWordsNumbered => 'ordered ol 有序列表 编号';

  @override
  String get slashWordsQuote => 'blockquote citation 引用 引文';

  @override
  String get slashWordsCode => 'pre snippet 代码 代码块';

  @override
  String get slashWordsText => 'paragraph plain normal body 正文 段落 普通文本';

  @override
  String get slashDate => '今天的日期';

  @override
  String get slashWordsDate => 'date today now day 日期 今天 现在 今日';

  @override
  String get slashWordsLink => 'url web address 链接 网址';

  @override
  String get slashWordsAttachment =>
      'image img photo file voice recording attachment 图片 照片 文件 语音 录音 附件';

  @override
  String get barFormatting => '格式';

  @override
  String get barList => '列表';

  @override
  String get barSelected => '已选文字';

  @override
  String get barStyles => '文字样式';

  @override
  String get barColors => '高亮颜色';

  @override
  String get barLineStyles => '行样式';

  @override
  String get toolOutdent => '减少缩进';

  @override
  String get toolIndent => '增加缩进';

  @override
  String get toolBold => '粗体';

  @override
  String get toolItalic => '斜体';

  @override
  String get toolUnderline => '下划线';

  @override
  String get toolStrikethrough => '删除线';

  @override
  String get toolHighlight => '高亮';

  @override
  String get toolAlignLeft => '左对齐';

  @override
  String get toolAlignCenter => '居中对齐';

  @override
  String get toolAlignRight => '右对齐';

  @override
  String get toolAlignJustify => '两端对齐';

  @override
  String get toolTextStyle => '颜色和字体';

  @override
  String get textStyleNone => '无';

  @override
  String get textStyleDefault => '默认';

  @override
  String get textStyleColor => '文字颜色';

  @override
  String get textStyleFont => '字体';

  @override
  String get textFontComic => 'Comic Sans';

  @override
  String get textFontHandwriting => '手写体';

  @override
  String get textFontTypewriter => '打字机';

  @override
  String get textFontRounded => '圆体';

  @override
  String get textFontSlab => '粗衬线';

  @override
  String get textFontMarker => '马克笔';

  @override
  String get textStyleCustomHighlight => '自定义高亮';

  @override
  String get textStyleCustomColor => '自定义文字颜色';

  @override
  String get colorGray => '灰色';

  @override
  String get colorPickerHue => '色相';

  @override
  String get colorPickerSaturation => '饱和度';

  @override
  String get colorPickerLightness => '亮度';

  @override
  String get colorPickerBadHex => '请使用 #rgb 或 #rrggbb';

  @override
  String get colorPickerApply => '应用';

  @override
  String get toolRemoveHighlight => '移除高亮';

  @override
  String get toolClearFormatting => '清除格式';

  @override
  String get toolRedo => '重做';

  @override
  String get toolHideKeyboard => '收起键盘';

  @override
  String get editorEmptyItem => '空条目';

  @override
  String get editorLinkCopied => '链接已复制';

  @override
  String editorCheckedItems(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 个已勾选项目',
    );
    return '$_temp0';
  }

  @override
  String get linkAdd => '添加链接';

  @override
  String get linkEdit => '编辑链接';

  @override
  String get linkTextHint => '文字';

  @override
  String get commonOpen => '打开';

  @override
  String get commonEdit => '编辑';

  @override
  String get commonRemove => '移除';

  @override
  String get editorSlashHint => '输入 / 查看更多';

  @override
  String get editorPastePicture => '粘贴图片';

  @override
  String get editorPlaceholder => '开始书写';

  @override
  String get commonTryAgain => '重试';

  @override
  String get historyCurrent => '当前版本';

  @override
  String get historySavedOnPhone => '已保存在这台手机上';

  @override
  String get historyNoChanges => '没有更改';

  @override
  String get historyEmptyTitle => '还没有较早版本';

  @override
  String get historyFetchFailed => '无法检查其他设备上的版本。';

  @override
  String get historyOffline => '连接网络即可查看其他设备上的版本。';

  @override
  String diffAdded(int count) {
    return '$count 行新增';
  }

  @override
  String diffRemoved(int count) {
    return '$count 行删除';
  }

  @override
  String diffChanged(int count) {
    return '$count 行更改';
  }

  @override
  String diffLinesAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '新增 $count 行',
    );
    return '$_temp0';
  }

  @override
  String diffLinesRemoved(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '删除 $count 行',
    );
    return '$_temp0';
  }

  @override
  String diffLinesChanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '更改 $count 行',
    );
    return '$_temp0';
  }

  @override
  String diffShowUnchanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '显示 $count 行未更改内容',
    );
    return '$_temp0';
  }

  @override
  String diffUnchanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 行未更改',
    );
    return '$_temp0';
  }

  @override
  String get diffAddedMark => '新增：';

  @override
  String get diffRemovedMark => '删除：';

  @override
  String get diffChangedMark => '更改：';

  @override
  String get diffCheckedMark => '已勾选：';

  @override
  String get diffUncheckedMark => '未勾选：';

  @override
  String get diffRemovedTitle => '删除的标题：';

  @override
  String get diffAddedTitle => '新增的标题：';

  @override
  String get revisionNotSavedLead => '未保存。';

  @override
  String get revisionNotSavedText => '此编辑未保存，因为笔记已在其他设备上先被修改。请恢复此版本，或复制你需要的内容。';

  @override
  String get revisionAlreadyMatches => '笔记已与此版本相同';

  @override
  String get revisionRestoreFailed => '无法恢复此版本';

  @override
  String get revisionRestoring => '正在恢复…';

  @override
  String get revisionBackToList => '返回版本列表';

  @override
  String get revisionNewer => '更新的版本';

  @override
  String get revisionOlder => '更早的版本';

  @override
  String revisionPosition(int index, int count) {
    return '第 $index 个，共 $count 个';
  }

  @override
  String get revisionGone => '此版本已不可用。';

  @override
  String get revisionSameAsNext => '与后一个版本的文字相同。';

  @override
  String get revisionSameAsCurrent => '与当前版本的文字相同。';

  @override
  String get revisionEmpty => '此版本为空。';

  @override
  String shareFailed(String name) {
    return '无法与 $name 共享';
  }

  @override
  String shareAccessFor(String name) {
    return '$name 的访问权限';
  }

  @override
  String shareRevoked(String name) {
    return '$name 已失去访问权限';
  }

  @override
  String shareRevokeFailed(String name) {
    return '无法移除 $name 的访问权限';
  }

  @override
  String shareChangeFailed(String name) {
    return '无法更改 $name 的访问权限';
  }

  @override
  String get shareSubtitle => '你添加的人会在他们的列表中看到这条笔记。';

  @override
  String get shareOffline => '连接网络即可共享此笔记。';

  @override
  String get shareSearchHint => '按姓名或邮箱添加联系人';

  @override
  String get shareNoMatches => '没有找到任何人。只有在此服务器上拥有账户的人才能被添加。';

  @override
  String get shareRecent => '最近共享给';

  @override
  String get sharePeople => '联系人';

  @override
  String shareAddPerson(String name) {
    return '添加 $name';
  }

  @override
  String get shareWithAccess => '有访问权限的人';

  @override
  String shareYou(String name) {
    return '$name（你）';
  }

  @override
  String get shareOwner => '所有者';

  @override
  String shareChangeAccess(String permission, String name) {
    return '$permission。更改 $name 的访问权限';
  }

  @override
  String get commonOffline => '离线';

  @override
  String commonDeleteItem(String name) {
    return '删除 $name';
  }

  @override
  String get commonMoveUp => '上移';

  @override
  String get commonMoveDown => '下移';

  @override
  String get commonMoveToTop => '移到顶部';

  @override
  String get commonMoveToBottom => '移到底部';

  @override
  String commonPosition(int index, int count) {
    return '第 $index 个，共 $count 个';
  }

  @override
  String get addToNote => '添加到笔记';

  @override
  String get addPhotoUnsupported => '无法添加此照片，请使用 JPEG 或 PNG 格式。';

  @override
  String get addMicDenied => '请在设置中允许麦克风权限以进行录音';

  @override
  String get addTakePhoto => '拍照';

  @override
  String get addChoosePhoto => '选择照片';

  @override
  String get addRecordAudio => '录制音频';

  @override
  String get recordingTitle => '录音';

  @override
  String get recordingHelp => '正常说话即可。录音会在上传前保存在这台手机上。';

  @override
  String get recordingReviewTitle => '你的录音';

  @override
  String recordingReviewHelp(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 秒。先听一遍，再决定保留还是重录。',
    );
    return '$_temp0';
  }

  @override
  String get recordingStoppedAtLimit => '已达到最长时长并停止。先听一遍，再决定保留还是重录。';

  @override
  String recordingElapsed(String time) {
    return '录音中，$time';
  }

  @override
  String get recordingStop => '停止';

  @override
  String get recordingDiscard => '丢弃';

  @override
  String get recordingAgain => '重录';

  @override
  String get voiceOffline => '恢复联网后将播放此语音笔记';

  @override
  String get voiceNote => '语音笔记';

  @override
  String get voiceLoadFailed => '无法加载';

  @override
  String get attachmentUploading => '正在上传…';

  @override
  String get attachmentUploadFailed => '无法上传';

  @override
  String voicePosition(String name) {
    return '$name 中的位置';
  }

  @override
  String audioSave(String name) {
    return '保存 $name';
  }

  @override
  String get audioSaveDialog => '保存音频';

  @override
  String audioSaved(String name) {
    return '已保存 $name';
  }

  @override
  String get audioSaveFailed => '无法保存音频';

  @override
  String get pictureAllowPhotos => '请在设置中允许访问照片以保存图片';

  @override
  String get pictureCopy => '复制图片';

  @override
  String get pictureCopied => '图片已复制';

  @override
  String get pictureCopyFailed => '无法复制图片';

  @override
  String get pictureSaved => '已保存到照片';

  @override
  String get pictureSaveFailed => '无法保存图片';

  @override
  String get pictureOffline => '恢复联网后将显示此图片';

  @override
  String get pictureLoadFailed => '无法加载此图片';

  @override
  String get pictureShowTags => '显示识别出的标签';

  @override
  String get pictureHideTags => '隐藏识别出的标签';

  @override
  String get pictureFindingTags => '正在识别标签';

  @override
  String get pictureTagsFailed => '无法获取标签';

  @override
  String get pictureTagsNotYet => '这张图片尚未分析，请稍后再试。';

  @override
  String pictureSearchTag(String tag) {
    return '在你的笔记中搜索 $tag';
  }

  @override
  String get pictureGrabText => '提取图片文字';

  @override
  String get pictureReadingText => '正在读取图片中的文字';

  @override
  String get pictureOpenNote => '打开笔记';

  @override
  String get pictureTextAdded => '文字已添加到笔记';

  @override
  String get pictureNoText => '这张图片中没有找到文字';

  @override
  String get pictureTextFailed => '无法读取这张图片';

  @override
  String get pictureSelectText => '选择文字';

  @override
  String pictureWordsSelected(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已选择 $count 个词',
      one: '已选择 1 个词',
    );
    return '$_temp0';
  }

  @override
  String get pictureSelectHint => '按住一个词并拖动来选择文字，或在旁边按住并拖出选框';

  @override
  String get pictureInsertText => '插入到笔记';

  @override
  String get pictureTextCopied => '文字已复制';

  @override
  String get pictureSaveToPhotos => '保存到照片';

  @override
  String attachmentRetry(String name) {
    return '重试，$name';
  }

  @override
  String pictureOpen(String name) {
    return '$name，打开';
  }

  @override
  String get groupPinned => '已置顶';

  @override
  String get groupOthers => '其他';

  @override
  String get groupArchived => '已归档';

  @override
  String get groupPictureMatches => '可能匹配的图片';

  @override
  String get noteBackground => '背景';

  @override
  String get notePattern => '图案';

  @override
  String get noteColorDefault => '默认';

  @override
  String get patternDots => '圆点';

  @override
  String get patternGrid => '网格';

  @override
  String get patternLines => '横线';

  @override
  String get patternWaves => '波浪';

  @override
  String get patternGroceries => '购物';

  @override
  String get patternMusic => '音乐';

  @override
  String get patternTravel => '旅行';

  @override
  String get patternCode => '代码';

  @override
  String get viewLayout => '布局';

  @override
  String get viewMasonry => '瀑布流';

  @override
  String get viewGrid => '网格';

  @override
  String get viewList => '列表';

  @override
  String get viewSortBy => '排序方式';

  @override
  String get viewDateEdited => '编辑日期';

  @override
  String get viewDateCreated => '创建日期';

  @override
  String get viewTitle => '标题';

  @override
  String get viewSize => '大小';

  @override
  String get viewLargestFirst => '最大优先';

  @override
  String get viewSmallestFirst => '最小优先';

  @override
  String get viewAtoZ => 'A 到 Z';

  @override
  String get viewZtoA => 'Z 到 A';

  @override
  String get viewNewestFirst => '最新优先';

  @override
  String get viewOldestFirst => '最早优先';

  @override
  String get noteUnsynced => '更改尚未同步';

  @override
  String get noteOnThisPhone => '仅在本机';

  @override
  String get noteGone => '此笔记已不可用';

  @override
  String get reminderRemoved => '提醒已移除';

  @override
  String get versionRestored => '版本已恢复';

  @override
  String get attachmentPictureAdded => '图片已添加';

  @override
  String get attachmentVoiceAdded => '语音笔记已添加';

  @override
  String get attachmentPictureAddedOffline => '图片已添加。恢复联网后将自动上传。';

  @override
  String get attachmentVoiceAddedOffline => '语音笔记已添加。恢复联网后将自动上传。';

  @override
  String get attachmentPictureAddFailed => '无法添加图片';

  @override
  String get attachmentVoiceAddFailed => '无法添加语音笔记';

  @override
  String get attachmentAudioAdded => '音频文件已添加';

  @override
  String get attachmentAudioAddedOffline => '音频文件已添加。恢复联网后将自动上传。';

  @override
  String get attachmentAudioAddFailed => '无法添加音频文件';

  @override
  String get attachmentTooBig => '无法添加超过 50 MB 的文件。';

  @override
  String get attachmentAudioDeleted => '音频文件已删除';

  @override
  String get audioFileOffline => '恢复联网后将播放此音频文件';

  @override
  String get noteTitleHint => '标题';

  @override
  String get viewOrder => '顺序';

  @override
  String get viewCards => '卡片';

  @override
  String get viewCardPictures => '卡片上显示图片';

  @override
  String get viewCardPicturesHelp => '在笔记卡片上显示其中的图片';

  @override
  String get slashMenuLabel => '插入';

  @override
  String get slashNoResults => '没有结果';

  @override
  String get noteColor => '颜色';

  @override
  String cardChecked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已完成 $count 项',
    );
    return '$_temp0';
  }

  @override
  String cardAllChecked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '全部 $count 项已完成',
    );
    return '$_temp0';
  }

  @override
  String get shareSheetTitle => '新建笔记';

  @override
  String shareTag(String name) {
    return '标签 $name';
  }

  @override
  String get shareSignIn => '登录 Anchor 以保存你共享的内容。';

  @override
  String get shareOpenApp => '打开 Anchor';

  @override
  String get shareNothing => '这里没有 Anchor 可以保存的内容。';

  @override
  String shareNotAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 个文件无法添加。',
    );
    return '$_temp0';
  }

  @override
  String shareUnsupported(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 个文件无法添加。Anchor 支持图片和音频。',
    );
    return '$_temp0';
  }

  @override
  String shareTooBig(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 个文件超过 50 MB，无法添加。',
    );
    return '$_temp0';
  }

  @override
  String get shareOverLimit => '仅添加前 20 个文件。';

  @override
  String shareRemoveItem(String name) {
    return '移除 $name';
  }

  @override
  String get actionLock => '锁定';

  @override
  String get actionChangeLock => '更改锁定方式';

  @override
  String get actionRemoveLock => '解除锁定';

  @override
  String get lockSheetTitle => '锁定';

  @override
  String get lockSheetChangeTitle => '更改锁定方式';

  @override
  String get lockSheetSubtitle => '用什么打开笔记';

  @override
  String get lockKindBiometric => '指纹或面容';

  @override
  String get lockKindBiometricHelp => '也可以用手机的屏幕锁';

  @override
  String get lockKindPin => 'PIN 码';

  @override
  String get lockKindPinHelp => '所有锁定笔记共用一个 PIN 码';

  @override
  String get lockKindPattern => '图案';

  @override
  String get lockKindPatternHelp => '所有锁定笔记共用一个图案';

  @override
  String get lockKindTap => '轻点即可';

  @override
  String get lockKindTapHelp => '隐藏笔记，轻点后显示';

  @override
  String noteLockedWith(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'biometric': '已用指纹或面容锁定',
      'pin': '已用 PIN 码锁定',
      'pattern': '已用图案锁定',
      'other': '已锁定，轻点即可打开',
    });
    return '$_temp0';
  }

  @override
  String noteLockChanged(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'biometric': '现在用指纹或面容锁定',
      'pin': '现在用 PIN 码锁定',
      'pattern': '现在用图案锁定',
      'other': '现在轻点即可打开',
    });
    return '$_temp0';
  }

  @override
  String get noteLockRemoved => '已解除锁定';

  @override
  String notesLocked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已锁定 $count 条笔记',
      one: '笔记已锁定',
    );
    return '$_temp0';
  }

  @override
  String notesLockedSome(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已锁定 $count 条笔记。尚未打开的已锁定笔记保持原有锁定方式。',
      one: '已锁定 1 条笔记。尚未打开的已锁定笔记保持原有锁定方式。',
    );
    return '$_temp0';
  }

  @override
  String notesLockOpenFirst(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '请先打开这些笔记再更改锁定方式',
      one: '请先打开这条笔记再更改锁定方式',
    );
    return '$_temp0';
  }

  @override
  String lockNeedsServer(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '设置 PIN 码需要连接服务器',
      'other': '设置图案需要连接服务器',
    });
    return '$_temp0';
  }

  @override
  String lockChangeNeedsServer(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '更改 PIN 码需要连接服务器',
      'other': '更改图案需要连接服务器',
    });
    return '$_temp0';
  }

  @override
  String get lockUntitled => '已锁定的笔记';

  @override
  String get lockTapToUnlock => '轻点解锁';

  @override
  String get lockUnlock => '解锁';

  @override
  String get lockEnterPin => '输入你的 PIN 码';

  @override
  String get lockDrawPattern => '绘制你的图案';

  @override
  String get lockUseBiometric => '使用指纹、面容或屏幕锁';

  @override
  String lockBiometricReason(String title) {
    return '解锁“$title”';
  }

  @override
  String get lockTooManyTries => '尝试次数过多。请先解锁手机，然后重试。';

  @override
  String get lockCantCheck => '暂时无法在这台手机上验证。请连接网络后重试。';

  @override
  String lockWrong(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN 码错误',
      'other': '图案错误',
    });
    return '$_temp0';
  }

  @override
  String get lockPatternGrid => '图案网格。请划过至少 4 个点。';

  @override
  String get lockPinErase => '删除数字';

  @override
  String lockPinDigits(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 位数字',
      one: '1 位数字',
      zero: '未输入数字',
    );
    return '$_temp0';
  }

  @override
  String lockSetupTitle(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN 码',
      'other': '图案',
    });
    return '$_temp0';
  }

  @override
  String lockSetupChoose(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '设置 PIN 码',
      'other': '绘制图案',
    });
    return '$_temp0';
  }

  @override
  String lockSetupChooseNew(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '设置新的 PIN 码',
      'other': '绘制新的图案',
    });
    return '$_temp0';
  }

  @override
  String lockSetupConfirm(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '再次输入 PIN 码',
      'other': '再次绘制图案',
    });
    return '$_temp0';
  }

  @override
  String get lockSetupCurrentHelp => '你当前使用的那个';

  @override
  String lockSetupChooseHelp(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '4 到 12 位数字。用于打开所有以 PIN 码锁定的笔记。',
      'other': '至少连接 4 个点。用于打开所有以图案锁定的笔记。',
    });
    return '$_temp0';
  }

  @override
  String get lockSetupConfirmHelp => '再确认一次';

  @override
  String lockSetupNotYours(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '这不是你的 PIN 码',
      'other': '这不是你的图案',
    });
    return '$_temp0';
  }

  @override
  String lockSetupBadShape(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '请使用 4 到 12 位数字',
      'other': '请连接至少 4 个点，每个点只能用一次',
    });
    return '$_temp0';
  }

  @override
  String lockSetupMismatch(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '两次输入的 PIN 码不一致，请重试。',
      'other': '两次绘制的图案不一致，请重试。',
    });
    return '$_temp0';
  }

  @override
  String get lockSetupForgot => '忘记了？使用密码';

  @override
  String get lockSetupPasswordTitle => '你的账号密码';

  @override
  String lockErrorWrongProof(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN 码或密码错误',
      'other': '图案或密码错误',
    });
    return '$_temp0';
  }

  @override
  String lockErrorInvalid(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN 码须为 4 到 12 位数字',
      'other': '图案须连接至少 4 个点',
    });
    return '$_temp0';
  }

  @override
  String get lockErrorUnsupported => '你的服务器尚不支持笔记锁定';

  @override
  String lockErrorOffline(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '无法保存 PIN 码，需要连接服务器。',
      'other': '无法保存图案，需要连接服务器。',
    });
    return '$_temp0';
  }

  @override
  String lockSaved(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN 码已保存',
      'other': '图案已保存',
    });
    return '$_temp0';
  }

  @override
  String get settingsNoteLocks => '笔记锁定';

  @override
  String settingsLockSet(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '设置 PIN 码',
      'other': '设置图案',
    });
    return '$_temp0';
  }

  @override
  String settingsLockChange(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '更改 PIN 码',
      'other': '更改图案',
    });
    return '$_temp0';
  }

  @override
  String settingsLockHelp(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '用于打开以 PIN 码锁定的笔记',
      'other': '用于打开以图案锁定的笔记',
    });
    return '$_temp0';
  }

  @override
  String get cardLocked => '已锁定';

  @override
  String get cardUnlocked => '已锁定，屏幕关闭前保持打开';

  @override
  String get settingsBackup => '备份';

  @override
  String get backupExport => '导出备份';

  @override
  String get backupExportHelp => '将所有笔记、标签、图片和录音保存到一个文件';

  @override
  String get backupExporting => '正在生成备份…';

  @override
  String get backupSaveTitle => '保存备份';

  @override
  String backupSaved(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已将 $count 条笔记保存到备份',
      one: '已将 1 条笔记保存到备份',
    );
    return '$_temp0';
  }

  @override
  String backupMissingFiles(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '有 $count 个附件不在这台手机上，且无法获取。',
      one: '有 1 个附件不在这台手机上，且无法获取。',
    );
    return '$_temp0';
  }

  @override
  String get backupExportFailed => '无法生成备份';

  @override
  String get backupRestore => '恢复备份';

  @override
  String get backupRestoreHelp => '从备份文件恢复笔记。已有的笔记保持不变';

  @override
  String get backupRestoring => '正在恢复…';

  @override
  String get backupPickTitle => '选择 Anchor 备份';

  @override
  String get backupOpenFailed => '无法打开文件';

  @override
  String backupRestored(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已恢复 $count 条笔记',
      one: '已恢复 1 条笔记',
    );
    return '$_temp0';
  }

  @override
  String backupAlreadyHere(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 条已存在。',
      one: '1 条已存在。',
    );
    return '$_temp0';
  }

  @override
  String get backupNothingToRestore => '无需恢复：所有笔记都已存在';

  @override
  String get backupRestoreFailed => '无法恢复备份';

  @override
  String get backupNotABackup => '此文件不是 Anchor 备份';

  @override
  String get backupDamaged => '此备份已损坏';

  @override
  String get backupTooNew => '此备份来自更新版本的 Anchor。请更新应用后再恢复。';

  @override
  String get attachmentFileAdded => '文件已添加';

  @override
  String get attachmentFileAddedOffline => '文件已添加。恢复联网后将自动上传。';

  @override
  String get attachmentFileAddFailed => '无法添加文件';

  @override
  String get attachmentFileDeleted => '文件已删除';

  @override
  String attachmentsAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已添加 $count 个附件',
      one: '已添加 1 个附件',
    );
    return '$_temp0';
  }

  @override
  String attachmentsAddedOffline(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已添加 $count 个附件。恢复联网后将自动上传。',
      one: '已添加 1 个附件。恢复联网后将自动上传。',
    );
    return '$_temp0';
  }

  @override
  String get pictureInTextCamera => '拍照';

  @override
  String get pictureInTextChoose => '选择图片';

  @override
  String get pictureCrop => '裁剪';

  @override
  String get pictureCropReset => '重置';

  @override
  String get cameraFlashOff => '闪光灯关';

  @override
  String get cameraFlashOn => '闪光灯开';

  @override
  String get cameraNone => '未找到相机';

  @override
  String get cameraNoPermission => 'Anchor 需要相机权限才能拍照';

  @override
  String get cameraFailed => '无法启动相机';

  @override
  String get cameraSwitch => '切换相机';

  @override
  String get cameraShutter => '拍照';

  @override
  String get cameraPointAtPage => '对准一页纸';

  @override
  String get cameraPageFound => '已识别页面';

  @override
  String cameraTaken(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已拍 $count 张',
      one: '已拍 1 张',
    );
    return '$_temp0';
  }

  @override
  String cameraPicturesAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已添加 $count 张图片',
      one: '已添加 1 张图片',
    );
    return '$_temp0';
  }

  @override
  String get inlinePicture => '图片';

  @override
  String get inlinePictureRetake => '重拍';

  @override
  String get inlinePictureMirrorHorizontally => '水平翻转';

  @override
  String get inlinePictureMirrorVertically => '垂直翻转';

  @override
  String get inlinePictureAddCaption => '添加说明';

  @override
  String get inlinePictureEditCaption => '编辑说明';

  @override
  String get inlinePictureCaptionHint => '图片说明';

  @override
  String get inlinePictureChangeFailed => '无法修改图片';

  @override
  String get inlinePictureResize => '调整图片大小';

  @override
  String get fileOffline => '恢复联网后即可打开此文件';

  @override
  String get fileLoadFailed => '无法加载文件';

  @override
  String get fileNoApp => '这台手机上没有能打开它的应用，请改为保存。';

  @override
  String get fileSaveDialog => '保存文件';

  @override
  String fileSaved(String name) {
    return '已保存 $name';
  }

  @override
  String get fileSaveFailed => '无法保存文件';

  @override
  String fileOpen(String name) {
    return '打开 $name';
  }

  @override
  String fileSave(String name) {
    return '保存 $name';
  }

  @override
  String get addTakeSeveral => '连续拍摄';

  @override
  String get addFiles => '文件';

  @override
  String get addFolder => '文件夹';

  @override
  String get addFolderFailed => '无法读取该文件夹';

  @override
  String get addFolderEmpty => '该文件夹为空';

  @override
  String get actionAddImage => '添加图片';

  @override
  String get actionTakePicture => '拍照';

  @override
  String get actionTakeSeveral => '连续拍摄';

  @override
  String get actionFreeze => '冻结';

  @override
  String get actionUnfreeze => '解冻';

  @override
  String get noteFreezeHelp => '在你解冻之前，任何人都无法修改或删除它';

  @override
  String get noteFreezeFailed => '无法冻结，需要连接服务器。';

  @override
  String get noteUnfreezeFailed => '无法解冻，需要连接服务器。';

  @override
  String notesFrozen(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已冻结 $count 条笔记',
      one: '笔记已冻结',
    );
    return '$_temp0';
  }

  @override
  String notesUnfrozen(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已解冻 $count 条笔记',
      one: '笔记已解冻',
    );
    return '$_temp0';
  }

  @override
  String notesFrozenStay(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已冻结的笔记无法删除，请先解冻。',
      one: '已冻结的笔记无法删除，请先解冻。',
    );
    return '$_temp0';
  }

  @override
  String get notesLockOrFreeze => '锁定或冻结';

  @override
  String get readOnlyFrozenByOwner => '所有者已将其冻结，因此无法修改。';

  @override
  String get notePublicCanView => '公开：任何拥有链接的人都可以查看';

  @override
  String get notePublicCanEdit => '公开：任何拥有链接的人都可以编辑';

  @override
  String get cardFrozen => '已冻结';

  @override
  String get noteNewCamera => '拍照笔记';

  @override
  String get actionReminder => '提醒';

  @override
  String get actionCheckboxes => '复选框';

  @override
  String get actionModifyQuickActions => '修改快捷操作';

  @override
  String get settingsQuickActions => '快捷操作';

  @override
  String get settingsQuickActionsHelp => '按此顺序显示在笔记顶栏中，最多可放 5 个。拖动可调整顺序。';

  @override
  String get settingsQuickActionsEmpty => '无。所有操作都在“更多”中。';

  @override
  String get settingsMoreActions => '在“更多”中';

  @override
  String get settingsMoreActionsHelp => '关闭某项后，它不会出现在任何地方。点按 + 可将其放到顶部栏。';

  @override
  String get settingsQuickActionsReset => '重置快捷操作';

  @override
  String settingsAddToBar(String action) {
    return '将 $action 放到顶部栏';
  }

  @override
  String settingsMoveAction(String action) {
    return '移动 $action';
  }

  @override
  String settingsRemoveFromBar(String action) {
    return '将 $action 移出顶部栏';
  }

  @override
  String get settingsCopySetup => '复制配置';

  @override
  String get settingsPasteSetup => '粘贴配置';

  @override
  String get settingsSetupCopied => '快捷操作已复制';

  @override
  String get settingsSetupPasted => '快捷操作已粘贴';

  @override
  String get settingsSetupPasteFailed => '剪贴板中没有已复制的快捷操作';

  @override
  String get authMagicCodeUsed => '此二维码或魔法链接已失效。请在网页版的“设置”中重新生成。';

  @override
  String get magicLoginScan => '扫描二维码';

  @override
  String get magicLoginScanTitle => '扫描魔法登录二维码';

  @override
  String get magicLoginScanHint => '在网页版中打开“设置”，在“在手机上登录”下点按“显示二维码”，然后将相机对准它。';

  @override
  String get magicLoginNotOurs => '这不是魔法登录二维码。请使用网页版“设置”中的二维码。';

  @override
  String get magicLoginNoPermission => 'Anchor 需要相机权限才能扫描二维码';

  @override
  String get magicLoginSigningIn => '正在登录…';

  @override
  String get magicLoginAlreadySignedIn => '你已登录。请先退出登录，再使用魔法链接。';

  @override
  String liveImageConnecting(String device) {
    return '正在连接 $device…';
  }

  @override
  String liveImageWaiting(String device) {
    return '正在等待 $device。请在该设备上打开 Anchor 以显示画面。';
  }

  @override
  String liveImageScreenPaused(String device) {
    return '$device 目前没有共享屏幕。';
  }

  @override
  String liveImageCameraPaused(String device) {
    return '$device 目前无法显示相机画面。';
  }

  @override
  String get liveImageSomeDevice => '添加它的设备';

  @override
  String get liveImageBadge => '实时';

  @override
  String get liveImageCamera => '实时相机';

  @override
  String get liveImageScreen => '实时屏幕';

  @override
  String get liveImageSoundOn => '打开声音';

  @override
  String get liveImageSoundOff => '关闭声音';

  @override
  String get liveImageMicMuted => '麦克风已静音';

  @override
  String liveImageViewers(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 人观看',
      one: '1 人观看',
      zero: '无人观看',
    );
    return '$_temp0';
  }

  @override
  String get liveImageStillKept => '静态画面已添加到附件';

  @override
  String get liveImageStillFailed => '无法保存实时图片的静态画面';

  @override
  String get liveImageCameraOff => '你的相机已关闭。';

  @override
  String get liveImageTurnCameraOn => '打开相机';

  @override
  String get liveImageCameraFailed => '无法打开相机';

  @override
  String get liveImageMute => '麦克风静音';

  @override
  String get liveImageUnmute => '取消麦克风静音';

  @override
  String get addLiveCamera => '实时相机';

  @override
  String get liveCameraTitle => '实时相机';

  @override
  String get liveCameraSubtitle =>
      '只要 Anchor 在这台手机上保持打开，任何打开此笔记的设备都会实时显示这台手机的相机画面。';

  @override
  String get liveCameraFront => '前置';

  @override
  String get liveCameraBack => '后置';

  @override
  String get liveCameraMic => '麦克风';

  @override
  String get liveCameraMicHint => '同时发送这台手机的声音；直播时可以静音。';

  @override
  String get liveCameraAdd => '添加到笔记';

  @override
  String get liveCameraNoCamera => '无法打开任何相机。';

  @override
  String get flowchart => '流程图';

  @override
  String get slashWordsFlowchart =>
      'diagram chart flow process boxes arrows decision 流程图 图表 流程 方框 箭头 判断';

  @override
  String get flowchartNew => '新建流程图';

  @override
  String get flowchartEdit => '编辑流程图';

  @override
  String get flowchartAdd => '添加';

  @override
  String get flowchartStep => '步骤';

  @override
  String get flowchartDecision => '判断';

  @override
  String get flowchartEnd => '结束';

  @override
  String get flowchartStartOrEnd => '开始或结束';

  @override
  String get flowchartWrite => '输入文字';

  @override
  String get flowchartNextStep => '下一步';

  @override
  String get flowchartFit => '显示全部';

  @override
  String get flowchartRemove => '移除流程图';

  @override
  String get flowchartBoxText => '方框中的文字';

  @override
  String get flowchartArrowText => '箭头上的文字';

  @override
  String get flowchartArrowHint => '标签，例如“是”';

  @override
  String get flowchartDiscardTitle => '丢弃更改？';

  @override
  String get flowchartDiscardMessage => '对此流程图的更改尚未保存。';

  @override
  String get flowchartDiscard => '丢弃';

  @override
  String get flowchartRemoveTitle => '移除流程图？';

  @override
  String get flowchartRemoveMessage => '流程图将从笔记中移除。在笔记中撤销即可恢复。';

  @override
  String flowchartCanvas(int boxes, int arrows) {
    return '流程图，包含 $boxes 个方框和 $arrows 个箭头。点按方框可选中，再次点按可输入文字。';
  }

  @override
  String flowchartLabel(String name) {
    return '流程图：$name';
  }

  @override
  String get flowchartOpenHint => '打开流程图进行编辑';

  @override
  String get pageScanTitle => '扫描页面';

  @override
  String get pageScanStraighten => '矫正';

  @override
  String get pageScanWhole => '整张图片';

  @override
  String get pageScanFinding => '正在查找页面…';

  @override
  String get pageScanFound => '拖动角点，使其贴合页面。';

  @override
  String get pageScanNotFound => '未找到页面。请将角点拖到页面的四个角上。';

  @override
  String get pageScanCorner => '页面角点';

  @override
  String get inlinePictureStraighten => '矫正页面';

  @override
  String get scanTitle => '扫描件';

  @override
  String get scanNew => '新扫描件';

  @override
  String get scanAdd => '添加';

  @override
  String get scanDocument => '扫描文档';

  @override
  String get scanPage => '页面';

  @override
  String scanPageNumber(int number, int count) {
    return '第 $number 页，共 $count 页';
  }

  @override
  String scanPageNumberShort(int number) {
    return '第 $number 页';
  }

  @override
  String scanPages(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 页',
      one: '1 页',
    );
    return '$_temp0';
  }

  @override
  String get scanBrightness => '亮度';

  @override
  String get scanContrast => '对比度';

  @override
  String get scanCleanup => '均匀背景';

  @override
  String get scanThreshold => '墨色';

  @override
  String get scanCorners => '角点';

  @override
  String get scanTurnLeft => '向左旋转';

  @override
  String get scanTurnRight => '向右旋转';

  @override
  String get scanProfileBw => '黑白';

  @override
  String get scanProfileWhiteboard => '白板';

  @override
  String get scanProfileText => '彩色文字';

  @override
  String get scanProfileColor => '全彩';

  @override
  String get scanLookForAll => '应用于所有页面';

  @override
  String get scanMovePage => '移动页面';

  @override
  String get scanDeletePage => '删除页面';

  @override
  String get scanNameHint => '名称（用于 PDF）';

  @override
  String get scanPhotoMissing => '部分照片尚未同步到这台手机，请稍后再试。';

  @override
  String get scanPdfFailed => '无法生成 PDF。';

  @override
  String get scanSharePdf => '分享 PDF';

  @override
  String get scanSavePdf => '保存 PDF';

  @override
  String get scanMakingPdf => '正在生成 PDF…';

  @override
  String get scanPdfSaved => 'PDF 已保存';

  @override
  String get scanNoPages => '还没有页面。请拍摄或选择页面的照片。';

  @override
  String get scanTakePhotos => '拍照';

  @override
  String get scanPdfPaper => '纸张';

  @override
  String get scanPaperLetter => 'Letter';

  @override
  String get scanPaperFit => '图片尺寸';

  @override
  String get scanPdfMargin => '页边距';

  @override
  String get scanMarginNone => '无';

  @override
  String scanMarginMm(int mm) {
    return '$mm mm';
  }

  @override
  String get scanPdfQuality => '质量';

  @override
  String get scanQualitySmall => '小';

  @override
  String get scanQualityStandard => '标准';

  @override
  String get scanQualityHigh => '高';

  @override
  String get scanRemove => '移除扫描件';

  @override
  String get scanOpenHint => '打开扫描件进行修改';

  @override
  String get scanFromGallery => '从相册选择';

  @override
  String get settingsServer => '服务器';

  @override
  String get settingsServerAddresses => '地址';

  @override
  String settingsServerAddressInUse(String address) {
    return '当前使用：$address';
  }

  @override
  String get serverAddressesTitle => '服务器地址';

  @override
  String get serverAddressesOrder => '按此顺序尝试';

  @override
  String get serverAddressesHelp =>
      '为同一台服务器添加更多地址，例如家中的地址，以及外出时通过 VPN 访问的地址。应用会按顺序尝试，并使用第一个响应的地址。你的笔记和账户在每个地址上都相同。';

  @override
  String get serverAddressesMain => '主地址';

  @override
  String get serverAddressesInUse => '使用中';

  @override
  String get serverAddressesMainInUse => '主地址 · 使用中';

  @override
  String serverAddressesMoveUp(String address) {
    return '上移 $address';
  }

  @override
  String serverAddressesMoveDown(String address) {
    return '下移 $address';
  }

  @override
  String serverAddressesRemove(String address) {
    return '移除 $address';
  }

  @override
  String get serverAddressesAdd => '添加地址';

  @override
  String get serverAddressesAddHint => 'http://192.168.1.20:3000';

  @override
  String get serverAddressesAlreadyAdded => '此地址已在列表中';

  @override
  String get serverAddressesCheck => '立即检查地址';

  @override
  String get serverAddressesChecking => '正在检查…';

  @override
  String serverAddressesUsing(String address) {
    return '正在使用 $address';
  }

  @override
  String serverAddressesNoneAnswered(String address) {
    return '没有地址响应。仍在使用 $address';
  }

  @override
  String get serverAddressesNone => '未连接服务器。';

  @override
  String get regularServerCrumb => '普通 Anchor 服务器';

  @override
  String get regularServerCrumbLabel => '普通 Anchor 服务器：部分 Anchor+ 功能已关闭。查看是哪些';

  @override
  String get regularServerTitle => '普通 Anchor 服务器';

  @override
  String regularServerTitleHost(String host) {
    return '$host 是普通 Anchor 服务器';
  }

  @override
  String get regularServerMessage =>
      '笔记、标签、提醒、与他人共享以及备份照常可用。Anchor+ 的专属功能需要 Anchor+ 服务器，因此已关闭：锁定、冻结和复制笔记、实时协同编辑、实时图片、公开链接、图片搜索、已登录设备，以及按你自己的顺序拖动排列笔记。';

  @override
  String get regularServerConnect => '连接';

  @override
  String magicLoginNeedsPlus(String host) {
    return '$host 是普通 Anchor 服务器，无法使用登录码登录。请改用密码登录。';
  }

  @override
  String get nativeWidgetLabel => '笔记';

  @override
  String get nativeWidgetDescription => '在主屏幕查看笔记并新建笔记。';

  @override
  String get nativeNewNote => '新建笔记';

  @override
  String get nativeNewChecklist => '新建清单';

  @override
  String get nativeWidgetEmpty => '还没有笔记。\n点按 + 写下第一条。';

  @override
  String get nativeWidgetSignedOut => '登录 Anchor\n即可在此查看笔记。';

  @override
  String get nativeLiveChannel => '实时图像';

  @override
  String get nativeLiveTransmitting => '正在传输';

  @override
  String get nativeLiveTransmittingText => '一条笔记正在实时显示你的相机画面。';

  @override
  String get nativeLiveStop => '停止传输';

  @override
  String get nativeRecordingChannel => '语音录音';

  @override
  String get nativeRecordingTitle => '正在录音';

  @override
  String get nativeRecordingText => '打开 Anchor 以停止录音。';

  @override
  String get nativeMusicUse => 'Anchor 使用你的音乐资料库将音频文件添加到笔记中。';

  @override
  String get nativeCameraUse => 'Anchor 使用相机为你的笔记和头像拍摄照片。';

  @override
  String get nativeFaceIdUse => 'Anchor 使用面容 ID 打开你用它锁定的笔记。';

  @override
  String get nativeLocalNetworkUse => '当你的服务器在本地网络中时，Anchor 会连接到它。';

  @override
  String get nativeMicrophoneUse => 'Anchor 使用麦克风录制语音笔记。';

  @override
  String get nativePhotoLibraryAddUse => 'Anchor 将笔记中的图片存储到你的照片图库。';

  @override
  String get nativePhotoLibraryUse => 'Anchor 使用你的照片图库为笔记添加图片并选择头像。';

  @override
  String get authLastAdmin => '你是此服务器上唯一的管理员。请先将其他人设为管理员。';

  @override
  String get deleteAccountTitle => '删除账户';

  @override
  String get deleteAccountWarning => '此操作无法撤销。';

  @override
  String get deleteAccountMessage =>
      '你的账户、笔记、标签、附件和提醒将从此服务器上永久删除，你将在所有设备上退出登录。你共享的笔记及其公开链接将对所有人失效。你添加到他人笔记中的图片和文件会保留在那些笔记中。';

  @override
  String get deleteAccountExport => '如需保留笔记副本，请先在网页版的设置中导出。';

  @override
  String get deleteAccountPasswordHelp => '输入密码以确认。';

  @override
  String get deleteAccountConfirm => '删除账户';

  @override
  String get deleteAccountDeleting => '正在删除…';

  @override
  String get deleteAccountDone => '账户已删除';

  @override
  String get deleteAccountOffline => '你已离线。请连接网络后再删除账户。';

  @override
  String get deleteAccountDialogTitle => '删除你的账户？';

  @override
  String get deleteAccountDialogMessage => '你的账户和笔记将从此服务器上永久删除。';

  @override
  String get settingsDeleteAccount => '删除账户';
}

/// The translations for Chinese, using the Han script (`zh_Hant`).
class AppLocalizationsZhHant extends AppLocalizationsZh {
  AppLocalizationsZhHant() : super('zh_Hant');

  @override
  String get appName => 'Anchor 筆記';

  @override
  String get commonBack => '返回';

  @override
  String get commonCancel => '取消';

  @override
  String get commonClose => '關閉';

  @override
  String get commonDone => '完成';

  @override
  String get commonMenu => '選單';

  @override
  String get commonCloseMenu => '關閉選單';

  @override
  String get commonShowPassword => '顯示密碼';

  @override
  String get commonHidePassword => '隱藏密碼';

  @override
  String get commonSelectedNotes => '已選筆記';

  @override
  String get commonPlay => '播放';

  @override
  String get commonPause => '暫停';

  @override
  String commonPlayItem(String name) {
    return '播放 $name';
  }

  @override
  String commonPauseItem(String name) {
    return '暫停 $name';
  }

  @override
  String commonSwitchOn(String label) {
    return '$label，已開啟';
  }

  @override
  String commonSwitchOff(String label) {
    return '$label，已關閉';
  }

  @override
  String get formOffline => '你目前離線。請連線網路後繼續。';

  @override
  String get linkInvalid => '連結無效';

  @override
  String get linkCantOpen => '無法開啟連結';

  @override
  String get densityDefault => '預設';

  @override
  String get densityCompact => '緊湊';

  @override
  String get noteFontSans => '無襯線';

  @override
  String get noteFontSerif => '襯線';

  @override
  String get noteFontMono => '等寬';

  @override
  String get textSizeSmall => '小';

  @override
  String get textSizeDefault => '預設';

  @override
  String get textSizeLarge => '大';

  @override
  String get lineSpacingTight => '緊湊';

  @override
  String get lineSpacingRelaxed => '寬鬆';

  @override
  String get errorOffline => '沒有網路連線。';

  @override
  String get errorTimeout => '伺服器回應逾時。';

  @override
  String get errorCertificate => '伺服器憑證不受信任。';

  @override
  String get errorCancelled => '請求已取消。';

  @override
  String get errorSignInAgain => '請重新登入後繼續。';

  @override
  String get errorForbidden => '你沒有執行此操作的權限。';

  @override
  String get errorNotFound => '找不到該項目。';

  @override
  String get errorIncompatible => '此應用程式與你的伺服器不相容，請更新後繼續。';

  @override
  String get errorCheckInput => '請檢查你填寫的資訊。';

  @override
  String get errorGeneric => '出了點問題，請重試。';

  @override
  String get errorServer => '伺服器出現問題，請稍後再試。';

  @override
  String get commonSave => '儲存';

  @override
  String get commonSaving => '正在儲存…';

  @override
  String get commonUndo => '復原';

  @override
  String get fieldName => '姓名';

  @override
  String get fieldNameHint => '你的名字';

  @override
  String get fieldEmail => '電子郵件';

  @override
  String get fieldEmailHint => 'you@example.com';

  @override
  String get fieldPassword => '密碼';

  @override
  String get fieldCurrentPassword => '目前密碼';

  @override
  String get fieldNewPassword => '新密碼';

  @override
  String passwordHelp(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '至少 $count 個字元。',
    );
    return '$_temp0';
  }

  @override
  String get authEnterName => '請輸入你的名字。';

  @override
  String get authEnterEmail => '請輸入你的電子郵件地址。';

  @override
  String get authEnterValidEmail => '請輸入有效的電子郵件地址。';

  @override
  String get authEnterPassword => '請輸入你的密碼。';

  @override
  String get authEnterCurrentPassword => '請輸入目前密碼。';

  @override
  String authPasswordTooShort(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '請至少使用 $count 個字元。',
    );
    return '$_temp0';
  }

  @override
  String get fieldTwoStepCode => '驗證器應用程式中的驗證碼';

  @override
  String get authTwoStepCodeHelp => '手機遺失了？請改為輸入一組復原碼。';

  @override
  String get authEnterTwoStepCode => '請輸入驗證器應用程式中的驗證碼。';

  @override
  String get authWrongTwoStepCode => '驗證碼不正確。請檢查你的驗證器應用程式後再試一次。';

  @override
  String get authPasskeyOnly => '此帳號使用通行金鑰登入。請先在網頁版登入，然後掃描「設定 › 手機登入」中的 QR 碼。';

  @override
  String get authSecondFactorSetup =>
      '管理員要求所有人使用通行金鑰或驗證器應用程式登入。請先在 Anchor+ 網頁版中設定其中一種，然後在這裡登入。';

  @override
  String get authIncorrectCredentials => '電子郵件或密碼不正確。';

  @override
  String get authPasswordless => '此帳號不使用密碼，請改用你的登入服務登入。';

  @override
  String get authPendingApproval => '你的帳號正在等待管理員核准。';

  @override
  String authPasswordSignInOff(String provider) {
    return '電子郵件和密碼登入已關閉，請使用 $provider 登入。';
  }

  @override
  String authPasswordSignUpOff(String provider) {
    return '電子郵件和密碼註冊已關閉，請使用 $provider 註冊。';
  }

  @override
  String get authPasswordSignInOffHere => '此伺服器已關閉電子郵件和密碼登入。';

  @override
  String get authPasswordSignUpOffHere => '此伺服器已關閉電子郵件和密碼註冊。';

  @override
  String get authRegistrationClosed => '此伺服器不接受新帳號。';

  @override
  String get authEmailTaken => '該電子郵件已註冊帳號。';

  @override
  String get authWrongCurrentPassword => '目前密碼不正確。';

  @override
  String get authSamePassword => '新密碼必須與目前密碼不同。';

  @override
  String get authUnreachable => '無法連線你的伺服器，請檢查網路後重試。';

  @override
  String get authProviderNotSetUp => '此伺服器未設定登入服務。';

  @override
  String get authProviderFailed => '無法透過你的服務登入，請重試。';

  @override
  String authProviderFailedWith(String detail) {
    return '無法透過你的服務登入：$detail';
  }

  @override
  String get authSignIn => '登入';

  @override
  String get authSigningIn => '正在登入…';

  @override
  String authContinueWith(String provider) {
    return '使用 $provider 繼續';
  }

  @override
  String authOpeningProvider(String provider) {
    return '正在開啟 $provider…';
  }

  @override
  String get authWelcomeBack => '歡迎回來';

  @override
  String get authSignInToAnchor => '登入以繼續使用 Anchor。';

  @override
  String authSignInTo(String server) {
    return '登入 $server';
  }

  @override
  String get authOfflineSignIn => '你目前離線，請連線網路後登入。';

  @override
  String get authNewToAnchor => '第一次使用 Anchor？';

  @override
  String get authNoAccountNeeded => '只是記筆記？';

  @override
  String get authUseWithoutServer => '不使用伺服器';

  @override
  String get authCreateAnAccount => '建立帳號';

  @override
  String get authOr => '或';

  @override
  String get authCreateAccount => '建立帳號';

  @override
  String get authCreatingAccount => '正在建立帳號…';

  @override
  String get authCreateYourAccount => '建立你的帳號';

  @override
  String get authApprovalNeeded => '新帳號需要管理員核准後才能登入。';

  @override
  String get authRegisterSubtitle => '開始紀錄你的想法。';

  @override
  String get authAlreadyHaveAccount => '已有帳號？';

  @override
  String authWelcomeName(String name) {
    return '歡迎使用 Anchor，$name';
  }

  @override
  String get authWaitingTitle => '等待核准';

  @override
  String get authWaitingMessage => '管理員核准你的帳號後即可登入。';

  @override
  String get authBackToSignIn => '返回登入';

  @override
  String get passwordTitle => '密碼';

  @override
  String get passwordChange => '修改密碼';

  @override
  String get passwordChanging => '正在修改…';

  @override
  String get passwordChanged => '密碼已修改';

  @override
  String get passwordOffline => '你目前離線，請連線網路後修改密碼。';

  @override
  String get profileTitle => '個人資料';

  @override
  String get profileSaved => '個人資料已儲存';

  @override
  String get profileOffline => '你目前離線，請連線網路後修改個人資料。';

  @override
  String get profilePhoto => '頭像';

  @override
  String get profilePhotoVisible => '與你共享筆記的人可以看到。';

  @override
  String get profileTakePhoto => '拍照';

  @override
  String get profileChoosePhoto => '選擇照片';

  @override
  String get profileRemovePhoto => '移除照片';

  @override
  String get profilePhotoUpdated => '照片已更新';

  @override
  String get profilePhotoUpdateFailed => '無法更新你的照片';

  @override
  String get profilePhotoRemoved => '照片已移除';

  @override
  String get profilePhotoRemoveFailed => '無法移除你的照片';

  @override
  String get profileEmailAdminOnly => '只有管理員可以修改你的電子郵件。';

  @override
  String get profileChangePhoto => '更換頭像';

  @override
  String get commonContinue => '繼續';

  @override
  String commonExpandedItem(String label) {
    return '$label，已展開';
  }

  @override
  String commonCollapsedItem(String label) {
    return '$label，已摺疊';
  }

  @override
  String get serverTitle => '伺服器';

  @override
  String get serverWelcome => '歡迎使用 Anchor+';

  @override
  String get serverSubtitle => '輸入你的伺服器地址以同步筆記。';

  @override
  String get serverAddress => '伺服器地址';

  @override
  String get serverAddressHint => 'notes.example.com';

  @override
  String get serverConnecting => '正在連線…';

  @override
  String get serverAdvanced => '進階';

  @override
  String get serverSelfSigned => '允許自簽憑證';

  @override
  String get serverSelfSignedWarning => '僅用於你自行管理的伺服器，Anchor 無法驗證其身份。';

  @override
  String get serverHeaders => '額外標頭';

  @override
  String get serverHeadersHint => 'CF-Access-Client-Id: …';

  @override
  String get serverHeadersHelp =>
      '用於伺服器前置的代理，例如 Cloudflare Access。每行一個，格式為 Name: value。只會傳送到此伺服器。';

  @override
  String serverHeaderNotNameValue(int line) {
    return '第 $line 行需要名稱和值，格式為 Name: value。';
  }

  @override
  String serverHeaderBadName(int line) {
    return '第 $line 行：名稱只能包含字母、數字和 - _ .';
  }

  @override
  String serverHeaderBadValue(int line) {
    return '第 $line 行：值包含標頭無法攜帶的字元。';
  }

  @override
  String serverHeaderReserved(int line) {
    return '第 $line 行：此標頭由 Anchor 自行設定。';
  }

  @override
  String serverHeaderRepeated(int line) {
    return '第 $line 行與上方的名稱重複。';
  }

  @override
  String get serverSelfHosted => '這支手機上的筆記會移入你的帳號。';

  @override
  String get serverEnterAddress => '請輸入伺服器地址。';

  @override
  String get serverEnterValidAddress => '請輸入有效的伺服器地址。';

  @override
  String get serverConnectFailed => '無法連線到伺服器，請重試。';

  @override
  String serverNotAnchor(String host) {
    return '$host 不是 Anchor 伺服器，請檢查地址。';
  }

  @override
  String serverUntrusted(String host) {
    return '無法驗證 $host 的憑證。如果是自簽憑證，請在「進階」中開啟「允許自簽憑證」。';
  }

  @override
  String serverUnreachableNoScheme(String host) {
    return '無法連線 $host。請檢查地址；如果你的伺服器不使用 https，請在地址前加上 http://。';
  }

  @override
  String serverUnreachable(String host) {
    return '無法連線 $host，請檢查地址和網路連線。';
  }

  @override
  String get serverConnectAnyway => '仍然連線';

  @override
  String serverLinkLabel(String host) {
    return '伺服器 $host。更換伺服器';
  }

  @override
  String get commonMore => '更多';

  @override
  String get commonCopy => '複製';

  @override
  String get commonSelect => '選擇';

  @override
  String get commonSelectAll => '全選';

  @override
  String get commonDeselectAll => '取消全選';

  @override
  String get commonStopSelecting => '結束選取';

  @override
  String commonSelectedCount(int count) {
    return '已選擇 $count 項';
  }

  @override
  String get settingsTitle => '設定';

  @override
  String settingsProfileCard(String name, String email) {
    return '$name，$email。個人資料';
  }

  @override
  String get settingsAppearance => '外觀';

  @override
  String get settingsLanguage => '語言';

  @override
  String get settingsLanguageSystem => '跟隨手機語言';

  @override
  String get settingsDensity => '密度';

  @override
  String get settingsDensityHelp => '緊湊模式可在螢幕上顯示更多筆記。';

  @override
  String get settingsAnimations => '動畫';

  @override
  String get settingsAnimationsHelp => '「快速」會讓筆記、面板和選單的開啟與關閉只花一半時間。';

  @override
  String get animationsNormal => '一般';

  @override
  String get animationsFast => '快速';

  @override
  String get settingsColorScheme => '配色';

  @override
  String get settingsMaterialYou => 'Material You';

  @override
  String get settingsMaterialYouHelp => '使用桌布的顏色，以及 Material 的形狀和漣漪效果。將取代配色。';

  @override
  String get colorSchemeAnchor => 'Anchor+';

  @override
  String get settingsCustomTheme => '自訂主題';

  @override
  String get settingsCustomThemeOff => '無';

  @override
  String get settingsCustomThemeOn => '開啟';

  @override
  String get customThemeHelp =>
      '以 JSON 貼上主題：為淺色、深色或兩者設定顏色，並可設定字型、圓角、陰影和紋理的樣式。未提供的部分會保留配色的顏色和 Anchor 的外觀。只儲存在此裝置上；同樣的 JSON 也適用於網頁版。';

  @override
  String get customThemeJsonLabel => '主題 JSON';

  @override
  String get customThemeApply => '套用';

  @override
  String get customThemeReset => '重設';

  @override
  String get customThemeCopy => '將目前主題複製為 JSON';

  @override
  String get customThemeApplied => '已套用自訂主題';

  @override
  String customThemeAppliedNamed(String name) {
    return '已套用自訂主題「$name」';
  }

  @override
  String get customThemeRemoved => '已移除自訂主題';

  @override
  String get customThemeCopied => '已將目前主題複製為 JSON';

  @override
  String customThemeNotJson(String detail) {
    return '不是有效的 JSON：$detail';
  }

  @override
  String get customThemeNotObject =>
      '主題必須是包含 \"light\" 或 \"dark\" 顏色或 \"style\" 的 JSON 物件';

  @override
  String customThemeUnknownKey(String key, String expected) {
    return '$key：未知的鍵；應為以下之一：$expected';
  }

  @override
  String customThemeUnknownKeyGuess(String key, String guess, String expected) {
    return '$key：未知的鍵（你是不是要輸入 \"$guess\"？）；應為以下之一：$expected';
  }

  @override
  String get customThemeNameNotText => 'name：必須是字串';

  @override
  String customThemeModeNotObject(String mode) {
    return '$mode：必須是顏色物件';
  }

  @override
  String customThemeNotAColor(String key, String value) {
    return '$key：$value 不是顏色；請使用 #rgb、#rrggbb 或 #rrggbbaa';
  }

  @override
  String customThemeNotALineSpacing(String value) {
    return 'lineSpacing：$value 不是 \"tight\"、\"default\" 或 \"relaxed\" 之一';
  }

  @override
  String get customThemeNoMode => '請至少提供 \"light\"、\"dark\" 或 \"style\" 之一';

  @override
  String get customThemeStyleNotObject => 'style：必須是物件';

  @override
  String customThemeBadStyleValue(String key, String value, String expected) {
    return '$key：$value 不是以下之一：$expected';
  }

  @override
  String get customThemeRadiusNotValid =>
      'style.radius：必須是 0 到 40 之間的數字，或四個 [x, y] 圓角';

  @override
  String customThemePatternNotObject(String key) {
    return '$key：必須是包含 shape、size、thickness、color 和 opacity 的物件';
  }

  @override
  String customThemeNotNumber(String key, String min, String max) {
    return '$key：必須是 $min 到 $max 之間的數字';
  }

  @override
  String customThemeNotStyleColor(String key, String value) {
    return '$key：$value 不是顏色或顏色鍵；請使用 #rgb、#rrggbb、#rrggbbaa 或 foreground 等鍵';
  }

  @override
  String get customThemeShadowNotValid => 'style.shadow：必須是 \"none\" 或物件';

  @override
  String get settingsTheme => '主題';

  @override
  String get themeLight => '淺色';

  @override
  String get themeDark => '深色';

  @override
  String get themeAutomatic => '自動';

  @override
  String get settingsEditor => '編輯器';

  @override
  String get settingsFont => '字型';

  @override
  String get settingsReminders => '提醒';

  @override
  String get settingsMorning => '早上';

  @override
  String get settingsAfternoon => '下午';

  @override
  String get settingsEvening => '傍晚';

  @override
  String get settingsNight => '晚上';

  @override
  String get settingsWeekStart => '每週開始於';

  @override
  String get settingsTextSize => '文字大小';

  @override
  String get settingsLineSpacing => '行距';

  @override
  String get settingsLineSpacingByTheme =>
      '由你的自訂主題設定。從中移除 \"lineSpacing\" 後即可在此選擇。';

  @override
  String get settingsMoveChecked => '將已勾選項目移至底部';

  @override
  String get settingsMoveCheckedHelp => '已勾選的條目會移到未勾選的條目下方。';

  @override
  String get settingsBurnDeleted => '焚燒已刪除的筆記';

  @override
  String get settingsBurnDeletedHelp => '刪除的筆記會在原處燃燒消失。關閉時則直接消失。';

  @override
  String get settingsStrikeSparks => '卡片碰撞時迸出火花';

  @override
  String get settingsStrikeSparksHelp => '刪除後，其餘卡片移到新位置相撞時會迸出火花。';

  @override
  String get settingsPreviewTitle => '里斯本週末';

  @override
  String get settingsPreviewText => '輕裝出行。山路陡峭，電車到九點就擠滿了。';

  @override
  String get settingsAccount => '帳號';

  @override
  String get settingsSync => '同步';

  @override
  String get settingsConnectServer => '連線到伺服器';

  @override
  String get settingsConnectServerHelp =>
      '透過你自己的 Anchor 伺服器同步和分享筆記。登入後，這支手機上的筆記會移入你的帳號。';

  @override
  String get settingsPassword => '密碼';

  @override
  String settingsPasswordManaged(String provider) {
    return '你的密碼由 $provider 管理。';
  }

  @override
  String get settingsPasswordManagedElsewhere => '你的密碼由登入服務管理。';

  @override
  String get settingsSignOut => '登出';

  @override
  String get settingsSigningOut => '正在登出…';

  @override
  String get settingsSignOutTitle => '登出？';

  @override
  String settingsSignOutMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 項更改尚未同步，它們會留在這支手機上，登入後再次同步。',
    );
    return '$_temp0';
  }

  @override
  String get settingsDevices => '裝置';

  @override
  String get devicesTitle => '裝置';

  @override
  String get devicesThisPhone => '這支手機';

  @override
  String devicesSignedIn(String date) {
    return '登入於 $date';
  }

  @override
  String devicesSignedInLastActive(String date, String active) {
    return '登入於 $date，最近活動 $active';
  }

  @override
  String devicesSignedOut(String device) {
    return '已登出 $device';
  }

  @override
  String devicesSignOutFailed(String device) {
    return '無法登出 $device';
  }

  @override
  String get devicesLoadFailed => '無法載入你的裝置';

  @override
  String get devicesLoadFailedHelp => '請檢查網路連線後再試一次。';

  @override
  String get settingsSignOutOthers => '登出其他裝置';

  @override
  String get settingsSignOutOthersTitle => '要登出你的其他裝置嗎？';

  @override
  String get settingsSignOutOthersMessage =>
      '15 分鐘內，其他所有手機、瀏覽器和電腦都會被要求重新登入。這支手機會保持登入。';

  @override
  String get settingsSignOutOthersConfirm => '登出其他裝置';

  @override
  String get settingsSignOutOthersDone => '已登出你的其他裝置';

  @override
  String get settingsSignOutOthersFailed => '無法登出你的其他裝置';

  @override
  String get settingsUpdates => '更新';

  @override
  String get settingsCheckForUpdates => '檢查更新';

  @override
  String get settingsUpdateChecking => '正在檢查…';

  @override
  String settingsUpdateBuild(int build, String repository) {
    return '這是 $repository 的第 $build 版組建';
  }

  @override
  String get settingsCheckAutomatically => '自動檢查';

  @override
  String get settingsCheckAutomaticallyHelp => 'Anchor 啟動時檢查新版本';

  @override
  String get settingsPreviewReleases => '接收預覽版';

  @override
  String get settingsPreviewReleasesHelp => '候選版本，需你的伺服器執行 :preview 映像檔';

  @override
  String get settingsSearch => '搜尋';

  @override
  String get settingsPictureSearch => '依圖片內容尋找';

  @override
  String get settingsPictureSearchHelp =>
      '搜尋「海邊夕陽」或「收據」，即可找到含有這類圖片的筆記，支援大多數語言。你的伺服器會下載一次模型（約 380 MB）並查看每張圖片；所有內容都不會離開你的伺服器。';

  @override
  String pictureSearchDownloading(int percent) {
    return '正在下載圖片模型… $percent%';
  }

  @override
  String get pictureSearchFailed => '無法下載圖片模型。請關閉後重新開啟以再試一次。';

  @override
  String pictureSearchIndexing(int indexed, int total) {
    return '正在查看你的圖片… $indexed/$total';
  }

  @override
  String pictureSearchReady(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '全部 $count 張圖片已可搜尋。',
      one: '你的圖片已可搜尋。',
      zero: '你新增的圖片將可供搜尋。',
    );
    return '$_temp0';
  }

  @override
  String get pictureSearchChangeFailed => '無法變更圖片搜尋';

  @override
  String get updateAvailable => '有可用的更新';

  @override
  String get updateSeeWhatsNew => '查看新功能';

  @override
  String get updateWhatsNew => '新功能';

  @override
  String updateMoreChanges(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '還有 $count 項',
      one: '還有 1 項',
    );
    return '$_temp0';
  }

  @override
  String get updateInstall => '下載並安裝';

  @override
  String updateInstallSize(int megabytes) {
    return '下載並安裝（$megabytes MB）';
  }

  @override
  String updateDownloading(int percent) {
    return '正在下載… $percent%';
  }

  @override
  String get updateViewRelease => '在 GitHub 上查看此版本';

  @override
  String get updateCheckFailed => '無法檢查更新';

  @override
  String get updateDownloadFailed => '無法下載更新';

  @override
  String get updateUpToDate => 'Anchor 已是最新版本';

  @override
  String get settingsHelp => '幫助';

  @override
  String get settingsLogs => '日誌';

  @override
  String get settingsLogsHelp => '用於排查問題的活動詳情';

  @override
  String get settingsPrivacyPolicy => '隱私權政策';

  @override
  String get settingsPrivacyPolicyHelp => '應用程式在這支手機上保存及傳送到你伺服器的內容';

  @override
  String get settingsSourceCode => '原始碼';

  @override
  String get settingsSourceCodeHelp => '採用 GNU AGPL v3 的自由軟體，不提供任何擔保';

  @override
  String get settingsLicense => '授權條款';

  @override
  String get settingsLicenseHelp => '© Anchor 和 Anchor+ 貢獻者';

  @override
  String get settingsOffline => '離線。更改已儲存在這支手機上。';

  @override
  String get settingsLocalOnly => '筆記只保存在這支手機上。';

  @override
  String settingsSyncPaused(String reason) {
    return '同步已暫停。$reason';
  }

  @override
  String settingsCantReach(String host) {
    return '無法連線 $host';
  }

  @override
  String settingsConnectedTo(String host) {
    return '已連線到 $host';
  }

  @override
  String settingsConnectedToVersion(String host, String version) {
    return '已連線到 $host · 伺服器 $version';
  }

  @override
  String settingsAppVersion(String version) {
    return 'Anchor $version';
  }

  @override
  String get settingsAppNameShort => 'Anchor+';

  @override
  String get settingsTagline => '你的想法，安全儲存。';

  @override
  String get logsTitle => '日誌';

  @override
  String get logsMenuHelp => '複製和儲存也會包含更早的會話。';

  @override
  String get logsCopyAll => '全部複製';

  @override
  String get logsSaveToFile => '儲存到檔案';

  @override
  String get logsClear => '清除日誌';

  @override
  String get logsCopiedAll => '日誌已複製，包括更早的會話';

  @override
  String get logsCopiedNewest => '已複製最新的日誌。如需全部日誌，請儲存到檔案。';

  @override
  String get logsClearTitle => '清除日誌？';

  @override
  String get logsClearMessage => '這支手機上的所有日誌都將被刪除，此操作無法復原。';

  @override
  String get logsCleared => '日誌已清除';

  @override
  String get logsSaveDialog => '儲存日誌';

  @override
  String logsSaved(String name) {
    return '已儲存 $name';
  }

  @override
  String get logsSaveFailed => '無法儲存日誌';

  @override
  String logsCopied(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已複製 $count 則日誌',
    );
    return '$_temp0';
  }

  @override
  String get logsSelectTitle => '選擇日誌';

  @override
  String get logsSearch => '搜尋日誌';

  @override
  String get logsSelected => '已選日誌';

  @override
  String get logsLevel => '日誌級別';

  @override
  String get logsAll => '全部';

  @override
  String get logsErrors => '錯誤';

  @override
  String get logsWarnings => '警告';

  @override
  String get logsInfo => '資訊';

  @override
  String get logsDebug => '除錯';

  @override
  String get logsSessionNote => '僅顯示本次會話。複製和儲存也會包含更早的會話。';

  @override
  String get logsNoMatches => '沒有匹配的日誌';

  @override
  String get logsNoMatchesHelp => '換個關鍵字，或顯示所有級別。';

  @override
  String get logsEmpty => '還沒有日誌';

  @override
  String get logsEmptyHelp => '本次會話的活動會顯示在這裡。';

  @override
  String get logLevelError => '錯誤';

  @override
  String get logLevelWarning => '警告';

  @override
  String get logLevelInfo => '資訊';

  @override
  String get logLevelDebug => '除錯';

  @override
  String get commonToday => '今天';

  @override
  String get commonTomorrow => '明天';

  @override
  String get commonNotNow => '暫不';

  @override
  String get commonLater => '以後';

  @override
  String get commonOk => '好';

  @override
  String get commonOpenSettings => '開啟設定';

  @override
  String get reminderTitle => '提醒';

  @override
  String get reminderSheetSubtitle => '你會在這支手機上收到通知。';

  @override
  String reminderDayTime(String day, String time) {
    return '$day $time';
  }

  @override
  String reminderWithRepeat(String when, String repeat) {
    return '$when · $repeat';
  }

  @override
  String reminderSpoken(String when) {
    return '提醒：$when';
  }

  @override
  String reminderSpokenLate(String when) {
    return '已過期的提醒：$when';
  }

  @override
  String get reminderLaterToday => '今天晚些時候';

  @override
  String get reminderThisAfternoon => '今天下午';

  @override
  String get reminderTonight => '今晚';

  @override
  String get reminderTomorrowNight => '明天晚上';

  @override
  String get reminderTomorrowMorning => '明天早上';

  @override
  String get reminderTomorrowAfternoon => '明天下午';

  @override
  String get reminderTomorrowEvening => '明天傍晚';

  @override
  String get reminderThisEvening => '今天傍晚';

  @override
  String get reminderNextWeek => '下週';

  @override
  String get reminderWeekend => '週末';

  @override
  String get reminderNextMonth => '下個月';

  @override
  String get reminderNone => '無提醒';

  @override
  String get reminderPickTime => '選擇日期和時間';

  @override
  String get reminderTimePassed => '此時間已過';

  @override
  String reminderInMinutes(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 分鐘後',
    );
    return '$_temp0';
  }

  @override
  String reminderInHours(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 小時後',
    );
    return '$_temp0';
  }

  @override
  String reminderInDays(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 天後',
    );
    return '$_temp0';
  }

  @override
  String get reminderRepeatsDaily => '每天重複';

  @override
  String reminderRepeatsWeekly(String weekday) {
    return '每$weekday重複';
  }

  @override
  String reminderRepeatsMonthly(int day) {
    return '每月 $day 日重複';
  }

  @override
  String reminderRepeatsMonthlyEnd(int day) {
    return '每月 $day 日或月底重複';
  }

  @override
  String reminderRepeatsYearly(String date) {
    return '每年 $date 重複';
  }

  @override
  String get repeatOnce => '一次';

  @override
  String get repeatDaily => '每天';

  @override
  String get repeatWeekly => '每週';

  @override
  String get repeatMonthly => '每月';

  @override
  String get repeatYearly => '每年';

  @override
  String get reminderWhen => '時間';

  @override
  String get reminderPickDate => '選擇日期';

  @override
  String get reminderDate => '日期';

  @override
  String get reminderTime => '時間';

  @override
  String get reminderRepeat => '重複';

  @override
  String get reminderRemove => '移除';

  @override
  String get reminderSetFailed => '無法設定提醒';

  @override
  String get reminderNotifyTitle => '允許通知？';

  @override
  String get reminderNotifyMessage => 'Anchor 需要通知權限，你的提醒才能在這支手機上響起。';

  @override
  String get reminderExactTitle => '允許精確鬧鐘？';

  @override
  String get reminderExactMessage => 'Android 可能會為省電而延遲提醒。請允許精確鬧鐘，讓提醒準時響起。';

  @override
  String get reminderNotificationsOff => '通知已關閉，請在手機設定中開啟。';

  @override
  String get monthPrevious => '上個月';

  @override
  String get monthNext => '下個月';

  @override
  String get reminderChannelName => '提醒';

  @override
  String get reminderChannelDescription => '你在筆記中設定的提醒';

  @override
  String get reminderDone => '完成';

  @override
  String notesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 則筆記',
    );
    return '$_temp0';
  }

  @override
  String get tagsTitle => '標籤';

  @override
  String get tagNotesTitle => '為筆記加上標籤';

  @override
  String get tagSaveFailed => '無法儲存標籤';

  @override
  String get tagUpdateFailed => '無法更新標籤';

  @override
  String tagNameTaken(String name) {
    return '名為「$name」的標籤已存在。';
  }

  @override
  String tagCreateNamed(String name) {
    return '建立「$name」';
  }

  @override
  String tagAdded(String tag) {
    return '$tag，已加入';
  }

  @override
  String tagNotAdded(String tag) {
    return '$tag，未加入';
  }

  @override
  String tagAddedToSome(String tag) {
    return '$tag，已加入到部分筆記';
  }

  @override
  String get tagSearchOrCreate => '搜尋或建立標籤';

  @override
  String get tagsEmpty => '還沒有標籤。輸入名稱即可建立。';

  @override
  String tagSheetLabel(String name) {
    return '標籤 $name';
  }

  @override
  String get tagColor => '顏色';

  @override
  String get tagRename => '重新命名標籤';

  @override
  String get tagDelete => '刪除標籤';

  @override
  String tagDeleteTitle(String name) {
    return '刪除標籤「$name」？';
  }

  @override
  String tagDeleteMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '該標籤將從 $count 則筆記中移除，筆記本身不會被刪除。',
    );
    return '$_temp0';
  }

  @override
  String get tagDeleteUnused => '此標籤未用於任何筆記。';

  @override
  String tagDeleted(String name) {
    return '標籤「$name」已刪除';
  }

  @override
  String get tagNew => '新增標籤';

  @override
  String tagMove(String name) {
    return '移動 $name';
  }

  @override
  String get tagOptions => '標籤選項';

  @override
  String get tagNamePreview => '標籤名';

  @override
  String get tagNameHint => '標籤名稱';

  @override
  String get tagCreate => '建立標籤';

  @override
  String get tagRenameAction => '重新命名';

  @override
  String get colorRed => '紅色';

  @override
  String get colorPink => '粉色';

  @override
  String get colorPurple => '紫色';

  @override
  String get colorDeepPurple => '深紫色';

  @override
  String get colorIndigo => '靛藍色';

  @override
  String get colorBlue => '藍色';

  @override
  String get colorLightBlue => '淺藍色';

  @override
  String get colorCyan => '青色';

  @override
  String get colorTeal => '藍綠色';

  @override
  String get colorGreen => '綠色';

  @override
  String get colorLightGreen => '淺綠色';

  @override
  String get colorLime => '黃綠色';

  @override
  String get colorAmber => '琥珀色';

  @override
  String get colorOrange => '橙色';

  @override
  String get colorDeepOrange => '深橙色';

  @override
  String get colorBrown => '棕色';

  @override
  String get colorBlueGrey => '藍灰色';

  @override
  String get colorYellow => '黃色';

  @override
  String get syncSignedOutLead => '已登出。';

  @override
  String get syncSignedOutText => '請重新登入以同步筆記。';

  @override
  String get syncSignInAgainTitle => '重新登入';

  @override
  String get syncSignInAgainMessage => '你的筆記會留在這支手機上，登入後即可同步。';

  @override
  String get syncServerOutdatedLead => '請更新伺服器。';

  @override
  String get syncServerOutdatedText => '伺服器版本太舊，無法與此應用程式同步。';

  @override
  String get syncServerOutdatedTitle => '更新伺服器';

  @override
  String get syncServerOutdatedMessage =>
      '你的 Anchor 伺服器版本太舊，無法與此應用程式同步。請更新伺服器後繼續。';

  @override
  String get syncAppOutdatedLead => '請更新 Anchor。';

  @override
  String get syncAppOutdatedText => '此應用程式版本太舊，無法與你的伺服器同步。';

  @override
  String get syncAppOutdatedTitle => '更新 Anchor';

  @override
  String get syncAppOutdatedMessage =>
      '此應用程式版本太舊，無法與你的 Anchor 伺服器同步。請更新應用程式後繼續。';

  @override
  String syncPausedMessage(String reason) {
    return '$reason 在此期間，你的筆記會留在這支手機上。';
  }

  @override
  String get reminderAdd => '新增提醒';

  @override
  String get commonYesterday => '昨天';

  @override
  String peopleCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 人',
    );
    return '$_temp0';
  }

  @override
  String wordsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 個詞',
    );
    return '$_temp0';
  }

  @override
  String get notesBackToTop => '回到頂端';

  @override
  String get notesSelectTitle => '選擇筆記';

  @override
  String get noteUntitled => '無標題';

  @override
  String namesTwo(String first, String second) {
    return '$first 和 $second';
  }

  @override
  String namesMore(String first, String second, int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$first、$second 以及另外 $count 人',
    );
    return '$_temp0';
  }

  @override
  String get shareOnlyYou => '只有你可以看到這則筆記。';

  @override
  String get shareLoadFailed => '無法載入有存取權限的人。';

  @override
  String shareSharedWith(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已共享給 $count 人。',
    );
    return '$_temp0';
  }

  @override
  String shareSharedWithOffline(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已共享給 $count 人。連線網路後可檢視具體是誰。',
    );
    return '$_temp0';
  }

  @override
  String shareSharedWithNames(String names) {
    return '已共享給 $names';
  }

  @override
  String shareSharedWithCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已共享給 $count 人',
    );
    return '$_temp0';
  }

  @override
  String get shareCanView => '可檢視';

  @override
  String get shareCanEdit => '可編輯';

  @override
  String get shareLink => '連結';

  @override
  String get shareLinkAnyone => '知道連結的任何人';

  @override
  String get shareLinkOff => '關閉';

  @override
  String get shareLinkOffHint => '只有你新增的人可以開啟';

  @override
  String get shareLinkViewHint => '知道連結的任何人都可以閱讀，無需帳號';

  @override
  String get shareLinkEditHint => '知道連結的任何人都可以修改標題和內文';

  @override
  String get shareLinkAccess => '連結存取權限';

  @override
  String shareLinkChangeAccess(String access) {
    return '$access。變更連結存取權限';
  }

  @override
  String get shareLinkCopy => '複製連結';

  @override
  String get shareLinkShareIt => '傳送連結';

  @override
  String get shareLinkCopied => '已複製連結';

  @override
  String get shareLinkMade => '已建立並複製連結';

  @override
  String get shareLinkTurnedOff => '連結已關閉，無法再開啟此筆記';

  @override
  String get shareLinkNowCanView => '任何擁有連結的人現在都可以檢視';

  @override
  String get shareLinkNowCanEdit => '任何擁有連結的人現在都可以編輯';

  @override
  String get shareLinkFailed => '無法變更連結';

  @override
  String get shareLinkLoadFailed => '無法載入此筆記的連結。';

  @override
  String get shareLinkOpens => '任何擁有連結的人都可以開啟。';

  @override
  String dayTodayAt(String time) {
    return '今天 $time';
  }

  @override
  String dayYesterdayAt(String time) {
    return '昨天 $time';
  }

  @override
  String dayOnAt(String date, String time) {
    return '$date $time';
  }

  @override
  String get editedToday => '今天編輯';

  @override
  String get editedYesterday => '昨天編輯';

  @override
  String editedOn(String date) {
    return '$date編輯';
  }

  @override
  String get editedJustNow => '剛剛編輯';

  @override
  String editedMinutesAgo(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 分鐘前編輯',
    );
    return '$_temp0';
  }

  @override
  String editedTodayAt(String time) {
    return '今天 $time 編輯';
  }

  @override
  String editedYesterdayAt(String time) {
    return '昨天 $time 編輯';
  }

  @override
  String editedOnAt(String date, String time) {
    return '$date $time 編輯';
  }

  @override
  String trashRule(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '這裡的筆記將在 $count 天後刪除。',
    );
    return '$_temp0';
  }

  @override
  String trashEmpty(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '你刪除的筆記會在這裡保留 $count 天。',
    );
    return '$_temp0';
  }

  @override
  String trashDaysLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '剩餘 $count 天',
    );
    return '$_temp0';
  }

  @override
  String trashDeletesOn(String date) {
    return '將於 $date 刪除。';
  }

  @override
  String trashDeletesAfter(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '將在 $count 天後刪除。',
    );
    return '$_temp0';
  }

  @override
  String historyKept(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '筆記每次更改都會儲存一個版本，保留 $count 天。',
    );
    return '$_temp0';
  }

  @override
  String historyLimit(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '超過 $count 天的編輯紀錄會被移除。',
    );
    return '$_temp0';
  }

  @override
  String get historyEarlier => '較早版本';

  @override
  String get historyNotSaved => '未儲存';

  @override
  String get historyBeforeRestore => '還原前';

  @override
  String get historySomeone => '某人';

  @override
  String get historyYou => '你';

  @override
  String get navNotes => '筆記';

  @override
  String get navArchive => '封存';

  @override
  String get navTrash => '垃圾桶';

  @override
  String drawerAccount(String name) {
    return '$name，設定';
  }

  @override
  String shareNowCanView(String person) {
    return '$person 現在可以檢視';
  }

  @override
  String shareNowCanEdit(String person) {
    return '$person 現在可以編輯';
  }

  @override
  String get revisionComparedCurrent => '與目前版本比較';

  @override
  String revisionComparedTodayAt(String time) {
    return '與今天 $time 的版本比較';
  }

  @override
  String revisionComparedYesterdayAt(String time) {
    return '與昨天 $time 的版本比較';
  }

  @override
  String revisionComparedOnAt(String date, String time) {
    return '與 $date $time 的版本比較';
  }

  @override
  String get listArchiveLine => '已從筆記中隱藏';

  @override
  String listTrashLine(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 天後刪除',
    );
    return '$_temp0';
  }

  @override
  String get listOfflineSaved => '離線 · 更改已儲存在這支手機上';

  @override
  String listOfflineChanges(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '離線 · $count 項更改待同步',
    );
    return '$_temp0';
  }

  @override
  String get listSyncFailed => '同步失敗';

  @override
  String listTitleMenu(String title) {
    return '$title，開啟選單';
  }

  @override
  String get searchNotes => '搜尋筆記';

  @override
  String get searchArchive => '搜尋封存';

  @override
  String get searchTrash => '搜尋垃圾桶';

  @override
  String get actionTag => '標籤';

  @override
  String get actionPin => '置頂';

  @override
  String get actionUnpin => '取消置頂';

  @override
  String get actionColor => '顏色';

  @override
  String get actionSend => '傳送';

  @override
  String get actionMakeCopy => '建立副本';

  @override
  String get actionPrint => '列印';

  @override
  String get notePrintEmpty => '還沒有可列印的內容';

  @override
  String get notePrintLocked => '此筆記已鎖定。';

  @override
  String get notePrintFailed => '無法列印';

  @override
  String get noteSendEmpty => '還沒有可傳送的內容';

  @override
  String get noteCopyMade => '這是你的副本';

  @override
  String get noteCopyFailed => '無法建立副本，需要連線伺服器。';

  @override
  String notesColorChanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已變更 $count 則筆記的顏色',
      one: '已變更 1 則筆記的顏色',
    );
    return '$_temp0';
  }

  @override
  String notesColorChangedExcept(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '顏色已變更。$count 則僅供你檢視的共享筆記維持不變',
      one: '顏色已變更。1 則僅供你檢視的共享筆記維持不變',
    );
    return '$_temp0';
  }

  @override
  String notesColorUnchanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '這些筆記僅共享給你檢視，無法變更顏色',
      one: '此筆記僅共享給你檢視，無法變更顏色',
    );
    return '$_temp0';
  }

  @override
  String get actionShare => '共享';

  @override
  String get actionHistory => '版本紀錄';

  @override
  String get actionUncheckAll => '取消全部勾選';

  @override
  String get actionSortByName => '依 A 到 Z 排序';

  @override
  String get actionDeleteChecked => '刪除已勾選項目';

  @override
  String get actionShowCheckboxes => '顯示核取方塊';

  @override
  String get actionHideCheckboxes => '隱藏核取方塊';

  @override
  String get actionArchive => '封存';

  @override
  String get actionUnarchive => '取消封存';

  @override
  String get actionDelete => '刪除';

  @override
  String get actionRemove => '移除';

  @override
  String get actionRestore => '還原';

  @override
  String get actionDeletePermanently => '永久刪除';

  @override
  String notesPinned(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已置頂 $count 則筆記',
    );
    return '$_temp0';
  }

  @override
  String notesUnpinned(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已取消置頂 $count 則筆記',
    );
    return '$_temp0';
  }

  @override
  String notesArchived(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已封存 $count 則筆記',
    );
    return '$_temp0';
  }

  @override
  String notesUnarchived(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已取消封存 $count 則筆記',
    );
    return '$_temp0';
  }

  @override
  String itemsUnchecked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已取消勾選 $count 個項目',
    );
    return '$_temp0';
  }

  @override
  String checkboxesShown(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已新增 $count 個核取方塊',
      one: '已新增核取方塊',
    );
    return '$_temp0';
  }

  @override
  String checkboxesHidden(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已移除 $count 個核取方塊',
      one: '已移除核取方塊',
    );
    return '$_temp0';
  }

  @override
  String itemsSortedByName(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已依 A 到 Z 排序 $count 個項目',
      one: '已依 A 到 Z 排序項目',
    );
    return '$_temp0';
  }

  @override
  String get itemsAlreadySorted => '已經是 A 到 Z 的順序';

  @override
  String checkedItemsDeleted(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已刪除 $count 個已勾選項目',
    );
    return '$_temp0';
  }

  @override
  String notesRestored(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已還原 $count 則筆記',
    );
    return '$_temp0';
  }

  @override
  String get noteRestoredFollow => '前往查看';

  @override
  String notesDeletedForever(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已永久刪除 $count 則筆記',
    );
    return '$_temp0';
  }

  @override
  String notesMovedToTrash(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已將 $count 則筆記移至垃圾桶',
    );
    return '$_temp0';
  }

  @override
  String notesRemovedFromYours(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已從你的筆記中移除 $count 則筆記',
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
      other: '已將 $count 則筆記移至垃圾桶。',
    );
    return '$_temp0';
  }

  @override
  String notesRemovedPart(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已從你的筆記中移除 $count 條。',
    );
    return '$_temp0';
  }

  @override
  String get notesRemoveSharedTitle => '要從你的筆記中移除此筆記？';

  @override
  String get notesRemoveSharedMessage => '如需再次檢視，需由擁有者重新共享給你。';

  @override
  String notesDeleteTitle(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '刪除 $count 則筆記？',
    );
    return '$_temp0';
  }

  @override
  String notesDeleteSharedMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '與你共享的 $count 則筆記將從你的筆記中移除。如需再次檢視，需由擁有者重新共享給你。',
    );
    return '$_temp0';
  }

  @override
  String get notesDeleteForeverOneTitle => '永久刪除此筆記？';

  @override
  String notesDeleteFailed(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '無法刪除這些筆記',
      one: '無法刪除此筆記',
    );
    return '$_temp0';
  }

  @override
  String notesDeleteForeverTitle(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '永久刪除 $count 則筆記？',
    );
    return '$_temp0';
  }

  @override
  String notesDeleteForeverMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '此操作無法復原。與你共享的人也將失去存取權限。',
    );
    return '$_temp0';
  }

  @override
  String get trashEmptyAction => '清空垃圾桶';

  @override
  String get trashNothing => '沒有可刪除的內容';

  @override
  String get trashEmptyTitle => '清空垃圾桶？';

  @override
  String trashEmptyMessage(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 則筆記將被永久刪除，此操作無法復原。',
    );
    return '$_temp0';
  }

  @override
  String get trashEmptied => '垃圾桶已清空';

  @override
  String get listSelectNotes => '選擇筆記';

  @override
  String get listViewOptions => '檢視選項';

  @override
  String get listPressBackAgainToExit => '再按一次返回鍵即可退出';

  @override
  String searchTag(String tag) {
    return '搜尋 #$tag';
  }

  @override
  String get syncOverwroteLead => '兩處都有變更';

  @override
  String syncOverwroteText(String title) {
    return '你對「$title」的變更覆蓋了其他裝置上的變更。輕觸即可在版本紀錄中查看。';
  }

  @override
  String syncOverwroteManyText(int count) {
    return '你對 $count 則筆記的變更覆蓋了其他裝置上的變更。輕觸即可查看第一則的版本紀錄。';
  }

  @override
  String searchNoResults(String query) {
    return '沒有「$query」的結果';
  }

  @override
  String get searchNoResultsHelp => '請檢查拼字，或換個關鍵字。';

  @override
  String get searchRegexInvalidHelp =>
      '這不是有效的規則運算式，因此已依原樣搜尋。請檢查運算式，或關閉「規則運算式」。';

  @override
  String get archiveEmptyTitle => '沒有已封存的筆記';

  @override
  String get archiveEmptyHelp => '把想保留但不必每天檢視的筆記封存。';

  @override
  String get trashEmptyStateTitle => '垃圾桶是空的';

  @override
  String tagEmptyTitle(String tag) {
    return '沒有帶 #$tag 標籤的筆記';
  }

  @override
  String get tagEmptyHelp => '你在這裡新增的筆記會自動帶上此標籤。';

  @override
  String get notesLoading => '正在載入筆記';

  @override
  String get notesEmptyTitle => '還沒有筆記';

  @override
  String get notesEmptyHelp => '點按「新增筆記」寫下第一則。';

  @override
  String get notesLoadFailedTitle => '無法載入你的筆記';

  @override
  String get notesLoadFailedHelp => '請檢查網路連線，然後重試。';

  @override
  String get notesLoadPausedHelp => '筆記同步後會顯示在這裡。';

  @override
  String get noteNewList => '新增清單';

  @override
  String get noteNew => '新增筆記';

  @override
  String get noteNewKinds => '新增清單或相機筆記';

  @override
  String get cardNotSynced => '尚未同步';

  @override
  String cardPictures(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 張圖片',
    );
    return '$_temp0';
  }

  @override
  String cardTickItem(String item) {
    return '勾選 $item';
  }

  @override
  String cardUntickItem(String item) {
    return '取消勾選 $item';
  }

  @override
  String cardOpenPicture(int number) {
    return '開啟第 $number 張圖片';
  }

  @override
  String shareSharedBy(String name) {
    return '由 $name 共享';
  }

  @override
  String get actionSharing => '共享';

  @override
  String get actionMoveToTrash => '移至垃圾桶';

  @override
  String get actionRemoveFromMine => '從我的筆記中移除';

  @override
  String get readOnlyInTrash => '位於垃圾桶。';

  @override
  String get readOnlyViewOnly => '僅可檢視。';

  @override
  String get readOnlyOwnerEdits => '只有擁有者可以編輯。';

  @override
  String readOnlySharedBy(String name) {
    return '由 $name 共享。';
  }

  @override
  String get noteArchived => '已封存';

  @override
  String get tagAdd => '新增標籤';

  @override
  String tagRemoveNamed(String tag) {
    return '移除 $tag';
  }

  @override
  String get starterList => '清單';

  @override
  String get starterAttachment => '圖片或音訊';

  @override
  String get attachmentPictureDeleted => '圖片已刪除';

  @override
  String get attachmentVoiceDeleted => '語音筆記已刪除';

  @override
  String get attachmentAddLabel => '新增圖片、錄音或檔案';

  @override
  String get attachmentAdd => '新增';

  @override
  String get pullOffline => '你目前離線，更改已儲存在這支手機上。';

  @override
  String get pullNoServer => '沒有伺服器，已是最新';

  @override
  String get pullSyncing => '正在同步…';

  @override
  String get pullUpToDate => '已是最新';

  @override
  String get pullFailed => '同步失敗，你的更改已儲存在這支手機上。';

  @override
  String get searchClear => '清除搜尋';

  @override
  String get searchFilter => '篩選筆記';

  @override
  String searchFiltersOn(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '篩選筆記，已開啟 $count 個篩選條件',
      one: '篩選筆記，已開啟 1 個篩選條件',
    );
    return '$_temp0';
  }

  @override
  String get searchNoMatches => '沒有符合的筆記';

  @override
  String get searchNoMatchesHelp => '關閉某個篩選條件即可查看更多筆記。';

  @override
  String get filterTitle => '篩選筆記';

  @override
  String get filterHelp => '僅顯示符合條件的筆記';

  @override
  String filterCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已開啟 $count 個篩選條件',
      one: '已開啟 1 個篩選條件',
    );
    return '$_temp0';
  }

  @override
  String get debugRecordingTitle => '偵錯錄影';

  @override
  String get debugStopRecording => '停止偵錯錄影';

  @override
  String get debugDiscard => '捨棄';

  @override
  String get debugDiscardTitle => '捨棄錄影？';

  @override
  String get debugDiscardMessage => '錄影和你標記的問題都將遺失。';

  @override
  String get debugShareFile => '分享檔案';

  @override
  String get debugPlay => '播放';

  @override
  String get debugPause => '暫停';

  @override
  String debugProblemHere(String time) {
    return '此處有問題（$time）';
  }

  @override
  String debugProblemAt(String time) {
    return '$time 的問題';
  }

  @override
  String get debugExpectation => '預期';

  @override
  String get debugExpectationHint => '原本應該發生什麼？';

  @override
  String get debugAdd => '新增';

  @override
  String get debugNoExpectation => '（無預期）';

  @override
  String get debugProblemsHint =>
      '移到出錯的位置，然後輕觸「此處有問題」。\n影片會將文字和圖片變灰，報告不包含你寫的內容。';

  @override
  String get debugCreateIssue => '建立 issue';

  @override
  String get debugSaveReport => '儲存偵錯報告';

  @override
  String get debugBuilding => '正在產生報告…';

  @override
  String get debugShareFailed => '無法分享報告';

  @override
  String get debugGithubFailed => '無法開啟 GitHub';

  @override
  String get debugBuildFailed => '無法產生報告';

  @override
  String get actionMerge => '合併';

  @override
  String notesMerged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已合併 $count 則筆記',
      one: '已合併 1 則筆記',
    );
    return '$_temp0';
  }

  @override
  String notesMergedKeptPictures(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已合併 $count 則筆記，圖片隨原筆記留在垃圾桶中',
      one: '已合併 1 則筆記，圖片隨原筆記留在垃圾桶中',
    );
    return '$_temp0';
  }

  @override
  String get notesMergePickTwo => '請選擇至少兩則筆記進行合併';

  @override
  String get notesMergeOwnOnly => '只能合併你自己的筆記';

  @override
  String get notesMergeFrozen => '請先解凍已凍結的筆記，再進行合併';

  @override
  String get notesMergeLocked => '請先開啟已鎖定的筆記，再進行合併';

  @override
  String get notesMergeFailed => '無法合併筆記';

  @override
  String get filterSecrets => '機密資訊';

  @override
  String get filterSecretsHelp => '金鑰、權杖、ID 和密碼';

  @override
  String get filterSearch => '搜尋';

  @override
  String get filterRegex => '規則運算式';

  @override
  String get filterMatchCase => '區分大小寫';

  @override
  String get searchHintRegex => '使用規則運算式搜尋';

  @override
  String get searchHintMatchCase => '搜尋（區分大小寫）';

  @override
  String get searchHintRegexMatchCase => '規則運算式，區分大小寫';

  @override
  String get searchRegexIncomplete => '規則運算式尚不完整：依原樣搜尋文字';

  @override
  String get filterHas => '包含';

  @override
  String get filterPictures => '圖片';

  @override
  String get filterChecklists => '清單';

  @override
  String get filterReminders => '提醒';

  @override
  String get filterTag => '標籤';

  @override
  String get filterClear => '清除篩選';

  @override
  String get lineText => '正文';

  @override
  String get lineH1 => '標題 1';

  @override
  String get lineH2 => '標題 2';

  @override
  String get lineH3 => '標題 3';

  @override
  String get lineChecklist => '清單';

  @override
  String get lineBullet => '項目符號清單';

  @override
  String get lineNumbered => '編號清單';

  @override
  String get lineQuote => '引用';

  @override
  String get lineCode => '程式碼區塊';

  @override
  String get editorLink => '連結';

  @override
  String get slashWordsChecklist => 'todo to-do task checkbox list 待辦 清單 勾選';

  @override
  String get slashWordsH1 => 'h1 title 標題 一級標題';

  @override
  String get slashWordsH2 => 'h2 subtitle subheading 副標題 二級標題';

  @override
  String get slashWordsH3 => 'h3 subheading 三級標題';

  @override
  String get slashWordsBullet => 'unordered ul dashes 無序清單 項目符號';

  @override
  String get slashWordsNumbered => 'ordered ol 有序清單 編號';

  @override
  String get slashWordsQuote => 'blockquote citation 引用 引文';

  @override
  String get slashWordsCode => 'pre snippet 程式碼 程式碼區塊';

  @override
  String get slashWordsText => 'paragraph plain normal body 正文 段落 普通文字';

  @override
  String get slashDate => '今天的日期';

  @override
  String get slashWordsDate => 'date today now day 日期 今天 現在 今日';

  @override
  String get slashWordsLink => 'url web address 連結 網址';

  @override
  String get slashWordsAttachment =>
      'image img photo file voice recording attachment 圖片 照片 檔案 語音 錄音 附件';

  @override
  String get barFormatting => '格式';

  @override
  String get barList => '清單';

  @override
  String get barSelected => '已選文字';

  @override
  String get barStyles => '文字樣式';

  @override
  String get barColors => '醒目提示顏色';

  @override
  String get barLineStyles => '行樣式';

  @override
  String get toolOutdent => '減少縮排';

  @override
  String get toolIndent => '增加縮排';

  @override
  String get toolBold => '粗體';

  @override
  String get toolItalic => '斜體';

  @override
  String get toolUnderline => '底線';

  @override
  String get toolStrikethrough => '刪除線';

  @override
  String get toolHighlight => '醒目提示';

  @override
  String get toolAlignLeft => '靠左對齊';

  @override
  String get toolAlignCenter => '置中對齊';

  @override
  String get toolAlignRight => '靠右對齊';

  @override
  String get toolAlignJustify => '左右對齊';

  @override
  String get toolTextStyle => '顏色和字型';

  @override
  String get textStyleNone => '無';

  @override
  String get textStyleDefault => '預設';

  @override
  String get textStyleColor => '文字顏色';

  @override
  String get textStyleFont => '字型';

  @override
  String get textFontComic => 'Comic Sans';

  @override
  String get textFontHandwriting => '手寫體';

  @override
  String get textFontTypewriter => '打字機';

  @override
  String get textFontRounded => '圓體';

  @override
  String get textFontSlab => '粗襯線';

  @override
  String get textFontMarker => '麥克筆';

  @override
  String get textStyleCustomHighlight => '自訂醒目標示';

  @override
  String get textStyleCustomColor => '自訂文字顏色';

  @override
  String get colorGray => '灰色';

  @override
  String get colorPickerHue => '色相';

  @override
  String get colorPickerSaturation => '飽和度';

  @override
  String get colorPickerLightness => '亮度';

  @override
  String get colorPickerBadHex => '請使用 #rgb 或 #rrggbb';

  @override
  String get colorPickerApply => '套用';

  @override
  String get toolRemoveHighlight => '移除醒目提示';

  @override
  String get toolClearFormatting => '清除格式';

  @override
  String get toolRedo => '重做';

  @override
  String get toolHideKeyboard => '收起鍵盤';

  @override
  String get editorEmptyItem => '空條目';

  @override
  String get editorLinkCopied => '連結已複製';

  @override
  String editorCheckedItems(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 個已勾選項目',
    );
    return '$_temp0';
  }

  @override
  String get linkAdd => '新增連結';

  @override
  String get linkEdit => '編輯連結';

  @override
  String get linkTextHint => '文字';

  @override
  String get commonOpen => '開啟';

  @override
  String get commonEdit => '編輯';

  @override
  String get commonRemove => '移除';

  @override
  String get editorSlashHint => '輸入 / 檢視更多';

  @override
  String get editorPastePicture => '貼上圖片';

  @override
  String get editorPlaceholder => '開始書寫';

  @override
  String get commonTryAgain => '重試';

  @override
  String get historyCurrent => '目前版本';

  @override
  String get historySavedOnPhone => '已儲存在這支手機上';

  @override
  String get historyNoChanges => '沒有更改';

  @override
  String get historyEmptyTitle => '還沒有較早版本';

  @override
  String get historyFetchFailed => '無法檢查其他裝置上的版本。';

  @override
  String get historyOffline => '連線網路即可檢視其他裝置上的版本。';

  @override
  String diffAdded(int count) {
    return '$count 行新增';
  }

  @override
  String diffRemoved(int count) {
    return '$count 行刪除';
  }

  @override
  String diffChanged(int count) {
    return '$count 行更改';
  }

  @override
  String diffLinesAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '新增 $count 行',
    );
    return '$_temp0';
  }

  @override
  String diffLinesRemoved(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '刪除 $count 行',
    );
    return '$_temp0';
  }

  @override
  String diffLinesChanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '更改 $count 行',
    );
    return '$_temp0';
  }

  @override
  String diffShowUnchanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '顯示 $count 行未更改內容',
    );
    return '$_temp0';
  }

  @override
  String diffUnchanged(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 行未更改',
    );
    return '$_temp0';
  }

  @override
  String get diffAddedMark => '新增：';

  @override
  String get diffRemovedMark => '刪除：';

  @override
  String get diffChangedMark => '更改：';

  @override
  String get diffCheckedMark => '已勾選：';

  @override
  String get diffUncheckedMark => '未勾選：';

  @override
  String get diffRemovedTitle => '刪除的標題：';

  @override
  String get diffAddedTitle => '新增的標題：';

  @override
  String get revisionNotSavedLead => '未儲存。';

  @override
  String get revisionNotSavedText => '此編輯未儲存，因為筆記已在其他裝置上先被修改。請還原此版本，或複製你需要的內容。';

  @override
  String get revisionAlreadyMatches => '筆記已與此版本相同';

  @override
  String get revisionRestoreFailed => '無法還原此版本';

  @override
  String get revisionRestoring => '正在還原…';

  @override
  String get revisionBackToList => '返回版本清單';

  @override
  String get revisionNewer => '更新的版本';

  @override
  String get revisionOlder => '更早的版本';

  @override
  String revisionPosition(int index, int count) {
    return '第 $index 個，共 $count 個';
  }

  @override
  String get revisionGone => '此版本已不可用。';

  @override
  String get revisionSameAsNext => '與後一個版本的文字相同。';

  @override
  String get revisionSameAsCurrent => '與目前版本的文字相同。';

  @override
  String get revisionEmpty => '此版本為空。';

  @override
  String shareFailed(String name) {
    return '無法與 $name 共享';
  }

  @override
  String shareAccessFor(String name) {
    return '$name 的存取權限';
  }

  @override
  String shareRevoked(String name) {
    return '$name 已失去存取權限';
  }

  @override
  String shareRevokeFailed(String name) {
    return '無法移除 $name 的存取權限';
  }

  @override
  String shareChangeFailed(String name) {
    return '無法更改 $name 的存取權限';
  }

  @override
  String get shareSubtitle => '你新增的人會在他們的清單中看到這則筆記。';

  @override
  String get shareOffline => '連線網路即可共享此筆記。';

  @override
  String get shareSearchHint => '按姓名或電子郵件新增聯絡人';

  @override
  String get shareNoMatches => '沒有找到任何人。只有在此伺服器上擁有帳號的人才能被新增。';

  @override
  String get shareRecent => '最近共享給';

  @override
  String get sharePeople => '聯絡人';

  @override
  String shareAddPerson(String name) {
    return '新增 $name';
  }

  @override
  String get shareWithAccess => '有存取權限的人';

  @override
  String shareYou(String name) {
    return '$name（你）';
  }

  @override
  String get shareOwner => '擁有者';

  @override
  String shareChangeAccess(String permission, String name) {
    return '$permission。更改 $name 的存取權限';
  }

  @override
  String get commonOffline => '離線';

  @override
  String commonDeleteItem(String name) {
    return '刪除 $name';
  }

  @override
  String get commonMoveUp => '上移';

  @override
  String get commonMoveDown => '下移';

  @override
  String get commonMoveToTop => '移到頂端';

  @override
  String get commonMoveToBottom => '移到底部';

  @override
  String commonPosition(int index, int count) {
    return '第 $index 個，共 $count 個';
  }

  @override
  String get addToNote => '加入筆記';

  @override
  String get addPhotoUnsupported => '無法新增此照片，請使用 JPEG 或 PNG 格式。';

  @override
  String get addMicDenied => '請在設定中允許麥克風權限以進行錄音';

  @override
  String get addTakePhoto => '拍照';

  @override
  String get addChoosePhoto => '選擇照片';

  @override
  String get addRecordAudio => '錄製音訊';

  @override
  String get recordingTitle => '錄音';

  @override
  String get recordingHelp => '正常說話即可。錄音會在上傳前儲存在這支手機上。';

  @override
  String get recordingReviewTitle => '你的錄音';

  @override
  String recordingReviewHelp(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 秒。先聽一遍，再決定保留還是重錄。',
    );
    return '$_temp0';
  }

  @override
  String get recordingStoppedAtLimit => '已達到最長時長並停止。先聽一遍，再決定保留還是重錄。';

  @override
  String recordingElapsed(String time) {
    return '錄音中，$time';
  }

  @override
  String get recordingStop => '停止';

  @override
  String get recordingDiscard => '丟棄';

  @override
  String get recordingAgain => '重錄';

  @override
  String get voiceOffline => '重新連線後後將播放此語音筆記';

  @override
  String get voiceNote => '語音筆記';

  @override
  String get voiceLoadFailed => '無法載入';

  @override
  String get attachmentUploading => '正在上傳…';

  @override
  String get attachmentUploadFailed => '無法上傳';

  @override
  String voicePosition(String name) {
    return '$name 中的位置';
  }

  @override
  String audioSave(String name) {
    return '儲存 $name';
  }

  @override
  String get audioSaveDialog => '儲存音訊';

  @override
  String audioSaved(String name) {
    return '已儲存 $name';
  }

  @override
  String get audioSaveFailed => '無法儲存音訊';

  @override
  String get pictureAllowPhotos => '請在設定中允許訪問照片以儲存圖片';

  @override
  String get pictureCopy => '複製圖片';

  @override
  String get pictureCopied => '圖片已複製';

  @override
  String get pictureCopyFailed => '無法複製圖片';

  @override
  String get pictureSaved => '已儲存到照片';

  @override
  String get pictureSaveFailed => '無法儲存圖片';

  @override
  String get pictureOffline => '重新連線後後將顯示此圖片';

  @override
  String get pictureLoadFailed => '無法載入此圖片';

  @override
  String get pictureShowTags => '顯示辨識出的標籤';

  @override
  String get pictureHideTags => '隱藏辨識出的標籤';

  @override
  String get pictureFindingTags => '正在辨識標籤';

  @override
  String get pictureTagsFailed => '無法取得標籤';

  @override
  String get pictureTagsNotYet => '這張圖片尚未分析，請稍後再試。';

  @override
  String pictureSearchTag(String tag) {
    return '在你的筆記中搜尋 $tag';
  }

  @override
  String get pictureGrabText => '擷取圖片文字';

  @override
  String get pictureReadingText => '正在讀取圖片中的文字';

  @override
  String get pictureOpenNote => '開啟筆記';

  @override
  String get pictureTextAdded => '文字已新增到筆記';

  @override
  String get pictureNoText => '這張圖片中沒有找到文字';

  @override
  String get pictureTextFailed => '無法讀取這張圖片';

  @override
  String get pictureSelectText => '選取文字';

  @override
  String pictureWordsSelected(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已選取 $count 個字詞',
      one: '已選取 1 個字詞',
    );
    return '$_temp0';
  }

  @override
  String get pictureSelectHint => '按住一個字詞並拖曳來選取文字，或在旁邊按住並拖出選取框';

  @override
  String get pictureInsertText => '插入到筆記';

  @override
  String get pictureTextCopied => '文字已複製';

  @override
  String get pictureSaveToPhotos => '儲存到照片';

  @override
  String attachmentRetry(String name) {
    return '重試，$name';
  }

  @override
  String pictureOpen(String name) {
    return '$name，開啟';
  }

  @override
  String get groupPinned => '已置頂';

  @override
  String get groupOthers => '其他';

  @override
  String get groupArchived => '已封存';

  @override
  String get groupPictureMatches => '可能符合的圖片';

  @override
  String get noteBackground => '背景';

  @override
  String get notePattern => '圖案';

  @override
  String get noteColorDefault => '預設';

  @override
  String get patternDots => '圓點';

  @override
  String get patternGrid => '網格';

  @override
  String get patternLines => '橫線';

  @override
  String get patternWaves => '波浪';

  @override
  String get patternGroceries => '購物';

  @override
  String get patternMusic => '音樂';

  @override
  String get patternTravel => '旅行';

  @override
  String get patternCode => '程式碼';

  @override
  String get viewLayout => '版面配置';

  @override
  String get viewMasonry => '瀑布流';

  @override
  String get viewGrid => '網格';

  @override
  String get viewList => '清單';

  @override
  String get viewSortBy => '排序方式';

  @override
  String get viewDateEdited => '編輯日期';

  @override
  String get viewDateCreated => '建立日期';

  @override
  String get viewTitle => '標題';

  @override
  String get viewSize => '大小';

  @override
  String get viewLargestFirst => '最大優先';

  @override
  String get viewSmallestFirst => '最小優先';

  @override
  String get viewAtoZ => 'A 到 Z';

  @override
  String get viewZtoA => 'Z 到 A';

  @override
  String get viewNewestFirst => '最新優先';

  @override
  String get viewOldestFirst => '最早優先';

  @override
  String get noteUnsynced => '更改尚未同步';

  @override
  String get noteOnThisPhone => '僅在本機';

  @override
  String get noteGone => '此筆記已不可用';

  @override
  String get reminderRemoved => '提醒已移除';

  @override
  String get versionRestored => '版本已還原';

  @override
  String get attachmentPictureAdded => '圖片已加入';

  @override
  String get attachmentVoiceAdded => '語音筆記已加入';

  @override
  String get attachmentPictureAddedOffline => '圖片已加入。重新連線後後將自動上傳。';

  @override
  String get attachmentVoiceAddedOffline => '語音筆記已加入。重新連線後後將自動上傳。';

  @override
  String get attachmentPictureAddFailed => '無法新增圖片';

  @override
  String get attachmentVoiceAddFailed => '無法新增語音筆記';

  @override
  String get attachmentAudioAdded => '音訊檔案已加入';

  @override
  String get attachmentAudioAddedOffline => '音訊檔案已加入。重新連線後後將自動上傳。';

  @override
  String get attachmentAudioAddFailed => '無法新增音訊檔案';

  @override
  String get attachmentTooBig => '無法新增超過 50 MB 的檔案。';

  @override
  String get attachmentAudioDeleted => '音訊檔案已刪除';

  @override
  String get audioFileOffline => '重新連線後後將播放此音訊檔案';

  @override
  String get noteTitleHint => '標題';

  @override
  String get viewOrder => '順序';

  @override
  String get viewCards => '卡片';

  @override
  String get viewCardPictures => '卡片上顯示圖片';

  @override
  String get viewCardPicturesHelp => '在筆記卡片上顯示其中的圖片';

  @override
  String get slashMenuLabel => '插入';

  @override
  String get slashNoResults => '沒有結果';

  @override
  String get noteColor => '顏色';

  @override
  String cardChecked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已完成 $count 項',
    );
    return '$_temp0';
  }

  @override
  String cardAllChecked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '全部 $count 項已完成',
    );
    return '$_temp0';
  }

  @override
  String get shareSheetTitle => '新增筆記';

  @override
  String shareTag(String name) {
    return '標籤 $name';
  }

  @override
  String get shareSignIn => '登入 Anchor 以儲存你共享的內容。';

  @override
  String get shareOpenApp => '開啟 Anchor';

  @override
  String get shareNothing => '這裡沒有 Anchor 可以儲存的內容。';

  @override
  String shareNotAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 個檔案無法新增。',
    );
    return '$_temp0';
  }

  @override
  String shareUnsupported(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 個檔案無法新增。Anchor 支援圖片和音訊。',
    );
    return '$_temp0';
  }

  @override
  String shareTooBig(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 個檔案超過 50 MB，無法新增。',
    );
    return '$_temp0';
  }

  @override
  String get shareOverLimit => '僅新增前 20 個檔案。';

  @override
  String shareRemoveItem(String name) {
    return '移除 $name';
  }

  @override
  String get actionLock => '鎖定';

  @override
  String get actionChangeLock => '變更鎖定方式';

  @override
  String get actionRemoveLock => '解除鎖定';

  @override
  String get lockSheetTitle => '鎖定';

  @override
  String get lockSheetChangeTitle => '變更鎖定方式';

  @override
  String get lockSheetSubtitle => '用什麼開啟筆記';

  @override
  String get lockKindBiometric => '指紋或臉部';

  @override
  String get lockKindBiometricHelp => '也可以用手機的螢幕鎖定';

  @override
  String get lockKindPin => 'PIN 碼';

  @override
  String get lockKindPinHelp => '所有鎖定的筆記共用一組 PIN 碼';

  @override
  String get lockKindPattern => '圖形';

  @override
  String get lockKindPatternHelp => '所有鎖定的筆記共用一個圖形';

  @override
  String get lockKindTap => '輕觸即可';

  @override
  String get lockKindTapHelp => '隱藏筆記，輕觸後顯示';

  @override
  String noteLockedWith(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'biometric': '已用指紋或臉部鎖定',
      'pin': '已用 PIN 碼鎖定',
      'pattern': '已用圖形鎖定',
      'other': '已鎖定，輕觸即可開啟',
    });
    return '$_temp0';
  }

  @override
  String noteLockChanged(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'biometric': '現在用指紋或臉部鎖定',
      'pin': '現在用 PIN 碼鎖定',
      'pattern': '現在用圖形鎖定',
      'other': '現在輕觸即可開啟',
    });
    return '$_temp0';
  }

  @override
  String get noteLockRemoved => '已解除鎖定';

  @override
  String notesLocked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已鎖定 $count 則筆記',
      one: '筆記已鎖定',
    );
    return '$_temp0';
  }

  @override
  String notesLockedSome(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已鎖定 $count 則筆記。尚未開啟的已鎖定筆記維持原本的鎖定方式。',
      one: '已鎖定 1 則筆記。尚未開啟的已鎖定筆記維持原本的鎖定方式。',
    );
    return '$_temp0';
  }

  @override
  String notesLockOpenFirst(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '請先開啟這些筆記再變更鎖定方式',
      one: '請先開啟這則筆記再變更鎖定方式',
    );
    return '$_temp0';
  }

  @override
  String lockNeedsServer(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '設定 PIN 碼需要連線到伺服器',
      'other': '設定圖形需要連線到伺服器',
    });
    return '$_temp0';
  }

  @override
  String lockChangeNeedsServer(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '變更 PIN 碼需要連線到伺服器',
      'other': '變更圖形需要連線到伺服器',
    });
    return '$_temp0';
  }

  @override
  String get lockUntitled => '已鎖定的筆記';

  @override
  String get lockTapToUnlock => '輕觸解鎖';

  @override
  String get lockUnlock => '解鎖';

  @override
  String get lockEnterPin => '輸入你的 PIN 碼';

  @override
  String get lockDrawPattern => '畫出你的圖形';

  @override
  String get lockUseBiometric => '使用指紋、臉部或螢幕鎖定';

  @override
  String lockBiometricReason(String title) {
    return '解鎖「$title」';
  }

  @override
  String get lockTooManyTries => '嘗試次數過多。請先解鎖手機，然後再試一次。';

  @override
  String get lockCantCheck => '暫時無法在這支手機上驗證。請連線網路後再試一次。';

  @override
  String lockWrong(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN 碼錯誤',
      'other': '圖形錯誤',
    });
    return '$_temp0';
  }

  @override
  String get lockPatternGrid => '圖形格線。請劃過至少 4 個點。';

  @override
  String get lockPinErase => '刪除數字';

  @override
  String lockPinDigits(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 位數字',
      one: '1 位數字',
      zero: '未輸入數字',
    );
    return '$_temp0';
  }

  @override
  String lockSetupTitle(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN 碼',
      'other': '圖形',
    });
    return '$_temp0';
  }

  @override
  String lockSetupChoose(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '設定 PIN 碼',
      'other': '畫出圖形',
    });
    return '$_temp0';
  }

  @override
  String lockSetupChooseNew(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '設定新的 PIN 碼',
      'other': '畫出新的圖形',
    });
    return '$_temp0';
  }

  @override
  String lockSetupConfirm(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '再次輸入 PIN 碼',
      'other': '再次畫出圖形',
    });
    return '$_temp0';
  }

  @override
  String get lockSetupCurrentHelp => '你目前使用的那個';

  @override
  String lockSetupChooseHelp(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '4 到 12 位數字。用於開啟所有以 PIN 碼鎖定的筆記。',
      'other': '至少連接 4 個點。用於開啟所有以圖形鎖定的筆記。',
    });
    return '$_temp0';
  }

  @override
  String get lockSetupConfirmHelp => '再確認一次';

  @override
  String lockSetupNotYours(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '這不是你的 PIN 碼',
      'other': '這不是你的圖形',
    });
    return '$_temp0';
  }

  @override
  String lockSetupBadShape(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '請使用 4 到 12 位數字',
      'other': '請連接至少 4 個點，每個點只能用一次',
    });
    return '$_temp0';
  }

  @override
  String lockSetupMismatch(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '兩次輸入的 PIN 碼不一致，請再試一次。',
      'other': '兩次畫出的圖形不一致，請再試一次。',
    });
    return '$_temp0';
  }

  @override
  String get lockSetupForgot => '忘記了？使用密碼';

  @override
  String get lockSetupPasswordTitle => '你的帳號密碼';

  @override
  String lockErrorWrongProof(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN 碼或密碼錯誤',
      'other': '圖形或密碼錯誤',
    });
    return '$_temp0';
  }

  @override
  String lockErrorInvalid(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN 碼須為 4 到 12 位數字',
      'other': '圖形須連接至少 4 個點',
    });
    return '$_temp0';
  }

  @override
  String get lockErrorUnsupported => '你的伺服器尚不支援筆記鎖定';

  @override
  String lockErrorOffline(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '無法儲存 PIN 碼，需要連線到伺服器。',
      'other': '無法儲存圖形，需要連線到伺服器。',
    });
    return '$_temp0';
  }

  @override
  String lockSaved(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': 'PIN 碼已儲存',
      'other': '圖形已儲存',
    });
    return '$_temp0';
  }

  @override
  String get settingsNoteLocks => '筆記鎖定';

  @override
  String settingsLockSet(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '設定 PIN 碼',
      'other': '設定圖形',
    });
    return '$_temp0';
  }

  @override
  String settingsLockChange(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '變更 PIN 碼',
      'other': '變更圖形',
    });
    return '$_temp0';
  }

  @override
  String settingsLockHelp(String kind) {
    String _temp0 = intl.Intl.selectLogic(kind, {
      'pin': '用於開啟以 PIN 碼鎖定的筆記',
      'other': '用於開啟以圖形鎖定的筆記',
    });
    return '$_temp0';
  }

  @override
  String get cardLocked => '已鎖定';

  @override
  String get cardUnlocked => '已鎖定，螢幕關閉前保持開啟';

  @override
  String get settingsBackup => '備份';

  @override
  String get backupExport => '匯出備份';

  @override
  String get backupExportHelp => '將所有筆記、標籤、圖片和錄音儲存到一個檔案';

  @override
  String get backupExporting => '正在建立備份…';

  @override
  String get backupSaveTitle => '儲存備份';

  @override
  String backupSaved(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已將 $count 則筆記儲存到備份',
      one: '已將 1 則筆記儲存到備份',
    );
    return '$_temp0';
  }

  @override
  String backupMissingFiles(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '有 $count 個附件不在這支手機上，且無法取得。',
      one: '有 1 個附件不在這支手機上，且無法取得。',
    );
    return '$_temp0';
  }

  @override
  String get backupExportFailed => '無法建立備份';

  @override
  String get backupRestore => '還原備份';

  @override
  String get backupRestoreHelp => '從備份檔案還原筆記。現有的筆記維持不變';

  @override
  String get backupRestoring => '正在還原…';

  @override
  String get backupPickTitle => '選擇 Anchor 備份';

  @override
  String get backupOpenFailed => '無法開啟檔案';

  @override
  String backupRestored(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已還原 $count 則筆記',
      one: '已還原 1 則筆記',
    );
    return '$_temp0';
  }

  @override
  String backupAlreadyHere(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 則已存在。',
      one: '1 則已存在。',
    );
    return '$_temp0';
  }

  @override
  String get backupNothingToRestore => '無需還原：所有筆記都已存在';

  @override
  String get backupRestoreFailed => '無法還原備份';

  @override
  String get backupNotABackup => '此檔案不是 Anchor 備份';

  @override
  String get backupDamaged => '此備份已損毀';

  @override
  String get backupTooNew => '此備份來自較新版本的 Anchor。請更新 App 後再還原。';

  @override
  String get attachmentFileAdded => '檔案已新增';

  @override
  String get attachmentFileAddedOffline => '檔案已新增。重新連線後將自動上傳。';

  @override
  String get attachmentFileAddFailed => '無法新增檔案';

  @override
  String get attachmentFileDeleted => '檔案已刪除';

  @override
  String attachmentsAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已新增 $count 個附件',
      one: '已新增 1 個附件',
    );
    return '$_temp0';
  }

  @override
  String attachmentsAddedOffline(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已新增 $count 個附件。重新連線後將自動上傳。',
      one: '已新增 1 個附件。重新連線後將自動上傳。',
    );
    return '$_temp0';
  }

  @override
  String get pictureInTextCamera => '拍照';

  @override
  String get pictureInTextChoose => '選擇圖片';

  @override
  String get pictureCrop => '裁切';

  @override
  String get pictureCropReset => '重設';

  @override
  String get cameraFlashOff => '閃光燈關';

  @override
  String get cameraFlashOn => '閃光燈開';

  @override
  String get cameraNone => '找不到相機';

  @override
  String get cameraNoPermission => 'Anchor 需要相機權限才能拍照';

  @override
  String get cameraFailed => '無法啟動相機';

  @override
  String get cameraSwitch => '切換相機';

  @override
  String get cameraShutter => '拍照';

  @override
  String get cameraPointAtPage => '對準一頁紙';

  @override
  String get cameraPageFound => '已識別頁面';

  @override
  String cameraTaken(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已拍 $count 張',
      one: '已拍 1 張',
    );
    return '$_temp0';
  }

  @override
  String cameraPicturesAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已新增 $count 張圖片',
      one: '已新增 1 張圖片',
    );
    return '$_temp0';
  }

  @override
  String get inlinePicture => '圖片';

  @override
  String get inlinePictureRetake => '重拍';

  @override
  String get inlinePictureMirrorHorizontally => '水平翻轉';

  @override
  String get inlinePictureMirrorVertically => '垂直翻轉';

  @override
  String get inlinePictureAddCaption => '新增說明';

  @override
  String get inlinePictureEditCaption => '編輯說明';

  @override
  String get inlinePictureCaptionHint => '圖片說明';

  @override
  String get inlinePictureChangeFailed => '無法修改圖片';

  @override
  String get inlinePictureResize => '調整圖片大小';

  @override
  String get fileOffline => '重新連線後即可開啟此檔案';

  @override
  String get fileLoadFailed => '無法載入檔案';

  @override
  String get fileNoApp => '這支手機上沒有能開啟它的 App，請改為儲存。';

  @override
  String get fileSaveDialog => '儲存檔案';

  @override
  String fileSaved(String name) {
    return '已儲存 $name';
  }

  @override
  String get fileSaveFailed => '無法儲存檔案';

  @override
  String fileOpen(String name) {
    return '開啟 $name';
  }

  @override
  String fileSave(String name) {
    return '儲存 $name';
  }

  @override
  String get addTakeSeveral => '連續拍攝';

  @override
  String get addFiles => '檔案';

  @override
  String get addFolder => '資料夾';

  @override
  String get addFolderFailed => '無法讀取該資料夾';

  @override
  String get addFolderEmpty => '該資料夾是空的';

  @override
  String get actionAddImage => '新增圖片';

  @override
  String get actionTakePicture => '拍照';

  @override
  String get actionTakeSeveral => '連續拍攝';

  @override
  String get actionFreeze => '凍結';

  @override
  String get actionUnfreeze => '解凍';

  @override
  String get noteFreezeHelp => '在你解凍之前，任何人都無法修改或刪除它';

  @override
  String get noteFreezeFailed => '無法凍結，需要連線到伺服器。';

  @override
  String get noteUnfreezeFailed => '無法解凍，需要連線到伺服器。';

  @override
  String notesFrozen(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已凍結 $count 則筆記',
      one: '筆記已凍結',
    );
    return '$_temp0';
  }

  @override
  String notesUnfrozen(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已解凍 $count 則筆記',
      one: '筆記已解凍',
    );
    return '$_temp0';
  }

  @override
  String notesFrozenStay(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '已凍結的筆記無法刪除，請先解凍。',
      one: '已凍結的筆記無法刪除，請先解凍。',
    );
    return '$_temp0';
  }

  @override
  String get notesLockOrFreeze => '鎖定或凍結';

  @override
  String get readOnlyFrozenByOwner => '擁有者已將其凍結，因此無法修改。';

  @override
  String get notePublicCanView => '公開：任何擁有連結的人都能檢視';

  @override
  String get notePublicCanEdit => '公開：任何擁有連結的人都能編輯';

  @override
  String get cardFrozen => '已凍結';

  @override
  String get noteNewCamera => '拍照筆記';

  @override
  String get actionReminder => '提醒';

  @override
  String get actionCheckboxes => '核取方塊';

  @override
  String get actionModifyQuickActions => '修改快速操作';

  @override
  String get settingsQuickActions => '快速操作';

  @override
  String get settingsQuickActionsHelp => '依此順序顯示在筆記頂端列，最多可放 5 個。拖曳即可調整順序。';

  @override
  String get settingsQuickActionsEmpty => '無。所有操作都在「更多」中。';

  @override
  String get settingsMoreActions => '在「更多」中';

  @override
  String get settingsMoreActionsHelp => '關閉某項後，它不會出現在任何地方。點按 + 可將其放到頂端列。';

  @override
  String get settingsQuickActionsReset => '重設快捷操作';

  @override
  String settingsAddToBar(String action) {
    return '將 $action 放到頂端列';
  }

  @override
  String settingsMoveAction(String action) {
    return '移動 $action';
  }

  @override
  String settingsRemoveFromBar(String action) {
    return '將 $action 移出頂端列';
  }

  @override
  String get settingsCopySetup => '複製配置';

  @override
  String get settingsPasteSetup => '貼上配置';

  @override
  String get settingsSetupCopied => '快捷操作已複製';

  @override
  String get settingsSetupPasted => '快捷操作已貼上';

  @override
  String get settingsSetupPasteFailed => '剪貼簿中沒有已複製的快捷操作';

  @override
  String get authMagicCodeUsed => '此 QR 碼或魔法連結已失效。請在網頁版的「設定」中重新產生。';

  @override
  String get magicLoginScan => '掃描 QR 碼';

  @override
  String get magicLoginScanTitle => '掃描魔法登入 QR 碼';

  @override
  String get magicLoginScanHint =>
      '在網頁版中開啟「設定」，在「在手機上登入」下點按「顯示 QR 碼」，然後將相機對準它。';

  @override
  String get magicLoginNotOurs => '這不是魔法登入 QR 碼。請使用網頁版「設定」中的 QR 碼。';

  @override
  String get magicLoginNoPermission => 'Anchor 需要相機權限才能掃描 QR 碼';

  @override
  String get magicLoginSigningIn => '正在登入…';

  @override
  String get magicLoginAlreadySignedIn => '你已登入。請先登出，再使用魔法連結。';

  @override
  String liveImageConnecting(String device) {
    return '正在連線 $device…';
  }

  @override
  String liveImageWaiting(String device) {
    return '正在等待 $device。請在該裝置上開啟 Anchor 以顯示畫面。';
  }

  @override
  String liveImageScreenPaused(String device) {
    return '$device 目前沒有分享螢幕。';
  }

  @override
  String liveImageCameraPaused(String device) {
    return '$device 目前無法顯示相機畫面。';
  }

  @override
  String get liveImageSomeDevice => '新增它的裝置';

  @override
  String get liveImageBadge => '即時';

  @override
  String get liveImageCamera => '即時相機';

  @override
  String get liveImageScreen => '即時螢幕';

  @override
  String get liveImageSoundOn => '開啟聲音';

  @override
  String get liveImageSoundOff => '關閉聲音';

  @override
  String get liveImageMicMuted => '麥克風已靜音';

  @override
  String liveImageViewers(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 人觀看',
      one: '1 人觀看',
      zero: '無人觀看',
    );
    return '$_temp0';
  }

  @override
  String get liveImageStillKept => '靜態畫面已加入附件';

  @override
  String get liveImageStillFailed => '無法儲存即時圖片的靜態畫面';

  @override
  String get liveImageCameraOff => '你的相機已關閉。';

  @override
  String get liveImageTurnCameraOn => '開啟相機';

  @override
  String get liveImageCameraFailed => '無法開啟相機';

  @override
  String get liveImageMute => '麥克風靜音';

  @override
  String get liveImageUnmute => '取消麥克風靜音';

  @override
  String get addLiveCamera => '即時相機';

  @override
  String get liveCameraTitle => '即時相機';

  @override
  String get liveCameraSubtitle =>
      '只要 Anchor 在這支手機上保持開啟，任何開啟此筆記的裝置都會即時顯示這支手機的相機畫面。';

  @override
  String get liveCameraFront => '前置';

  @override
  String get liveCameraBack => '後置';

  @override
  String get liveCameraMic => '麥克風';

  @override
  String get liveCameraMicHint => '同時傳送這支手機的聲音；直播時可以靜音。';

  @override
  String get liveCameraAdd => '新增到筆記';

  @override
  String get liveCameraNoCamera => '無法開啟任何相機。';

  @override
  String get flowchart => '流程圖';

  @override
  String get slashWordsFlowchart =>
      'diagram chart flow process boxes arrows decision 流程圖 圖表 流程 方框 箭頭 判斷';

  @override
  String get flowchartNew => '新增流程圖';

  @override
  String get flowchartEdit => '編輯流程圖';

  @override
  String get flowchartAdd => '新增';

  @override
  String get flowchartStep => '步驟';

  @override
  String get flowchartDecision => '判斷';

  @override
  String get flowchartEnd => '結束';

  @override
  String get flowchartStartOrEnd => '開始或結束';

  @override
  String get flowchartWrite => '輸入文字';

  @override
  String get flowchartNextStep => '下一步';

  @override
  String get flowchartFit => '顯示全部';

  @override
  String get flowchartRemove => '移除流程圖';

  @override
  String get flowchartBoxText => '方框中的文字';

  @override
  String get flowchartArrowText => '箭頭上的文字';

  @override
  String get flowchartArrowHint => '標籤，例如「是」';

  @override
  String get flowchartDiscardTitle => '丟棄更改？';

  @override
  String get flowchartDiscardMessage => '對此流程圖的更改尚未儲存。';

  @override
  String get flowchartDiscard => '丟棄';

  @override
  String get flowchartRemoveTitle => '移除流程圖？';

  @override
  String get flowchartRemoveMessage => '流程圖將從筆記中移除。在筆記中復原即可找回。';

  @override
  String flowchartCanvas(int boxes, int arrows) {
    return '流程圖，包含 $boxes 個方框和 $arrows 個箭頭。點按方框可選取，再次點按可輸入文字。';
  }

  @override
  String flowchartLabel(String name) {
    return '流程圖：$name';
  }

  @override
  String get flowchartOpenHint => '開啟流程圖進行編輯';

  @override
  String get pageScanTitle => '掃描頁面';

  @override
  String get pageScanStraighten => '校正';

  @override
  String get pageScanWhole => '整張圖片';

  @override
  String get pageScanFinding => '正在尋找頁面…';

  @override
  String get pageScanFound => '拖曳角點，使其貼合頁面。';

  @override
  String get pageScanNotFound => '找不到頁面。請將角點拖曳到頁面的四個角上。';

  @override
  String get pageScanCorner => '頁面角點';

  @override
  String get inlinePictureStraighten => '校正頁面';

  @override
  String get scanTitle => '掃描檔';

  @override
  String get scanNew => '新掃描檔';

  @override
  String get scanAdd => '新增';

  @override
  String get scanDocument => '掃描文件';

  @override
  String get scanPage => '頁面';

  @override
  String scanPageNumber(int number, int count) {
    return '第 $number 頁，共 $count 頁';
  }

  @override
  String scanPageNumberShort(int number) {
    return '第 $number 頁';
  }

  @override
  String scanPages(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count 頁',
      one: '1 頁',
    );
    return '$_temp0';
  }

  @override
  String get scanBrightness => '亮度';

  @override
  String get scanContrast => '對比';

  @override
  String get scanCleanup => '均勻背景';

  @override
  String get scanThreshold => '墨色';

  @override
  String get scanCorners => '角點';

  @override
  String get scanTurnLeft => '向左旋轉';

  @override
  String get scanTurnRight => '向右旋轉';

  @override
  String get scanProfileBw => '黑白';

  @override
  String get scanProfileWhiteboard => '白板';

  @override
  String get scanProfileText => '彩色文字';

  @override
  String get scanProfileColor => '全彩';

  @override
  String get scanLookForAll => '套用至所有頁面';

  @override
  String get scanMovePage => '移動頁面';

  @override
  String get scanDeletePage => '刪除頁面';

  @override
  String get scanNameHint => '名稱（用於 PDF）';

  @override
  String get scanPhotoMissing => '部分照片尚未同步到這支手機，請稍後再試。';

  @override
  String get scanPdfFailed => '無法產生 PDF。';

  @override
  String get scanSharePdf => '分享 PDF';

  @override
  String get scanSavePdf => '儲存 PDF';

  @override
  String get scanMakingPdf => '正在產生 PDF…';

  @override
  String get scanPdfSaved => 'PDF 已儲存';

  @override
  String get scanNoPages => '還沒有頁面。請拍攝或選擇頁面的照片。';

  @override
  String get scanTakePhotos => '拍照';

  @override
  String get scanPdfPaper => '紙張';

  @override
  String get scanPaperLetter => 'Letter';

  @override
  String get scanPaperFit => '圖片尺寸';

  @override
  String get scanPdfMargin => '邊界';

  @override
  String get scanMarginNone => '無';

  @override
  String scanMarginMm(int mm) {
    return '$mm mm';
  }

  @override
  String get scanPdfQuality => '品質';

  @override
  String get scanQualitySmall => '小';

  @override
  String get scanQualityStandard => '標準';

  @override
  String get scanQualityHigh => '高';

  @override
  String get scanRemove => '移除掃描檔';

  @override
  String get scanOpenHint => '開啟掃描檔進行修改';

  @override
  String get scanFromGallery => '從相簿選擇';

  @override
  String get settingsServer => '伺服器';

  @override
  String get settingsServerAddresses => '地址';

  @override
  String settingsServerAddressInUse(String address) {
    return '目前使用：$address';
  }

  @override
  String get serverAddressesTitle => '伺服器地址';

  @override
  String get serverAddressesOrder => '依此順序嘗試';

  @override
  String get serverAddressesHelp =>
      '為同一台伺服器新增更多地址，例如家中的地址，以及外出時透過 VPN 存取的地址。應用程式會依序嘗試，並使用第一個回應的地址。你的筆記和帳號在每個地址上都相同。';

  @override
  String get serverAddressesMain => '主要地址';

  @override
  String get serverAddressesInUse => '使用中';

  @override
  String get serverAddressesMainInUse => '主要地址 · 使用中';

  @override
  String serverAddressesMoveUp(String address) {
    return '上移 $address';
  }

  @override
  String serverAddressesMoveDown(String address) {
    return '下移 $address';
  }

  @override
  String serverAddressesRemove(String address) {
    return '移除 $address';
  }

  @override
  String get serverAddressesAdd => '新增地址';

  @override
  String get serverAddressesAddHint => 'http://192.168.1.20:3000';

  @override
  String get serverAddressesAlreadyAdded => '此地址已在清單中';

  @override
  String get serverAddressesCheck => '立即檢查地址';

  @override
  String get serverAddressesChecking => '正在檢查…';

  @override
  String serverAddressesUsing(String address) {
    return '正在使用 $address';
  }

  @override
  String serverAddressesNoneAnswered(String address) {
    return '沒有地址回應。仍在使用 $address';
  }

  @override
  String get serverAddressesNone => '未連線伺服器。';

  @override
  String get regularServerCrumb => '一般 Anchor 伺服器';

  @override
  String get regularServerCrumbLabel => '一般 Anchor 伺服器：部分 Anchor+ 功能已關閉。查看有哪些';

  @override
  String get regularServerTitle => '一般 Anchor 伺服器';

  @override
  String regularServerTitleHost(String host) {
    return '$host 是一般 Anchor 伺服器';
  }

  @override
  String get regularServerMessage =>
      '筆記、標籤、提醒、與他人共享以及備份照常可用。Anchor+ 的專屬功能需要 Anchor+ 伺服器，因此已關閉：鎖定、凍結和複製筆記、即時共同編輯、即時圖片、公開連結、圖片搜尋、已登入裝置，以及依你自己的順序拖曳排列筆記。';

  @override
  String get regularServerConnect => '連線';

  @override
  String magicLoginNeedsPlus(String host) {
    return '$host 是一般 Anchor 伺服器，無法使用登入碼登入。請改用密碼登入。';
  }

  @override
  String get nativeWidgetLabel => '筆記';

  @override
  String get nativeWidgetDescription => '在主畫面查看筆記並新增筆記。';

  @override
  String get nativeNewNote => '新增筆記';

  @override
  String get nativeNewChecklist => '新增清單';

  @override
  String get nativeWidgetEmpty => '還沒有筆記。\n點按 + 寫下第一則。';

  @override
  String get nativeWidgetSignedOut => '登入 Anchor\n即可在此查看筆記。';

  @override
  String get nativeLiveChannel => '即時影像';

  @override
  String get nativeLiveTransmitting => '正在傳輸';

  @override
  String get nativeLiveTransmittingText => '一則筆記正在即時顯示你的相機畫面。';

  @override
  String get nativeLiveStop => '停止傳輸';

  @override
  String get nativeRecordingChannel => '語音錄音';

  @override
  String get nativeRecordingTitle => '正在錄音';

  @override
  String get nativeRecordingText => '打開 Anchor 以停止錄音。';

  @override
  String get nativeMusicUse => 'Anchor 使用你的音樂資料庫將音訊檔案加入筆記。';

  @override
  String get nativeCameraUse => 'Anchor 使用相機為你的筆記和大頭貼拍攝照片。';

  @override
  String get nativeFaceIdUse => 'Anchor 使用 Face ID 打開你用它鎖定的筆記。';

  @override
  String get nativeLocalNetworkUse => '當你的伺服器在區域網路中時，Anchor 會連線到它。';

  @override
  String get nativeMicrophoneUse => 'Anchor 使用麥克風錄製語音筆記。';

  @override
  String get nativePhotoLibraryAddUse => 'Anchor 將筆記中的圖片儲存到你的照片圖庫。';

  @override
  String get nativePhotoLibraryUse => 'Anchor 使用你的照片圖庫為筆記加入圖片並選擇大頭貼。';

  @override
  String get authLastAdmin => '你是此伺服器上唯一的管理員。請先將其他人設為管理員。';

  @override
  String get deleteAccountTitle => '刪除帳號';

  @override
  String get deleteAccountWarning => '此操作無法復原。';

  @override
  String get deleteAccountMessage =>
      '你的帳號、筆記、標籤、附件和提醒將從此伺服器上永久刪除，你將在所有裝置上登出。你共享的筆記及其公開連結將對所有人失效。你加入他人筆記中的圖片和檔案會保留在那些筆記中。';

  @override
  String get deleteAccountExport => '如需保留筆記副本，請先在網頁版的設定中匯出。';

  @override
  String get deleteAccountPasswordHelp => '輸入密碼以確認。';

  @override
  String get deleteAccountConfirm => '刪除帳號';

  @override
  String get deleteAccountDeleting => '正在刪除…';

  @override
  String get deleteAccountDone => '帳號已刪除';

  @override
  String get deleteAccountOffline => '你已離線。請連上網路後再刪除帳號。';

  @override
  String get deleteAccountDialogTitle => '刪除你的帳號？';

  @override
  String get deleteAccountDialogMessage => '你的帳號和筆記將從此伺服器上永久刪除。';

  @override
  String get settingsDeleteAccount => '刪除帳號';
}
