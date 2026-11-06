# Coliseo StarCrafty

Juego de lucha de arena para el navegador, ambientado en **StarCraft: Brood War**. Un Marine, un Hidralisco y un Dark Templar pelean dentro de un coliseo, solos contra la IA o de dos jugadores. Hecho con HTML, CSS y JavaScript puro, sin librerías ni instalación.

## ▶ Jugar ahora

**https://wizardjcp60-sketch.github.io/Proyecto-StarCrafty/**

Haz clic en la pantalla antes de esperar la música: los navegadores bloquean el sonido hasta el primer clic o tecla.

![Menú del juego](docs/menu.jpg)

![Partida: Marine contra Hidralisco](docs/partida.jpg)

## Cómo se juega

- Cada luchador tiene **2 vidas** (configurable de 1 a 3) y cada ronda dura **45 segundos**.
- Si se acaba el tiempo, cae un **misil nuclear** sobre quien tenga menos vida.
- Caen objetos al azar: escudo, stimpack, botiquín, multidisparo y un zergling explosivo (un disparo lo detona).
- **Huevo zerg y mascota:** de vez en cuando sale un huevo al azar; a los 3 s nace un zergling con vida propia que deambula. Quien lo toca lo adopta (se vuelve azul o rojo) y la mascota persigue y muerde al rival. Se puede matar a disparos, golpes y áreas (ver LEEME, sección 6K).
- **Super ataque raro:** de vez en cuando cae una baliza azul. Quien la recoge llama a un **Battlecruiser** que entra con salto táctico, cambia la música y bombardea al rival con láseres y el cañón Yamato (las marcas del suelo se pueden esquivar). Se ajusta en `CONFIG.BC` de `js/config.js`.
- **Ataques especiales automáticos:** cada 5 ataques el Hidralisco escupe una bola de ácido grande (deja ácido encima) y el Marine dispara una **mina** que se pega al rival y explota **2 s despues** (temporizador en `CONFIG.MBIG.fuse`; 0 = explota al instante) y deja **quemadura** por segundo. Ajustes en `CONFIG.HBIG` y `CONFIG.MBIG` de `js/config.js`.
- Dificultad de la IA: fácil, normal o difícil.
- **Arena:** en el menú puedes elegir entre el coliseo Terran contra Zerg y una arena de piedra algo más estrecha.

### Controles

| Acción | Teclado |
| --- | --- |
| Mover | `W` `A` `S` `D` o flechas |
| Disparar | `F` o `Espacio` |
| Pausa | `Enter` |
| Especial (se recarga cada 9 s) | `G` lanza la granada del Marine, `.` escupe el ácido del Hidralisco |

- **2 jugadores:** el Marine usa `WASD` + `F`; el Hidralisco usa las flechas + `Shift` derecho.
- **Dark Templar:** pelea cuerpo a cuerpo, va camuflado (los disparos contra él se desvían hasta que ataca) y su especial es un salto sombrío que lo hace reaparecer detrás del rival.
- **Mando:** stick o cruceta para mover, `A` o gatillo para disparar, `X` o `B` para el especial, `Start` para pausar.
- **Móvil:** salen controles táctiles (mejor en horizontal).

![Efecto de la granada del Marine](docs/preview_granada.jpg)

## Jugar online (1 contra 1)

Sin servidor propio: los dos navegadores se conectan directamente (WebRTC con [PeerJS](https://peerjs.com), que se carga desde internet).

1. Uno pulsa **Jugar online → Crear sala** y recibe un **código de 4 letras** (elige antes los luchadores, las vidas y la arena: él juega a la izquierda).
2. El otro pulsa **Jugar online**, escribe el código y pulsa **Unirse** (juega a la derecha). La partida empieza sola.
3. Al acabar, el anfitrión pulsa cualquier botón de jugar para la **revancha**. **Salir** (arriba) cierra la sala.

Los controles son los de 1 jugador (WASD o flechas, `F`/Espacio, `G` o `.`, `V` o `/`, mando y táctil). No hay pausa online.
Funciona por **sincronización de controles** (lockstep): los dos juegos corren idénticos a 60 pasos/s con la misma semilla y solo se envían las teclas, con 4 pasos de adelanto (~67 ms). Detalles en `js/online.js`.
Prueba automática sin navegador: `node tools/test_online.js` (dos clientes, red falsa con latencia y jitter, comprueba que los estados son idénticos paso a paso).

## Jugar en tu ordenador

Descarga el repositorio (botón verde **Code → Download ZIP**), descomprímelo y abre `index.html` en Chrome, Edge o Firefox. No necesita servidor.

## Estructura

```
index.html        Página principal (HUD, menú, pausa y canvas)
css/              Estilos
js/               config.js (ajustes y rutas), audio.js, granada_fx.js, game.js, online.js
assets/           Imágenes, sonidos, voces y música
tools/            Scripts de Python que generan atlas, efectos y sonidos
docs/             Capturas para este README
LEEME.txt         Documentación completa del proyecto (en español)
```

Los ajustes de balance están en `js/config.js`. El detalle de cada sistema está en [`LEEME.txt`](LEEME.txt).

## Créditos y aviso

Proyecto de aficionado, sin fines comerciales y sin relación con Blizzard Entertainment. *StarCraft*, *Brood War* y sus personajes, imágenes, voces y música son propiedad de Blizzard Entertainment.

- Hoja de sprites del Marine ("Terran Marine"): extraída por Colton.
- Hojas del Hidralisco y del Dark Templar: ACE_Spark.
- La música de fondo (`arena.mp3`) es el "Main Title" de StarCraft Remastered. Si quieres publicar tu propia versión, reemplázala por una pista tuya con el mismo nombre.

Si vas a redistribuir el proyecto, revisa antes los derechos de las imágenes, voces y música.
