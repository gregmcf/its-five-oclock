/* It's 5 o'clock. Original concept and Python code © 2007–2012 Greg McFarlane. */
(() => {
'use strict';
const canvas=document.getElementById('clock'),ctx=canvas.getContext('2d');
const TAU=2*Math.PI,mod=(x,m)=>((x%m)+m)%m;
const TAU30=1000/30;
let w=0,h=0,cx=0,cy=0,hw=0,hh=0;
let distances=new Float64Array(3601),arc1=0,arc2=0;
function resize(){
 const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,3);
 if(w===r.width&&h===r.height&&canvas.width===Math.round(w*dpr))return;
 w=Math.max(r.width,1);h=Math.max(r.height,1);cx=hw=w/2;cy=hh=h/2;
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);
 let prev=0;distances[0]=0;
 for(let i=0;i<=3600;i++){let th=TAU*i/3600,velocity=Math.hypot(hw*Math.cos(th),hh*Math.sin(th));if(i)distances[i]=distances[i-1]+(velocity+prev)*Math.PI/3600;prev=velocity;}
 arc1=distances[1500];arc2=distances[3600]-arc1;
}
function screen(t,x,y){const th=-t*TAU/60,s=Math.sin(th),c=Math.cos(th);return [cx+(c*x-s*y)*hw,cy-(s*x+c*y)*hh];}
// Keep all tick gaps within each fixed-hand arc equal in physical length.
const SINGULARITY_HALF_WINDOW=0.5; // blank for one second at coincidence
function handSeparation(t){
 const hour=mod(t/720,60),minute=mod(t/60,60);
 return Math.min(mod(hour-minute,60),mod(minute-hour,60));
}
function physicalPosition(t,n){
 const minute=mod(t/60,60),span=mod(t/720-minute,60);
 const offset=mod(n-minute,60);
 if(offset<=span)return arc1*offset/span;
 return arc1+arc2*(offset-span)/(60-span);
}
// Invert the ellipse's cumulative arc length to get the drawing angle.
// The hand positions stay 0 (minute) and 25 (hour), regardless of shape.
function map(length){
 const circumference=arc1+arc2;
 length=mod(length,circumference);
 if(length===0)return 0;
 if(Math.abs(length-arc1)<1e-9)return 25;
 let lo=0,hi=3600;
 while(lo<hi){
   const mid=(lo+hi)>>1;
   if(distances[mid]<length)lo=mid+1;else hi=mid;
 }
 if(lo<=0)return 0;
 return ((lo-1)+(length-distances[lo-1])/
               (distances[lo]-distances[lo-1]))/60;
}
function ellipse(x,y,rx,ry,fill,line=0){ctx.beginPath();ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);ctx.fillStyle=fill;ctx.fill();if(line){ctx.strokeStyle='#111';ctx.lineWidth=line;ctx.stroke();}}
function hand(length,width,rotate,colour='#000'){let pts=[[0,length],[width,.8*length],[width,-.2*length],[-width,-.2*length],[-width,.8*length]];
 ctx.beginPath();pts.forEach(([x,y],i)=>{const p=screen(rotate,x,y);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.closePath();ctx.fillStyle=colour;ctx.fill();
}
function draw(){
 resize();const now=new Date(),seconds=now.getSeconds()+now.getMilliseconds()/1000,t=(now.getHours()%12)*3600+now.getMinutes()*60+seconds;
 // The hour and minute hands coincide eleven times every twelve hours.
 // Briefly blank the dial at each singularity instead of displaying a
 // misleading or undefined set of numbers. Fast motion either side is OK.
 const separationSeconds=handSeparation(t)*720/11;
 if(separationSeconds<=SINGULARITY_HALF_WINDOW){ctx.clearRect(0,0,w,h);return;}
 const ticks=Array.from({length:60},(_,n)=>physicalPosition(t,n)),scale=Math.min(hw,hh),border=Math.max(1,.015*scale),dot=Math.max(1,.7*border);
 ctx.clearRect(0,0,w,h);ellipse(cx,cy,.75*hw,.75*hh,'#bbbbff',border);
 hand(.91*.75,.5*.059*.75,0);hand(.76*.75,.059*.75,25);
 ellipse(cx,cy,.3*.059*.75*hw,.3*.059*.75*hh,'#bbbbbb');
 const labels=[];
 ticks.forEach((p,n)=>{
 const angle=map(p),xy=screen(angle,0,.97*.75);ellipse(xy[0],xy[1],dot,dot,'#000');
 if(n%5===0){
   labels.push({text:String(n===0?12:n/5),point:screen(angle,0,1.15*.75)});
   const end=screen(angle,0,1.03*.75);ellipse(end[0],end[1],dot,dot,'#000');
 }
 });
 drawLabels(labels,scale*.15);
 hand(.96*.75,.23*.059*.75,map(physicalPosition(t,seconds)),'#a0152c');
}
function drawLabels(labels,font){
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='bold '+font+'px Georgia,serif';
 const widths=labels.map(label=>ctx.measureText(label.text).width);
 let size=1;
 for(let i=0;i<labels.length;i++){
   for(let j=i+1;j<labels.length;j++){
     const [x1,y1]=labels[i].point,[x2,y2]=labels[j].point;
     const horizontal=(Math.abs(x1-x2)-2)/((widths[i]+widths[j])/2);
     const vertical=(Math.abs(y1-y2)-2)/font;
     size=Math.min(size,Math.max(horizontal,vertical));
   }
 }
 ctx.font='bold '+Math.max(1,Math.floor(font*size))+'px Georgia,serif';
 ctx.fillStyle='#000';
 labels.forEach(label=>ctx.fillText(label.text,...label.point));
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