# SISTEMA DE INTEGRACIÓN MULTI-FUENTE: Implementación Detallada

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Componentes Principales](#componentes-principales)
4. [Flujos de Integración](#flujos-de-integración)
5. [Implementación Paso a Paso](#implementación-paso-a-paso)
6. [Integraciones Específicas](#integraciones-específicas)
7. [Sistema de Caché](#sistema-de-caché)
8. [Gestión de Permisos](#gestión-de-permisos)
9. [Sincronización en Tiempo Real](#sincronización-en-tiempo-real)
10. [Ejemplos de Código](#ejemplos-de-código)

---

## VISIÓN GENERAL

### Concepto

El sistema de integración multi-fuente permite al usuario agregar recursos desde múltiples orígenes:

```
┌─────────────────────────────────────────────────────────────┐
│              INTERFAZ DE INTEGRACIÓN                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Agregar desde Figma                                 │  │
│  │ Añadir desde OneDrive                               │  │
│  │ Añadir desde Google Drive                           │  │
│  │ Usar habilidades                                    │  │
│  │ Archivos recientes                                  │  │
│  │ Agregar desde archivos locales                      │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│          INTEGRATION MANAGER (Orquestador)                  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Figma        │  │ OneDrive     │  │ Google Drive │    │
│  │ Connector    │  │ Connector    │  │ Connector    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Skills       │  │ Recent Files │  │ Local Files  │    │
│  │ Manager      │  │ Manager      │  │ Manager      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              RESOURCE REPOSITORY                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Metadata | Content | Permissions | Sync Status      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Características Principales

✅ **Multi-fuente** - Integra múltiples servicios
✅ **Sincronización** - Mantiene datos sincronizados
✅ **Caché Inteligente** - Optimiza rendimiento
✅ **Permisos** - Gestiona acceso a recursos
✅ **Historial** - Archivos recientes
✅ **Búsqueda** - Busca en todas las fuentes
✅ **Previsualización** - Vista previa de recursos

---

## ARQUITECTURA DEL SISTEMA

### Capas de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTACIÓN (React)                     │
│  - IntegrationMenu                                          │
│  - FileExplorer                                             │
│  - ResourcePreview                                          │
│  - UploadDialog                                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    LÓGICA (Node.js)                         │
│  - IntegrationManager                                       │
│  - ConnectorFactory                                         │
│  - PermissionManager                                        │
│  - CacheManager                                             │
│  - SyncManager                                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    CONECTORES                               │
│  - FigmaConnector                                           │
│  - OneDriveConnector                                        │
│  - GoogleDriveConnector                                     │
│  - LocalFileConnector                                       │
│  - SkillsConnector                                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    SERVICIOS EXTERNOS                       │
│  - Figma API                                                │
│  - Microsoft Graph (OneDrive)                               │
│  - Google Drive API                                         │
│  - Sistema de Archivos Local                                │
└─────────────────────────────────────────────────────────────┘
```

### Estructura de Datos

```typescript
interface Resource {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'design' | 'skill';
  source: 'figma' | 'onedrive' | 'google-drive' | 'local' | 'skill';
  mimeType: string;
  size: number;
  url: string;
  localPath?: string;
  metadata: {
    createdAt: Date;
    modifiedAt: Date;
    owner: string;
    shared: boolean;
    permissions: Permission[];
  };
  preview?: {
    thumbnail: string;
    preview: string;
  };
  syncStatus: 'synced' | 'syncing' | 'pending' | 'error';
  lastSyncedAt: Date;
}

interface Permission {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  grantedAt: Date;
}

interface IntegrationConfig {
  source: string;
  apiKey?: string;
  refreshToken?: string;
  accessToken?: string;
  expiresAt?: Date;
  permissions: string[];
  enabled: boolean;
}
```

---

## COMPONENTES PRINCIPALES

### 1. Integration Manager

```typescript
class IntegrationManager {
  private connectors: Map<string, BaseConnector>;
  private cacheManager: CacheManager;
  private permissionManager: PermissionManager;
  private syncManager: SyncManager;
  
  constructor() {
    this.connectors = new Map();
    this.cacheManager = new CacheManager();
    this.permissionManager = new PermissionManager();
    this.syncManager = new SyncManager();
    
    // Registrar conectores
    this.registerConnector('figma', new FigmaConnector());
    this.registerConnector('onedrive', new OneDriveConnector());
    this.registerConnector('google-drive', new GoogleDriveConnector());
    this.registerConnector('local', new LocalFileConnector());
    this.registerConnector('skill', new SkillsConnector());
  }
  
  registerConnector(source: string, connector: BaseConnector): void {
    this.connectors.set(source, connector);
  }
  
  async getResources(source: string, filters?: any): Promise<Resource[]> {
    // 1. Verificar caché
    const cached = this.cacheManager.get(`resources:${source}`, filters);
    if (cached) return cached;
    
    // 2. Obtener conector
    const connector = this.connectors.get(source);
    if (!connector) throw new Error(`Conector no encontrado: ${source}`);
    
    // 3. Obtener recursos
    const resources = await connector.listResources(filters);
    
    // 4. Enriquecer con metadata
    const enriched = await Promise.all(
      resources.map(r => this.enrichResource(r, source))
    );
    
    // 5. Guardar en caché
    this.cacheManager.set(`resources:${source}`, filters, enriched);
    
    return enriched;
  }
  
  async addResource(source: string, resourceId: string): Promise<Resource> {
    const connector = this.connectors.get(source);
    const resource = await connector.getResource(resourceId);
    
    // Enriquecer y guardar
    const enriched = await this.enrichResource(resource, source);
    await this.saveResource(enriched);
    
    return enriched;
  }
  
  async searchResources(query: string): Promise<Resource[]> {
    const results = await Promise.all(
      Array.from(this.connectors.keys()).map(source =>
        this.connectors.get(source)!.search(query)
      )
    );
    
    return results.flat();
  }
  
  private async enrichResource(resource: any, source: string): Promise<Resource> {
    return {
      ...resource,
      source,
      syncStatus: 'synced',
      lastSyncedAt: new Date()
    };
  }
  
  private async saveResource(resource: Resource): Promise<void> {
    await db.query(
      `INSERT INTO resources (id, name, type, source, mime_type, size, url, metadata, sync_status, last_synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        resource.id,
        resource.name,
        resource.type,
        resource.source,
        resource.mimeType,
        resource.size,
        resource.url,
        JSON.stringify(resource.metadata),
        resource.syncStatus,
        resource.lastSyncedAt
      ]
    );
  }
}
```

### 2. Base Connector

```typescript
abstract class BaseConnector {
  protected config: IntegrationConfig;
  
  abstract async authenticate(): Promise<void>;
  abstract async listResources(filters?: any): Promise<Resource[]>;
  abstract async getResource(id: string): Promise<Resource>;
  abstract async uploadResource(file: File): Promise<Resource>;
  abstract async deleteResource(id: string): Promise<void>;
  abstract async search(query: string): Promise<Resource[]>;
  
  async validateConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

### 3. Cache Manager

```typescript
class CacheManager {
  private cache: Map<string, { data: any; expiresAt: Date }>;
  private ttl: number = 5 * 60 * 1000; // 5 minutos
  
  constructor() {
    this.cache = new Map();
    this.startCleanupInterval();
  }
  
  set(key: string, filters: any, data: any): void {
    const cacheKey = this.generateKey(key, filters);
    this.cache.set(cacheKey, {
      data,
      expiresAt: new Date(Date.now() + this.ttl)
    });
  }
  
  get(key: string, filters?: any): any | null {
    const cacheKey = this.generateKey(key, filters);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return null;
    if (new Date() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return entry.data;
  }
  
  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  private generateKey(key: string, filters?: any): string {
    return `${key}:${JSON.stringify(filters || {})}`;
  }
  
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = new Date();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 60 * 1000); // Limpiar cada minuto
  }
}
```

### 4. Permission Manager

```typescript
class PermissionManager {
  async checkPermission(userId: string, resource: Resource, action: string): Promise<boolean> {
    // 1. Verificar si es propietario
    if (resource.metadata.owner === userId) {
      return true;
    }
    
    // 2. Verificar permisos compartidos
    const permission = resource.metadata.permissions.find(p => p.userId === userId);
    if (!permission) return false;
    
    // 3. Verificar rol
    const allowedActions = {
      'owner': ['read', 'write', 'delete', 'share'],
      'editor': ['read', 'write'],
      'viewer': ['read']
    };
    
    return allowedActions[permission.role]?.includes(action) || false;
  }
  
  async grantPermission(resource: Resource, userId: string, role: 'owner' | 'editor' | 'viewer'): Promise<void> {
    resource.metadata.permissions.push({
      userId,
      role,
      grantedAt: new Date()
    });
    
    await this.savePermissions(resource);
  }
  
  async revokePermission(resource: Resource, userId: string): Promise<void> {
    resource.metadata.permissions = resource.metadata.permissions.filter(p => p.userId !== userId);
    await this.savePermissions(resource);
  }
  
  private async savePermissions(resource: Resource): Promise<void> {
    await db.query(
      `UPDATE resources SET metadata = $1 WHERE id = $2`,
      [JSON.stringify(resource.metadata), resource.id]
    );
  }
}
```

### 5. Sync Manager

```typescript
class SyncManager {
  private syncQueue: Resource[] = [];
  private isSyncing: boolean = false;
  
  async syncResource(resource: Resource): Promise<void> {
    this.syncQueue.push(resource);
    
    if (!this.isSyncing) {
      await this.processSyncQueue();
    }
  }
  
  private async processSyncQueue(): Promise<void> {
    this.isSyncing = true;
    
    while (this.syncQueue.length > 0) {
      const resource = this.syncQueue.shift()!;
      
      try {
        await this.performSync(resource);
        resource.syncStatus = 'synced';
      } catch (error) {
        resource.syncStatus = 'error';
        console.error(`Error sincronizando ${resource.id}:`, error);
      }
      
      resource.lastSyncedAt = new Date();
      await this.updateResourceStatus(resource);
    }
    
    this.isSyncing = false;
  }
  
  private async performSync(resource: Resource): Promise<void> {
    // Sincronizar con el servicio externo
    const connector = this.getConnector(resource.source);
    const latestVersion = await connector.getResource(resource.id);
    
    // Actualizar metadata
    resource.metadata.modifiedAt = latestVersion.metadata.modifiedAt;
    resource.size = latestVersion.size;
    
    await this.updateResourceMetadata(resource);
  }
  
  private async updateResourceStatus(resource: Resource): Promise<void> {
    await db.query(
      `UPDATE resources SET sync_status = $1, last_synced_at = $2 WHERE id = $3`,
      [resource.syncStatus, resource.lastSyncedAt, resource.id]
    );
  }
  
  private async updateResourceMetadata(resource: Resource): Promise<void> {
    await db.query(
      `UPDATE resources SET metadata = $1, size = $2 WHERE id = $3`,
      [JSON.stringify(resource.metadata), resource.size, resource.id]
    );
  }
  
  private getConnector(source: string): BaseConnector {
    // Obtener conector del Integration Manager
    return integrationManager.getConnector(source);
  }
}
```

---

## FLUJOS DE INTEGRACIÓN

### Flujo 1: Agregar desde Figma

```
┌─────────────────────────────────────────────────────────────┐
│  1. Usuario hace click en "Agregar desde Figma"             │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Sistema verifica si está autenticado en Figma           │
│     - Si NO: Mostrar diálogo de autenticación               │
│     - Si SÍ: Continuar                                      │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  3. FigmaConnector obtiene lista de archivos                │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Mostrar FileExplorer con archivos de Figma              │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Usuario selecciona archivo(s)                           │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  6. IntegrationManager.addResource() es llamado             │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  7. Enriquecer recurso con metadata                         │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  8. Guardar en base de datos                                │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  9. Iniciar sincronización en background                    │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  10. Mostrar confirmación al usuario                        │
└─────────────────────────────────────────────────────────────┘
```

### Flujo 2: Agregar desde Google Drive

```
┌─────────────────────────────────────────────────────────────┐
│  1. Usuario hace click en "Añadir desde Google Drive"       │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Mostrar Google Drive Picker                             │
│     (Integración nativa de Google)                          │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Usuario selecciona archivo(s)                           │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  4. GoogleDriveConnector procesa selección                  │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Obtener metadata del archivo                            │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Guardar referencia en base de datos                     │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  7. Crear watch para cambios                                │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  8. Mostrar confirmación                                    │
└─────────────────────────────────────────────────────────────┘
```

### Flujo 3: Agregar desde Archivos Locales

```
┌─────────────────────────────────────────────────────────────┐
│  1. Usuario hace click en "Agregar desde archivos locales"  │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Mostrar diálogo de selección de archivos                │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Usuario selecciona archivo(s)                           │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  4. LocalFileConnector procesa archivos                     │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Subir archivo al servidor                               │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Generar thumbnail/preview                               │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  7. Guardar en base de datos                                │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  8. Mostrar confirmación                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## IMPLEMENTACIÓN PASO A PASO

### Paso 1: Crear Estructura Base

```bash
# Crear directorios
mkdir -p src/integrations/{connectors,managers}
mkdir -p src/models
mkdir -p src/routes/api/integrations
mkdir -p src/components/integration
mkdir -p tests/integrations

# Crear archivos base
touch src/integrations/BaseConnector.ts
touch src/integrations/IntegrationManager.ts
touch src/integrations/managers/{CacheManager,PermissionManager,SyncManager}.ts
touch src/integrations/connectors/{FigmaConnector,OneDriveConnector,GoogleDriveConnector,LocalFileConnector,SkillsConnector}.ts
```

### Paso 2: Implementar Base Connector

```typescript
// src/integrations/BaseConnector.ts
abstract class BaseConnector {
  protected config: IntegrationConfig;
  protected logger: Logger;
  
  constructor(config: IntegrationConfig) {
    this.config = config;
    this.logger = new Logger(this.constructor.name);
  }
  
  abstract async authenticate(): Promise<void>;
  abstract async listResources(filters?: any): Promise<Resource[]>;
  abstract async getResource(id: string): Promise<Resource>;
  abstract async uploadResource(file: File): Promise<Resource>;
  abstract async deleteResource(id: string): Promise<void>;
  abstract async search(query: string): Promise<Resource[]>;
  
  async validateConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      this.logger.info('Conexión validada');
      return true;
    } catch (error) {
      this.logger.error('Error validando conexión', error);
      return false;
    }
  }
  
  protected async makeRequest(
    method: string,
    url: string,
    data?: any,
    headers?: any
  ): Promise<any> {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
          ...headers
        },
        body: data ? JSON.stringify(data) : undefined
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      this.logger.error(`Error en ${method} ${url}`, error);
      throw error;
    }
  }
}
```

### Paso 3: Implementar Figma Connector

```typescript
// src/integrations/connectors/FigmaConnector.ts
class FigmaConnector extends BaseConnector {
  private baseUrl = 'https://api.figma.com/v1';
  
  async authenticate(): Promise<void> {
    const response = await this.makeRequest('GET', `${this.baseUrl}/me`);
    if (!response.id) {
      throw new Error('Autenticación fallida en Figma');
    }
  }
  
  async listResources(filters?: any): Promise<Resource[]> {
    const response = await this.makeRequest('GET', `${this.baseUrl}/files`);
    
    return response.files.map((file: any) => ({
      id: file.key,
      name: file.name,
      type: 'design',
      source: 'figma',
      mimeType: 'application/figma',
      size: 0,
      url: `https://figma.com/file/${file.key}`,
      metadata: {
        createdAt: new Date(file.created_at),
        modifiedAt: new Date(file.modified_at),
        owner: file.owner.id,
        shared: file.shared,
        permissions: []
      },
      preview: {
        thumbnail: file.thumbnail_url,
        preview: file.thumbnail_url
      },
      syncStatus: 'synced',
      lastSyncedAt: new Date()
    }));
  }
  
  async getResource(id: string): Promise<Resource> {
    const response = await this.makeRequest('GET', `${this.baseUrl}/files/${id}`);
    
    return {
      id: response.key,
      name: response.name,
      type: 'design',
      source: 'figma',
      mimeType: 'application/figma',
      size: 0,
      url: `https://figma.com/file/${response.key}`,
      metadata: {
        createdAt: new Date(response.created_at),
        modifiedAt: new Date(response.modified_at),
        owner: response.owner.id,
        shared: response.shared,
        permissions: []
      },
      syncStatus: 'synced',
      lastSyncedAt: new Date()
    };
  }
  
  async uploadResource(file: File): Promise<Resource> {
    throw new Error('Figma no soporta upload directo');
  }
  
  async deleteResource(id: string): Promise<void> {
    // Figma no tiene endpoint de delete
    throw new Error('No se puede eliminar archivos de Figma');
  }
  
  async search(query: string): Promise<Resource[]> {
    const resources = await this.listResources();
    return resources.filter(r =>
      r.name.toLowerCase().includes(query.toLowerCase())
    );
  }
}
```

### Paso 4: Implementar Google Drive Connector

```typescript
// src/integrations/connectors/GoogleDriveConnector.ts
class GoogleDriveConnector extends BaseConnector {
  private baseUrl = 'https://www.googleapis.com/drive/v3';
  
  async authenticate(): Promise<void> {
    const response = await this.makeRequest('GET', `${this.baseUrl}/about?fields=user`);
    if (!response.user) {
      throw new Error('Autenticación fallida en Google Drive');
    }
  }
  
  async listResources(filters?: any): Promise<Resource[]> {
    const query = "trashed = false and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/pdf')";
    
    const response = await this.makeRequest(
      'GET',
      `${this.baseUrl}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,owners,webViewLink,thumbnailLink)`
    );
    
    return response.files.map((file: any) => ({
      id: file.id,
      name: file.name,
      type: this.getMimeTypeCategory(file.mimeType),
      source: 'google-drive',
      mimeType: file.mimeType,
      size: parseInt(file.size) || 0,
      url: file.webViewLink,
      metadata: {
        createdAt: new Date(file.createdTime),
        modifiedAt: new Date(file.modifiedTime),
        owner: file.owners[0].emailAddress,
        shared: false,
        permissions: []
      },
      preview: {
        thumbnail: file.thumbnailLink,
        preview: file.thumbnailLink
      },
      syncStatus: 'synced',
      lastSyncedAt: new Date()
    }));
  }
  
  async getResource(id: string): Promise<Resource> {
    const response = await this.makeRequest(
      'GET',
      `${this.baseUrl}/files/${id}?fields=id,name,mimeType,size,createdTime,modifiedTime,owners,webViewLink,thumbnailLink`
    );
    
    return {
      id: response.id,
      name: response.name,
      type: this.getMimeTypeCategory(response.mimeType),
      source: 'google-drive',
      mimeType: response.mimeType,
      size: parseInt(response.size) || 0,
      url: response.webViewLink,
      metadata: {
        createdAt: new Date(response.createdTime),
        modifiedAt: new Date(response.modifiedTime),
        owner: response.owners[0].emailAddress,
        shared: false,
        permissions: []
      },
      syncStatus: 'synced',
      lastSyncedAt: new Date()
    };
  }
  
  async uploadResource(file: File): Promise<Resource> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${this.baseUrl}/files?fields=id,name,mimeType,size,webViewLink`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    return {
      id: data.id,
      name: data.name,
      type: 'file',
      source: 'google-drive',
      mimeType: data.mimeType,
      size: data.size,
      url: data.webViewLink,
      metadata: {
        createdAt: new Date(),
        modifiedAt: new Date(),
        owner: 'current-user',
        shared: false,
        permissions: []
      },
      syncStatus: 'synced',
      lastSyncedAt: new Date()
    };
  }
  
  async deleteResource(id: string): Promise<void> {
    await this.makeRequest('DELETE', `${this.baseUrl}/files/${id}`);
  }
  
  async search(query: string): Promise<Resource[]> {
    const searchQuery = `trashed = false and name contains '${query}'`;
    
    const response = await this.makeRequest(
      'GET',
      `${this.baseUrl}/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,owners,webViewLink,thumbnailLink)`
    );
    
    return response.files.map((file: any) => ({
      id: file.id,
      name: file.name,
      type: this.getMimeTypeCategory(file.mimeType),
      source: 'google-drive',
      mimeType: file.mimeType,
      size: parseInt(file.size) || 0,
      url: file.webViewLink,
      metadata: {
        createdAt: new Date(file.createdTime),
        modifiedAt: new Date(file.modifiedTime),
        owner: file.owners[0].emailAddress,
        shared: false,
        permissions: []
      },
      syncStatus: 'synced',
      lastSyncedAt: new Date()
    }));
  }
  
  private getMimeTypeCategory(mimeType: string): string {
    if (mimeType.includes('document')) return 'document';
    if (mimeType.includes('spreadsheet')) return 'spreadsheet';
    if (mimeType.includes('presentation')) return 'presentation';
    if (mimeType.includes('pdf')) return 'pdf';
    return 'file';
  }
}
```

### Paso 5: Implementar Local File Connector

```typescript
// src/integrations/connectors/LocalFileConnector.ts
class LocalFileConnector extends BaseConnector {
  async authenticate(): Promise<void> {
    // No requiere autenticación
  }
  
  async listResources(filters?: any): Promise<Resource[]> {
    const result = await db.query(
      `SELECT * FROM resources WHERE source = 'local' ORDER BY created_at DESC`
    );
    
    return result.rows.map(row => JSON.parse(row.metadata));
  }
  
  async getResource(id: string): Promise<Resource> {
    const result = await db.query(
      `SELECT * FROM resources WHERE id = $1 AND source = 'local'`,
      [id]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`Recurso no encontrado: ${id}`);
    }
    
    return JSON.parse(result.rows[0].metadata);
  }
  
  async uploadResource(file: File): Promise<Resource> {
    const buffer = await file.arrayBuffer();
    const filename = `${Date.now()}_${file.name}`;
    const filepath = path.join(process.env.UPLOAD_DIR, filename);
    
    // Guardar archivo
    fs.writeFileSync(filepath, Buffer.from(buffer));
    
    // Generar thumbnail si es imagen
    let thumbnail = null;
    if (file.type.startsWith('image/')) {
      thumbnail = await this.generateThumbnail(filepath);
    }
    
    const resource: Resource = {
      id: `local_${Date.now()}`,
      name: file.name,
      type: this.getFileType(file.type),
      source: 'local',
      mimeType: file.type,
      size: file.size,
      url: `/uploads/${filename}`,
      localPath: filepath,
      metadata: {
        createdAt: new Date(),
        modifiedAt: new Date(),
        owner: 'current-user',
        shared: false,
        permissions: []
      },
      preview: {
        thumbnail: thumbnail,
        preview: thumbnail
      },
      syncStatus: 'synced',
      lastSyncedAt: new Date()
    };
    
    return resource;
  }
  
  async deleteResource(id: string): Promise<void> {
    const resource = await this.getResource(id);
    if (resource.localPath) {
      fs.unlinkSync(resource.localPath);
    }
    
    await db.query(`DELETE FROM resources WHERE id = $1`, [id]);
  }
  
  async search(query: string): Promise<Resource[]> {
    const result = await db.query(
      `SELECT * FROM resources 
       WHERE source = 'local' AND name ILIKE $1
       ORDER BY created_at DESC`,
      [`%${query}%`]
    );
    
    return result.rows.map(row => JSON.parse(row.metadata));
  }
  
  private getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'document';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
    return 'file';
  }
  
  private async generateThumbnail(filepath: string): Promise<string> {
    const thumbnailPath = `${filepath}_thumb.jpg`;
    
    // Usar sharp para generar thumbnail
    await sharp(filepath)
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    return `/uploads/${path.basename(thumbnailPath)}`;
  }
}
```

### Paso 6: Implementar Skills Connector

```typescript
// src/integrations/connectors/SkillsConnector.ts
class SkillsConnector extends BaseConnector {
  async authenticate(): Promise<void> {
    // No requiere autenticación
  }
  
  async listResources(filters?: any): Promise<Resource[]> {
    const skillsDir = '/home/ubuntu/skills';
    const skills = fs.readdirSync(skillsDir);
    
    return skills.map(skill => ({
      id: `skill_${skill}`,
      name: skill,
      type: 'skill',
      source: 'skill',
      mimeType: 'application/skill',
      size: 0,
      url: `file://${skillsDir}/${skill}`,
      metadata: {
        createdAt: new Date(),
        modifiedAt: new Date(),
        owner: 'system',
        shared: true,
        permissions: []
      },
      syncStatus: 'synced',
      lastSyncedAt: new Date()
    }));
  }
  
  async getResource(id: string): Promise<Resource> {
    const skillName = id.replace('skill_', '');
    const skillPath = `/home/ubuntu/skills/${skillName}`;
    
    if (!fs.existsSync(skillPath)) {
      throw new Error(`Skill no encontrado: ${skillName}`);
    }
    
    return {
      id,
      name: skillName,
      type: 'skill',
      source: 'skill',
      mimeType: 'application/skill',
      size: 0,
      url: `file://${skillPath}`,
      metadata: {
        createdAt: new Date(),
        modifiedAt: new Date(),
        owner: 'system',
        shared: true,
        permissions: []
      },
      syncStatus: 'synced',
      lastSyncedAt: new Date()
    };
  }
  
  async uploadResource(file: File): Promise<Resource> {
    throw new Error('No se pueden subir skills');
  }
  
  async deleteResource(id: string): Promise<void> {
    throw new Error('No se pueden eliminar skills');
  }
  
  async search(query: string): Promise<Resource[]> {
    const resources = await this.listResources();
    return resources.filter(r =>
      r.name.toLowerCase().includes(query.toLowerCase())
    );
  }
}
```

---

## INTEGRACIONES ESPECÍFICAS

### OneDrive Connector

```typescript
class OneDriveConnector extends BaseConnector {
  private baseUrl = 'https://graph.microsoft.com/v1.0/me/drive';
  
