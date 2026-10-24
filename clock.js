/* It's 5 o'clock. Original concept and Python code © 2007–2012 Greg McFarlane. */
(() => {
'use strict';
const canvas=document.getElementById('clock'),ctx=canvas.getContext('2d');
const TAU=2*Math.PI,mod=(x,m)=>((x%m)+m)%m,smooth=t=>t*t*(3-2*t);
const CROSS=12*3600/11,WINDOW=120,TAU30=1000/30;
let w=0,h=0,cx=0,cy=0,hw=0,hh=0,shape='',last=0,positions=null,first=null,lastStep=null;
let distances=new Float64Array(3601),arc1=0,arc2=0,slope=0;
function resize(){
 const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,3);
 if(w===r.width&&h===r.height&&canvas.width===Math.round(w*dpr))return;
 w=Math.max(r.width,1);h=Math.max(r.height,1);cx=hw=w/2;cy=hh=h/2;
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);
 let prev=0;distances[0]=0;
 for(let i=0;i<=3600;i++){let th=TAU*i/3600,velocity=Math.hypot(hw*Math.cos(th),hh*Math.sin(th));if(i)distances[i]=distances[i-1]+(velocity+prev)*Math.PI/3600;prev=velocity;}
 arc1=distances[1500];arc2=distances[3600]-arc1;slope=Math.min(arc1/25,arc2/35);
}
function screen(t,x,y){const th=-t*TAU/60,s=Math.sin(th),c=Math.cos(th);return [cx+(c*x-s*y)*hw,cy-(s*x+c*y)*hh];}
function hermite(t,n){
 const minute=mod(t/60,60),hour=mod(t/720,60),a=mod(hour-minute,60),b=60-a;
 if(a<1e-9||b<1e-9)return mod(n-minute,60);
 const m=.7*Math.min(25/a,35/b),d=mod(n-minute,60);
 function h(u,len,span){return len*(3*u*u-2*u*u*u)+m*span*(u-3*u*u+2*u*u*u);}
 return d<=a?h(d/a,25,a):25+h((d-a)/b,35,b);
}
function targets(t){
 const crossing=Math.round(t/CROSS)*CROSS,delta=t-crossing;
 if(Math.abs(delta)>=WINDOW)return Array.from({length:60},(_,n)=>hermite(t,n));
 const before=crossing-WINDOW,after=crossing+WINDOW,k=smooth((delta+WINDOW)/(2*WINDOW));
 const p=hermite(before,0),q=hermite(after,0),shift=-60*Math.floor((q-p+30)/60);
 return Array.from({length:60},(_,n)=>{
 const a=p+mod(hermite(before,n)-p,60),b=q+shift+mod(hermite(after,n)-q,60);
 return mod((1-k)*a+k*b,60);
 });
}
function elastic(t,now){
 const raw=targets(t),base=raw[0];let lifted=raw.map(p=>base+mod(p-base,60));
 if(!positions||lastStep===null||now-lastStep<0||now-lastStep>2){positions=lifted.slice();first=lifted.slice();lastStep=now;return positions;}
 const dt=now-lastStep;lastStep=now,shift=60*Math.round((first[0]-lifted[0])/60);
 const alpha=-Math.expm1(-dt/1.4);
 for(let i=0;i<60;i++){first[i]+=alpha*(lifted[i]+shift-first[i]);positions[i]+=alpha*(first[i]-positions[i]);}
 return positions;
}
function map(pos){
 pos=mod(pos,60);if(pos===0||pos===25)return pos;
 const short=pos<25,start=short?0:25,span=short?25:35,arc=short?arc1:arc2,offset=short?0:arc1,u=(pos-start)/span;
 const target=offset+arc*(3*u*u-2*u*u*u)+slope*span*(u-3*u*u+2*u*u*u);
 let lo=0,hi=3600;while(lo<hi){const mid=(lo+hi)>>1;if(distances[mid]<target)lo=mid+1;else hi=mid;}
 if(lo<=0)return 0;if(lo>=3601)return 60;
 return ((lo-1)+(target-distances[lo-1])/(distances[lo]-distances[lo-1]))/60;
}
function ellipse(x,y,rx,ry,fill,line=0){ctx.beginPath();ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);ctx.fillStyle=fill;ctx.fill();if(line){ctx.strokeStyle='#111';ctx.lineWidth=line;ctx.stroke();}}
function hand(length,width,rotate){let pts=[[0,length],[width,.8*length],[width,-.2*length],[-width,-.2*length],[-width,.8*length]];
 ctx.beginPath();pts.forEach(([x,y],i)=>{const p=screen(rotate,x,y);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.closePath();ctx.fillStyle='#000';ctx.fill();
}
function draw(){
 resize();const now=new Date(),seconds=now.getSeconds()+now.getMilliseconds()/1000,t=(now.getHours()%12)*3600+now.getMinutes()*60+seconds;
 const ticks=elastic(t,performance.now()/1000),scale=Math.min(hw,hh),border=Math.max(1,.015*scale),dot=Math.max(1,.7*border);
 ctx.clearRect(0,0,w,h);ellipse(cx,cy,.75*hw,.75*hh,'#bbbbff',border);
 hand(.91*.75,.5*.059*.75,0);hand(.76*.75,.059*.75,25);
 ellipse(cx,cy,.3*.059*.75*hw,.3*.059*.75*hh,'#bbbbbb');
 const font=Math.max(1,Math.floor(scale*.15));ctx.font='bold '+font+'px Georgia,serif';ctx.textAlign='center';ctx.textBaseline='middle';
 ticks.forEach((p,n)=>{
 const angle=map(p),xy=screen(angle,0,.97*.75);ellipse(xy[0],xy[1],dot,dot,'#000');
 if(n%5===0){const label=screen(angle,0,1.15*.75);ctx.fillStyle='#000';ctx.fillText(String(n===0?12:n/5),...label);
 const end=screen(angle,0,1.03*.75);ellipse(end[0],end[1],dot,dot,'#000');}
 });
 const n=Math.floor(seconds),frac=seconds-n,start=ticks[n],end=n===59?ticks[0]+60:ticks[n+1];
 hand(.93*.75,.15*.059*.75,map(mod(start+frac*(end-start),60)));
}
function frame(){
 try {
   draw();
   const error=document.getElementById('clock-error');
   if(error) error.hidden=true;
 } catch(e) {
   console.error('Clock drawing error:', e);
   const error=document.getElementById('clock-error');
   if(error){error.hidden=false;error.textContent='Clock error: '+String(e && (e.stack || e.message) || e);}
 }
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)lastStep=null;});
window.addEventListener('resize',()=>{resize();frame();},{passive:true});
resize();
frame();
setInterval(frame, TAU30);
})();