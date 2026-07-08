# Guía de Implementación - Mejoras de UI/UX Alineadas con Manus IA

Este documento proporciona una guía paso a paso para implementar las mejoras de UI/UX en el proyecto `agente`.

---

## Fase 1: Preparación (Día 1)

### 1.1 Crear rama de desarrollo
```bash
git checkout -b feature/manus-ui-improvements
```

### 1.2 Instalar dependencias adicionales (si es necesario)
```bash
npm install framer-motion react-markdown remark-gfm
```

### 1.3 Revisar archivos de referencia
- `UI_IMPROVEMENTS.md` - Visión general de mejoras
- `COMPONENT_IMPROVEMENTS.md` - Ejemplos de código

---

## Fase 2: Cambios en Estilos Globales (Día 2)

### 2.1 Actualizar `src/globals.css`

Añadir variables de color para Manus IA:
```css
:root {
  /* Colores de Manus IA */
  --manus-primary: 139 92 246; /* Violeta */
  --manus-secondary: 59 130 246; /* Azul */
  --manus-accent: 6 182 212; /* Cyan */
  
  /* Gradientes */
  --manus-gradient: linear-gradient(135deg, rgb(139 92 246), rgb(59 130 246));
  --manus-gradient-subtle: linear-gradient(135deg, rgb(139 92 246 / 0.1), rgb(59 130 246 / 0.1));
}

/* Animaciones personalizadas */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse-glow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

/* Utility classes */
.animation-delay-100 { animation-delay: 100ms; }
.animation-delay-200 { animation-delay: 200ms; }
.animation-delay-300 { animation-delay: 300ms; }

.bg-gradient-manus {
  background: var(--manus-gradient);
}

.bg-gradient-manus-subtle {
  background: var(--manus-gradient-subtle);
}
```

### 2.2 Actualizar `tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  theme: {
    extend: {
      colors: {
        manus: {
          primary: "rgb(139 92 246 / <alpha-value>)",
          secondary: "rgb(59 130 246 / <alpha-value>)",
          accent: "rgb(6 182 212 / <alpha-value>)",
        },
      },
      backgroundImage: {
        "gradient-manus": "linear-gradient(135deg, rgb(139 92 246), rgb(59 130 246))",
        "gradient-manus-subtle": "linear-gradient(135deg, rgb(139 92 246 / 0.1), rgb(59 130 246 / 0.1))",
      },
      animation: {
        "slide-in-up": "slideInUp 0.3s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "shimmer": "shimmer 2s infinite",
      },
      keyframes: {
        slideInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
    },
  },
}

export default config
```

---

## Fase 3: Mejoras de Componentes (Días 3-5)

### 3.1 Actualizar `src/components/ui/markdown.tsx`

Implementar los cambios del archivo `COMPONENT_IMPROVEMENTS.md` sección 4.

**Cambios principales:**
- Mejorar estilos de encabezados con gradientes
- Mejorar estilos de tablas
- Mejorar estilos de código
- Mejorar estilos de citas

### 3.2 Actualizar `src/components/agente/chat-panel.tsx`

Implementar los cambios del archivo `COMPONENT_IMPROVEMENTS.md` secciones 1-3.

**Cambios principales:**
- Mejorar `MessageBubble` con avatar de gradiente
- Mejorar `StepRow` con información adicional
- Mejorar `OutputBlock` con mejor diseño y acciones

**Pasos:**
1. Crear función `StepRowImproved`
2. Crear función `OutputBlockImproved`
3. Actualizar `MessageBubble` para usar las nuevas funciones
4. Añadir importaciones necesarias (Copy icon, etc.)

### 3.3 Actualizar `src/components/ui/button.tsx`

Añadir nuevas variantes de botón:
```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Nuevas variantes para Manus IA
        manus: "bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 shadow-lg",
        "manus-subtle": "bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 dark:text-violet-400",
        success: "bg-green-500 text-white hover:bg-green-600",
        "success-subtle": "bg-green-500/10 text-green-600 hover:bg-green-500/20",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

---

## Fase 4: Mejoras de Sidebar (Día 6)

### 4.1 Actualizar `src/components/agente/conversation-sidebar.tsx`

**Cambios principales:**
- Añadir información detallada sobre cada conversación (tokens, costo, modelo)
- Mejorar la visualización del estado de la conversación
- Añadir filtros por categoría

**Ejemplo:**
```tsx
{conversation.messages.length > 0 && (
  <div className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1.5">
    <span>{conversation.tokensUsed} tokens</span>
    {conversation.cost > 0 && (
      <>
        <span>·</span>
        <span>${conversation.cost.toFixed(4)}</span>
      </>
    )}
    {conversation.modelUsed && (
      <>
        <span>·</span>
        <span className="truncate">{conversation.modelUsed}</span>
      </>
    )}
  </div>
)}
```