  async authenticate(): Promise<void> {
    const response = await this.makeRequest('GET', `${this.baseUrl}`);
    if (!response.id) {
      throw new Error('Autenticación fallida en OneDrive');
    }
  }
  
  async listResources(filters?: any): Promise<Resource[]> {
    const response = await this.makeRequest(
      'GET',
      `${this.baseUrl}/root/children?$select=id,name,size,createdDateTime,lastModifiedDateTime,webUrl,thumbnails`
    );
    
    return response.value.map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.folder ? 'folder' : 'file',
      source: 'onedrive',
      mimeType: item.file?.mimeType || 'folder',
      size: item.size || 0,
      url: item.webUrl,
      metadata: {
        createdAt: new Date(item.createdDateTime),
        modifiedAt: new Date(item.lastModifiedDateTime),
        owner: 'current-user',
        shared: !!item.shared,
        permissions: []
      },
      preview: {
        thumbnail: item.thumbnails?.[0]?.medium?.url,
        preview: item.thumbnails?.[0]?.large?.url
      },
      syncStatus: 'synced',
      lastSyncedAt: new Date()
    }));
  }
  
  async getResource(id: string): Promise<Resource> {
    const response = await this.makeRequest(
      'GET',
      `${this.baseUrl}/items/${id}?$select=id,name,size,createdDateTime,lastModifiedDateTime,webUrl,thumbnails`
    );
    
    return {
      id: response.id,
      name: response.name,
      type: response.folder ? 'folder' : 'file',
      source: 'onedrive',
      mimeType: response.file?.mimeType || 'folder',
      size: response.size || 0,
      url: response.webUrl,
      metadata: {
        createdAt: new Date(response.createdDateTime),
        modifiedAt: new Date(response.lastModifiedDateTime),
        owner: 'current-user',
        shared: !!response.shared,
        permissions: []
      },
      syncStatus: 'synced',
      lastSyncedAt: new Date()
    };
  }
  
  async uploadResource(file: File): Promise<Resource> {
    const buffer = await file.arrayBuffer();
    
    const response = await fetch(
      `${this.baseUrl}/root:/${file.name}:/content`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': file.type
        },
        body: buffer
      }
    );
    
    const data = await response.json();
    
    return {
      id: data.id,
      name: data.name,
      type: 'file',
      source: 'onedrive',
      mimeType: file.type,
      size: file.size,
      url: data.webUrl,
      metadata: {
        createdAt: new Date(data.createdDateTime),
        modifiedAt: new Date(data.lastModifiedDateTime),
        owner: 'current-user',
        shared: false,
        permissions: []
      },
      syncStatus: 'synced',
      lastSyncedAt: new Date()
    };
  }
  
  async deleteResource(id: string): Promise<void> {
    await this.makeRequest('DELETE', `${this.baseUrl}/items/${id}`);
  }
  
  async search(query: string): Promise<Resource[]> {
    const response = await this.makeRequest(
      'GET',
      `${this.baseUrl}/root/search(q='${query}')?$select=id,name,size,createdDateTime,lastModifiedDateTime,webUrl`
    );
    
    return response.value.map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.folder ? 'folder' : 'file',
      source: 'onedrive',
      mimeType: item.file?.mimeType || 'folder',
      size: item.size || 0,
      url: item.webUrl,
      metadata: {
        createdAt: new Date(item.createdDateTime),
        modifiedAt: new Date(item.lastModifiedDateTime),
        owner: 'current-user',
        shared: false,
        permissions: []
      },
      syncStatus: 'synced',
      lastSyncedAt: new Date()
    }));
  }
}
```

---

## COMPONENTES FRONTEND

### Integration Menu Component

```typescript
// src/components/integration/IntegrationMenu.tsx
import React, { useState } from 'react';
import { FigmaIcon, GoogleDriveIcon, OneDriveIcon, UploadIcon, SkillIcon } from '@/icons';

