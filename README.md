# Amaya Stickers 🎨✂️

Aplicación web para transformar fotos en stickers imprimibles usando inteligencia artificial.

## Características

- **Autenticación simple**: PIN de 6 dígitos con sesión persistente (7 días)
- **Subida de imágenes**: Drag & drop o selección de archivos (JPG, PNG, WebP hasta 4MB)
- **3 estilos de sticker**:
  - ✨ Mágico (estilo cartoon)
  - 📸 Como Foto (estilo realista)
  - 🎌 Anime (estilo anime)
- **Límite diario**: 15 stickers por día (se resetea a medianoche)
- **Diseño amigable**: Colores pastel, tipografía redondeada, perfecto para móvil/tablet

## Tecnologías

- Next.js 14 (App Router)
- Tailwind CSS
- API de Kie.ai (modelo nano-banana-edit)

## Despliegue en Vercel

### 1. Fork o clona el repositorio

```bash
git clone https://github.com/tu-usuario/amaya-stickers.git
cd amaya-stickers
```

### 2. Configura las variables de entorno

En Vercel (Settings > Environment Variables), añade:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `AMAYA_PIN` | PIN de 6 dígitos para acceder | `123456` |
| `KIE_API_KEY` | API Key de Kie.ai | `kie_xxxxx` |

### 3. Despliega

#### Opción A: Desde Vercel Dashboard
1. Ve a [vercel.com](https://vercel.com)
2. Importa tu repositorio
3. Las variables de entorno se configuran automáticamente si las añadiste antes
4. Click en "Deploy"

#### Opción B: Desde línea de comandos
```bash
npm install -g vercel
vercel
```

## Desarrollo local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo:
```bash
cp .env.example .env.local
```

Edita `.env.local` con tus valores:
```env
AMAYA_PIN=123456
KIE_API_KEY=tu_api_key_de_kie
```

### 3. Iniciar servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Obtener API Key de Kie.ai

1. Ve a [kie.ai/api-key](https://kie.ai/api-key)
2. Crea una cuenta o inicia sesión
3. Genera una nueva API Key
4. Copia la key y pégala en tus variables de entorno

## Estructura del proyecto

```
/app
  /page.tsx           # Página de login con PIN
  /stickers/page.tsx  # App principal (protegida)
  /api
    /auth/route.ts    # API de autenticación
    /generate/route.ts # API de generación de stickers
/components
  /PinInput.tsx       # Input para el PIN
  /ImageUploader.tsx  # Componente drag & drop
  /StyleSelector.tsx  # Selector de estilos
  /StickerResult.tsx  # Resultado con descarga
  /RemainingCounter.tsx # Contador de stickers restantes
```

## Personalización

### Cambiar el límite diario
En `app/stickers/page.tsx`, modifica la constante:
```typescript
const DAILY_LIMIT = 15 // Cambia este número
```

### Cambiar los estilos de sticker
En `app/api/generate/route.ts`, modifica el objeto `STYLE_PROMPTS`:
```typescript
const STYLE_PROMPTS: Record<string, string> = {
  cartoon: 'Tu prompt personalizado...',
  // ...
}
```

### Cambiar duración de la sesión
En `app/api/auth/route.ts`, modifica:
```typescript
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 días en segundos
```

## Licencia

MIT

---

Hecho con ❤️ para Amaya
