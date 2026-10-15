pluginManagement {
    val googleMavenMirror = providers.gradleProperty("jame.googleMavenMirror").orNull
    repositories {
        if (googleMavenMirror.isNullOrBlank()) {
            google()
        } else {
            maven(googleMavenMirror) {
                name = "OptionalGoogleMavenMirror"
                content {
                    includeGroupByRegex("com\\.android.*")
                    includeGroupByRegex("androidx\\..*")
                    includeGroup("com.google.testing.platform")
                }
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    val googleMavenMirror = providers.gradleProperty("jame.googleMavenMirror").orNull
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        if (googleMavenMirror.isNullOrBlank()) {
            google()
        } else {
            maven(googleMavenMirror) {
                name = "OptionalGoogleMavenMirror"
                content {
                    includeGroupByRegex("com\\.android.*")
                    includeGroupByRegex("androidx\\..*")
                    includeGroup("com.google.testing.platform")
                }
            }
        }
        mavenCentral()
    }
}

rootProject.name = "JameAlTafasirMansour"
include(":android")
