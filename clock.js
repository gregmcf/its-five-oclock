/* It's 5 o'clock. Original concept and Python code © 2007–2012 Greg McFarlane. */
(() => {
'use strict';
const canvas=document.getElementById('clock'),ctx=canvas.getContext('2d');
const TAU=2*Math.PI,mod=(x,m)=>((x%m)+m)%m,smooth=t=>t*t*(3-2*t);
const TAU30=1000/30;
let w=0,h=0,cx=0,cy=0,hw=0,hh=0;
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
// Original clock geometry: the minute mark stays at the fixed 12 hand
// (position 0), the fractional hour stays at the fixed 5 hand (25).
// Interpolate linearly between those two constraints, as in gettick().
// This guarantees both readings and preserves the circular order of marks.
// The second hand moves, looking up its fractional-second mark in this map.
const SINGULARITY_HALF_WINDOW=0.5; // blank for one second in total
function handSeparation(t){
 const hour=mod(t/720,60);
 const minute=mod(t/60,60);
 return Math.min(mod(hour-minute,60),mod(minute-hour,60));
}
function positionAt(t,n){
 const hour=mod(t/720,60),minute=mod(t/60,60);
 const shortSpan=mod(hour-minute,60);
 // At exact coincidence the mapping is mathematically undefined.
 if(shortSpan<1e-10||60-shortSpan<1e-10)return null;
 const distance=mod(n-minute,60);
 if(distance<=shortSpan)return 25*distance/shortSpan;
 return 25+35*(distance-shortSpan)/(60-shortSpan);
}
function targets(t){
 return Array.from({length:60},(_,n)=>positionAt(t,n));
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
 // The hour and minute hands coincide eleven times every twelve hours.
 // Briefly blank the dial at each singularity instead of displaying a
 // misleading or undefined set of numbers. Fast motion either side is OK.
 const separationSeconds=handSeparation(t)*720/11;
 if(separationSeconds<=SINGULARITY_HALF_WINDOW){ctx.clearRect(0,0,w,h);return;}
 const ticks=targets(t),scale=Math.min(hw,hh),border=Math.max(1,.015*scale),dot=Math.max(1,.7*border);
 ctx.clearRect(0,0,w,h);ellipse(cx,cy,.75*hw,.75*hh,'#bbbbff',border);
 hand(.91*.75,.5*.059*.75,0);hand(.76*.75,.059*.75,25);
 ellipse(cx,cy,.3*.059*.75*hw,.3*.059*.75*hh,'#bbbbbb');
 const font=Math.max(1,Math.floor(scale*.15));ctx.font='bold '+font+'px Georgia,serif';ctx.textAlign='center';ctx.textBaseline='middle';
 ticks.forEach((p,n)=>{
 const angle=map(p),xy=screen(angle,0,.97*.75);ellipse(xy[0],xy[1],dot,dot,'#000');
 if(n%5===0){const label=screen(angle,0,1.15*.75);ctx.fillStyle='#000';ctx.fillText(String(n===0?12:n/5),...label);
 const end=screen(angle,0,1.03*.75);ellipse(end[0],end[1],dot,dot,'#000');}
 });
 hand(.93*.75,.15*.059*.75,map(positionAt(t,mod(t/60,60))));
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
document.addEventListener('visibilitychange',()=>{if(!document.hidden)frame();});
window.addEventListener('resize',()=>{resize();frame();},{passive:true});
resize();
frame();
setInterval(frame, TAU30);
})();