# Sistema de Desarrollo Multiplataforma - Guía Completa

## 📋 Descripción General

Tu agente `flowers1989/agente` ahora es una **plataforma completa de desarrollo multiplataforma** capaz de:

- ✅ **Programar sitios web** con previsualización en tiempo real
- ✅ **Programar aplicaciones móviles** (Android, iOS, Android TV)
- ✅ **Programar aplicaciones de escritorio** (Windows, macOS, Linux)
- ✅ **Compilar automáticamente** para todas las plataformas
- ✅ **Empaquetar código fuente** con archivos ZIP
- ✅ **Seleccionar el mejor modelo LLM** automáticamente para cada tarea

## 🏗️ Arquitectura del Sistema

### Componentes Principales

#### 1. **Model Selector** (`model-selector.ts`)
Sistema inteligente que analiza la complejidad de cada tarea y selecciona automáticamente el mejor modelo LLM de los 13 disponibles.

**Características:**
- Análisis de complejidad (low, medium, high, ultra-high)
- Detección de requisitos (razonamiento, código, creatividad)
- Ranking de modelos por score
- Selección por prioridad (velocidad, costo, calidad, balanceado)
- Estimación de tokens y costos

**Uso:**
```typescript
const analysis = ModelSelector.analyzeTaskComplexity(
  "Crear un sitio web de e-commerce con React",
  "web"
);
const best = ModelSelector.selectBestModel(analysis);
// Retorna: Kimi K2.7 Code (especializado en código)
```

#### 2. **Web Preview Service** (`web-preview-service.ts`)
Servicio que previsualiza sitios web en tiempo real, similar al Workspace de Manus IA.

**Características:**
- Creación de sesiones de previsualización con ID único
- Servidores HTTP locales en puertos dinámicos
- Soporte para HTML, CSS y JavaScript
- Actualización en tiempo real
- Limpieza automática de sesiones antiguas

**Uso:**
```typescript
const preview = await webPreviewService.createPreview({
  html: "<h1>Mi Sitio</h1>",
  css: "h1 { color: blue; }",
  title: "Mi Aplicación"
});
// Retorna: http://localhost:8000 (previsualización en vivo)
```

#### 3. **React Native Executor** (`react-native-executor.ts`)
Compilador especializado para aplicaciones móviles.

**Plataformas soportadas:**
- Android (.apk, .aab)
- iOS (.ipa)
- Android TV (.apk optimizado)

**Métodos:**
```typescript
await executor.createProject(config)        // Crear proyecto
await executor.buildAndroid(path)           // Compilar Android
await executor.buildIOS(path)               // Compilar iOS
await executor.buildAndroidTV(path)         // Compilar Android TV
await executor.buildAndroidAAB(path)        // Compilar AAB para Play Store
```

#### 4. **Electron Executor** (`electron-executor.ts`)
Compilador especializado para aplicaciones de escritorio.

**Plataformas soportadas:**
- Windows (.exe, .msi)
- macOS (.dmg, .app)
- Linux (.AppImage, .deb)

**Métodos:**
```typescript
await executor.createProject(config)        // Crear proyecto
await executor.buildWindows(path)           // Compilar Windows
await executor.buildMacOS(path)             // Compilar macOS
await executor.buildLinux(path)             // Compilar Linux
```

#### 5. **Build Service** (`build-service.ts`)
Servicio centralizado que orquesta compilaciones multiplataforma.

**Características:**
- Creación de trabajos de compilación con ID único
- Compilación paralela de múltiples plataformas
- Generación de reportes detallados
- Creación automática de ZIP con compilados
- Cálculo de tamaño total y duración

**Uso:**
```typescript
const buildService = getBuildService();
const job = await buildService.createBuildJob({
  projectId: "proj-123",
  projectName: "MiApp",
  targetPlatforms: ["android", "ios", "windows", "macos", "linux"],
  buildType: "release"
});
const result = await buildService.executeBuildJob(job.jobId);
```

#### 6. **Package Service** (`package-service.ts`)
Servicio de empaquetado que crea ZIPs con código fuente.

**Características:**
- Copia de código fuente con exclusiones inteligentes
- Exclusión automática de: node_modules, .git, dist, build, etc.
- Creación de README.md automático
- Inclusión de metadatos del proyecto
- Cálculo de checksum MD5
- Verificación de integridad del ZIP

**Uso:**
```typescript
const packageService = getPackageService();
const result = await packageService.createPackage({
  projectId: "proj-123",
  projectName: "MiApp",
  projectPath: "/home/ubuntu/projects/MiApp",
  metadata: {
    version: "1.0.0",
    author: "Mi Nombre",
    platforms: ["android", "ios", "windows"]
  }
});
```

### Herramientas Registradas en Tool Registry

```
✅ Web Preview              - Previsualiza sitios web en tiempo real
✅ Build Multiplataforma    - Compila para todas las plataformas
✅ Package & Zip            - Empaqueta código fuente
✅ Model Selection          - Selecciona el mejor modelo LLM
```

## 🚀 Flujo de Trabajo Completo

### Ejemplo: Crear una Aplicación Multiplataforma

