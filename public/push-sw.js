self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{};}catch{}
 event.waitUntil(self.registration.showNotification(data.title||'Guale Conecta',{
  body:data.body||'Tenés publicaciones para revisar.',icon:'/push-icon.svg',badge:'/push-icon.svg',
  tag:data.tag||'review-pending',data:{url:data.url||'/?adminPanel=1'},renotify:false
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();let url=new URL('/?adminPanel=1',self.location.origin);
 try{const requested=new URL(event.notification.data?.url,self.location.origin);if(requested.origin===self.location.origin)url=requested;}catch{}
 event.waitUntil((async()=>{const tabs=await self.clients.matchAll({type:'window',includeUncontrolled:true});const existing=tabs.find(tab=>tab.url===url.href);if(existing)return existing.focus();return self.clients.openWindow(url.href);})());
});
