# CONECTORES: Sistema de Integraciones con Aplicaciones y Servicios (V2)

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura de Conectores](#arquitectura-de-conectores)
3. [Tipos de Conectores](#tipos-de-conectores)
4. [Los 27 Conectores Principales](#los-27-conectores-principales)
5. [Conectores de Diseño: Canva y Figma](#conectores-de-diseño-canva-y-figma)
6. [Browser Control: Función de Control del Navegador](#browser-control-función-de-control-del-navegador)
7. [Implementación de Conectores](#implementación-de-conectores)
8. [Sistema de Autenticación](#sistema-de-autenticación)
9. [Gestión de Credenciales](#gestión-de-credenciales)
10. [Flujo de Integración](#flujo-de-integración)
11. [Ejemplos de Implementación](#ejemplos-de-implementación)
12. [Testing y Validación](#testing-y-validación)

---

## VISIÓN GENERAL

### Objetivo
Crear un sistema de conectores que permita al agente de IA:
- Conectarse a múltiples aplicaciones y servicios (27 conectores)
- Controlar el navegador del usuario en tiempo real
- Automatizar tareas en aplicaciones de diseño (Canva, Figma)
- Ejecutar acciones complejas sin intervención manual

### Diferenciadores Clave
✅ **27 Conectores Listos** - Aplicaciones populares + Canva + Figma
✅ **Browser Control** - Agente toma control del navegador
✅ **Diseño Automatizado** - Crear y editar diseños automáticamente
✅ **Autenticación Flexible** - OAuth2, API Keys, Webhooks
✅ **Gestión Segura** - Encriptación de credenciales
✅ **Extensible** - Fácil añadir nuevos conectores
✅ **Sin Intervención Manual** - Automatización completa

### Conectores Incluidos (27 Total)

**Comunicación (5):**
- Slack, Discord, Telegram, Gmail, WhatsApp

**Productividad (5):**
- Google Sheets, Notion, Asana, Monday.com, Google Docs

**E-commerce (5):**
- Shopify, Stripe, PayPal, WooCommerce, Square

**CRM y Marketing (5):**
- Salesforce, HubSpot, Mailchimp, Klaviyo, Pipedrive

**Desarrollo (5):**
- GitHub, GitLab, Jira, Linear, Vercel

**Diseño (2 - NUEVO):**
- Canva, Figma

**Especial (1 - NUEVO):**
- Browser Control (Control del navegador)

---

## ARQUITECTURA DE CONECTORES

### Diagrama General Actualizado

```
┌─────────────────────────────────────────────────────────────┐
│                      AGENTE DE IA                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Analizador | Planificador | Ejecutor | Verificador  │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              CONNECTOR MANAGER (Orquestador)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Registry | Factory | Auth Manager | Credential Mgr  │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌─────────┐        ┌─────────┐        ┌─────────┐
   │ Slack   │        │ Figma   │        │ Browser │
   │Connector│        │Connector│        │ Control │
   └─────────┘        └─────────┘        └─────────┘
        │                  │                  │
        ▼                  ▼                  ▼
   ┌─────────┐        ┌─────────┐        ┌─────────┐
   │  Slack  │        │ Figma   │        │ User's  │
   │   API   │        │   API   │        │Browser  │
   └─────────┘        └─────────┘        └─────────┘
```

---

## TIPOS DE CONECTORES

### 1. Conectores de API REST

```typescript
abstract class RestConnector {
  protected baseUrl: string;
  protected apiKey: string;
  protected headers: Record<string, string>;
  
  async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: this.headers,
      body: data ? JSON.stringify(data) : undefined
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  }
}
```

### 2. Conectores OAuth2

```typescript
abstract class OAuth2Connector {
  protected clientId: string;
  protected clientSecret: string;
  protected redirectUri: string;
  protected accessToken: string;
  protected refreshToken: string;
  
  async authenticate(authCode: string): Promise<void> {
    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri
      })
    });
    
    const data = await response.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
  }
}
```

### 3. Conectores Webhook

```typescript
abstract class WebhookConnector {
  protected webhookUrl: string;
  protected webhookSecret: string;
  
  async registerWebhook(events: string[]): Promise<void> {
    await this.makeRequest('POST', '/webhooks', {
      url: this.webhookUrl,
      events: events,
      secret: this.webhookSecret
    });
  }
}
```

### 4. Conectores GraphQL

```typescript
abstract class GraphQLConnector {
  protected endpoint: string;
  protected accessToken: string;
  
  async query(query: string, variables?: any): Promise<any> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({ query, variables })
    });
    
    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL Error: ${data.errors[0].message}`);
    }
    
    return data.data;
  }
}
```

### 5. Conectores de Control de Navegador (NUEVO)

```typescript
abstract class BrowserControlConnector {
  protected browserSession: BrowserSession;
  protected userBrowserId: string;
  
  async initializeBrowserControl(userId: string): Promise<void> {
    // Conectar con el navegador del usuario
    this.browserSession = await this.connectToUserBrowser(userId);
  }
  
  async executeInBrowser(action: BrowserAction): Promise<any> {
    // Ejecutar acción en el navegador del usuario
    return this.browserSession.executeAction(action);
  }
}
```

---

## LOS 27 CONECTORES PRINCIPALES

### CATEGORÍA 1: COMUNICACIÓN (5 conectores)

[Slack, Discord, Telegram, Gmail, WhatsApp - Igual al documento anterior]

### CATEGORÍA 2: PRODUCTIVIDAD (5 conectores)

[Google Sheets, Notion, Asana, Monday.com, Google Docs - Igual al documento anterior]

### CATEGORÍA 3: E-COMMERCE (5 conectores)

[Shopify, Stripe, PayPal, WooCommerce, Square - Igual al documento anterior]

### CATEGORÍA 4: CRM Y MARKETING (5 conectores)

[Salesforce, HubSpot, Mailchimp, Klaviyo, Pipedrive - Igual al documento anterior]

### CATEGORÍA 5: DESARROLLO (5 conectores)

[GitHub, GitLab, Jira, Linear, Vercel - Igual al documento anterior]

### CATEGORÍA 6: DISEÑO (2 conectores - NUEVO)

#### 26. Canva Connector

```typescript
// canva-connector.ts
import { RestConnector } from './base-connectors';

class CanvaConnector extends OAuth2Connector {
  constructor(clientId: string, clientSecret: string) {
    super();
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseUrl = 'https://api.canva.com/rest/v1';
    this.tokenEndpoint = 'https://api.canva.com/oauth/token';
  }
  
  // Obtener diseños del usuario
  async listDesigns(limit: number = 50): Promise<any> {
    return this.makeRequest('GET', `/designs?limit=${limit}`);
  }
  
  // Obtener un diseño específico
  async getDesign(designId: string): Promise<any> {
    return this.makeRequest('GET', `/designs/${designId}`);
  }
  
  // Crear nuevo diseño
  async createDesign(designType: string, title?: string): Promise<any> {
    return this.makeRequest('POST', '/designs', {
      design_type: designType,
      title
    });
  }
  
  // Actualizar diseño
  async updateDesign(designId: string, updates: any): Promise<any> {
    return this.makeRequest('PUT', `/designs/${designId}`, updates);
  }
  
  // Obtener elementos del diseño
  async getDesignElements(designId: string): Promise<any> {
    return this.makeRequest('GET', `/designs/${designId}/elements`);
  }
  
  // Añadir elemento al diseño
  async addElement(designId: string, element: any): Promise<any> {
    return this.makeRequest('POST', `/designs/${designId}/elements`, element);
  }
  
  // Actualizar elemento
  async updateElement(designId: string, elementId: string, updates: any): Promise<any> {
    return this.makeRequest('PUT', `/designs/${designId}/elements/${elementId}`, updates);
  }
  
  // Eliminar elemento
  async deleteElement(designId: string, elementId: string): Promise<any> {
    return this.makeRequest('DELETE', `/designs/${designId}/elements/${elementId}`);
  }
  
  // Añadir texto
  async addText(designId: string, text: string, x: number, y: number, fontSize: number = 24): Promise<any> {
    return this.addElement(designId, {
      type: 'text',
      content: text,
      position: { x, y },
      font_size: fontSize
    });
  }
  
  // Añadir imagen
  async addImage(designId: string, imageUrl: string, x: number, y: number, width: number, height: number): Promise<any> {
    return this.addElement(designId, {
      type: 'image',
      src: imageUrl,
      position: { x, y },
      size: { width, height }
    });
  }
  
  // Cambiar color de fondo
  async setBackgroundColor(designId: string, color: string): Promise<any> {
    return this.updateDesign(designId, {
      background_color: color
    });
  }
  
  // Exportar diseño
  async exportDesign(designId: string, format: 'png' | 'jpg' | 'pdf' = 'png'): Promise<any> {
    return this.makeRequest('POST', `/designs/${designId}/export`, {
      format
    });
  }
  
  // Obtener URL de descarga
  async getExportUrl(designId: string, format: 'png' | 'jpg' | 'pdf' = 'png'): Promise<string> {
    const export_data = await this.exportDesign(designId, format);
    return export_data.download_url;
  }
  
  // Crear diseño desde plantilla
  async createFromTemplate(templateId: string, title?: string): Promise<any> {
    return this.makeRequest('POST', '/designs', {
      template_id: templateId,
      title
    });
  }
  
  // Obtener plantillas disponibles
  async listTemplates(category?: string): Promise<any> {
    const url = category ? `/templates?category=${category}` : '/templates';
    return this.makeRequest('GET', url);
  }
  
  // Compartir diseño
  async shareDesign(designId: string, email: string): Promise<any> {
    return this.makeRequest('POST', `/designs/${designId}/share`, {
      email
    });
  }
  
  // Obtener historial de versiones
  async getVersionHistory(designId: string): Promise<any> {
    return this.makeRequest('GET', `/designs/${designId}/versions`);
  }
  
  // Restaurar versión anterior
  async restoreVersion(designId: string, versionId: string): Promise<any> {
    return this.makeRequest('POST', `/designs/${designId}/versions/${versionId}/restore`);
  }
}

// Métodos disponibles para el agente
const canvaMethods = {
  'canva.list_designs': async (connector, params) => {
    return connector.listDesigns(params.limit);
  },
  'canva.create_design': async (connector, params) => {
    return connector.createDesign(params.design_type, params.title);
  },
  'canva.add_text': async (connector, params) => {
    return connector.addText(params.design_id, params.text, params.x, params.y, params.font_size);
  },
  'canva.add_image': async (connector, params) => {
    return connector.addImage(params.design_id, params.image_url, params.x, params.y, params.width, params.height);
  },
  'canva.export_design': async (connector, params) => {
    return connector.exportDesign(params.design_id, params.format);
  },
  'canva.set_background_color': async (connector, params) => {
    return connector.setBackgroundColor(params.design_id, params.color);
  }
};

export default CanvaConnector;
```

#### 27. Figma Connector

```typescript
// figma-connector.ts
class FigmaConnector extends RestConnector {
  constructor(accessToken: string) {
    super();
    this.baseUrl = 'https://api.figma.com/v1';
    this.accessToken = accessToken;
    this.headers = {
      'X-Figma-Token': accessToken,
      'Content-Type': 'application/json'
    };
  }
  
  // Obtener archivo
  async getFile(fileId: string): Promise<any> {
    return this.makeRequest('GET', `/files/${fileId}`);
  }
  
  // Obtener nodos específicos
  async getNodes(fileId: string, nodeIds: string[]): Promise<any> {
    const ids = nodeIds.join(',');
    return this.makeRequest('GET', `/files/${fileId}/nodes?ids=${ids}`);
  }
  
  // Obtener imágenes
  async getImages(fileId: string, nodeIds: string[]): Promise<any> {
    return this.makeRequest('POST', `/files/${fileId}/images`, {
      ids: nodeIds
    });
  }
  
  // Obtener URL de imagen
  async getImageUrl(fileId: string, nodeId: string, scale: number = 1, format: 'jpg' | 'png' | 'svg' = 'png'): Promise<string> {
    const images = await this.getImages(fileId, [nodeId]);
    return images.images[nodeId];
  }
  
  // Obtener componentes
  async getComponents(fileId: string): Promise<any> {
    return this.makeRequest('GET', `/files/${fileId}/components`);
  }
  
  // Obtener estilos
  async getStyles(fileId: string): Promise<any> {
    return this.makeRequest('GET', `/files/${fileId}/styles`);
  }
  
  // Crear comentario
  async createComment(fileId: string, message: string, nodeId?: string): Promise<any> {
    return this.makeRequest('POST', `/files/${fileId}/comments`, {
      message,
      client_meta: nodeId ? { node_id: nodeId } : undefined
    });
  }
  
  // Obtener comentarios
  async getComments(fileId: string): Promise<any> {
    return this.makeRequest('GET', `/files/${fileId}/comments`);
  }
  
  // Actualizar comentario
  async updateComment(fileId: string, commentId: string, message: string): Promise<any> {
    return this.makeRequest('PUT', `/files/${fileId}/comments/${commentId}`, {
      message
    });
  }
  
  // Eliminar comentario
  async deleteComment(fileId: string, commentId: string): Promise<any> {
    return this.makeRequest('DELETE', `/files/${fileId}/comments/${commentId}`);
  }
  
  // Obtener versiones del archivo
  async getVersions(fileId: string): Promise<any> {
    return this.makeRequest('GET', `/files/${fileId}/versions`);
  }
  
  // Obtener detalles de versión
  async getVersion(fileId: string, versionId: string): Promise<any> {
    return this.makeRequest('GET', `/files/${fileId}/versions/${versionId}`);
  }
  
  // Listar archivos de equipo
  async listTeamFiles(teamId: string): Promise<any> {
    return this.makeRequest('GET', `/teams/${teamId}/files`);
  }
  
  // Obtener proyectos de equipo
  async listTeamProjects(teamId: string): Promise<any> {
    return this.makeRequest('GET', `/teams/${teamId}/projects`);
  }
  
  // Obtener archivos de proyecto
  async listProjectFiles(projectId: string): Promise<any> {
    return this.makeRequest('GET', `/projects/${projectId}/files`);
  }
  
  // Exportar nodo
  async exportNode(fileId: string, nodeId: string, format: 'jpg' | 'png' | 'svg' | 'pdf' = 'png'): Promise<any> {
    return this.makeRequest('GET', `/files/${fileId}/export?ids=${nodeId}&format=${format}`);
  }
  
  // Obtener información de usuario
  async getMe(): Promise<any> {
    return this.makeRequest('GET', '/me');
  }
  
  // Obtener información de equipo
  async getTeam(teamId: string): Promise<any> {
    return this.makeRequest('GET', `/teams/${teamId}`);
  }
  
  // Buscar en archivo
  async searchInFile(fileId: string, query: string): Promise<any> {
    const file = await this.getFile(fileId);
    // Implementar búsqueda en estructura del archivo
    return this.searchNodes(file.document, query);
  }
  
  private searchNodes(node: any, query: string, results: any[] = []): any[] {
    if (node.name && node.name.toLowerCase().includes(query.toLowerCase())) {
      results.push(node);
    }
    
    if (node.children) {
      for (const child of node.children) {
        this.searchNodes(child, query, results);
      }
    }
    
    return results;
  }
  
  // Obtener paleta de colores
  async getColorPalette(fileId: string): Promise<any> {
    const styles = await this.getStyles(fileId);
    const colors = styles.filter(s => s.style_type === 'FILL');
    return colors;
  }
  
  // Obtener tipografía
  async getTypography(fileId: string): Promise<any> {
    const styles = await this.getStyles(fileId);
    const typography = styles.filter(s => s.style_type === 'TEXT');
    return typography;
  }
}

// Métodos disponibles para el agente
const figmaMethods = {
  'figma.get_file': async (connector, params) => {
    return connector.getFile(params.file_id);
  },
  'figma.get_images': async (connector, params) => {
    return connector.getImages(params.file_id, params.node_ids);
  },
  'figma.create_comment': async (connector, params) => {
    return connector.createComment(params.file_id, params.message, params.node_id);
  },
  'figma.export_node': async (connector, params) => {
    return connector.exportNode(params.file_id, params.node_id, params.format);
  },
  'figma.get_color_palette': async (connector, params) => {
    return connector.getColorPalette(params.file_id);
  }
};

export default FigmaConnector;
```

### CATEGORÍA 7: BROWSER CONTROL (1 conector - NUEVO)

#### 28. Browser Control Connector (FUNCIÓN ESPECIAL)

```typescript
// browser-control-connector.ts
import { EventEmitter } from 'events';

interface BrowserControlSession {
  userId: string;
  sessionId: string;
  browserInstance: any;
  isActive: boolean;
  startTime: Date;
  lastActivity: Date;
}

interface BrowserAction {
  type: 'click' | 'type' | 'scroll' | 'navigate' | 'screenshot' | 'wait' | 'execute_script';
  params: any;
  timestamp: Date;
}

class BrowserControlConnector extends EventEmitter {
  private sessions: Map<string, BrowserControlSession> = new Map();
  private credentialManager: any;
  private logger: any;
  
  constructor(credentialManager: any, logger: any) {
    super();
    this.credentialManager = credentialManager;
    this.logger = logger;
  }
  
  // Iniciar sesión de control del navegador
  async initializeBrowserControl(userId: string): Promise<BrowserControlSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: BrowserControlSession = {
      userId,
      sessionId,
      browserInstance: null,
      isActive: false,
      startTime: new Date(),
      lastActivity: new Date()
    };
    
    this.sessions.set(sessionId, session);
    
    // Emitir evento para que el frontend inicie la conexión
    this.emit('browser:control:initialized', {
      sessionId,
      userId,
      message: 'Sesión de control de navegador iniciada. El agente puede tomar control.'
    });
    
    this.logger.info(`Browser control session initialized: ${sessionId}`);
    
    return session;
  }
  
  // Activar control del navegador
  async activateBrowserControl(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Sesión no encontrada: ${sessionId}`);
    }
    
    session.isActive = true;
    session.lastActivity = new Date();
    
    this.emit('browser:control:activated', {
      sessionId,
      message: 'El agente ha tomado control del navegador'
    });
    
    this.logger.info(`Browser control activated: ${sessionId}`);
  }
  
  // Desactivar control del navegador
  async deactivateBrowserControl(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Sesión no encontrada: ${sessionId}`);
    }
    
    session.isActive = false;
    
    this.emit('browser:control:deactivated', {
      sessionId,
      message: 'El agente ha liberado el control del navegador'
    });
    
    this.logger.info(`Browser control deactivated: ${sessionId}`);
  }
  
  // Hacer click
  async click(sessionId: string, x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      throw new Error('Sesión de control no activa');
    }
    
    const action: BrowserAction = {
      type: 'click',
      params: { x, y, button },
      timestamp: new Date()
    };
    
    session.lastActivity = new Date();
    
    this.emit('browser:action', {
      sessionId,
      action,
      message: `Click en (${x}, ${y})`
    });
    
    this.logger.info(`Browser action: click at (${x}, ${y})`);
  }
  
  // Escribir texto
  async typeText(sessionId: string, text: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      throw new Error('Sesión de control no activa');
    }
    
    const action: BrowserAction = {
      type: 'type',
      params: { text },
      timestamp: new Date()
    };
    
    session.lastActivity = new Date();
    
    this.emit('browser:action', {
      sessionId,
      action,
      message: `Escribiendo: ${text}`
    });
    
    this.logger.info(`Browser action: type text`);
  }
  
  // Scroll
  async scroll(sessionId: string, x: number, y: number, direction: 'up' | 'down', amount: number = 3): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      throw new Error('Sesión de control no activa');
    }
    
    const action: BrowserAction = {
      type: 'scroll',
      params: { x, y, direction, amount },
      timestamp: new Date()
    };
    
    session.lastActivity = new Date();
    
    this.emit('browser:action', {
      sessionId,
      action,
      message: `Scroll ${direction} ${amount} veces`
    });
    
    this.logger.info(`Browser action: scroll ${direction}`);
  }
  
  // Navegar a URL
  async navigate(sessionId: string, url: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      throw new Error('Sesión de control no activa');
    }
    
    const action: BrowserAction = {
      type: 'navigate',
      params: { url },
      timestamp: new Date()
    };
    
    session.lastActivity = new Date();
    
    this.emit('browser:action', {
      sessionId,
      action,
      message: `Navegando a: ${url}`
    });
    
    this.logger.info(`Browser action: navigate to ${url}`);
  }
  
  // Capturar pantalla
  async screenshot(sessionId: string): Promise<Buffer> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      throw new Error('Sesión de control no activa');
    }
    
    session.lastActivity = new Date();
    
    return new Promise((resolve, reject) => {
      this.emit('browser:screenshot:request', {
        sessionId,
        callback: (screenshot: Buffer) => {
          resolve(screenshot);
        }
      });
    });
  }
  
  // Ejecutar script JavaScript
  async executeScript(sessionId: string, script: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      throw new Error('Sesión de control no activa');
    }
    
    const action: BrowserAction = {
      type: 'execute_script',
      params: { script },
      timestamp: new Date()
    };
    
    session.lastActivity = new Date();
    
    return new Promise((resolve, reject) => {
      this.emit('browser:script:execute', {
        sessionId,
        script,
        callback: (result: any) => {
          resolve(result);
        }
      });
    });
  }
  
  // Presionar tecla
  async pressKey(sessionId: string, key: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      throw new Error('Sesión de control no activa');
    }
    
    const action: BrowserAction = {
      type: 'click',
      params: { key },
      timestamp: new Date()
    };
    
    session.lastActivity = new Date();
    
    this.emit('browser:action', {
      sessionId,
      action,
      message: `Presionando tecla: ${key}`
    });
    
    this.logger.info(`Browser action: press key ${key}`);
  }
  
  // Esperar
  async wait(sessionId: string, duration: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      throw new Error('Sesión de control no activa');
    }
    
    return new Promise(resolve => {
      setTimeout(() => {
        session.lastActivity = new Date();
        resolve();
      }, duration);
    });
  }
  
  // Obtener información de la sesión
  getSessionInfo(sessionId: string): BrowserControlSession | null {
    return this.sessions.get(sessionId) || null;
  }
  
  // Listar sesiones activas
  listActiveSessions(): BrowserControlSession[] {
    return Array.from(this.sessions.values()).filter(s => s.isActive);
  }
  
  // Cerrar sesión
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Sesión no encontrada: ${sessionId}`);
    }
    
    this.sessions.delete(sessionId);
    
    this.emit('browser:control:closed', {
      sessionId,
      message: 'Sesión de control cerrada'
    });
    
    this.logger.info(`Browser control session closed: ${sessionId}`);
  }
  
  // Monitorear inactividad
  startInactivityMonitor(sessionId: string, timeout: number = 300000): void { // 5 minutos por defecto
    const session = this.sessions.get(sessionId);
    
    if (!session) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const inactiveTime = now.getTime() - session.lastActivity.getTime();
      
      if (inactiveTime > timeout) {
        this.deactivateBrowserControl(sessionId);
        clearInterval(interval);
        
        this.emit('browser:control:timeout', {
          sessionId,
          message: 'Sesión de control cerrada por inactividad'
        });
      }
    }, 10000); // Verificar cada 10 segundos
  }
}

// Métodos disponibles para el agente
const browserControlMethods = {
  'browser.click': async (connector, params) => {
    return connector.click(params.session_id, params.x, params.y, params.button);
  },
  'browser.type': async (connector, params) => {
    return connector.typeText(params.session_id, params.text);
  },
  'browser.scroll': async (connector, params) => {
    return connector.scroll(params.session_id, params.x, params.y, params.direction, params.amount);
  },
  'browser.navigate': async (connector, params) => {
    return connector.navigate(params.session_id, params.url);
  },
  'browser.screenshot': async (connector, params) => {
    return connector.screenshot(params.session_id);
  },
  'browser.execute_script': async (connector, params) => {
    return connector.executeScript(params.session_id, params.script);
  },
  'browser.press_key': async (connector, params) => {
    return connector.pressKey(params.session_id, params.key);
  },
  'browser.wait': async (connector, params) => {
    return connector.wait(params.session_id, params.duration);
  }
};

export default BrowserControlConnector;
```