```
Usuario: "Crea una aplicación de tareas para Android, iOS, Windows y macOS"
         ↓
Analyzer Agent
  - Analiza requisitos
  - Identifica complejidad
         ↓
Planner Agent
  - Crea plan de desarrollo
  - Selecciona herramientas
         ↓
Model Selector
  - Analiza: "Crear app React Native + Electron"
  - Selecciona: Kimi K2.7 Code (especializado en código)
         ↓
Executor Agent
  - Genera código React Native
  - Genera código Electron
  - Crea proyectos
         ↓
Web Preview Service
  - Previsualiza interfaz en navegador
         ↓
Build Service
  - Compila Android (.apk)
  - Compila iOS (.ipa)
  - Compila Windows (.exe)
  - Compila macOS (.dmg)
         ↓
Package Service
  - Empaqueta código fuente
  - Crea ZIP con compilados
         ↓
Reporter Agent
  - Genera reporte final
  - Entrega archivos al usuario
         ↓
Usuario recibe:
  - app-android.apk
  - app-ios.ipa
  - app-windows.exe
  - app-macos.dmg
  - app-source-code.zip
```

## 📊 Modelos LLM Disponibles

| Modelo | Especialidad | Velocidad | Costo | Calidad |
|--------|-------------|-----------|-------|---------|
| GLM-5.2 | Razonamiento avanzado | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Kimi K2.7 Code | Coding especializado | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| DeepSeek V4 Pro | Razonamiento complejo | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| DeepSeek V4 Flash | Velocidad + costo bajo | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| MiMo-V2.5 | Velocidad extrema | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Qwen3.7 Max | Máxima calidad | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 📱 Plataformas Soportadas

### Móvil (React Native)
- **Android**: .apk (debug/release), .aab (Play Store)
- **iOS**: .ipa (debug/release)
- **Android TV**: .apk optimizado para TV

### Escritorio (Electron)
- **Windows**: .exe (installer), .msi
- **macOS**: .dmg, .app
- **Linux**: .AppImage, .deb

### Web
- HTML, CSS, JavaScript
- Previsualización en tiempo real

## 🔧 Configuración y Requisitos

### Dependencias del Sistema
```bash
# Node.js y npm
node --version  # v22.13.0+
npm --version   # 10.0.0+

# Para React Native
npm install -g react-native-cli

# Para Electron
npm install -g electron

# Para compilación
# Android: Android SDK, Gradle
# iOS: Xcode (macOS)
# Windows: Visual Studio Build Tools
# Linux: build-essential
```

### Instalación de Dependencias del Proyecto
```bash
cd /home/ubuntu/flowers_agente
npm install
npm run setup-sandbox  # Instalar herramientas de compilación
```

## 📈 Casos de Uso

### 1. Crear Sitio Web Profesional
```
Usuario: "Crea un sitio web de portafolio con React y Tailwind"
Resultado: Sitio previsualizado en tiempo real + ZIP con código
```

### 2. Crear App Móvil Multiplataforma
```
Usuario: "Crea una app de notas para Android e iOS"
Resultado: app.apk + app.ipa + código fuente
```

### 3. Crear App de Escritorio Multiplataforma
```
Usuario: "Crea una app de administración de tareas para Windows, Mac y Linux"
Resultado: app-windows.exe + app-macos.dmg + app-linux.AppImage + código
```

### 4. Crear Aplicación Híbrida Completa
```
Usuario: "Crea una app de redes sociales para web, móvil y escritorio"
Resultado: Sitio web + app Android + app iOS + app Windows/Mac/Linux + código
```

## 🎯 Ventajas del Sistema

✅ **Automatización Completa**: Desde código hasta compilados listos para distribuir
✅ **Selección Inteligente de Modelos**: Elige el mejor LLM automáticamente
✅ **Previsualización en Tiempo Real**: Ve el resultado mientras se desarrolla
✅ **Compilación Multiplataforma**: Un comando para compilar todas las plataformas
✅ **Empaquetado Automático**: Código fuente + compilados en un ZIP
✅ **Reportes Detallados**: Información completa de cada compilación
✅ **Recuperación Automática**: Agent Loop maneja errores y reintentos

## 📝 Ejemplos de Uso

### Ejemplo 1: Crear y Compilar una App Móvil

```bash
# El usuario pide:
"Crea una app de calculadora para Android e iOS"

# El agente:
1. Selecciona Kimi K2.7 Code (especializado en código)
2. Genera código React Native
3. Previsualiza en navegador
4. Compila para Android (.apk)
5. Compila para iOS (.ipa)
6. Empaqueta código fuente
7. Entrega: calculadora.apk + calculadora.ipa + source.zip
```

### Ejemplo 2: Crear Sitio Web con Previsualización

```bash
# El usuario pide:
"Crea un sitio web de blog moderno"

# El agente:
1. Selecciona DeepSeek V4 Flash (velocidad)
2. Genera HTML, CSS, JavaScript
3. Crea previsualización: http://localhost:8000
4. Usuario ve el sitio en tiempo real
5. Entrega: sitio compilado + código fuente
```

## 🔐 Seguridad y Limitaciones

- Los compilados se almacenan en `/tmp/build-outputs`
- Los archivos ZIP se limpian automáticamente después de 24 horas
- Cada trabajo tiene un ID único para trazabilidad
- Se excluyen automáticamente archivos sensibles (.env, .git, etc.)

## 📞 Soporte y Troubleshooting

Si encuentras problemas:

1. **Verificar logs**: `npm run logs`
2. **Validar sandbox**: `bash scripts/validate-sandbox.sh`
3. **Reinstalar dependencias**: `npm install`
4. **Limpiar caché**: `npm run clean`

## 🎓 Próximos Pasos

Tu agente ahora puede:
- ✅ Programar aplicaciones multiplataforma
- ✅ Compilar automáticamente
- ✅ Previsualizar en tiempo real
- ✅ Entregar archivos empaquetados
- ✅ Seleccionar modelos inteligentemente

¡Tu sistema de desarrollo está listo para producción! 🚀
