/* ==========================================================================
   cursores.js - CURSORES ORIGINALES DE STARCRAFT (hoja de ACE_Spark), animados
   Se carga DESPUES de game.js (lee sus variables: cv, W, H, F). Ajustes en CONFIG.CURSORS.
   Los fotogramas son PNG sueltos en assets/images/cursors/ (los genera tools/build_cursors.py).
   Un cursor CSS no se anima solo: aqui se cambia su imagen en tres variables CSS del <html>
   (--cur-arrow, --cur-hover, --cur-no, --cur-canvas) y css/style.css las usa donde toca:
     - flecha verde animada ........ por toda la pagina (menus, pausa, presentacion)
     - elipse verde ................ sobre botones, listas, deslizadores y casillas
     - flecha tachada .............. sobre controles desactivados
     - anillo de punteria giratorio . sobre el campo de batalla (verde)
         * elipse verde sobre un luchador controlado por una persona
         * elipse roja  sobre un luchador de la IA (enemigo)
   ========================================================================== */
(function(){
  const C=CONFIG.CURSORS; if(!C||!C.on)return;
  if(window.matchMedia&&!matchMedia('(any-pointer:fine)').matches)return;   // movil/tablet sin raton: no hay cursor que animar (ahorra ~100 imagenes precargadas y un bucle que corria sin parar)
  // n fotogramas, tamano (w,h) y punto activo (hx,hy) en px de la hoja original (salida de tools/build_cursors.py)
  const CUR_SETS={
    arrow:  {n:5, w:20, h:21, hx:0,  hy:0},
    forbid: {n:5, w:28, h:30, hx:8,  hy:5},
    hover_g:{n:2, w:27, h:19, hx:13, hy:9},
    hover_r:{n:2, w:27, h:19, hx:13, hy:9},
    ring_g: {n:14,w:41, h:26, hx:19, hy:12},
    ring_r: {n:14,w:41, h:26, hx:19, hy:12}
  };
  const S=C.scale==1?1:2, EMB=window.CURSOR_EMBED||{}, root=document.documentElement.style;
  const path=(k,i)=>'assets/images/cursors/x'+S+'/'+k+'_'+i+'.png';
  // ruta ABSOLUTA: una url() dentro de una variable CSS se resuelve respecto a css/style.css, no a index.html
  const url=(k,i)=>{const p=path(k,i);return EMB[p]||new URL(p,document.baseURI).href};
  const CSSC={};   // cache: cada cadena CSS se construye una sola vez (antes se rehacia, con new URL, en cada fotograma)
  const css=(k,i,fb)=>{const key=k+'|'+i+'|'+fb;return CSSC[key]||(CSSC[key]='url("'+url(k,i)+'") '+Math.round((CUR_SETS[k].hx+.5)*S)+' '+Math.round((CUR_SETS[k].hy+.5)*S)+', '+fb)};
  // orden de los fotogramas: la flecha va y vuelve (brillo suave); el resto da vueltas
  const seq=(k,loop)=>{const n=CUR_SETS[k].n,a=[];for(let i=0;i<n;i++)a.push(i);if(loop=='pp')for(let i=n-2;i>0;i--)a.push(i);return a};
  const ANIM={arrow:{k:'arrow',fps:C.fps.arrow,o:seq('arrow','pp'),fb:'default',v:'--cur-arrow'},
              no:{k:'forbid',fps:C.fps.arrow,o:seq('forbid','pp'),fb:'not-allowed',v:'--cur-no'},
              hover:{k:'hover_g',fps:C.fps.hover,o:seq('hover_g'),fb:'pointer',v:'--cur-hover'}};
  for(const k in CUR_SETS)for(let i=0;i<CUR_SETS[k].n;i++)new Image().src=url(k,i);   // precarga: sin parpadeo al cambiar de fotograma
  // --- cursor del campo de batalla: anillo verde, o elipse verde/roja sobre un luchador ---
  let cKind='ring_g',mx=null,my=null;
  const cvs=document.getElementById('c');
  function over(){   // que hay bajo el raton, en coordenadas logicas del juego (480x270)
    if(!C.canvasHover||mx===null)return 'ring_g';
    try{for(const f of F){if(f.hp>0&&Math.abs(mx-f.x)<=11&&my>f.y-28&&my<f.y+4)return f.ai?'hover_r':'hover_g'}}catch(e){}
    return 'ring_g';
  }
  if(cvs){
    cvs.addEventListener('pointermove',e=>{if(e.pointerType=='touch')return;const r=cvs.getBoundingClientRect();mx=(e.clientX-r.left)/r.width*W;my=(e.clientY-r.top)/r.height*H});
    cvs.addEventListener('pointerleave',()=>{mx=my=null});
  }
  const last={};
  function set(v,val){if(last[v]!==val){last[v]=val;root.setProperty(v,val)}}
  function tick(t){
    const s=t/1000;
    for(const id in ANIM){const a=ANIM[id];set(a.v,css(a.k,a.o[Math.floor(s*a.fps)%a.o.length],a.fb))}
    cKind=over();
    const ring=cKind=='ring_g',k=cKind,n=CUR_SETS[k].n,fps=ring?C.fps.ring:C.fps.hover;
    set('--cur-canvas',css(k,Math.floor(s*fps)%n,ring?'crosshair':'pointer'));
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  // --- listas desplegables propias: el menu nativo de un <select> lo dibuja el sistema y siempre muestra la flecha de Windows ---
  // El <select> original se queda oculto (game.js sigue leyendo y guardando su .value) y se le lanza 'change' al elegir.
  if(!matchMedia('(pointer:coarse)').matches){   // en movil/tactil se deja el selector nativo, que es mas comodo
    let abierta=null;
    const cerrar=()=>{if(abierta){abierta.lista.remove();abierta.btn.classList.remove('open');abierta=null}};
    document.querySelectorAll('.opts select').forEach(sel=>{
      const btn=document.createElement('button');btn.type='button';btn.className='csel';
      const mostrar=()=>{const o=sel.options[sel.selectedIndex];btn.textContent=o?o.text:''};
      mostrar();sel.style.display='none';sel.parentNode.insertBefore(btn,sel);   // antes del select: la etiqueta (label) activa este boton
      sel.addEventListener('change',mostrar);
      btn.addEventListener('click',e=>{
        e.preventDefault();
        if(abierta&&abierta.btn===btn){cerrar();return}
        cerrar();
        const lista=document.createElement('div');lista.className='clist';
        [...sel.options].forEach((o,i)=>{
          const b=document.createElement('button');b.type='button';b.textContent=o.text;if(i==sel.selectedIndex)b.className='sel';
          b.addEventListener('click',ev=>{ev.stopPropagation();sel.selectedIndex=i;sel.dispatchEvent(new Event('change',{bubbles:true}));mostrar();cerrar();btn.blur()});
          lista.appendChild(b);
        });
        const r=btn.getBoundingClientRect();lista.style.minWidth=r.width+'px';lista.style.left=r.left+'px';lista.style.top=r.bottom+'px';
        document.body.appendChild(lista);btn.classList.add('open');abierta={btn,lista};
        const lr=lista.getBoundingClientRect();if(lr.bottom>innerHeight)lista.style.top=Math.max(0,r.top-lr.height)+'px';   // si no cabe debajo, se abre hacia arriba
      });
    });
    document.addEventListener('pointerdown',e=>{if(abierta&&!abierta.lista.contains(e.target)&&e.target!==abierta.btn)cerrar()},true);
    addEventListener('resize',cerrar);
    addEventListener('keydown',e=>{if(e.key=='Escape')cerrar()},true);
  }
})();