---

## BROWSER CONTROL: Función de Control del Navegador

### Concepto

El Browser Control es una función especial que permite al agente tomar control del navegador del usuario en tiempo real. El usuario ve exactamente qué está haciendo el agente mientras lo hace.

### Características

✅ **Control en Tiempo Real** - Agente controla el navegador del usuario
✅ **Visualización en Vivo** - Usuario ve todas las acciones
✅ **Interacción Completa** - Clicks, escritura, scroll, navegación
✅ **Ejecución de Scripts** - Ejecutar JavaScript personalizado
✅ **Seguridad** - Usuario puede detener en cualquier momento
✅ **Auditoría** - Registro de todas las acciones
✅ **Timeout Automático** - Cierre por inactividad

### Flujo de Control del Navegador

```
1. Usuario autoriza control
   └─> Agente obtiene sessionId
   └─> Conexión WebSocket establecida

2. Agente analiza tarea
   └─> "Rellena este formulario"
   └─> Identifica campos necesarios

3. Agente toma control
   └─> Navega a URL
   └─> Hace click en campo
   └─> Escribe información
   └─> Presiona botón enviar

4. Usuario ve en tiempo real
   └─> Video stream de pantalla
   └─> Acciones realizadas
   └─> Logs de ejecución

5. Agente completa tarea
   └─> Libera control
   └─> Muestra resultado
```

