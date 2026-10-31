/* ==========================================================================
   config.js - AJUSTES DEL JUEGO (edita aqui para cambiar el balance)
   Se carga primero. Los demas archivos leen estas constantes.
   ========================================================================== */

const CONFIG={
  ROUND_TIME:45,              // segundos por ronda; al acabarse cae la bomba nuclear
  LIVES:2,                    // vidas por luchador
  COUNTDOWN:3,                // segundos de cuenta atras antes de FIGHT!
  HP:      {m:95, h:140, d:100},    // vida: m = Marine, h = Hidralisco
  SPEED:   {m:60, h:50, d:72},     // velocidad de movimiento (pixeles logicos por segundo)
  COOLDOWN:{m:1.07, h:1.07, d:1},   // segundos entre disparos (mayor = dispara mas lento); antes .20/.75, ahora cadencia x0,7
  DAMAGE:  {m:3.6, h:8.4, d:15},    // dano por proyectil (antes 6/14, ahora x0,6)
  LING_DAMAGE:30,             // dano de la explosion del zergling
  MEDKIT_HEAL:35,             // vida que cura el medical kit (varia +-5 al azar)
  SPECIAL_COOLDOWN:9,        // segundos para recargar el ataque especial
  KEYS:{marine:'KeyG', hydra:'Period'},   // tecla del especial: G (granada) y . (acido)
  GRENADE_DAMAGE:35,          // dano de la granada del Marine (igual que LING_DAMAGE)
  GRENADE_RADIUS:40,          // radio de la explosion de la granada
  ACID_DPS:9,                 // dano por segundo del acido del Hidralisco
  ACID_TIME:6,                // segundos que dura el charco (dano maximo = ACID_DPS x ACID_TIME)
  ACID_RADIUS:38,             // radio del charco
  NUKE_FALL:2.2,              // segundo de la presentacion nuclear en que el misil empieza a caer (la voz "nuclear detected" dura 2,3 s)
  NUKE_HIT:3.6,               // segundo del impacto (destello, explosion visual y sonido de la explosion)
  NUKE_SFX:{lead:.05, fadeAt:3.2, fadeDur:2.8},   // explosion: adelanto del sonido (s), y cuando empieza a apagarse y cuanto tarda (el mp3 dura 20 s)
  NUKE_TARGET:'percent',      // la nuclear cae sobre quien tenga MENOS VIDA al llegar el reloj a 0: 'percent' = menor porcentaje de la barra (justo con vidas maximas distintas), 'points' = menos puntos de vida
  VOICE_END:{win:{m:'marine_what',h:'hydra_yes',d:'dt_yes0'},lose:{m:'marine_pissed',h:'hydra_pissed',d:null}},   // frases al terminar la partida (claves de AUDIO.files; null = sin voz). Cambialas por las que prefieras
  VOICE:{enabled:true, gap:3, hitMin:20, lowHp:.3, chance:.7},   // voces del Marine: pausa minima entre frases (s), golpe que le molesta, vida baja, probabilidad
  MARINE_ART:{                // ANIMACION DEL MARINE por fotogramas (hoja "Terran Marine"; se genera con tools/build_marine_atlas.py)
    on:true,                  // false = vuelve a las 3 imagenes fijas de antes
    stride:4,                 // px que avanza para cambiar de fotograma al caminar (menor = piernas mas rapidas; 9 fotogramas por ciclo)
    bob:.5,                   // rebote vertical extra al caminar (px; 0 = ninguno, el ciclo ya trae su propio movimiento)
    faceMove:true,            // al caminar mira hacia donde camina (true) o siempre hacia el rival (false)
    aim:.5,                   // segundos que sigue mirando al rival despues de disparar
    shootT:.14,               // segundos que muestra la pose de disparo
    scale:1                   // tamano del sprite (1 = pixel perfecto, 2 pantallas por pixel)
  },
  HYDRA_ART:{                 // ANIMACION DEL HIDRALISCO por fotogramas (hoja "Zerg Hydralisk"; se genera con tools/build_hydra_atlas.py)
    on:true,                  // false = vuelve a las 3 imagenes fijas de antes
    stride:5,                 // px que avanza para cambiar de fotograma al caminar (menor = se arrastra mas rapido; 7 fotogramas por ciclo)
    bob:.4,                   // rebote vertical extra al caminar (px; 0 = ninguno, el ciclo ya trae su propio movimiento)
    faceMove:true,            // al caminar mira hacia donde camina (true) o siempre hacia el rival (false)
    aim:.5,                   // segundos que sigue mirando al rival despues de escupir
    attackT:.32,              // segundos que dura la animacion de ataque (5 fotogramas: la cabeza se lanza)
    scale:1                   // tamano de dibujo (deja 1 para que se vea nitido; el tamano real se cambia con SCALE en tools/build_hydra_atlas.py y regenerando el atlas)
  },
  DT:{                        // DARK TEMPLAR: luchador cuerpo a cuerpo y camuflado (vida, velocidad, cadencia y dano estan arriba, en la columna d)
    reach:10,                 // alcance de la cuchilla (px logicos, de borde a borde)
    cloak:true,               // camuflaje: semitransparente, y los disparos enemigos se desvian; false = siempre visible
    alpha:.5,                 // opacidad mientras esta camuflado (1 = totalmente visible)
    reveal:.8,                // segundos que se deja ver despues de atacar o saltar
    evasion:.35,              // probabilidad (0-1) de que un disparo o cuchillada enemiga FALLE contra un DT camuflado (como el Butterfly de Dota); 0 = nunca
    critChance:.25,           // CRITICO contra el DT visible: probabilidad (0-1) de que un disparo o cuchillada enemiga haga dano critico mientras el DT esta revelado (0 = nunca)
    critBonus:2,              // dano critico = dano base x critMult + critBonus  (critBonus = puntos extra fijos, +2 por defecto)
    critMult:1,               // multiplicador del dano critico (1 = solo suma critBonus; 2 = el doble, estilo Dota, etc.)
    aim:.14,                  // error de punteria (radianes) de los disparos contra un DT camuflado
    jit:12,                   // error extra (px) de granada, acido y salto contra un DT camuflado
    blinkDamage:30,           // dano del salto sombrio (el especial del DT)
    blinkRadius:30,           // radio del golpe al aterrizar
    blinkT:.45,               // segundos entre desaparecer y reaparecer (se puede esquivar)
    behind:12                 // reaparece este numero de px DETRAS del rival
  },
  MFX:{                       // EFECTOS DEL DISPARO DEL MARINE (solo visuales, no cambian el dano)
    on:true,                  // false = disparo sencillo de antes
    flashT:.09,               // segundos que dura el fogonazo del canon
    flashSize:9,              // tamano del fogonazo (px logicos)
    tracerLen:10,             // largo de la estela luminosa de la bala (px)
    sparks:10,                // chispas al impactar (0 = ninguna)
    casing:true,              // expulsa un casquillo dorado en cada disparo
    recoil:1.5                // retroceso del Marine al disparar (px; 0 = ninguno)
  },
  GFX:{                       // GRANADA DEL MARINE: vuelo y explosion (solo visual y sonido; NO cambia dano, radio ni tiempos)
    on:true,                  // false = granada y explosion sencillas de antes
    quality:1,                // cantidad de particulas (1 = todo; .5 = la mitad, para PCs lentos; 1.5 = mas espectaculo)
    arc:1,                    // altura del lanzamiento (1 = normal; 0 = vuelo plano; 1.5 = muy alto)
    shake:.42,                // temblor de camara al explotar (0 = ninguno)
    stop:.07,                 // segundos de "congelado" de impacto en la explosion (0 = sin congelado)
    stopScale:.08,            // a que velocidad va el juego durante ese congelado (0 = parado del todo)
    flash:.4,                 // destello blanco-naranja en toda la pantalla (0 = ninguno, 1 = muy fuerte)
    smoke:1,                  // duracion y altura de la columna de humo (1 = normal; 0.5 = corta)
    scorchT:9,                // segundos que dura la mancha de quemado en el suelo
    secondary:true            // pequenas explosiones encadenadas dentro del radio
  },
  HFX:{                       // ESCUPIDA DE ACIDO del Hidralisco (solo visual, no cambia dano, cadencia ni punteria)
    on:true,                  // false = disparo de espinas de antes
    z:21,                     // altura del pico donde nace la escupida y a la que vuela (px logicos)
    flashT:.12,               // segundos que dura la salpicadura en la boca
    flashSize:11,             // tamano del destello verde de la boca
    recoil:1.2,               // retroceso de la cabeza al escupir (px; 0 = ninguno)
    drops:7,                  // gotas que salen de la boca al disparar
    trailLen:9,               // largo de la estela luminosa de la escupida (px)
    hitN:8,                   // fotogramas de acido_impacto.png (tira horizontal)
    splashT:.42,              // segundos que dura la animacion de salpicadura al impactar
    splashScale:1.1,          // tamano de esa salpicadura (1 = tamano original del sprite)
    splashDrops:9,            // gotas que saltan al impactar
    stainT:1.4,               // segundos que dura la mancha de acido en el suelo (0 = sin mancha)
    cols:['#9dff4a','#6fcf2a','#d6ff6a','#3f9a1e'],  // colores de las gotas
    poolFx:true               // efectos del CHARCO del ataque especial (aparicion, burbujas, vapor, brillo, ondas...); false = charco sencillo de antes
  },
  MULTI:{                     // MULTIDISPARO (objeto que cae): el ataque normal mas proyectiles extra a los costados. Solo sirve a Marine e Hidralisco; si lo recoge el Dark Templar (cuerpo a cuerpo) se ANULA: desaparece sin efecto
    time:5,                   // segundos que dura el efecto
    pairs:1,                  // pares de proyectiles extra (1 = uno a cada lado; 2 = dos a cada lado)
    spread:.24,               // separacion angular entre proyectiles (radianes)
    dmgMul:.3,                // dano de cada proyectil extra = dano normal x este numero (.3 = 30 por ciento)
    scale:.72,                // tamano visual de los proyectiles extra (1 = igual que el principal)
    iconSize:20               // tamano del icono del objeto en el suelo (px logicos)
  },
  LING_FUSE:4,                // segundos de mecha: si el zergling no alcanza a nadie en ese tiempo, explota solo
  LING_FUSE_DMG:.5,           // dano de esa explosion por tiempo = LING_DAMAGE x este numero (.5 = la mitad del dano habitual)
  LING_FUSE_RADIUS:22,        // radio (px logicos) de esa explosion por tiempo (la explosion normal, al tocar a alguien o ser detonado, tiene radio 38)
  LING_TIMER:true,            // muestra la cuenta atras sobre el zergling (false = sin numero)
  LING_TNT:true,              // dibuja el paquete de dinamita (TNT) sobre el zergling explosivo (false = sin TNT)
  LING_ART:{dirs:9, walkN:7, cell:40, fps:14, scale:.5, ax:20, ay:29, tntY:8, tntScale:.75},   // sprite del zergling: direcciones, fotogramas de caminar, tamano de celda (px), velocidad de animacion, escala (.5 = 1 px de imagen por px de pantalla), pie (ax,ay) y altura de la TNT sobre el suelo
  DAMAGE_NUMBERS:true,        // cifras de dano flotantes sobre el personaje golpeado
  KO_CAM:false,               // zoom y camara lenta en el ultimo golpe de cada ronda (desactivada: no gusto)
  TOUCH_CONTROLS:'auto',      // controles tactiles: 'auto' (solo en pantallas tactiles), true o false
  DIFF:{                      // dificultad de la IA (se elige en el menu)
    easy:  {aim:.26, jit:26, dodge:1.2, spRate:.02},   // punteria mala, esquiva poco, usa poco el especial
    normal:{aim:.13, jit:14, dodge:3,   spRate:.05},   // valores originales
    hard:  {aim:.06, jit:6,  dodge:4.5, spRate:.12}    // punteria fina, esquiva mucho, usa mas el especial
  },
  INTRO:{                     // PRESENTACION DE ENTRADA (aparece al abrir el juego, antes del menu)
    on:true,                  // false = el juego abre directo en el menu
    once:false,               // true = solo la primera vez en cada sesion del navegador (al recargar la pagina no vuelve a salir)
    images:[                  // imagenes que se van alternando con zoom lento. Guardalas en assets/images/intro/ . Una sola = fija. Si un archivo no existe se salta solo
      'assets/images/intro/intro_1.jpg',
      'assets/images/intro/intro_2.jpg',
      'assets/images/intro/intro_4.jpg',
      'assets/images/intro/intro_5.jpg',
      'assets/images/intro/intro_6.jpg'
    ],
    slideTime:6,              // segundos que se ve cada imagen antes de pasar a la siguiente
    shuffle:false,            // true = orden al azar
    title:'COLISEO',          // titulo grande
    subtitle:'STARCRAFTY',     // subtitulo
    credit:'by Wizass',       // firma debajo del subtitulo ('' = ninguna)
    lines:['Marine \u00b7 Hidralisco \u00b7 Dark Templar','Un solo coliseo. Ningun superviviente.'],   // frases que aparecen debajo, una tras otra ([] = ninguna)
    prompt:'Pulsa cualquier tecla o toca la pantalla',   // texto parpadeante para empezar
    dim:.35                   // oscurecido de las imagenes (0 = ninguno, 1 = negro)
  },
  BG_IMAGE:'assets/images/background/arena.jpg',   // fondo del coliseo (960x540); null = version dibujada por codigo
  ARENA:{cx:241, cy:129.5, rx:182, ry:84},   // elipse jugable en coordenadas logicas (mitad de los px del fondo 960x540); debe caer sobre el suelo del fondo
  AMBIENT:true,               // llamas animadas de los braseros y brasas que suben
  TORCHES:[[208,7],[270,7],[118,24],[366,24],[27,77],[453,77],[34,159],[447,159]],   // centro de la llama de cada antorcha (coordenadas logicas)
  TORCH_FLAME:.45,            // intensidad de la llama animada que se suma a la del fondo (0 = sin llama animada)
  TORCH_GLOW:.3,              // intensidad del resplandor parpadeante
                              // (960x540). null = usa el coliseo dibujado por codigo.
};

