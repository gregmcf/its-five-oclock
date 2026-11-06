/* It's 5 o'clock. Original concept and Python code © 2007–2012 Greg McFarlane. */
(() => {
'use strict';
const canvas=document.getElementById('clock'),ctx=canvas.getContext('2d');
const TAU=2*Math.PI,mod=(x,m)=>((x%m)+m)%m,smooth=t=>t*t*(3-2*t);
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
// Positions are calculated in physical arc length along the ellipse.
// The two fixed hands divide its perimeter into arcs of lengths arc1 and
// arc2. Their different average mark spacing is respected exactly.
//
// Within the family of monotone C1 cubic Hermite splines, choose the common
// slope at BOTH hands to minimise the sum of squared differences between
// successive gaps (for all 60 tick marks). This reduces visible bunching,
// while preserving the exact fractional hour, minute and second readings.
const SINGULARITY_HALF_WINDOW=0.5; // blank for one second at coincidence
function handSeparation(t){
 const hour=mod(t/720,60),minute=mod(t/60,60);
 return Math.min(mod(hour-minute,60),mod(minute-hour,60));
}
function physicalPosition(t,n,joinSlope){
 const hour=mod(t/720,60),minute=mod(t/60,60);
 const a=mod(hour-minute,60),b=60-a;
 if(a<1e-10||b<1e-10)return null;
 const d=mod(n-minute,60);
 const short=d<=a, span=short?a:b,length=short?arc1:arc2;
 const x=short?d:d-a,u=x/span,u2=u*u,u3=u2*u;
 return (short?0:arc1)+length*(3*u2-2*u3)
      +joinSlope*span*(u-3*u2+2*u3);
}
function tickGaps(t,joinSlope){
 const circumference=arc1+arc2;
 const positions=Array.from({length:60},
   (_,n)=>physicalPosition(t,n,joinSlope));
 return positions.map((p,n)=>mod(positions[(n+1)%60]-p,circumference));
}
function optimalSlope(t){
 const span1=mod(t/720-t/60,60),span2=60-span1;
 const average1=arc1/span1,average2=arc2/span2;
 // Every cubic stays increasing if the common slope is between
 // zero and three times the smaller average gradient.
 const maximum=2.999*Math.min(average1,average2);
 const step=Math.min(1,maximum*0.2);
 const base=tickGaps(t,0),sample=tickGaps(t,step);
 let numerator=0,denominator=0;
 for(let n=0;n<60;n++){
   const next=(n+1)%60;
   const baseDifference=base[next]-base[n];
   const slopeDifference=((sample[next]-base[next])
                         -(sample[n]-base[n]))/step;
   numerator+=baseDifference*slopeDifference;
   denominator+=slopeDifference*slopeDifference;
 }
 const best=denominator>1e-16?-numerator/denominator:0;
 return Math.max(0,Math.min(maximum,best));
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
 const joinSlope=optimalSlope(t);
 const ticks=Array.from({length:60},(_,n)=>physicalPosition(t,n,joinSlope)),scale=Math.min(hw,hh),border=Math.max(1,.015*scale),dot=Math.max(1,.7*border);
 ctx.clearRect(0,0,w,h);ellipse(cx,cy,.75*hw,.75*hh,'#bbbbff',border);
 hand(.91*.75,.5*.059*.75,0);hand(.76*.75,.059*.75,25);
 ellipse(cx,cy,.3*.059*.75*hw,.3*.059*.75*hh,'#bbbbbb');
 const font=Math.max(1,Math.floor(scale*.15));ctx.font='bold '+font+'px Georgia,serif';ctx.textAlign='center';ctx.textBaseline='middle';
 ticks.forEach((p,n)=>{
 const angle=map(p),xy=screen(angle,0,.97*.75);ellipse(xy[0],xy[1],dot,dot,'#000');
 if(n%5===0){const label=screen(angle,0,1.15*.75);ctx.fillStyle='#000';ctx.fillText(String(n===0?12:n/5),...label);
 const end=screen(angle,0,1.03*.75);ellipse(end[0],end[1],dot,dot,'#000');}
 });
 hand(.93*.75,.15*.059*.75,map(physicalPosition(t,mod(t/60,60),joinSlope)));
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