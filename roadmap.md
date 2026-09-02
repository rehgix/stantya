# Roadmap

- [x] Buscador conectado a APIs reales (Google Books, TMDB, RAWG) vía server function segura
- [x] Modal "+ Añadir obra": cuadrícula de portadas con debounce 400ms y previsualización con botón "Añadir a mi biblioteca"
- [x] Secretos GOOGLE_BOOKS_API_KEY, TMDB_API_KEY, RAWG_API_KEY disponibles en el backend
- [x] Identidad de marca "Stantya": logo SVG en el header, subtítulo, favicon y metadatos
- [x] Búsqueda de libros con maxResults=40 y fallback sin langRestrict; carátulas zoom=3 en https
- [x] Juegos: selector de plataforma según el título y banner tipo caja física por consola
- [x] Carátula alternativa: pegar URL o subir foto propia
- [x] Landing page premium para visitantes no autenticados

## Escaneo / digitalización de portadas (hecho)
- [x] Bucket privado `custom_covers` + políticas de subida para usuarios autenticados
- [x] Componente CoverScanner: cámara/galería, recorte con ratio 2:3 (libros/cine) y 3:4 (juegos), rotar 90°, brillo/contraste
- [x] Procesado canvas ≥1000px alto, JPEG/WebP calidad 0.85, subida y guardado en cover_url
- [x] Integrado en el modal de añadir obra y en la ficha de edición