---

## Fase 5: Mejoras de Workspace (Día 7)

### 5.1 Actualizar `src/components/agente/workspace-panel.tsx`

**Cambios principales:**
- Mejorar visualización de archivos con más detalles
- Mejorar visualización de código con opciones de copia/descarga
- Mejorar visualización de terminal
- Mejorar visualización de datos

---

## Fase 6: Mejoras de Páginas (Días 8-9)

### 6.1 Actualizar `src/components/agente/pages/dashboard-page.tsx`

**Cambios principales:**
- Añadir gráficos de uso de agentes
- Añadir gráficos de uso de modelos
- Añadir gráficos de uso de herramientas
- Mejorar visualización de estadísticas

### 6.2 Actualizar `src/components/agente/pages/history-page.tsx`

**Cambios principales:**
- Añadir filtros avanzados
- Mejorar búsqueda
- Mejorar visualización del historial

### 6.3 Actualizar `src/components/agente/pages/reports-page.tsx`

**Cambios principales:**
- Mejorar visualización de reportes
- Añadir opciones de descarga
- Mejorar búsqueda y filtros

---

## Fase 7: Testing y Refinamiento (Día 10)

### 7.1 Pruebas Visuales
- Verificar que todos los componentes se vean correctamente
- Verificar que las animaciones funcionen suavemente
- Verificar que los colores sean consistentes

### 7.2 Pruebas de Responsividad
- Verificar en dispositivos móviles
- Verificar en tablets
- Verificar en pantallas grandes

### 7.3 Pruebas de Accesibilidad
- Verificar contraste de colores
- Verificar navegación con teclado
- Verificar lectores de pantalla

---

## Checklist de Implementación

### Fase 1: Preparación
- [ ] Crear rama de desarrollo
- [ ] Instalar dependencias
- [ ] Revisar archivos de referencia

### Fase 2: Estilos Globales
- [ ] Actualizar `globals.css`
- [ ] Actualizar `tailwind.config.ts`
- [ ] Verificar que los estilos se apliquen correctamente

### Fase 3: Componentes
- [ ] Actualizar `markdown.tsx`
- [ ] Actualizar `chat-panel.tsx`
- [ ] Actualizar `button.tsx`
- [ ] Verificar que los componentes se vean correctamente

### Fase 4: Sidebar
- [ ] Actualizar `conversation-sidebar.tsx`
- [ ] Verificar que la información se muestre correctamente

### Fase 5: Workspace
- [ ] Actualizar `workspace-panel.tsx`
- [ ] Verificar que la visualización sea clara

### Fase 6: Páginas
- [ ] Actualizar `dashboard-page.tsx`
- [ ] Actualizar `history-page.tsx`
- [ ] Actualizar `reports-page.tsx`

### Fase 7: Testing
- [ ] Pruebas visuales
- [ ] Pruebas de responsividad
- [ ] Pruebas de accesibilidad

---

## Comandos Útiles

### Desarrollo
```bash
# Iniciar servidor de desarrollo
npm run dev

# Compilar TypeScript
npm run build

# Linting
npm run lint

# Formatear código
npm run format
```

### Git
```bash
# Ver cambios
git status

# Añadir cambios
git add .

# Hacer commit
git commit -m "feat: descripción de cambios"

# Hacer push
git push origin feature/manus-ui-improvements

# Crear pull request
# (desde GitHub)
```

---

## Recursos

- **Tailwind CSS**: https://tailwindcss.com/
- **Framer Motion**: https://www.framer.com/motion/
- **React Markdown**: https://github.com/remarkjs/react-markdown
- **Manus IA**: https://manus.im/

---

## Notas Importantes

1. **Mantener Consistencia**: Asegúrate de que todos los componentes sigan el mismo estilo y paleta de colores.

2. **Rendimiento**: Evita animaciones excesivas que puedan ralentizar la aplicación.

3. **Accesibilidad**: Asegúrate de que todos los componentes sean accesibles para usuarios con discapacidades.

4. **Testing**: Prueba cada componente en diferentes navegadores y dispositivos.

5. **Documentación**: Documenta cualquier cambio importante en el código.

---

## Próximos Pasos

Después de completar esta guía, considera:

1. Implementar temas personalizables (claro/oscuro)
2. Añadir más animaciones y transiciones
3. Mejorar la experiencia móvil
4. Implementar notificaciones en tiempo real
5. Añadir más gráficos y visualizaciones

---

## Soporte

Si tienes preguntas o problemas durante la implementación, consulta:

- `UI_IMPROVEMENTS.md` - Visión general de mejoras
- `COMPONENT_IMPROVEMENTS.md` - Ejemplos de código
- Documentación de Tailwind CSS
- Documentación de Framer Motion
