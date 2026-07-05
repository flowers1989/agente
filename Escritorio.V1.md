# Escritorio.V1 — Flujo de Consentimiento e Instalación de Toolchains Nativas

> Versión 1.0 — Junio 2026

---

## 1. Resumen

Este documento define el flujo que debe seguir el agente cuando el usuario solicita compilar una aplicación para una plataforma que requiere toolchains nativas no disponibles en el entorno actual.

El principio fundamental es:

> **El agente nunca instala software de sistema sin el consentimiento explícito del usuario.**

El usuario debe ser informado de:
- Qué toolchains son necesarias.
- Por qué se requieren.
- Cuánto espacio y tiempo demandan.
- Qué permisos de sistema se necesitan.

Solo después de recibir un consentimiento explícito el agente procederá a instalar lo necesario.

---

## 2. Flujo General

```
Usuario: "Compila mi app para Android y Windows"
        ↓
Agente: detecta intención de compilación
        ↓
Agente: analiza plataformas solicitadas
        ↓
Agente: verifica toolchains disponibles en el sistema
        ↓
├─ Si todo está instalado → compila directamente
└─ Si falta algo → genera propuesta de instalación
        ↓
Agente: muestra al usuario:
  • Plataformas a compilar
  • Toolchains faltantes
  • Espacio estimado en disco
  • Tiempo estimado de instalación
  • Permisos requeridos
        ↓
Usuario: confirma o rechaza
        ↓
├─ Rechaza → agente explica alternativas (compilar solo plataformas disponibles, usar contenedores, etc.)
└─ Acepta → agente instala toolchains
        ↓
Agente: valida instalación
        ↓
Agente: ejecuta compilación
        ↓
Agente: entrega artefactos
```

---

## 3. Toolchains por Plataforma

### 3.1 Android

| Componente | Uso | Instalación típica |
|---|---|---|
| Android SDK | Compilar y empaquetar APK/AAB | `sdkmanager` o Android Studio |
| Gradle | Sistema de build | Incluido en wrapper del proyecto |
| Java JDK 17+ | Compilación Kotlin/Java | `apt install openjdk-17-jdk` / descarga de Oracle |
| Android NDK | Código nativo C/C++ (opcional) | `sdkmanager "ndk;25.2.9519653"` |

**Validación:**
```bash
java -version
sdkmanager --list
./gradlew --version
```

---

### 3.2 Android TV

| Componente | Uso | Instalación típica |
|---|---|---|
| Android SDK | Igual que Android | Igual que Android |
| Leanback Support Library | UI optimizada para TV | Incluida como dependencia Gradle |

**Nota:** comparte toolchain con Android.

---

### 3.3 Windows

| Componente | Uso | Instalación típica |
|---|---|---|
| .NET SDK 8+ | Compilar WinUI / WPF / Console | `winget install Microsoft.DotNet.SDK.8` |
| Visual Studio Build Tools | Compiladores C++, MSBuild | Instalador de VS Build Tools |
| WiX Toolset | Generar instaladores MSI | `dotnet tool install wix` |
| SignTool | Firmar ejecutables | Incluido en Windows SDK |

**Validación:**
```bash
dotnet --version
msbuild -version
```

**Nota:** en Linux solo se puede compilar para Windows usando cross-compilation o Mono/.NET con limitaciones. Para binarios nativos reales se recomienda un runner Windows o Wine con precaución.

---

### 3.4 Linux

| Componente | Uso | Instalación típica |
|---|---|---|
| Python 3 | Runtime para apps Python | Generalmente preinstalado |
| GCC/Clang | Compilación nativa | `apt install build-essential` |
| dpkg-dev | Crear paquetes DEB | `apt install dpkg-dev` |
| rpm-build | Crear paquetes RPM | `apt install rpm` |
| appimagetool | Crear AppImage | Descarga oficial |

**Validación:**
```bash
python3 --version
gcc --version
dpkg-deb --version
```

---

### 3.5 macOS

| Componente | Uso | Instalación típica |
|---|---|---|
| Xcode Command Line Tools | Compiladores Swift/C/C++ | `xcode-select --install` |
| Xcode completo | Firmar, notarizar, crear DMG | App Store o portal de desarrolladores |
| create-dmg | Crear imágenes DMG | `brew install create-dmg` |

**Validación:**
```bash
xcode-select -p
swift --version
codesign --version
```

**Nota:** macOS requiere hardware Apple o un entorno virtualizado con macOS para compilar nativamente. No es posible en Linux/Windows de forma legal sin macOS.

---

## 4. Mensaje de Consentimiento al Usuario

Ejemplo de diálogo que el agente debe mostrar:

```
Para compilar tu aplicación "ChatApp" para Android y Windows necesito instalar
las siguientes herramientas nativas en este equipo:

Plataforma: Android
  • OpenJDK 17           (~400 MB)
  • Android SDK          (~2-4 GB)
  • Gradle               (~150 MB)
  Total estimado: 3-5 GB

Plataforma: Windows
  • .NET SDK 8           (~800 MB)
  • Visual Studio Build Tools  (~2-6 GB)
  Total estimado: 3-7 GB

Tiempo estimado de instalación: 10-30 minutos
Permisos requeridos: administrador / sudo

¿Autorizas la instalación? [Sí] [No]
```

El usuario debe poder:
- Aceptar todas las instalaciones.
- Seleccionar solo algunas plataformas.
- Rechazar y optar por compilar solo plataformas ya disponibles.

---

## 5. Proceso de Instalación

### 5.1 Detección previa

Antes de pedir consentimiento, el agente ejecuta scripts de detección no invasivos:

