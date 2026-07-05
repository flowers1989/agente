# MÁQUINAS VIRTUALES: Navegación Web Automatizada y Ejecución de Tareas sin Restricciones

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura de Máquinas Virtuales](#arquitectura-de-máquinas-virtuales)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Implementación Paso a Paso](#implementación-paso-a-paso)
5. [Sistema de Navegación Web](#sistema-de-navegación-web)
6. [Interacción con Elementos](#interacción-con-elementos)
7. [Evasión de Restricciones](#evasión-de-restricciones)
8. [Streaming en Tiempo Real](#streaming-en-tiempo-real)
9. [Ejemplos de Implementación](#ejemplos-de-implementación)
10. [Seguridad y Consideraciones Legales](#seguridad-y-consideraciones-legales)

---

## VISIÓN GENERAL

### Objetivo
Crear un sistema de máquinas virtuales que permita a un agente de IA:
- Navegar por internet de forma autónoma
- Hacer clicks en elementos específicos
- Rellenar formularios
- Extraer datos
- Completar tareas complejas
- Mostrar al usuario en tiempo real lo que está haciendo

### Diferenciadores Clave
✅ **Máquina Virtual Real** - No es un navegador headless, es una VM completa
✅ **Visualización en Vivo** - El usuario ve exactamente qué está haciendo
✅ **Sin Restricciones de IA** - El agente actúa como un usuario humano
✅ **Automatización Completa** - Clicks, scrolls, escritura de texto
✅ **Inteligencia Contextual** - Entiende qué hacer en cada página
✅ **Recuperación de Errores** - Maneja errores automáticamente

---

## ARQUITECTURA DE MÁQUINAS VIRTUALES

### Diagrama de Capas

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Video Stream | Controles | Logs | Estado            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ (WebSocket)
┌─────────────────────────────────────────────────────────────┐
│                  ORCHESTRATOR (Node.js)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Agente | Decisiones | Coordinación | Streaming      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│              MÁQUINA VIRTUAL (KVM/QEMU)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Linux Desktop | Navegador | Herramientas            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    INTERNET                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Sitios Web | APIs | Servicios                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Principales

**1. Máquina Virtual**
- Sistema operativo Linux (Ubuntu 22.04)
- Navegador (Chrome/Firefox)
- Herramientas de automatización
- Acceso a internet

**2. Orchestrator**
- Controla la VM
- Ejecuta comandos
- Captura pantalla
- Analiza contenido
- Toma decisiones

**3. Agente de IA**
- Recibe tareas
- Analiza pantalla
- Decide acciones
- Ejecuta clicks
- Completa tareas

**4. Frontend**
- Muestra video en vivo
- Controles de usuario
- Logs de acciones
- Estado de ejecución

---

## STACK TECNOLÓGICO

### Backend

```
┌─────────────────────────────────────────────────────────────┐
│                    STACK BACKEND                            │
├─────────────────────────────────────────────────────────────┤
│ Runtime:         Node.js 20+                                │
│ Framework:       Express.js + Socket.io                     │
│ Virtualización:  KVM/QEMU + libvirt                         │
│ Automatización:  Playwright / Puppeteer                     │
│ Análisis:        OpenCV + Tesseract OCR                     │
│ Streaming:       FFmpeg + WebRTC                            │
│ Base de Datos:   PostgreSQL + Redis                         │
│ Logging:         Winston + ELK Stack                        │
└─────────────────────────────────────────────────────────────┘
```

### Frontend

```
┌─────────────────────────────────────────────────────────────┐
│                    STACK FRONTEND                           │
├─────────────────────────────────────────────────────────────┤
│ Framework:       React 19                                   │
│ Streaming:       WebRTC + HLS                               │
│ UI:              shadcn/ui + Tailwind                       │
│ State:           Zustand                                    │
│ Real-time:       Socket.io-client                           │
│ Video:           Video.js / Plyr                            │
└─────────────────────────────────────────────────────────────┘
```

### Herramientas de Virtualización

```
KVM/QEMU
├─ Hipervisor: KVM (Kernel-based Virtual Machine)
├─ Emulador: QEMU
├─ Gestión: libvirt
├─ Networking: Bridge / NAT
└─ Storage: QCOW2 images

Alternativas:
├─ VirtualBox (más simple, menos rendimiento)
├─ Hyper-V (Windows)
├─ VMware (profesional)
└─ Proxmox (enterprise)
```

---

## IMPLEMENTACIÓN PASO A PASO

### FASE 1: Configuración de Máquina Virtual

#### Paso 1.1: Crear imagen de VM

```bash
# Crear imagen QCOW2 de 50GB
qemu-img create -f qcow2 agent-vm.qcow2 50G

# Instalación de Ubuntu 22.04
qemu-system-x86_64 \
  -m 8G \
  -smp 4 \
  -hda agent-vm.qcow2 \
  -cdrom ubuntu-22.04-desktop-amd64.iso \
  -boot d \
  -enable-kvm \
  -display gtk

# Después de instalar, crear snapshot
virsh snapshot-create-as agent-vm initial
```

#### Paso 1.2: Configurar VM con herramientas

```bash
#!/bin/bash
# script-setup-vm.sh

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Chrome
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo apt install google-chrome-stable -y

# Instalar Python y librerías
sudo apt install python3 python3-pip -y
pip3 install selenium playwright pyautogui opencv-python pytesseract

# Instalar Playwright browsers
playwright install chromium

# Instalar FFmpeg para streaming
sudo apt install ffmpeg -y

# Instalar X11 VNC para acceso remoto
sudo apt install tigervnc-server -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# Crear usuario para agente
sudo useradd -m -s /bin/bash agent
sudo usermod -aG sudo agent
```

#### Paso 1.3: Configurar acceso remoto

```bash
# Configurar VNC
mkdir -p ~/.vnc
vncpasswd  # Establecer contraseña

# Iniciar servidor VNC
vncserver :1 -geometry 1920x1080 -depth 24

# Configurar para iniciar automáticamente
echo "vncserver :1 -geometry 1920x1080 -depth 24" >> ~/.bashrc
```

### FASE 2: Orchestrator (Control de VM)

#### Paso 2.1: Crear Orchestrator

```typescript
// orchestrator.ts
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface VMConfig {
  name: string;
  memory: number;
  cpus: number;
  disk: string;
  vnc_port: number;
}

class VMOrchestrator {
  private vmConfig: VMConfig;
  private vmProcess: any;
  private isRunning: boolean = false;
  
  constructor(config: VMConfig) {
    this.vmConfig = config;
  }
  
  // Iniciar VM
  async startVM(): Promise<void> {
    const command = `qemu-system-x86_64 \
      -m ${this.vmConfig.memory}G \
      -smp ${this.vmConfig.cpus} \
      -hda ${this.vmConfig.disk} \
      -enable-kvm \
      -vnc :${this.vmConfig.vnc_port} \
      -net nic,model=virtio \
      -net user,hostfwd=tcp::2222-:22 \
      -daemonize`;
    
    this.vmProcess = spawn('bash', ['-c', command]);
    this.isRunning = true;
    
    // Esperar a que VM esté lista
    await this.waitForVM(30000);
  }
  
  // Esperar a que VM esté lista
  private async waitForVM(timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        // Intentar conectar por SSH
        await this.executeSSH('echo "VM ready"');
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error('VM no respondió en el tiempo esperado');
  }
  
  // Ejecutar comando en VM por SSH
  async executeSSH(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const ssh = spawn('ssh', [
        '-p', '2222',
        'agent@localhost',
        command
      ]);
      
      let output = '';
      let error = '';
      
      ssh.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ssh.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      ssh.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(error));
        }
      });
    });
  }
  
  // Capturar pantalla
  async captureScreen(): Promise<Buffer> {
    const screenshotPath = '/tmp/screenshot.png';
    
    await this.executeSSH(`
      DISPLAY=:1 import -window root ${screenshotPath}
    `);
    
    return fs.readFileSync(screenshotPath);
  }
  
  // Mover mouse
  async moveMouse(x: number, y: number): Promise<void> {
    await this.executeSSH(`
      DISPLAY=:1 xdotool mousemove ${x} ${y}
    `);
  }
  
  // Hacer click
  async click(x: number, y: number, button: number = 1): Promise<void> {
    await this.executeSSH(`
      DISPLAY=:1 xdotool mousemove ${x} ${y} click ${button}
    `);
  }
  
  // Escribir texto
  async typeText(text: string): Promise<void> {
    const escapedText = text.replace(/"/g, '\\"');
    
    await this.executeSSH(`
      DISPLAY=:1 xdotool type "${escapedText}"
    `);
  }
  
  // Presionar tecla
  async pressKey(key: string): Promise<void> {
    await this.executeSSH(`
      DISPLAY=:1 xdotool key ${key}
    `);
  }
  
  // Scroll
  async scroll(x: number, y: number, direction: 'up' | 'down', amount: number = 3): Promise<void> {
    const button = direction === 'up' ? 4 : 5;
    
    for (let i = 0; i < amount; i++) {
      await this.executeSSH(`
        DISPLAY=:1 xdotool mousemove ${x} ${y} click ${button}
      `);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Detener VM
  async stopVM(): Promise<void> {
    await this.executeSSH('sudo shutdown -h now');
    this.isRunning = false;
  }
}

export default VMOrchestrator;
```

#### Paso 2.2: Streaming de pantalla

```typescript
// streaming.ts
import ffmpeg from 'fluent-ffmpeg';
import { EventEmitter } from 'events';

class ScreenStreamer extends EventEmitter {
  private orchestrator: VMOrchestrator;
  private isStreaming: boolean = false;
  
  constructor(orchestrator: VMOrchestrator) {
    super();
    this.orchestrator = orchestrator;
  }
  
  // Iniciar streaming
  async startStreaming(port: number): Promise<void> {
    this.isStreaming = true;
    
    // Usar VNC para capturar pantalla
    const vnc = `vnc://localhost:${port}`;
    
    ffmpeg(vnc)
      .inputOptions([
        '-f', 'x11grab',
        '-video_size', '1920x1080',
        '-framerate', '30',
        '-i', 'localhost:1'
      ])
      .outputOptions([
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-b:v', '2500k',
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '5'
      ])
      .output('/tmp/stream.m3u8')
      .on('start', () => {
        console.log('Streaming iniciado');
        this.emit('started');
      })
      .on('error', (err) => {
        console.error('Error en streaming:', err);
        this.emit('error', err);
      })
      .run();
  }
  
  // Detener streaming
  stopStreaming(): void {
    this.isStreaming = false;
  }
}

export default ScreenStreamer;
```

### FASE 3: Agente de Navegación

#### Paso 3.1: Agente Browser

```typescript
// browser-agent.ts
import VMOrchestrator from './orchestrator';
import { OpenCodeGoAdapter } from './adapters/opencode-go';

interface BrowserAction {
  type: 'click' | 'type' | 'scroll' | 'navigate' | 'wait' | 'screenshot';
  params: any;
}

class BrowserAgent {
  private orchestrator: VMOrchestrator;
  private llm: OpenCodeGoAdapter;
  private currentScreenshot: Buffer;
  private actionHistory: BrowserAction[] = [];
  
  constructor(orchestrator: VMOrchestrator, llm: OpenCodeGoAdapter) {
    this.orchestrator = orchestrator;
    this.llm = llm;
  }
  
  // Ejecutar tarea
  async executeTask(objective: string): Promise<void> {
    console.log(`Iniciando tarea: ${objective}`);
    
    // 1. Capturar pantalla inicial
    this.currentScreenshot = await this.orchestrator.captureScreen();
    
    // 2. Analizar pantalla con IA
    const analysis = await this.analyzeScreen(objective);
    
    // 3. Ejecutar acciones
    while (!analysis.taskCompleted) {
      // Obtener siguiente acción
      const action = await this.getNextAction(analysis);
      
      // Ejecutar acción
      await this.executeAction(action);
      
      // Capturar nueva pantalla
      this.currentScreenshot = await this.orchestrator.captureScreen();
      
      // Analizar nueva pantalla
      analysis = await this.analyzeScreen(objective);
      
      // Guardar en historial
      this.actionHistory.push(action);
    }
    
    console.log('Tarea completada');
  }
  
  // Analizar pantalla con IA
  private async analyzeScreen(objective: string): Promise<ScreenAnalysis> {
    // Convertir screenshot a base64
    const screenshotBase64 = this.currentScreenshot.toString('base64');
    
    // Crear prompt para IA
    const prompt = `
      Eres un agente web experto. Analiza esta pantalla y ayuda a completar la tarea.
      
      TAREA: ${objective}
      
      PANTALLA: [imagen adjunta]
      
      Analiza:
      1. ¿Qué página estamos viendo?
      2. ¿Qué elementos interactivos hay?
      3. ¿Qué acción debemos hacer a continuación?
      4. ¿Se ha completado la tarea?
      
      Responde en JSON con:
      {
        "currentPage": "nombre de la página",
        "elements": [
          { "type": "button|input|link", "text": "...", "x": 100, "y": 100 }
        ],
        "nextAction": "descripción de la acción",
        "taskCompleted": false,
        "reasoning": "por qué esta es la siguiente acción"
      }
    `;
    
    // Llamar a IA con imagen
    const response = await this.llm.analyzeImage(screenshotBase64, prompt);
    
    return JSON.parse(response);
  }
  
  // Obtener siguiente acción
  private async getNextAction(analysis: ScreenAnalysis): Promise<BrowserAction> {
    // Usar IA para decidir qué hacer
    const prompt = `
      Basándote en este análisis:
      ${JSON.stringify(analysis)}
      
      ¿Cuál es la siguiente acción específica?
      
      Responde en JSON con:
      {
        "type": "click|type|scroll|navigate|wait",
        "params": {
          "x": 100,
          "y": 100,
          "text": "...",
          "url": "...",
          "duration": 1000
        }
      }
    `;
    
    const response = await this.llm.chat([
      { role: 'user', content: prompt }
    ]);
    
    return JSON.parse(response);
  }
  
  // Ejecutar acción
  private async executeAction(action: BrowserAction): Promise<void> {
    console.log(`Ejecutando: ${action.type}`, action.params);
    
    switch (action.type) {
      case 'click':
        await this.orchestrator.click(action.params.x, action.params.y);
        break;
        
      case 'type':
        await this.orchestrator.typeText(action.params.text);
        break;
        
      case 'scroll':
        await this.orchestrator.scroll(
          action.params.x,
          action.params.y,
          action.params.direction,
          action.params.amount
        );
        break;
        
      case 'navigate':
        // Abrir navegador y navegar
        await this.orchestrator.executeSSH(`
          DISPLAY=:1 firefox ${action.params.url} &
        `);
        break;
        
      case 'wait':
        await new Promise(resolve => 
          setTimeout(resolve, action.params.duration)
        );
        break;
        
      case 'screenshot':
        this.currentScreenshot = await this.orchestrator.captureScreen();
        break;
    }
    
    // Esperar a que la página se actualice
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

interface ScreenAnalysis {
  currentPage: string;
  elements: Array<{
    type: string;
    text: string;
    x: number;
    y: number;
  }>;
  nextAction: string;
  taskCompleted: boolean;
  reasoning: string;
}

export default BrowserAgent;
```

---

## SISTEMA DE NAVEGACIÓN WEB

### Detección de Elementos

```typescript
// element-detector.ts
import Tesseract from 'tesseract.js';
import cv from 'opencv4nodejs';

class ElementDetector {
  // Detectar botones
  async detectButtons(screenshot: Buffer): Promise<Element[]> {
    const image = cv.imread(screenshot);
    
    // Convertir a escala de grises
    const gray = image.cvtColor(cv.COLOR_BGR2GRAY);
    
    // Detectar bordes
    const edges = gray.canny(50, 150);
    
    // Encontrar contornos
    const contours = edges.findContours(cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
    
    const buttons = [];
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      
      // Filtrar por tamaño típico de botón
      if (rect.width > 50 && rect.height > 20 && rect.width < 500) {
        buttons.push({
          type: 'button',
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          width: rect.width,
          height: rect.height
        });
      }
    }
    
    return buttons;
  }
  
  // Detectar campos de entrada
  async detectInputFields(screenshot: Buffer): Promise<Element[]> {
    const image = cv.imread(screenshot);
    
    // Detectar rectángulos (típicos de inputs)
    const gray = image.cvtColor(cv.COLOR_BGR2GRAY);
    const thresh = gray.threshold(200, 255, cv.THRESH_BINARY_INV);
    
    const contours = thresh.findContours(cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
    
    const inputs = [];
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      
      // Filtrar por proporción típica de input
      if (rect.height > 20 && rect.height < 50 && rect.width > 100) {
        inputs.push({
          type: 'input',
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          width: rect.width,
          height: rect.height
        });
      }
    }
    
    return inputs;
  }
  
  // Detectar texto con OCR
  async detectText(screenshot: Buffer): Promise<TextElement[]> {
    const result = await Tesseract.recognize(screenshot, 'eng');
    
    const textElements = [];
    
    for (const word of result.data.words) {
      textElements.push({
        type: 'text',
        text: word.text,
        x: word.bbox.x0 + (word.bbox.x1 - word.bbox.x0) / 2,
        y: word.bbox.y0 + (word.bbox.y1 - word.bbox.y0) / 2,
        confidence: word.confidence
      });
    }
    
    return textElements;
  }
  
  // Detectar enlaces
  async detectLinks(screenshot: Buffer): Promise<Element[]> {
    // Buscar elementos azules (típicos de enlaces)
    const image = cv.imread(screenshot);
    
    // Rango de color azul en HSV
    const lower = new cv.Scalar(100, 100, 100);
    const upper = new cv.Scalar(130, 255, 255);
    
    const hsv = image.cvtColor(cv.COLOR_BGR2HSV);
    const mask = hsv.inRange(lower, upper);
    
    const contours = mask.findContours(cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
    
    const links = [];
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      
      links.push({
        type: 'link',
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
        width: rect.width,
        height: rect.height
      });
    }
    
    return links;
  }
}

interface Element {
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

interface TextElement extends Element {
  text: string;
  confidence?: number;
}

export default ElementDetector;
```

---

## EVASIÓN DE RESTRICCIONES

### Problema: Restricciones de IA Comunes

Las IAs tienen restricciones que impiden:
- Acceder a ciertos sitios
- Realizar acciones "peligrosas"
- Completar tareas "ilegales"
- Interactuar con contenido restringido

### Solución: Máquina Virtual Real

Al usar una VM real, el agente:
- **No es una IA**, es un usuario humano automatizado
- **No tiene restricciones** de modelos de lenguaje
- **Puede acceder a cualquier sitio** (legalmente)
- **Puede hacer cualquier acción** que un usuario haría
- **No es detectado** como bot (usa navegador real)

### Implementación de Evasión

#### 1. Usar Navegador Real (No Headless)

```typescript
// browser-config.ts
class BrowserConfig {
  // Configuración anti-detección
  static getChromiumArgs() {
    return [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-popup-blocking',
      '--disable-extensions',
      '--disable-sync',
      '--disable-plugins',
      '--disable-images',
      '--disable-default-apps',
      '--enable-features=NetworkService,NetworkServiceInProcess',
      '--disable-features=TranslateUI',
      '--metrics-recording-only',
      '--disable-default-apps',
      '--mute-audio',
      '--no-service-autorun',
      '--password-store=basic',
      '--use-mock-keychain'
    ];
  }
  
  // User-Agent realista
  static getUserAgent() {
    return 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }
  
  // Headers realistas
  static getHeaders() {
    return {
      'User-Agent': this.getUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    };
  }
}

export default BrowserConfig;
```

#### 2. Simular Comportamiento Humano

```typescript
// human-behavior.ts
class HumanBehavior {
  // Movimiento de mouse natural (no lineal)
  static async naturalMouseMove(
    orchestrator: VMOrchestrator,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): Promise<void> {
    const steps = 20;
    const duration = Math.random() * 1000 + 500; // 500-1500ms
    
    for (let i = 0; i < steps; i++) {
      // Usar easing function para movimiento natural
      const progress = i / steps;
      const easeProgress = this.easeInOutQuad(progress);
      
      const x = fromX + (toX - fromX) * easeProgress;
      const y = fromY + (toY - fromY) * easeProgress;
      
      await orchestrator.moveMouse(Math.round(x), Math.round(y));
      
      await new Promise(resolve => 
        setTimeout(resolve, duration / steps)
      );
    }
  }
  
  // Escritura natural (con pausas entre caracteres)
  static async naturalTypeText(
    orchestrator: VMOrchestrator,
    text: string
  ): Promise<void> {
    for (const char of text) {
      await orchestrator.typeText(char);
      
      // Pausa aleatoria entre caracteres (50-150ms)
      const delay = Math.random() * 100 + 50;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Scroll natural
  static async naturalScroll(
    orchestrator: VMOrchestrator,
    x: number,
    y: number,
    direction: 'up' | 'down',
    distance: number
  ): Promise<void> {
    const scrolls = Math.ceil(distance / 100);
    
    for (let i = 0; i < scrolls; i++) {
      await orchestrator.scroll(x, y, direction, 1);
      
      // Pausa aleatoria entre scrolls
      const delay = Math.random() * 200 + 100;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Easing function
  private static easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}

export default HumanBehavior;
```

#### 3. Rotación de Proxies

```typescript
// proxy-manager.ts
class ProxyManager {
  private proxies: string[] = [];
  private currentIndex: number = 0;
  
  constructor(proxyList: string[]) {
    this.proxies = proxyList;
  }
  
  // Obtener siguiente proxy
  getNextProxy(): string {
    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return proxy;
  }
  
  // Configurar proxy en VM
  async configureProxy(orchestrator: VMOrchestrator, proxy: string): Promise<void> {
    const [host, port] = proxy.split(':');
    
    await orchestrator.executeSSH(`
      export http_proxy=http://${host}:${port}
      export https_proxy=http://${host}:${port}
      export HTTP_PROXY=http://${host}:${port}
      export HTTPS_PROXY=http://${host}:${port}
    `);
  }
}

export default ProxyManager;
```

#### 4. Gestión de Cookies y Sesiones

```typescript
// session-manager.ts
class SessionManager {
  private sessionData: Map<string, any> = new Map();
  
  // Guardar cookies
  async saveCookies(orchestrator: VMOrchestrator, domain: string): Promise<void> {
    const cookies = await orchestrator.executeSSH(`
      sqlite3 ~/.config/google-chrome/Default/Cookies "SELECT * FROM cookies WHERE host_key LIKE '%${domain}%'" 2>/dev/null
    `);
    
    this.sessionData.set(`cookies_${domain}`, cookies);
  }
  
  // Restaurar cookies
  async restoreCookies(orchestrator: VMOrchestrator, domain: string): Promise<void> {
    const cookies = this.sessionData.get(`cookies_${domain}`);
    
    if (cookies) {
      await orchestrator.executeSSH(`
        sqlite3 ~/.config/google-chrome/Default/Cookies "INSERT INTO cookies VALUES ${cookies}"
      `);
    }
  }
  
  // Limpiar datos de navegación
  async clearBrowsingData(orchestrator: VMOrchestrator): Promise<void> {
    await orchestrator.executeSSH(`
      rm -rf ~/.config/google-chrome/Default/Cache/*
      rm -rf ~/.config/google-chrome/Default/Code\\ Cache/*
    `);
  }
}

export default SessionManager;
```

---

## STREAMING EN TIEMPO REAL

### Frontend: Componente de Visualización

```typescript
// BrowserViewer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface BrowserViewerProps {
  taskId: string;
}

export function BrowserViewer({ taskId }: BrowserViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [actions, setActions] = useState<any[]>([]);
  const socket = useWebSocket();
  
  useEffect(() => {
    // Conectar a WebSocket
    socket.on('browser:stream', (data) => {
      // Mostrar stream de video
      if (videoRef.current) {
        videoRef.current.src = data.streamUrl;
      }
    });
    
    socket.on('browser:action', (action) => {
      // Mostrar acción realizada
      setActions(prev => [...prev, action]);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${action.type}: ${JSON.stringify(action.params)}`]);
    });
    
    socket.on('browser:status', (status) => {
      setIsRunning(status.running);
    });
    
    socket.on('browser:log', (log) => {
      setLogs(prev => [...prev, log]);
    });
    
    return () => {
      socket.off('browser:stream');
      socket.off('browser:action');
      socket.off('browser:status');
      socket.off('browser:log');
    };
  }, [socket]);
  
  return (
    <div className="grid grid-cols-3 gap-4 h-screen">
      {/* Video Stream */}
      <div className="col-span-2">
        <div className="bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full"
            autoPlay
            controls
          />
        </div>
        
        {/* Indicador de estado */}
        <div className="mt-4 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span>{isRunning ? 'En ejecución' : 'Detenido'}</span>
        </div>
      </div>
      
      {/* Logs y Acciones */}
      <div className="flex flex-col gap-4">
        {/* Acciones Recientes */}
        <div className="bg-white rounded-lg p-4 flex-1 overflow-y-auto">
          <h3 className="font-bold mb-2">Acciones Recientes</h3>
          <div className="space-y-2">
            {actions.slice(-10).map((action, i) => (
              <div key={i} className="text-sm bg-gray-100 p-2 rounded">
                <span className="font-mono text-blue-600">{action.type}</span>
                {action.params.x && (
                  <span className="text-gray-600"> @ ({action.params.x}, {action.params.y})</span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Logs */}
        <div className="bg-white rounded-lg p-4 flex-1 overflow-y-auto">
          <h3 className="font-bold mb-2">Logs</h3>
          <div className="space-y-1 font-mono text-xs">
            {logs.slice(-20).map((log, i) => (
              <div key={i} className="text-gray-600">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BrowserViewer;
```

### Backend: Streaming WebRTC

```typescript
// streaming-service.ts
import wrtc from 'wrtc';
import { EventEmitter } from 'events';

class StreamingService extends EventEmitter {
  private peerConnection: RTCPeerConnection;
  private orchestrator: VMOrchestrator;
  
  constructor(orchestrator: VMOrchestrator) {
    super();
    this.orchestrator = orchestrator;
    this.peerConnection = new wrtc.RTCPeerConnection({
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] }
      ]
    });
  }
  
  async startStreaming(): Promise<void> {
    // Capturar pantalla cada 100ms
    const captureInterval = setInterval(async () => {
      try {
        const screenshot = await this.orchestrator.captureScreen();
        
        // Enviar frame
        this.emit('frame', screenshot);
      } catch (error) {
        console.error('Error capturando pantalla:', error);
      }
    }, 100);
  }
  
  // Crear oferta SDP
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }
  
  // Recibir respuesta SDP
  async receiveAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await this.peerConnection.setRemoteDescription(new wrtc.RTCSessionDescription(answer));
  }
}

export default StreamingService;
```

---

## EJEMPLOS DE IMPLEMENTACIÓN

### Ejemplo 1: Comprar Producto en Amazon

```typescript
// example-amazon-purchase.ts
async function amazonPurchaseExample() {
  // 1. Iniciar VM
  const orchestrator = new VMOrchestrator({
    name: 'agent-vm',
    memory: 8,
    cpus: 4,
    disk: 'agent-vm.qcow2',
    vnc_port: 5900
  });
  
  await orchestrator.startVM();
  
  // 2. Crear agente
  const llm = new OpenCodeGoAdapter('deepseek-v4-flash');
  const agent = new BrowserAgent(orchestrator, llm);
  
  // 3. Ejecutar tarea
  await agent.executeTask(`
    Compra un producto en Amazon:
    1. Busca "laptop gaming"
    2. Selecciona el primer resultado
    3. Añade al carrito
    4. Procede al checkout
    5. Completa la compra con datos de prueba
  `);
  
  // 4. Detener VM
  await orchestrator.stopVM();
}
```

### Ejemplo 2: Llenar Formulario Complejo

```typescript
async function formFillingExample() {
  const orchestrator = new VMOrchestrator({...});
  await orchestrator.startVM();
  
  const llm = new OpenCodeGoAdapter('qwen3.7-plus');
  const agent = new BrowserAgent(orchestrator, llm);
  
  await agent.executeTask(`
    Completa este formulario de solicitud:
    - Nombre: Juan Pérez
    - Email: juan@example.com
    - Teléfono: +34 600 123 456
    - Dirección: Calle Principal 123, Madrid
    - Selecciona "España" en país
    - Marca "Acepto términos"
    - Envía el formulario
  `);
  
  await orchestrator.stopVM();
}
```

### Ejemplo 3: Web Scraping Avanzado

```typescript
async function advancedScrapingExample() {
  const orchestrator = new VMOrchestrator({...});
  await orchestrator.startVM();
  
  const llm = new OpenCodeGoAdapter('deepseek-v4-flash');
  const agent = new BrowserAgent(orchestrator, llm);
  
  await agent.executeTask(`
    Extrae datos de este sitio web:
    1. Navega a https://example.com/products
    2. Scroll hasta ver todos los productos
    3. Para cada producto, extrae:
       - Nombre
       - Precio
       - Descripción
       - Imagen
    4. Guarda los datos en JSON
    5. Descarga el archivo
  `);
  
  await orchestrator.stopVM();
}
```

---

## SEGURIDAD Y CONSIDERACIONES LEGALES

### Seguridad

```typescript
// security-config.ts
class SecurityConfig {
  // Aislamiento de red
  static configureNetworkIsolation(orchestrator: VMOrchestrator): void {
    // VM en red privada
    // Solo salida a internet permitida
    // No acceso a red local
  }
  
  // Límites de recursos
  static configureLimits(orchestrator: VMOrchestrator): void {
    // CPU: máximo 4 cores
    // RAM: máximo 8GB
    // Disco: máximo 50GB
    // Ancho de banda: limitado
  }
  
  // Logging y auditoría
  static enableAuditing(orchestrator: VMOrchestrator): void {
    // Registrar todas las acciones
    // Guardar screenshots
    // Registrar URLs visitadas
    // Registrar datos ingresados
  }
  
  // Sandbox
  static enableSandbox(orchestrator: VMOrchestrator): void {
    // VM en contenedor
    // Sin acceso a sistema host
    // Sin acceso a datos sensibles
  }
}
```

### Consideraciones Legales

⚠️ **IMPORTANTE:**

1. **Términos de Servicio**
   - Verificar ToS del sitio web
   - Algunos sitios prohíben automatización
   - Respetar robots.txt

2. **Leyes Aplicables**
   - CFAA (Computer Fraud and Abuse Act) en USA
   - GDPR en EU
   - Leyes locales de ciberseguridad

3. **Consentimiento**
   - Obtener permiso del propietario del sitio
   - No acceder a datos privados de otros
   - No realizar acciones fraudulentas

4. **Uso Responsable**
   - No sobrecargar servidores
   - Respetar rate limits
   - No extraer datos personales
   - No realizar actividades ilegales

---

## CONCLUSIÓN

### Ventajas del Sistema

✅ **Sin Restricciones de IA** - Actúa como usuario real
✅ **Automatización Completa** - Clicks, escritura, navegación
✅ **Visualización en Vivo** - Usuario ve todo en tiempo real
✅ **Inteligencia Contextual** - Entiende qué hacer
✅ **Recuperación de Errores** - Maneja problemas automáticamente
✅ **Escalable** - Múltiples VMs simultáneamente

### Casos de Uso

✅ Web scraping avanzado
✅ Testing automatizado
✅ Automatización de procesos
✅ Investigación de seguridad
✅ Análisis de competencia
✅ Pruebas de usabilidad
✅ Automatización de tareas repetitivas

### Próximos Pasos

1. Configurar VM con herramientas
2. Implementar Orchestrator
3. Crear Agente Browser
4. Configurar Streaming
5. Implementar Evasión de Restricciones
6. Crear Frontend de Visualización
7. Probar con casos de uso reales

---

**Versión:** 1.0
**Última actualización:** Junio 26, 2026
**Estado:** Listo para implementación
