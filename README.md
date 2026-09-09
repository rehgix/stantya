# Stantya

Quiero crear una aplicación web y móvil de gestión y valoración de colecciones físicas (libros, videojuegos y películas) conectada a mi base de datos de Supabase.

Características clave del MVP:

Panel Principal (Dashboard): Muestra el valor total estimado de la colección en euros (€) y tarjetas/grid con los artículos añadidos. Permite filtrar por tipo: Libros, Videojuegos, Películas o Lista de Deseos.

Buscador y Registro: Un buscador para añadir artículos. Para libros, integra la API gratuita de Google Books para obtener título, autor, portada y fecha al escribir el nombre o ISBN. Para videojuegos y películas, crea la estructura para guardar carátula, plataforma/formato, título y año.

Gestión de Inventario: Cada artículo debe permitir indicar su estado de conservación (Nuevo, Muy bueno, Bueno, Aceptable) y el precio pagado de compra.

Métricas de Valor: Cada artículo debe mostrar una estimación de precio de mercado actual y calcular la ganancia/pérdida frente al precio de compra.

Diseño: Interfaz moderna, limpia, optimizada para verse perfecta tanto en móvil como en escritorio (Mobile-First), con modo oscuro elegante.

Por favor, crea las tablas necesarias en Supabase (items, user_inventory) y genera la interfaz completa y funcional.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dc2feed0-8f12-4305-8d36-93039d8a38c7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