/* Rutas de las imagenes. Para cambiar un sprite, reemplaza el archivo
   conservando el nombre (o cambia la ruta aqui). */
const ASSETS={
  sprites:{
    m :'assets/images/sprites/marine_lateral.png',      // 3/4 mirando a la DERECHA
    mf:'assets/images/sprites/marine_frente.png',       // al moverse hacia abajo
    mb:'assets/images/sprites/marine_espalda.png',      // al moverse hacia arriba
    h :'assets/images/sprites/hidralisco_lateral.png',  // mirando a la IZQUIERDA
    hf:'assets/images/sprites/hidralisco_frente.png',
    hb:'assets/images/sprites/hidralisco_espalda.png'
  },
  marineAtlas:'assets/images/sprites/marine_atlas.png',   // hoja del Marine: 9 direcciones x (reposo, 9 de caminar, disparo)
  fx:{
    missile  :'assets/images/fx/misil_nuclear.png',
    explosion:'assets/images/fx/explosion_nuclear_hoja.jpg',
    multiIcon:'assets/images/fx/icono_multidisparo.png',   // icono del objeto Multidisparo (64x64; se genera con tools/build_multi_icon.py)
    acidHit  :'assets/images/fx/acido_impacto.png'     // salpicadura de acido: 8 fotogramas de 31x32 (hoja de ACE_Spark; se regenera con tools/build_acid_fx.py)
  },
  dt:{                                                       // hoja de fotogramas del Dark Templar (ver ATLAS_DT)
    orig:'assets/images/sprites/dark_templar_atlas.png',     // capa magenta original
    red :'assets/images/sprites/dark_templar_atlas_roja.png' // capa roja: el DT de la derecha cuando hay dos DT
  },
  ling:'assets/images/sprites/zergling_atlas.png',         // zergling explosivo: 9 direcciones (0 sur, 4 oeste, 8 norte; el este se espeja) x 7 fotogramas de caminar; se genera con tools/build_ling_atlas.py
  hydraAtlas:'assets/images/sprites/hidralisco_atlas.png',   // hoja del Hidralisco: 9 direcciones x (7 de caminar, 5 de ataque); se genera con tools/build_hydra_atlas.py
  portraits:{                                                // retratos del HUD
    m:'assets/images/ui/retrato_marine.jpg',
    h:'assets/images/ui/retrato_hidralisco.jpg',
    d:'assets/images/ui/retrato_dark_templar.jpg'
  }
};