interface IntegrationMenuProps {
  onSelect: (source: string) => void;
}

export function IntegrationMenu({ onSelect }: IntegrationMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const integrations = [
    {
      id: 'figma',
      label: 'Agregar desde Figma',
      icon: FigmaIcon,
      description: 'Importar diseños de Figma'
    },
    {
      id: 'onedrive',
      label: 'Añadir desde archivos de OneDrive',
      icon: OneDriveIcon,
      description: 'Importar archivos de OneDrive'
    },
    {
      id: 'google-drive',
      label: 'Añadir desde archivos de Google Drive',
      icon: GoogleDriveIcon,
      description: 'Importar archivos de Google Drive'
    },
    {
      id: 'skill',
      label: 'Usar habilidades',
      icon: SkillIcon,
      description: 'Utilizar habilidades disponibles'
    },
    {
      id: 'recent',
      label: 'Archivos recientes',
      icon: 'clock',
      description: 'Ver archivos recientes'
    },
    {
      id: 'local',
      label: 'Agregar desde archivos locales',
      icon: UploadIcon,
      description: 'Subir archivos desde tu computadora'
    }
  ];
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <span>+</span>
        <span>Agregar</span>
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {integrations.map(integration => (
            <button
              key={integration.id}
              onClick={() => {
                onSelect(integration.id);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
            >
              <integration.icon className="w-5 h-5" />
              <div>
                <p className="font-medium text-sm">{integration.label}</p>
                <p className="text-xs text-gray-500">{integration.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### File Explorer Component

```typescript
// src/components/integration/FileExplorer.tsx
import React, { useState, useEffect } from 'react';
import { Resource } from '@/types';

interface FileExplorerProps {
  source: string;
  onSelect: (resources: Resource[]) => void;
  onCancel: () => void;
}

export function FileExplorer({ source, onSelect, onCancel }: FileExplorerProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadResources();
  }, [source]);
  
  const loadResources = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/integrations/${source}/resources`);
      const data = await response.json();
      setResources(data);
    } catch (err) {
      setError('Error cargando recursos');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };
  
  const handleSelect = () => {
    const selectedResources = resources.filter(r => selected.has(r.id));
    onSelect(selectedResources);
  };
  
  if (loading) {
    return <div className="p-8 text-center">Cargando...</div>;
  }
  
  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-96 flex flex-col">
        <h2 className="text-2xl font-bold mb-4">Seleccionar archivos</h2>
        
        <div className="flex-1 overflow-y-auto mb-4">
          {resources.map(resource => (
            <label key={resource.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(resource.id)}
                onChange={() => toggleSelect(resource.id)}
                className="w-4 h-4"
              />
              {resource.preview?.thumbnail && (
                <img
                  src={resource.preview.thumbnail}
                  alt={resource.name}
                  className="w-10 h-10 rounded object-cover"
                />
              )}
              <div className="flex-1">
                <p className="font-medium">{resource.name}</p>
                <p className="text-sm text-gray-500">
                  {new Date(resource.metadata.modifiedAt).toLocaleDateString()}
                </p>
              </div>
            </label>
          ))}
        </div>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSelect}
            disabled={selected.size === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Agregar ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## CONCLUSIÓN

Este documento proporciona una guía completa para implementar un sistema de integración multi-fuente. El sistema es:

✅ **Modular** - Fácil de extender con nuevos conectores
✅ **Escalable** - Soporta múltiples usuarios y fuentes
✅ **Seguro** - Gestión de permisos y credenciales
✅ **Eficiente** - Caché y sincronización inteligente
✅ **Flexible** - Adaptable a diferentes tipos de recursos

---

**Versión:** 1.0
**Última actualización:** Junio 27, 2026
**Estado:** Listo para implementación
