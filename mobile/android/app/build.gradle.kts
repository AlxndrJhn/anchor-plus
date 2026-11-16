import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Released builds (ORG_GRADLE_PROJECT_anchorPlus=true) are named Anchor+,
// others Anchor Notes. Every build is com.alxndrjhn.anchorplus.
val isPlusBuild = (project.findProperty("anchorPlus") as String?) == "true"

// Builds for Google Play (ORG_GRADLE_PROJECT_playStore=true) leave out the
// permission to install the app's own updates: Play doesn't allow apps to
// update themselves, and keeps them up to date itself.
val isPlayBuild = (project.findProperty("playStore") as String?) == "true"

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.alxndrjhn.anchorplus"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        // flutter_local_notifications needs java.time on minSdk 24.
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.alxndrjhn.anchorplus"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        manifestPlaceholders["appAuthRedirectScheme"] = "anchor"
        manifestPlaceholders["appLabel"] = when {
            isPlusBuild -> "Anchor+"
            else -> "Anchor Notes"
        }
    }

    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String?
            keyPassword = keystoreProperties["keyPassword"] as String?
            storeFile = keystoreProperties["storeFile"]?.let { file(it) }
            storePassword = keystoreProperties["storePassword"] as String?
        }
    }

    if (isPlayBuild) {
        sourceSets.getByName("release").manifest.srcFile("src/play/AndroidManifest.xml")
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
        }
        release {
            // Without key.properties the APK is unsigned, as F-Droid builds
            // it (it signs it itself).
            if (keystorePropertiesFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
    // FileProvider, to hand a downloaded update to Android's installer.
    implementation("androidx.core:core:1.17.0")
    // An AppCompat theme, which the fingerprint prompt needs on Android 8
    // and older (local_auth).
    implementation("androidx.appcompat:appcompat:1.7.1")
}