```bash
# Java
java -version 2>&1

# Android SDK
command -v sdkmanager

# .NET
dotnet --version 2>&1

# Python
python3 --version 2>&1

# GCC
gcc --version 2>&1
```

### 5.2 Instalación por consentimiento

Si el usuario acepta, el agente ejecuta los comandos de instalación correspondientes:

```bash
# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install -y openjdk-17-jdk python3 python3-pip build-essential dpkg-dev

# Android SDK
mkdir -p ~/android-sdk/cmdline-tools
cd ~/android-sdk/cmdline-tools
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-*.zip
mv cmdline-tools latest
export ANDROID_HOME=$HOME/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# .NET (Linux)
wget https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt update
sudo apt install -y dotnet-sdk-8.0
```

### 5.3 Validación post-instalación

Después de instalar, el agente vuelve a validar:

```bash
java -version && echo "JDK OK"
sdkmanager --list >/dev/null && echo "Android SDK OK"
dotnet --version && echo ".NET OK"
```

Si falla, se informa al usuario con el error específico y se ofrecen alternativas.

---

## 6. Seguridad y Permisos

### 6.1 Principios

1. **Consentimiento explícito:** nunca instalar en segundo plano.
2. **Mínimo privilegio:** instalar solo lo estrictamente necesario.
3. **Origen verificado:** descargar solo desde fuentes oficiales (Google, Microsoft, repositorios oficiales).
4. **Logs claros:** registrar cada comando ejecutado y su resultado.
5. **Rollback documentado:** si una instalación falla, dejar el sistema en estado conocido.

### 6.2 Confirmaciones requeridas

El agente debe pedir confirmación antes de:
- Ejecutar cualquier comando con `sudo`.
- Descargar archivos de más de 500 MB.
- Modificar variables de entorno del sistema.
- Instalar paquetes del sistema operativo.

---

## 7. Integración con el Sistema Actual

### 7.1 En el flujo de compilación

El `BuildManager` actual debe ser extendido para:

1. Antes de compilar, detectar toolchains faltantes.
2. Generar una propuesta de instalación.
3. Esperar confirmación del usuario antes de instalar.
4. Una vez confirmado, delegar la instalación a un `ToolchainInstaller`.
5. Después de instalar, reintentar la compilación.

### 7.2 Nuevos componentes sugeridos

```
src/lib/compilation/
├── toolchain/
│   ├── ToolchainDetector.ts      # Detecta toolchains instaladas
│   ├── ToolchainProposal.ts      # Genera propuesta para el usuario
│   ├── ToolchainInstaller.ts     # Ejecuta instalaciones con consentimiento
│   └── validators/               # Validadores por plataforma
│       ├── AndroidValidator.ts
│       ├── WindowsValidator.ts
│       ├── LinuxValidator.ts
│       └── MacOSValidator.ts
```

### 7.3 API sugerida

```typescript
// POST /api/compile/check-toolchains
{
  "platforms": ["android", "windows"]
}

// Response
{
  "ready": false,
  "missing": [
    {
      "platform": "android",
      "tools": [
        { "name": "OpenJDK 17", "installed": false, "size": "400 MB" },
        { "name": "Android SDK", "installed": false, "size": "3 GB" }
      ]
    }
  ],
  "totalSize": "3.4 GB",
  "estimatedTime": "15 minutos"
}

// POST /api/compile/install-toolchains
{
  "platforms": ["android"],
  "consent": true
}
```

---

## 8. Ejemplo de Interacción Completa

```
Usuario: Compila mi app ChatApp para Android.

Agente: Voy a compilar ChatApp para Android. Primero necesito verificar
        las herramientas disponibles en el sistema.

        [Verificando...]

Agente: Encontré lo siguiente:
        ✅ Python 3.11
        ❌ OpenJDK 17
        ❌ Android SDK

        Para compilar para Android necesito instalar:
        • OpenJDK 17  (~400 MB)
        • Android SDK (~3 GB)

        Tiempo estimado: 15 minutos
        Se requiere permiso de administrador.

        ¿Deseas que instale estas herramientas ahora? Responde "sí" para
        continuar, o dime qué plataformas alternativas prefieres.

Usuario: Sí, instala todo.

Agente: Instalando OpenJDK 17...
        [progreso]
        Instalando Android SDK...
        [progreso]
        Validando instalación...

        ✅ Toolchains listas. Procediendo a compilar ChatApp para Android.

        [Compilando...]

Agente: Compilación completada.
        📦 chatapp-1.0.0-android.apk (12 MB)
        ⬇️  Descargar: /api/compile/download/...
```

---

## 9. Manejo de Errores

| Situación | Acción del agente |
|---|---|
| Usuario rechaza instalar | Ofrecer compilar solo plataformas disponibles o sugerir contenedores |
| Instalación falla | Informar error, mostrar logs, no continuar con esa plataforma |
| Falta espacio en disco | Calcular espacio libre y advertir antes de instalar |
| No hay permisos de admin | Pedir que el usuario ejecute manualmente los comandos sugeridos |
| Plataforma no soportada en el SO | Explicar limitaciones (ej. macOS requiere macOS) |

---

## 10. Notas Finales

- Esta propuesta prioriza la transparencia y el control del usuario sobre el sistema.
- La instalación automática solo debe ejecutarse en entornos controlados y con consentimiento.
- Para entornos de producción compartidos se recomienda usar contenedores Docker preconfigurados en lugar de instalar toolchains en el host.
- El agente debe siempre poder cancelar el proceso si el usuario lo solicita.

---

*Documento de diseño Escritorio.V1*
