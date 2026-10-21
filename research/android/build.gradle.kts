plugins {
    id("com.android.application")
}

val keystorePath = providers.environmentVariable("JAME_KEYSTORE_PATH").orNull
val keystorePassword = providers.environmentVariable("JAME_KEYSTORE_PASSWORD").orNull
val keyAliasValue = providers.environmentVariable("JAME_KEY_ALIAS").orNull
val keyPasswordValue = providers.environmentVariable("JAME_KEY_PASSWORD").orNull
val hasReleaseSigning = listOf(
    keystorePath,
    keystorePassword,
    keyAliasValue,
    keyPasswordValue,
).all { !it.isNullOrBlank() }

android {
    namespace = "org.jamealtafasir.mobile"
    compileSdk = 36
    buildToolsVersion = "36.0.0"

    defaultConfig {
        applicationId = "org.jamealtafasir.mobile"
        minSdk = 24
        targetSdk = 36
        versionCode = 20801
        versionName = "2.8.0-preview.3"

        vectorDrawables.useSupportLibrary = false
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = file(requireNotNull(keystorePath))
                storePassword = requireNotNull(keystorePassword)
                keyAlias = requireNotNull(keyAliasValue)
                keyPassword = requireNotNull(keyPasswordValue)
                enableV1Signing = true
                enableV2Signing = true
                enableV3Signing = true
                enableV4Signing = true
            }
        }
    }

    flavorDimensions += "distribution"
    productFlavors {
        create("direct") {
            dimension = "distribution"
            buildConfigField("String", "DISTRIBUTION_CHANNEL", "\"direct\"")
            buildConfigField("boolean", "SELF_UPDATE_ENABLED", "true")
            manifestPlaceholders["distributionChannel"] = "direct"
        }
        create("myket") {
            dimension = "distribution"
            buildConfigField("String", "DISTRIBUTION_CHANNEL", "\"myket\"")
            buildConfigField("boolean", "SELF_UPDATE_ENABLED", "false")
            manifestPlaceholders["distributionChannel"] = "myket"
        }
        create("play") {
            dimension = "distribution"
            buildConfigField("String", "DISTRIBUTION_CHANNEL", "\"play\"")
            buildConfigField("boolean", "SELF_UPDATE_ENABLED", "false")
            manifestPlaceholders["distributionChannel"] = "play"
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isDebuggable = false
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        resources.excludes += setOf(
            "META-INF/DEPENDENCIES",
            "META-INF/LICENSE*",
            "META-INF/NOTICE*",
        )
    }

    androidResources {
        // Required for AssetFileDescriptor and HTTP range playback in WebView.
        noCompress += "mp3"
    }

    lint {
        abortOnError = true
        checkReleaseBuilds = true
        warningsAsErrors = true
        // AGP 8.13 reports a newer-plugin hint even though it is the stable
        // release line documented for API 36; keep other lint warnings fatal.
        disable += "AndroidGradlePluginVersion"
        // Direct-distribution preview deliberately retains the API 36 baseline
        // of release 2.7. API 37 migration needs separate device validation.
        disable += "OldTargetApi"
    }
}

android.sourceSets.getByName("main").assets.directories.add(
    rootProject.layout.projectDirectory.dir("dist").asFile.absolutePath,
)

val verifyWebAssets = tasks.register("verifyWebAssets") {
    description = "Verifies that the production Vite bundle exists before packaging."
    group = "verification"
    inputs.dir(rootProject.layout.projectDirectory.dir("dist"))
    doLast {
        val entryPoint = rootProject.layout.projectDirectory.file("dist/index.html").asFile
        check(entryPoint.isFile) {
            "dist/index.html is missing. Run pnpm run build before building Android."
        }
    }
}

tasks.named("preBuild").configure {
    dependsOn(verifyWebAssets)
}

val validateReleaseSigning = tasks.register("validateReleaseSigning") {
    description = "Fails release builds when external signing credentials are missing."
    group = "verification"
    doLast {
        check(hasReleaseSigning) {
            "Release signing is not configured. Set JAME_KEYSTORE_PATH, " +
                "JAME_KEYSTORE_PASSWORD, JAME_KEY_ALIAS and JAME_KEY_PASSWORD."
        }
    }
}

tasks.configureEach {
    if (name.matches(Regex("assemble(Direct|Myket|Play)Release"))) {
        dependsOn(validateReleaseSigning)
    }
}
