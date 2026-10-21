# Dirección visual

Modo: Operate en descubrimiento y publicación, Read en consejos. Evolución de la marca existente, no reemplazo del producto. DESIGN_VARIANCE=6, MOTION_INTENSITY=4, VISUAL_DENSITY=5: fotografía editorial compacta, búsqueda visible y controles familiares.

Material UI permanece como única biblioteca de componentes. Glassmorphism web implementado con CSS, no como una biblioteca oficial de Apple. Fotografía local real con autor, fuente y licencia. Carrusel manual por defecto, navegación por teclado, sin movimiento perpetuo. Sin datos comerciales inventados.

Tokens implementados en `src/glass.css` y `src/main.tsx`, siguiendo `prefers-color-scheme`:

| Token | Claro | Oscuro |
| --- | --- | --- |
| Página | `#eaf3ef` | `#0c231d` |
| Texto principal | `#18312d` | `#eef6f2` |
| Texto secundario | `#4d6960` | `#bbd0c5` |
| Acento | `#00695c` | `#8ad4bc` |
| Vidrio | `rgba(255,255,255,.78)` | `rgba(22,51,41,.9)` |
| Superficie sólida | `#f8fcfa` | `#17342a` |
| Borde de vidrio | `rgba(255,255,255,.9)` | `rgba(164,208,186,.2)` |

El color secundario MUI es `#e7a436`. Vidrio con borde de 1px, `blur(16px) saturate(125%)`, brillo interior y sombra suave; búsqueda y botones del carrusel usan blur de 12px. Manrope se sirve mediante `@fontsource/manrope`, con pesos 400, 600, 700 y 800 y alternativas Segoe UI, Arial y sans-serif. Título principal: peso 800, interlineado 1.15, tamaño fluido 30–48px (34px a 500px o menos). Texto introductorio: 16px e interlineado 1.7. Radios: tema 14px, barra lateral/fotografía/checklist 22px, acordeones 16px, tarjetas/banner 18px, estado vacío 20px. Z-index: cabecera 10, capas Material gestionadas por su tema; contenido y carrusel no definen un z-index propio.

Movimiento: `glass.css`, importado después de `motion.css`, establece `cubic-bezier(.23,1,.32,1)`. Fotografía por opacidad en 240ms, entrada de tarjetas en 240ms con retrasos de 45ms hasta 225ms, transiciones de tarjeta en 260ms, detalles de tarjeta en 180ms, navegación en 220ms y chips en 200ms. Botón presionado: escala .97, sin duración local específica de 140ms. El contenedor principal tiene `animation:none`; no repite entrada al cambiar de pestaña. Hover de elevación limitado a puntero preciso con hover. Movimiento reducido desactiva animaciones, transiciones y transformaciones de feedback.

Transparencia reducida sustituye las superficies de vidrio por fondo sólido y elimina blur, incluida búsqueda. El fallback sin soporte de `backdrop-filter` cubre las superficies principales; su selector no incluye búsqueda ni controles del carrusel.

Composición: ancho máximo 1480px, barra lateral 205px, gap/padding de 24px. A 1100px o menos: barra lateral 180px y gap/padding de 18px. A 800px: una columna, navegación horizontal y búsqueda apilada. A 500px: navegación 2×2 con las cuatro opciones Descubrir, Agenda, Comercios y Consejos; tarjetas en una columna.

Carrusel manual con botones de 44px y flechas izquierda/derecha cuando tiene foco; sin temporizador. Texto alternativo, foco visible, título `aria-live="polite"` y mensaje de error de carga. Fotos: río frente al Club de Pescadores y costanera. WebP con variantes 800/1600px, `object-fit:cover`, alturas 260px/240px/220px según los breakpoints 1100px y 800px. `public/city/sources.json` registra Wikimedia Commons, Ezarate, CC BY-SA 4.0 y cambios de tamaño/formato; conservar los enlaces de atribución y licencia.

Referencias usadas: emilkowalski/skills (emil-design-eng), pbakaus/impeccable (new-work y craft-floor, sin launcher local) y Leonxlnx/taste-skill (design-taste-frontend). Se aplican las recomendaciones contextuales al diseño solicitado, preservando Material UI y el funcionamiento existente.

Las guías fueron consultadas; no implican instalar un launcher Impeccable. `.impeccable/design.json` es un registro JSON local sin declaración de esquema oficial ni validación de Impeccable. Revisión visual: se inspeccionaron escritorio y celular, carrusel, consejos y diálogo de acceso. El revisor independiente detectó Consejos oculto en celular; confirmó esa corrección en las capturas finales de 380px y 320px. El veredicto final cubre esa corrección, sin certificar modo oscuro ni lector de pantalla. Compilación final y 26 pruebas completadas. La presencia del flujo de ingreso Google no confirma autenticación operativa con credenciales reales.


## Revisión solicitada: bandera y búsqueda

La petición posterior del usuario sustituye la dirección fotográfica: no mostrar carrusel. Usar exactamente la imagen aportada en public/brand/gualeguaychu.png como logo rectangular, sin transformar el dibujo. Fondo fijo con esa imagen al 12% en claro, 8% en oscuro; desactivado con transparencia reducida. Hero de una columna con borde lateral de 3px, título Gualeguaychú, a mano. y tamaño fluido 34–58px (36px en celular). Logo de 66x44, 45x30 en celular y 36x24 en pantallas muy pequeñas.

