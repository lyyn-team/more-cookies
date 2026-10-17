/* More Cookies service worker. Offline browsing only: it never stores orders, carts or customer data.
   Version is generated at build time; every deploy gets its own cache and the old one is removed on activate. */
const VERSION='973d511df5';
const STATIC='mc-static-'+VERSION;
const FONTS='mc-fonts-v1';                       /* Google Fonts CSS/files, kept across versions */
const CORE=['index.html','manifest.webmanifest'];
const ASSETS=[
 "assets/icons/icon-192.png",
 "assets/icons/icon-512.png",
 "assets/icons/icon-maskable-512.png",
 "assets/img/black-negresco.jpg",
 "assets/img/black-white.jpg",
 "assets/img/black.jpg",
 "assets/img/caixa-hand.jpg",
 "assets/img/caixa-stack.jpg",
 "assets/img/classic.jpg",
 "assets/img/duo-classic.jpg",
 "assets/img/encontro-poster.jpg",
 "assets/img/erameu-poster.jpg",
 "assets/img/italiano.jpg",
 "assets/img/logo.png",
 "assets/img/matriz-1.jpg",
 "assets/img/matriz-2.jpg",
 "assets/img/matriz-3.jpg",
 "assets/img/milk-nuts.jpg",
 "assets/img/nutella-poster.jpg",
 "assets/img/nutella-white-inside.jpg",
 "assets/img/nutella-white.jpg",
 "assets/img/ovomaltine-1.jpg",
 "assets/img/ovomaltine-2.jpg",
 "assets/img/pistachio.jpg",
 "assets/img/posaula-poster.jpg",
 "assets/img/quem-faz.jpg",
 "assets/img/red-black.jpg",
 "assets/img/rv-broken.jpg",
 "assets/img/rv-whole.jpg",
 "assets/img/soeu-poster.jpg",
 "assets/img/terca-poster.jpg",
 "assets/img/white.jpg"
];                         /* images + icons: small, essential for the offline look */
/* videos (assets/videos/*) are deliberately NOT cached: large, and the page keeps each video's poster when offline */

self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(STATIC);
    await c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})));                       /* shell must succeed */
    await Promise.allSettled(ASSETS.map(u=>c.add(new Request(u,{cache:'reload'}))));   /* one failed image must not break install */
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys()){if(k.startsWith('mc-static-')&&k!==STATIC)await caches.delete(k)}
    await self.clients.claim();
  })());
});

const OFFLINE_HTML='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>More Cookies</title><body style="font:700 20px/1.4 system-ui;background:#FFFDF8;color:#222A3F;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center"><p>Você está sem conexão e o site ainda não foi guardado neste aparelho.<br>Conecte-se uma vez para poder abrir a More Cookies offline.</p>';

function withTimeout(p,ms){return new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error('timeout')),ms);p.then(v=>{clearTimeout(t);res(v)},e=>{clearTimeout(t);rej(e)})})}

async function shell(req){
  const c=await caches.open(STATIC);
  const net=fetch(new Request('index.html',{cache:'no-store'})).then(r=>{if(r&&r.ok)c.put('index.html',r.clone()).catch(()=>{});return r});
  net.catch(()=>{});                                            /* keep refreshing the cache even if we answered from it */
  try{return await withTimeout(net.then(r=>r.clone()),3500)}     /* online: newest shell */
  catch(_){                                                      /* offline or very slow: cached shell, whatever the URL */
    const hit=await c.match('index.html');
    return hit||new Response(OFFLINE_HTML,{status:200,headers:{'Content-Type':'text/html; charset=utf-8'}});
  }
}
async function cacheFirst(req){
  const c=await caches.open(STATIC),hit=await c.match(req);
  if(hit)return hit;
  const r=await fetch(req);
  if(r&&r.ok&&r.status===200)c.put(req,r.clone()).catch(()=>{});
  return r;
}
async function staleWhileRevalidate(req){
  const c=await caches.open(FONTS),hit=await c.match(req);
  const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone()).catch(()=>{});return r}).catch(()=>null);
  return hit||(await net)||Response.error();
}

self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  if(req.method!=='GET')return;                                  /* never touch anything that could be a submission */
  if(req.headers.has('range'))return;                            /* video/audio ranges go straight to the network */
  if(url.origin===location.origin){
    if(url.searchParams.has('ping'))return;                      /* the page's reachability probe must hit the real network */
    if(req.mode==='navigate'){e.respondWith(shell(req));return}
    if(url.pathname.includes('/assets/videos/'))return;
    if(url.pathname.endsWith('/sw.js'))return;
    if(/\/assets\/|manifest\.webmanifest$/.test(url.pathname)){e.respondWith(cacheFirst(req).catch(()=>Response.error()));return}
    return;
  }
  if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){e.respondWith(staleWhileRevalidate(req));return}
  /* everything else (maps, iFood, WhatsApp, Instagram…) is left alone: live, never cached */
});