### Arquitectura del Browser Control

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Video Stream | Controles | Logs | Autorización      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                    ↕ (WebSocket)
┌─────────────────────────────────────────────────────────────┐
│              BROWSER CONTROL MANAGER                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Session Manager | Action Executor | Monitor          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────────────────────────┐
│                  USUARIO'S NAVEGADOR                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Chrome/Firefox | Inyección de Scripts | Captura      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Implementación del Browser Control en Frontend

```typescript
// BrowserControlView.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface BrowserControlViewProps {
  sessionId: string;
  onControlEnd: () => void;
}

export function BrowserControlView({ sessionId, onControlEnd }: BrowserControlViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isControlActive, setIsControlActive] = useState(true);
  const [actions, setActions] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const socket = useWebSocket();
  
  useEffect(() => {
    // Inyectar script de captura en el navegador
    const captureScript = `
      (function() {
        // Capturar pantalla cada 100ms
        const captureScreen = async () => {
          const canvas = await html2canvas(document.body);
          const imageData = canvas.toDataURL('image/png');
          window.parent.postMessage({
            type: 'screenshot',
            data: imageData
          }, '*');
        };
        
        // Interceptar eventos
        document.addEventListener('click', (e) => {
          window.parent.postMessage({
            type: 'action',
            action: 'click',
            x: e.clientX,
            y: e.clientY
          }, '*');
        });
        
        setInterval(captureScreen, 100);
      })();
    `;
    
    // Inyectar script
    const script = document.createElement('script');
    script.textContent = captureScript;
    document.body.appendChild(script);
    
    // Escuchar eventos del agente
    socket.on('browser:action', (data) => {
      setActions(prev => [...prev, data.action]);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${data.message}`]);
      
      // Ejecutar acción en navegador
      executeAction(data.action);
    });
    
    socket.on('browser:control:deactivated', () => {
      setIsControlActive(false);
      onControlEnd();
    });
    
    return () => {
      socket.off('browser:action');
      socket.off('browser:control:deactivated');
    };
  }, [socket, onControlEnd]);
  
  const executeAction = async (action: any) => {
    switch (action.type) {
      case 'click':
        // Simular click
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          clientX: action.params.x,
          clientY: action.params.y
        });
        const element = document.elementFromPoint(action.params.x, action.params.y);
        element?.dispatchEvent(clickEvent);
        break;
        
      case 'type':
        // Simular escritura
        const activeElement = document.activeElement as HTMLInputElement;
        if (activeElement) {
          activeElement.value += action.params.text;
          activeElement.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;
        
      case 'scroll':
        // Simular scroll
        window.scrollBy(0, action.params.direction === 'down' ? 100 : -100);
        break;
        
      case 'navigate':
        // Navegar
        window.location.href = action.params.url;
        break;
    }
  };
  
  const stopControl = () => {
    socket.emit('browser:control:stop', { sessionId });
    setIsControlActive(false);
    onControlEnd();
  };
  
  return (
    <div className="grid grid-cols-3 gap-4 h-screen">
      {/* Video Stream */}
      <div className="col-span-2">
        <div className="bg-black rounded-lg overflow-hidden relative">
          <video
            ref={videoRef}
            className="w-full h-full"
            autoPlay
          />
          
          {/* Overlay de estado */}
          <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
            🔴 AGENTE EN CONTROL
          </div>
          
          {/* Botón de detener */}
          <button
            onClick={stopControl}
            className="absolute bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded"
          >
            Detener Control
          </button>
        </div>
      </div>
      
      {/* Logs y Acciones */}
      <div className="flex flex-col gap-4">
        {/* Acciones */}
        <div className="bg-white rounded-lg p-4 flex-1 overflow-y-auto">
          <h3 className="font-bold mb-2">Acciones Realizadas</h3>
          <div className="space-y-2">
            {actions.slice(-10).map((action, i) => (
              <div key={i} className="text-sm bg-gray-100 p-2 rounded">
                <span className="font-mono text-blue-600">{action.type}</span>
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

export default BrowserControlView;
```

---

## IMPLEMENTACIÓN DE CONECTORES

### Connector Manager Actualizado

```typescript
// connector-manager.ts
class ConnectorManager {
  private connectors: Map<string, any> = new Map();
  private credentialManager: CredentialManager;
  
  constructor(credentialManager: CredentialManager) {
    this.credentialManager = credentialManager;
    this.registerConnectors();
  }
  
  private registerConnectors(): void {
    // Conectores existentes
    this.connectors.set('slack', SlackConnector);
    this.connectors.set('discord', DiscordConnector);
    this.connectors.set('github', GitHubConnector);
    this.connectors.set('shopify', ShopifyConnector);
    // ... más conectores
    
    // Nuevos conectores
    this.connectors.set('canva', CanvaConnector);
    this.connectors.set('figma', FigmaConnector);
    this.connectors.set('browser-control', BrowserControlConnector);
  }
  
  async getConnector(connectorName: string, userId: string): Promise<any> {
    const ConnectorClass = this.connectors.get(connectorName);
    
    if (!ConnectorClass) {
      throw new Error(`Conector no encontrado: ${connectorName}`);
    }
    
    // Browser Control no necesita credenciales
    if (connectorName === 'browser-control') {
      return new ConnectorClass(this.credentialManager, this.logger);
    }
    
    const credentials = await this.credentialManager.getCredentials(userId, connectorName);
    return new ConnectorClass(...Object.values(credentials));
  }
  
  listConnectors(): string[] {
    return Array.from(this.connectors.keys());
  }
}
```

---

## EJEMPLOS DE IMPLEMENTACIÓN

### Ejemplo 1: Crear Diseño en Canva

```typescript
async function canvaDesignExample() {
  const canva = await connectorManager.getConnector('canva', userId);
  
  // Crear nuevo diseño
  const design = await canva.createDesign('social_media_post', 'Mi Primer Diseño');
  
  // Añadir texto
  await canva.addText(design.id, 'Hola Mundo', 100, 100, 48);
  
  // Añadir imagen
  await canva.addImage(design.id, 'https://example.com/image.jpg', 200, 200, 300, 300);
  
  // Cambiar color de fondo
  await canva.setBackgroundColor(design.id, '#FF5733');
  
  // Exportar
  const url = await canva.getExportUrl(design.id, 'png');
  
  console.log('Diseño creado y exportado:', url);
}
```

### Ejemplo 2: Extraer Información de Figma

```typescript
async function figmaAnalysisExample() {
  const figma = await connectorManager.getConnector('figma', userId);
  
  // Obtener archivo
  const file = await figma.getFile('file-id');
  
  // Obtener paleta de colores
  const colors = await figma.getColorPalette('file-id');
  
  // Obtener tipografía
  const typography = await figma.getTypography('file-id');
  
  // Exportar componentes
  const components = await figma.getComponents('file-id');
  
  console.log('Análisis de Figma completado');
}
```

### Ejemplo 3: Browser Control - Llenar Formulario

```typescript
async function browserControlFormExample() {
  const browserControl = await connectorManager.getConnector('browser-control', userId);
  
  // Iniciar sesión
  const session = await browserControl.initializeBrowserControl(userId);
  
  // Activar control
  await browserControl.activateBrowserControl(session.sessionId);
  
  // Navegar a formulario
  await browserControl.navigate(session.sessionId, 'https://example.com/form');
  
  // Esperar a que cargue
  await browserControl.wait(session.sessionId, 2000);
  
  // Capturar pantalla
  const screenshot = await browserControl.screenshot(session.sessionId);
  
  // Hacer click en campo de nombre
  await browserControl.click(session.sessionId, 100, 100);
  
  // Escribir nombre
  await browserControl.typeText(session.sessionId, 'Juan Pérez');
  
  // Hacer click en campo de email
  await browserControl.click(session.sessionId, 100, 150);
  
  // Escribir email
  await browserControl.typeText(session.sessionId, 'juan@example.com');
  
  // Hacer click en botón enviar
  await browserControl.click(session.sessionId, 100, 200);
  
  // Esperar confirmación
  await browserControl.wait(session.sessionId, 2000);
  
  // Liberar control
  await browserControl.deactivateBrowserControl(session.sessionId);
}
```

---

## TESTING Y VALIDACIÓN

### Unit Tests

```typescript
describe('CanvaConnector', () => {
  let connector: CanvaConnector;
  
  beforeEach(() => {
    connector = new CanvaConnector('client-id', 'client-secret');
  });
  
  test('createDesign debe crear un nuevo diseño', async () => {
    const result = await connector.createDesign('social_media_post', 'Test Design');
    expect(result.id).toBeDefined();
    expect(result.title).toBe('Test Design');
  });
  
  test('addText debe añadir texto al diseño', async () => {
    const result = await connector.addText('design-id', 'Hola', 100, 100, 24);
    expect(result.type).toBe('text');
  });
});

describe('FigmaConnector', () => {
  let connector: FigmaConnector;
  
  beforeEach(() => {
    connector = new FigmaConnector('access-token');
  });
  
  test('getFile debe obtener un archivo', async () => {
    const result = await connector.getFile('file-id');
    expect(result.id).toBe('file-id');
  });
});

describe('BrowserControlConnector', () => {
  let connector: BrowserControlConnector;
  
  beforeEach(() => {
    connector = new BrowserControlConnector(credentialManager, logger);
  });
  
  test('initializeBrowserControl debe crear una sesión', async () => {
    const session = await connector.initializeBrowserControl('user-id');
    expect(session.sessionId).toBeDefined();
    expect(session.userId).toBe('user-id');
  });
  
  test('click debe registrar acción de click', async () => {
    const session = await connector.initializeBrowserControl('user-id');
    await connector.activateBrowserControl(session.sessionId);
    
    let actionEmitted = false;
    connector.on('browser:action', () => {
      actionEmitted = true;
    });
    
    await connector.click(session.sessionId, 100, 100);
    expect(actionEmitted).toBe(true);
  });
});
```

---

## CONCLUSIÓN

### Ventajas del Sistema Actualizado

✅ **27 Conectores** - Todas las aplicaciones populares
✅ **Diseño Automatizado** - Canva y Figma
✅ **Browser Control** - Agente controla el navegador del usuario
✅ **Visualización en Vivo** - Usuario ve todo en tiempo real
✅ **Seguridad** - Encriptación y control de acceso
✅ **Extensible** - Fácil añadir nuevos conectores
✅ **Automatización Completa** - Sin intervención manual

### Casos de Uso

✅ Automatización de flujos de trabajo
✅ Creación de diseños automáticos
✅ Rellenado de formularios
✅ Extracción de datos
✅ Sincronización de datos
✅ Notificaciones automáticas
✅ Integración de aplicaciones

---

**Versión:** 2.0
**Última actualización:** Junio 26, 2026
**Estado:** Listo para implementación