AnimatedSearch conserva una etiqueta accesible estable. Alterna cuatro sugerencias locales: pausa 2400ms, escritura 65ms/caracter, borrado 32ms/caracter y pausa entre frases 250ms. Detiene los temporizadores al enfocar, escribir o desmontarse. Movimiento reducido mantiene una sugerencia fija. No utiliza anuncios aria-live para el texto decorativo.

Reflejo diagonal de las tarjetas con transición de fondo de 650ms; opacidad, bordes y sombras responden en 220ms. Solo aplica con hover y puntero preciso; movimiento reducido elimina el reflejo y las transformaciones. Las tarjetas reales aparecen únicamente cuando haya publicaciones vigentes, sin contenido ficticio para demostrar efectos.

Verificación de esta revisión: 28 pruebas y compilación aprobadas. Inspeccionadas las capturas de escritorio compacto y celular, navegación y buscador. La captura amplia se recuperó con calidad limitada en la herramienta del navegador; no se certifica su nitidez. Un revisor independiente no encontró defectos materiales nuevos en el alcance de las capturas compacta y móvil. Las fotos y componente anteriores quedan desconectados de App.


## Dirección actual: afiche local neobrutalista

El nuevo pedido explícito del usuario reemplaza la predominancia glass con brutalismo y colores excéntricos. Material UI y Manrope siguen como base. Componente DiscoveryHero presenta GUALE. PASAN COSAS., marca de localidad, sello decorativo inclinado DE ACÁ. PARA VOS. y textos locales; sin datos comerciales ficticios ni métricas inventadas.

Tokens efectivos en brutal.css, importado al final: crema #fff6df, tinta/borde #18181b, papel #fffdf5, violeta #6333ee, amarillo ácido #deff00, rosa #ff76b0, cian #77e8ec. Primario MUI violeta (lavanda #c7b4ff en oscuro), secundario rosa. Oscuro: página #201d29, papel #302b3d, texto #fff6df, secundario #d0c6dd, borde #08070a. Bloques rosa/cian/ácido conservan texto negro. Bandera al 4,5% en claro y 3,5% en oscuro.

Esquinas rectas; bordes de 2px en controles y 3px en bloques. Sombras de desplazamiento sin blur: botones 4px, lateral 5px, paneles 6px y hero 8px. Cabecera conserva vidrio al 94%; el resto de superficies principales es sólido. Hero: título 44–80px, primera línea 1,27em; texto secundario 15px; márgenes negros editoriales. Sello 130x150, inclinado 7 grados; en celular pasa a 64x76 y tipografía de 10px, sin interacción funcional.

Hover: tarjetas se desplazan -3px y rotan -.4 grados, filtros -2px/-2 grados, sombras cambian a violeta; sello gira -5 grados. Movimiento reducido elimina estos movimientos. Se conserva el buscador con escritura y pausa accesible y los formularios existentes. Se mantienen cuatro destinos visibles en celular.

Verificación: compilación final aprobada y 28 pruebas. Revisor independiente no detectó regresiones materiales en código y capturas compactas/móviles. Separación visual PASAN/COSAS corregida con margen .14em. La herramienta de capturas no confirmó dimensiones exactas ni escritorio amplio; modo oscuro y tarjetas pobladas no se certificaron visualmente en esta revisión.

## Logo definitivo

El usuario sustituyó la bandera como logo por public/brand/guale-conecta.png, copia intacta de Logo Guale Conecta con Nodo Azul.png. La cabecera usa únicamente esta imagen (incluye nombre y lema), sin duplicar texto. El nodo azul conserva su color original. Tamaños de presentación: 220x76 escritorio, 170x59 hasta800, 140x49 hasta500 y 116x40 hasta360; object-fit cover centra y recorta únicamente margen blanco. Sin borde ni sombra adicional. La bandera anterior continúa exclusivamente como fondo tenue. Compilación verificada tras el cambio.

## Cabecera armónica

AppHeader reúne logo, navegación semántica y acciones. Cabecera blanca sólida, tinta negra y azul #001cff tomado de la identidad del nodo; Publicar azul y sección activa negra con sombra azul de 3px. Logo centrado verticalmente y sin borde, menú con controles de al menos 44px. Ancho compartido de 1280px con el contenido, margen interior 28px. Se retiró la barra lateral para evitar separar el logo de los destinos principales.

A más de950px: logo, menú y acciones en una fila. Hasta950px: logo/acciones arriba y cuatro destinos iguales debajo, separados por una línea tenue. Celular: 16px de margen, etiquetas de 11px y logo140x49; hasta360px logo116x40 y margen12px. El archivo de logo permanece intacto y conserva el nodo azul. Capturas compacta/móvil y medidas DOM verificadas sin desborde; herramienta de viewport no acredita ancho exacto solicitado. Compilación y 28 pruebas aprobadas tras la integración.
# Panel administrativo

El panel conserva la tipografía, bordes negros y sombras del sitio. Presenta pendientes y aprobadas con contadores, búsqueda y revisión en un diálogo con contacto y adjuntos. El acceso aparece para el rol administrativo; el servidor valida ese rol. Se revisó en escritorio y celular, sin desbordamiento horizontal. La aprobación requiere una acción explícita y conserva el estado pendiente cuando falla. Verificación: 37 pruebas y compilación correctas; la publicación real permaneció pendiente durante la revisión visual.
