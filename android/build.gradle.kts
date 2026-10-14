plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    alias(libs.plugins.androidx.room)
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
    compileSdk = 37
    buildToolsVersion = "36.0.0"

    defaultConfig {
        applicationId = "org.jamealtafasir.mobile"
        minSdk = 24
        targetSdk = 37
        versionCode = 20500
        versionName = "2.5.0"

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
        compose = true
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

    lint {
        abortOnError = true
        checkReleaseBuilds = true
        warningsAsErrors = true
        // Dependency versions are intentionally pinned to the verified offline
        // toolchain. CI updates them through a separate, reviewable change.
        disable += setOf(
            "AndroidGradlePluginVersion",
            "GradleDependency",
            "NewerVersionAvailable",
        )
    }
}

room3 {
    schemaDirectory("$projectDir/schemas")
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.compose.foundation)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    debugImplementation(libs.androidx.compose.ui.tooling)

    implementation(libs.dagger.hilt.android)
    ksp(libs.dagger.hilt.compiler)
    implementation(libs.androidx.hilt.lifecycle.viewmodel.compose)

    implementation(libs.androidx.room.runtime)
    ksp(libs.androidx.room.compiler)
    implementation(libs.androidx.sqlite.bundled)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.kotlinx.serialization.json)

    testImplementation(libs.junit4)
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
