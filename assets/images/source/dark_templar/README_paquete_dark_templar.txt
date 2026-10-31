=====================================================================
 DARK TEMPLAR (StarCraft: Brood War)  -  PERSONAJE FRAME A FRAME  v1.0
=====================================================================
Sprites cortados de la hoja "Protoss Dark Templar" (extraida y compilada
por ACE_Spark). Todo lo que hay aqui se genera a partir de esa hoja.

---------------------------------------------------------------------
 1. CONTENIDO DEL ZIP
---------------------------------------------------------------------
 demo.html                  Demo jugable. Abrela con doble clic (sin servidor).
 src/darktemplar.js         Libreria del personaje (sin dependencias).
 assets/atlas.png           Atlas con los 295 frames (1024x1520, frames de 64x80).
 assets/atlas.json          Coordenadas de cada frame por animacion y direccion.
 assets/atlas_data.js       Mismo atlas embebido en base64 (para file:// sin servidor).
 assets/frames/             295 PNG sueltos:  <anim>/dir_XX/frame_YY.png
 assets/team_colors/        Atlas pre-coloreados: red, blue, teal, purple, orange,
                            brown, white, yellow.
 source/original_spritesheet.png   Hoja original.
 tools/build_atlas.py       Regenera todo desde la hoja original (Python + Pillow + numpy).
 tests/test_logic.js        Pruebas de la logica (node tests/test_logic.js).

---------------------------------------------------------------------
 2. ANIMACIONES Y DIRECCIONES
---------------------------------------------------------------------
 Animaciones                 Frames   Direcciones   Bucle
   idle   (quieto)              1         16          si
   walk   (caminar)            10         16          si
   attack (ataque con cuchilla) 7         16          no   (el golpe cae en el frame 4)
   death  (muerte / explosion)  7          1          no

 Las 16 direcciones van en sentido horario, empezando por el norte:
   0=N  1=NNE 2=NE 3=ENE 4=E  5=ESE 6=SE 7=SSE
   8=S  9=SSO 10=SO 11=OSO 12=O 13=ONO 14=NO 15=NNO
 (La hoja original solo trae 9; las demas se generan por espejo horizontal.)

 Indice del frame dentro del atlas (cuadricula de 16 columnas, celdas 64x80):
   walk   dir d, frame k  ->  d*10 + k            (0..159)
   idle   dir d           ->  160 + d             (160..175)
   attack dir d, frame k  ->  176 + d*7 + k       (176..287)
   death  frame k         ->  288 + k             (288..294)
   x = (indice % 16) * 64      y = floor(indice / 16) * 80
 Punto de anclaje (pivote) = (32, 64): son los PIES del personaje.

 Color de jugador: el magenta del sprite se sustituye por cualquier color
 con setTeamColor() (en tiempo real) o con los atlas de assets/team_colors/.

---------------------------------------------------------------------
 3. INICIO RAPIDO (HTML + Canvas)
---------------------------------------------------------------------
 <canvas id="c" width="800" height="500"></canvas>
 <script src="assets/atlas_data.js"></script>   <!-- define window.DT_ATLAS_DATA -->
 <script src="src/darktemplar.js"></script>
 <script>
 (async () => {
   const ctx   = document.getElementById("c").getContext("2d");
   const atlas = await DarkTemplar.loadAtlas({ data: window.DT_ATLAS_DATA });
   const dt    = new DarkTemplar(atlas, { x: 200, y: 300, scale: 2 });

   dt.moveTo(500, 300);            // camina; al llegar dispara el evento "arrive"
   let last = performance.now();
   (function loop(now) {
     const dtSec = Math.min(0.05, (now - last) / 1000); last = now;
     dt.update(dtSec);             // logica + animacion
     ctx.clearRect(0, 0, 800, 500);
     dt.drawUI(ctx);               // circulo de seleccion y barras (si dt.selected)
     dt.draw(ctx);                 // sprite
     requestAnimationFrame(loop);
   })(last);
 })();
 </script>

 Si lo sirves desde un servidor web puedes cargar los archivos normales:
   const atlas = await DarkTemplar.loadAtlas({ png:"assets/atlas.png", json:"assets/atlas.json" });
 (Con file:// usa atlas_data.js; el navegador bloquea fetch() y el recoloreado de imagenes locales.)

 Con bundlers (Webpack/Vite/Node):  const DarkTemplar = require("./src/darktemplar.js");
 En Node solo funciona la logica (update, ordenes, dano); draw()/setTeamColor necesitan Canvas.

---------------------------------------------------------------------
 4. REFERENCIA DE LA API
---------------------------------------------------------------------
 --- Estaticos ---------------------------------------------------------
 DarkTemplar.loadAtlas({data|png+json|image+meta})  -> Promise<Atlas>
 DarkTemplar.angleToDir(dx, dy)   Vector de pantalla (y hacia abajo) -> direccion 0..15.
 DarkTemplar.dirToAngle(dir)      Direccion -> radianes desde el norte, en sentido horario.
 DarkTemplar.TEAM_COLORS          {original, red, blue, teal, purple, orange, brown, white, yellow}
 DarkTemplar.DEFAULTS             Valores por defecto (ver seccion 5).
 atlas.getVariant(color)          Imagen/canvas con el color de jugador cambiado (en cache).
                                  color = nombre de TEAM_COLORS o [r,g,b].

 --- Constructor -------------------------------------------------------
 new DarkTemplar(atlas, opciones)   Ver opciones en la seccion 5.

 --- Ordenes -----------------------------------------------------------
 .moveTo(x, y)           Camina al punto. Cancela cualquier ataque.
 .attack(objetivo)       Persigue y ataca. El objetivo es cualquier objeto con
                         x, y y, idealmente, takeDamage(dano, fuente), alive, radius.
                         Repite el ataque (cooldown) hasta que el objetivo muere.
 .attackMove(x, y)       Camina al punto y ataca lo primero que aparezca a <120 px
                         (necesita .setEnemies(array)).
 .setEnemies(array)      Lista de enemigos para attackMove.
 .stop()                 Se queda quieto (idle) y olvida las ordenes.
 .faceTowards(x, y)      Gira al instante hacia un punto.
 .setDirection(0..15)    Fija la direccion a mano.
 .playAnimation(nombre, {frame}) Fuerza una animacion ("walk","attack","death","idle")
                         para previsualizarla.

 --- Vida y dano -------------------------------------------------------
 .takeDamage(n, fuente)  Primero el escudo, luego la vida (armadura se resta a la vida,
                         minimo 0.5 como en Brood War). Devuelve el dano aplicado.
                         Dispara "damage"; si la vida llega a 0 llama a kill().
 .heal(hp, escudo)       Cura (sin pasar de los maximos).
 .kill(fuente)           Muere: reproduce la animacion de muerte y dispara "death".
 .revive()               Vuelve a la vida con vida y escudo completos.
 (El escudo se regenera solo tras shieldRegenDelay segundos sin recibir dano.)

 --- Camuflaje ---------------------------------------------------------
 .setCloak(true|false)   Activa o desactiva la invisibilidad (el DT la tiene siempre).
 .setDetected(true|false) true = un detector lo revela (se dibuja casi opaco).
 .isVisibleTo("ally"|"enemy")  Dice si ese bando lo ve ahora mismo.
 draw(ctx, { viewer:"ally" }) -> semitransparente con distorsion.
 draw(ctx, { viewer:"enemy" }) -> casi invisible (solo un leve espejismo).

 --- Aspecto -----------------------------------------------------------
 .setTeamColor("red" | [r,g,b] | "original")
 .scale = 2              Tamano de dibujo (editable en cualquier momento).
 .selected = true        Muestra circulo y barras de vida/escudo con drawUI().

 --- Dibujo ------------------------------------------------------------
 .draw(ctx, {viewer, shadow, camera:{x,y}})   Dibuja el sprite (con sombra, destello al
                                              recibir dano y efecto de camuflaje).
 .drawUI(ctx, camera)                         Circulo de seleccion + barras de escudo/vida.

 --- Consultas ---------------------------------------------------------
 .getBounds()            {x,y,w,h} caja de seleccion.
 .containsPoint(px,py)   Para clics del raton.
 .distanceTo(otro)       Distancia a cualquier objeto con x,y.
 .isMoving() / .isAttacking()
 .getFrameRect()         [x,y,w,h] del frame actual dentro del atlas.
 .getFrameCount()        Numero de frames de la animacion actual.

 --- Guardado ----------------------------------------------------------
 .serialize()            -> objeto JSON (posicion, vida, direccion, estado, color...).
 .deserialize(obj)

 --- Eventos (dt.on / dt.off) -----------------------------------------
 dt.on("state",   (nuevo, anterior) => ...)   idle | move | chase | attack | cooldown | dead
 dt.on("arrive",  () => ...)                  llego al destino
 dt.on("hit",     (objetivo, dano) => ...)    el golpe conecto
 dt.on("kill",    (objetivo) => ...)          el objetivo murio / se perdio
 dt.on("damage",  (cantidad, fuente) => ...)  recibio dano
 dt.on("death",   (fuente) => ...)            murio
 dt.on("animend", (nombreAnim) => ...)        termino una animacion no cíclica
 dt.off("hit")  /  dt.off("hit", fn)

 --- Propiedades de estado (lectura) ----------------------------------
 x, y (pies), dir, state, anim, frame, hp, shield, alive, target, dest, cloaked, detected

---------------------------------------------------------------------
 5. OPCIONES DEL CONSTRUCTOR (valores por defecto aproximados a Brood War)
---------------------------------------------------------------------
 x, y            0, 0       posicion (pies)
 maxHp           80         vida
 maxShield       80         escudo
 armor           1
 damage          40         dano por golpe
 attackCooldown  1.25       segundos entre golpes
 range           22         alcance melee (px, de borde a borde)
 radius          12         radio de colision / seleccion
 speed           110        px por segundo
 walkFps         12         velocidad de la animacion de caminar
 attackFps       16         velocidad de la animacion de ataque
 deathFps        9
 hitFrame        4          frame del ataque en que se aplica el dano
 scale           1.5        tamano de dibujo
 direction       8          direccion inicial (8 = sur)
 cloaked         true
 teamColor       "original"
 shieldRegenDelay 7, shieldRegenRate 2

 Ejemplo "Dark Templar fuerte y lento":
   new DarkTemplar(atlas, { maxHp:150, damage:65, speed:80, attackCooldown:1.6, teamColor:"blue" });

---------------------------------------------------------------------
 6. INTEGRACION EN OTROS MOTORES
---------------------------------------------------------------------
 Nota: la libreria JS y el demo estan probados en Chromium. Los fragmentos de
 Phaser/Unity/Godot/Pygame de abajo son guias basadas en el formato del atlas
 y no se han ejecutado en esos motores.

 6.1 PHASER 3 (usando los indices de la seccion 2)
   preload(){ this.load.spritesheet("dt","assets/atlas.png",{frameWidth:64,frameHeight:80}); }
   create(){
     for (let d=0; d<16; d++) {
       this.anims.create({key:`walk${d}`,   frames:this.anims.generateFrameNumbers("dt",{start:d*10,end:d*10+9}), frameRate:12, repeat:-1});
       this.anims.create({key:`attack${d}`, frames:this.anims.generateFrameNumbers("dt",{start:176+d*7,end:176+d*7+6}), frameRate:16});
     }
     this.anims.create({key:"death", frames:this.anims.generateFrameNumbers("dt",{start:288,end:294}), frameRate:9});
     this.dt = this.add.sprite(300,300,"dt",160+8).setOrigin(0.5, 64/80).setScale(2);
     this.dt.play("walk4");
   }
   // dir desde un vector:  const dir = Math.round(((Math.atan2(dx,-dy)+2*Math.PI)%(2*Math.PI)) / (Math.PI/8)) % 16;

 6.2 UNITY
   - Importa assets/atlas.png: Texture Type = Sprite (2D), Sprite Mode = Multiple,
     Filter Mode = Point (no filter), Compression = None, Pixels Per Unit = 32.
   - Sprite Editor > Slice > Grid By Cell Size 64x80, Pivot = Custom (0.5, 0.2)
     (los pies estan a 64/80 desde arriba = 0.2 desde abajo).
   - Crea un array de Sprite con los 295 cortes (el orden es el de la seccion 2) y
     cambia SpriteRenderer.sprite en Update():
        int frame = (int)(Time.time * 12) % 10;
        sr.sprite = sprites[dir * 10 + frame];             // walk
        sr.sprite = sprites[176 + dir * 7 + k];            // attack
        sr.sprite = sprites[288 + k];                      // death
   - Alternativa: importa las carpetas assets/frames/<anim>/dir_XX/ y crea Animation Clips
     arrastrando los frames de cada carpeta.
   - Camuflaje: material con color alpha 0.5 (o un shader de distorsion).

 6.3 GODOT 4
   - Importa los PNG de assets/frames o el atlas. En un AnimatedSprite2D crea un
     SpriteFrames con animaciones "walk_0"... "walk_15", "attack_0"..., "death"
     (Add frames from Sprite Sheet: 16 columnas x 19 filas, y selecciona los indices de la seccion 2).
   - Texture Filter = Nearest. Offset del sprite = (0, -24) para que Node2D.position sean los pies.
   - Cambia animacion:  $Sprite.play("walk_%d" % dir)

 6.4 PYGAME
   import json, math, pygame
   atlas = pygame.image.load("assets/atlas.png").convert_alpha()
   meta  = json.load(open("assets/atlas.json"))
   def frame(anim, d, k):
       x,y,w,h = meta["animations"][anim]["frames"][str(d)][k]
       return atlas.subsurface((x,y,w,h))
   def angle_to_dir(dx, dy):
       a = math.atan2(dx, -dy) % (2*math.pi)
       return round(a / (math.pi/8)) % 16
   # dibujo: screen.blit(frame("walk", d, k), (px-32, py-64))   # pivote en los pies

 6.5 Cualquier otro motor
   Usa assets/frames/ (PNG sueltos) o atlas.png + atlas.json. Cada rectangulo de
   atlas.json es [x, y, ancho, alto]. Todos los frames miden 64x80 y comparten pivote (32,64).

---------------------------------------------------------------------
 7. REGENERAR O PERSONALIZAR
---------------------------------------------------------------------
   pip install pillow numpy
   python3 tools/build_atlas.py
 Cambia FW/FH, TEAM_COLORS o las filas usadas dentro del script y vuelve a ejecutarlo.
 Para ejecutar las pruebas de logica:  node tests/test_logic.js

---------------------------------------------------------------------
 8. NOTAS
---------------------------------------------------------------------
 - Los valores de juego (vida, dano, velocidad...) son aproximaciones de Brood War y
   se pueden cambiar libremente.
 - StarCraft es marca de Blizzard Entertainment. Los sprites pertenecen a Blizzard;
   usalos solo para proyectos personales / fan-made / educativos.