/* Hoja de sprites de la explosion nuclear (27 fotogramas en cuadricula).
   n = fotogramas, cols = columnas, fw/fh = tamano de cada fotograma en px,
   ax/ay = punto del suelo dentro del fotograma, dur = duracion total en s. */
const EXPLOSION_SHEET={"n": 27, "cols": 6, "fw": 300, "fh": 313, "ax": 142, "ay": 227, "dur": 2.16};

/* Atlas del Dark Templar: cuadricula de 16 columnas con celdas de 64x80 px. ax/ay = pies (pivote).
   Indices: caminar dir*10+k | reposo idle+dir | ataque attack+dir*7+k | muerte death+k
   dir 0..15 en sentido horario desde el norte (4 = este, 8 = sur, 12 = oeste).
   pose = recorte del fotograma de reposo mirando al sur (sprite de la pantalla de victoria). */
const ATLAS_DT={fw:64,fh:80,cols:16,ax:32,ay:64,walkN:10,walkFps:12,attack:176,attackN:7,attackFps:16,hitFrame:4,idle:160,death:288,deathN:7,deathFps:9,pose:{x:530,y:830,w:29,h:40}};

/* Atlas del Marine: celdas de cell x cell px, 9 columnas = direcciones (0 norte/espalda, 4 este, 8 sur/frente; el oeste se espeja).
   Filas: idleRow reposo | walkRow..walkRow+walkN-1 caminar | shootRow disparo. (ax,ay) = pies del fotograma. */
/* Atlas del Hidralisco: celdas de w x h px; (ax,ay) = punto del suelo dentro de la celda; walkRow/walkN = caminar (el reposo usa el fotograma 0); atkRow/atkN = ataque */
const ATLAS_HYDRA={w:34,h:43,ax:17,ay:33,walkRow:0,walkN:7,atkRow:7,atkN:5};
const ATLAS_MARINE={cell:40,ax:20,ay:35,idleRow:0,walkRow:1,walkN:9,shootRow:10};
