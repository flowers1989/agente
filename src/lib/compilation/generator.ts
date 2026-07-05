// ==================== GENERADOR DE CÓDIGO BASE MULTIPLATAFORMA ====================
// Crea estructuras de proyecto y plantillas por plataforma.

import type { BuildConfig, GeneratedProject, Platform } from "./types";

export function generateProject(config: BuildConfig): GeneratedProject {
  const files: GeneratedProject["files"] = [];
  const enabledPlatforms = Object.entries(config.platforms)
    .filter(([, p]) => p?.enabled)
    .map(([platform]) => platform as Platform);

  // Archivo de configuración unificado
  files.push({
    path: "build-config.json",
    content: JSON.stringify(config, null, 2),
  });

  // README general
  files.push({
    path: "README.md",
    content: generateReadme(config),
  });

  // Código compartido
  files.push({
    path: "shared/constants.ts",
    content: `export const APP_NAME = "${config.project.name}";
export const APP_VERSION = "${config.project.version}";
export const APP_DESCRIPTION = "${config.project.description}";
`,
  });

  // Plantillas por plataforma
  enabledPlatforms.forEach((platform) => {
    const platformConfig = config.platforms[platform];
    if (!platformConfig) return;

    switch (platform) {
      case "android":
        files.push(...generateAndroidFiles(config));
        break;
      case "android-tv":
        files.push(...generateAndroidTVFiles(config));
        break;
      case "windows":
        files.push(...generateWindowsFiles(config));
        break;
      case "linux":
        files.push(...generateLinuxFiles(config));
        break;
      case "macos":
        files.push(...generateMacOSFiles(config));
        break;
    }
  });

  return {
    rootPath: `${config.project.name.toLowerCase().replace(/\s+/g, "-")}-project`,
    config,
    files,
  };
}

function generateReadme(config: BuildConfig): string {
  const platforms = Object.entries(config.platforms)
    .filter(([, p]) => p?.enabled)
    .map(([p]) => `- ${p}`)
    .join("\n");

  return `# ${config.project.name}

${config.project.description}

- Versión: ${config.project.version}
- Autor: ${config.project.author}
- Licencia: ${config.project.license}

## Plataformas soportadas

${platforms || "Ninguna plataforma seleccionada."}

## Características

- Offline: ${config.features.offline ? "Sí" : "No"}
- Cámara: ${config.features.camera ? "Sí" : "No"}
- GPS: ${config.features.gps ? "Sí" : "No"}
- Tiempo real: ${config.features.realtime ? "Sí" : "No"}
- IA: ${config.features.ai ? "Sí" : "No"}
- Gráficos: ${config.features.graphics || "básicos"}

## Compilación

Cada plataforma tiene su propio directorio con instrucciones.
`;
}

function generateAndroidFiles(config: BuildConfig): GeneratedProject["files"] {
  const name = config.project.name;
  const packageName = `com.example.${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

  return [
    {
      path: "android/app/build.gradle.kts",
      content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "${packageName}"
    compileSdk = 34

    defaultConfig {
        applicationId = "${packageName}"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "${config.project.version}"
    }

    buildTypes {
        release {
            isMinifyEnabled = ${config.optimization.minify}
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
}
`,
    },
    {
      path: "android/app/src/main/AndroidManifest.xml",
      content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:label="${name}"
        android:name=".${name.replace(/\s+/g, "")}Application"
        android:theme="@style/Theme.Material3.DayNight">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`,
    },
    {
      path: "android/app/src/main/java/com/example/MainActivity.kt",
      content: `package ${packageName}

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
    }
}
`,
    },
    {
      path: "android/app/src/main/res/layout/activity_main.xml",
      content: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="${name}"
        android:textSize="24sp" />
</LinearLayout>
`,
    },
    {
      path: "android/settings.gradle.kts",
      content: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "${name}"
include(":app")
`,
    },
  ];
}

function generateAndroidTVFiles(config: BuildConfig): GeneratedProject["files"] {
  return [
    {
      path: "android-tv/README.md",
      content: `# ${config.project.name} - Android TV

Aplicación Android TV con interfaz Leanback.

## Estructura

- \`app/src/main/java/\` - Código Kotlin
- \`app/src/main/res/layout/\` - Layouts Leanback
- \`app/build.gradle.kts\` - Configuración Gradle
`,
    },
    {
      path: "android-tv/app/src/main/AndroidManifest.xml",
      content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-feature android:name="android.software.leanback" android:required="true" />
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
    <application android:label="${config.project.name}" android:banner="@drawable/banner">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`,
    },
  ];
}

function generateWindowsFiles(config: BuildConfig): GeneratedProject["files"] {
  return [
    {
      path: "windows/README.md",
      content: `# ${config.project.name} - Windows

Aplicación Windows generada con WinUI 3 / .NET.
`,
    },
    {
      path: "windows/App.csproj",
      content: `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows10.0.19041.0</TargetFramework>
    <TargetPlatformMinVersion>10.0.19041.0</TargetPlatformMinVersion>
    <UseWinUI>true</UseWinUI>
  </PropertyGroup>
</Project>
`,
    },
    {
      path: "windows/MainWindow.xaml",
      content: `<Window
    x:Class="App.MainWindow"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="${config.project.name}">
    <StackPanel HorizontalAlignment="Center" VerticalAlignment="Center">
        <TextBlock Text="${config.project.name}" FontSize="24" />
        <TextBlock Text="${config.project.description}" FontSize="14" />
    </StackPanel>
</Window>
`,
    },
  ];
}

function generateLinuxFiles(config: BuildConfig): GeneratedProject["files"] {
  return [
    {
      path: "linux/main.py",
      content: `#!/usr/bin/env python3
"""${config.project.name} - ${config.project.description}"""

import sys

APP_NAME = "${config.project.name}"
APP_VERSION = "${config.project.version}"


def main():
    print(f"{APP_NAME} v{APP_VERSION}")
    print("${config.project.description}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
`,
    },
    {
      path: "linux/Makefile",
      content: `.PHONY: all run package clean

APP_NAME=${config.project.name.toLowerCase().replace(/\s+/g, "-")}
VERSION=${config.project.version}

all:
	chmod +x main.py

run:
	python3 main.py

package:
	mkdir -p dist
	tar -czf dist/$(APP_NAME)-$(VERSION)-linux.tar.gz main.py README.md

clean:
	rm -rf dist/
`,
    },
    {
      path: "linux/debian/control",
      content: `Package: ${config.project.name.toLowerCase().replace(/\s+/g, "-")}
Version: ${config.project.version}
Section: utils
Priority: optional
Architecture: amd64
Maintainer: ${config.project.author}
Description: ${config.project.description}
`,
    },
  ];
}

function generateMacOSFiles(config: BuildConfig): GeneratedProject["files"] {
  return [
    {
      path: "macos/README.md",
      content: `# ${config.project.name} - macOS

Aplicación macOS generada con SwiftUI.
`,
    },
    {
      path: "macos/ContentView.swift",
      content: `import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack {
            Text("${config.project.name}")
                .font(.largeTitle)
            Text("${config.project.description}")
                .font(.body)
        }
        .padding()
    }
}
`,
    },
    {
      path: "macos/Info.plist",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>${config.project.name}</string>
    <key>CFBundleIdentifier</key>
    <string>com.example.${config.project.name.toLowerCase().replace(/[^a-z0-9]/g, "")}</string>
    <key>CFBundleVersion</key>
    <string>${config.project.version}</string>
</dict>
</plist>
`,
    },
  ];
}
