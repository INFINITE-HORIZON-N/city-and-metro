'use strict';
// Shenzhen landmark meshes. Footprints: OSM/ODbL; architectural interpretation: see szdata/model_sources.md.
(function(CM){
 const IDS=new Set(['ba_ab','ba_t3','ba_sat','ft_szh','ft_bay','ns_crc','ns_culture','ft_pingan','ft_cocopark','ba_cec2','ft_cec']);
 CM.SZModels={has:lm=>IDS.has(lm.id),draw,drawPlan};
 function drawPlan(ctx,lm,lvl,night){
  if(lm.id!=='ft_bay')return false;
  const a=lm.rot*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),mesh=CM.SZ_ROOF_MESH;
  const trace=p=>{p.forEach((q,i)=>{const x=lm.x+(q[0]*ca-q[1]*sa)/250,y=lm.y+(q[0]*sa+q[1]*ca)/250;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath()};
  ctx.save();ctx.beginPath();trace(mesh.outer);for(const h of mesh.holes)trace(h.p);ctx.fillStyle=night?'#798fa4':'#e1e8ec';ctx.fill('evenodd');
  for(const h of mesh.holes){ctx.beginPath();trace(h.p);ctx.fillStyle=h.type==='field'?(night?'#355d49':'#82ac79'):(night?'#45677c':'#bfdad8');ctx.fill()}
  ctx.restore();return true;
 }
 function draw(ctx,pj,lm,s,opt){
  if(!IDS.has(lm.id))return false;
  const N=opt.night,E=opt.ex*(lm.kind==='skyscraper'?1:.8),a=(lm.rot||0)*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a);
  const world=(u,v)=>[lm.x+(u*ca-v*sa)/250,lm.y+(u*sa+v*ca)/250];
  const P=(u,v,h)=>{const w=world(u,v);return pj(w[0],w[1],h*E)};
  const faces=[],ink=[], roofMarks=[];
  const glass=N?[33,67,99]:[103,158,185],silver=N?[129,150,172]:[223,230,230],white=N?[146,165,187]:[244,244,233];
  const rgb=(c,k=1)=>'rgb('+c.map(x=>Math.max(0,Math.min(255,Math.round(x*k)))).join(',')+')';
  const poly=(pts,col,shade=1,holes=[])=>{if(pts.length<3)return;const coords=pts.map(p=>world(p[0],p[1]));faces.push({p:pts,holes,layer:pts.every(q=>q[2]<=3)?0:1,c:rgb(col,shade),d:coords.reduce((n,p)=>n+p[0]+p[1],0)/pts.length})};
  const path=(pts,col,w=.6)=>ink.push({p:pts,c:col,w});
  const ring=(cx,cy,rx,ry,z,n=48,rot=0)=>Array.from({length:n},(_,i)=>{const a=i/n*2*Math.PI;return[cx+Math.cos(a)*rx*Math.cos(rot)-Math.sin(a)*ry*Math.sin(rot),cy+Math.cos(a)*rx*Math.sin(rot)+Math.sin(a)*ry*Math.cos(rot),z]});
  const join=(A,B,col)=>{for(let i=0;i<A.length;i++){const j=(i+1)%A.length;const dx=A[j][0]-A[i][0],dy=A[j][1]-A[i][1];poly([A[i],A[j],B[j],B[i]],col,.82+.17*(.5+.5*(dx-dy)/(Math.hypot(dx,dy)||1)));}};
  const prism=(p,h,col,top=col,z=0)=>{const A=p.map(q=>[q[0],q[1],z]),B=p.map(q=>[q[0],q[1],h]);join(A,B,col);poly(B,top,1.03)};
  const box=(x,y,w,d,z,h,c,t=c)=>prism([[x-w/2,y-d/2],[x+w/2,y-d/2],[x+w/2,y+d/2],[x-w/2,y+d/2]],h,c,t,z);
  const bounds=p=>[Math.min(...p.map(q=>q[0])),Math.min(...p.map(q=>q[1])),Math.max(...p.map(q=>q[0])),Math.max(...p.map(q=>q[1]))];
  const center=p=>{const b=bounds(p);return[(b[0]+b[2])/2,(b[1]+b[3])/2]};
  const inside=(x,y,p)=>{let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const A=p[i],B=p[j];if((A[1]>y)!==(B[1]>y)&&x<(B[0]-A[0])*(y-A[1])/(B[1]-A[1])+A[0])hit=!hit}return hit};
  const parts=(lm.parts||[]).filter(p=>!p.year||p.year<=opt.year);
  // Circular/tapered towers use floor rings and complete facade ribs, rather than extruded footprints.
  if(lm.id==='ns_crc'){
   const rad=Math.min(lm.w,lm.d)*.46,H=lm.h||392,n=56;
   const profile=[[0,1],[20,1],[110,.96],[220,.90],[290,.78],[335,.59],[368,.34],[390,.065],[H,.01]];
   const rings=profile.map(([z,r])=>ring(0,0,rad*r,rad*r,z,n));
   for(let i=1;i<rings.length;i++)join(rings[i-1],rings[i],glass);
   poly(rings.at(-1),silver);
   for(let k=0;k<n;k++){const w=world(rings[0][k][0],rings[0][k][1]);if(w[0]+w[1]<lm.x+lm.y)continue;path(rings.map(r=>r[k]),N?'#9abdd3':'#ecf0e8',s>=32?.65:.45);}
   for(let z=12;z<335;z+=12){let k=profile.findIndex(p=>p[0]>=z),A=profile[k-1],B=profile[k],r=A[1]+(B[1]-A[1])*(z-A[0])/(B[0]-A[0]);path([...ring(0,0,rad*r,rad*r,z,n),ring(0,0,rad*r,rad*r,z,n)[0]],N?'rgba(177,217,237,.24)':'rgba(77,121,148,.32)',.45)}
   for(let k=0;k<n;k+=2)path([rings[4][k],rings[5][(k+2)%n],rings[6][k],rings[7][(k+2)%n]],N?'#abcadd':'#d6e0e1',.6);
  }else if(lm.id==='ft_pingan'){
   const H=lm.h||599,p=parts[0].p,profile=[[0,1],[30,1],[410,.93],[490,.84],[540,.63],[H,.15]];
   const rings=profile.map(([z,r])=>p.map(q=>[q[0]*r,q[1]*r,z]));
   for(let i=1;i<rings.length;i++)join(rings[i-1],rings[i],glass);
   poly(rings.at(-1),silver);
   const R=lm.w*.43;
   // Eight polished mega-columns, arranged at the chamfered corners.
   for(const [x,y] of [[R,R*.70],[R*.70,R],[-R,R*.70],[-R*.70,R],[R,-R*.70],[R*.70,-R],[-R,-R*.70],[-R*.70,-R]])path(profile.map(([z,r])=>[x*r,y*r,z]),N?'#bfc8bf':'#e1d9bb',s>=32?1.8:1.1);
   for(let z=24;z<530;z+=16){let i=profile.findIndex(r=>r[0]>=z),A=profile[i-1],B=profile[i],r=A[1]+(B[1]-A[1])*(z-A[0])/(B[0]-A[0]);path([...p,p[0]].map(q=>[q[0]*r,q[1]*r,z]),N?'rgba(255,216,142,.28)':'rgba(68,100,125,.35)',.5)}
   for(let side=0;side<4;side++){const an=side*Math.PI/2,vec=(x,y,z)=>[x*Math.cos(an)-y*Math.sin(an),x*Math.sin(an)+y*Math.cos(an),z];for(let z=50;z<450;z+=96)path([vec(-R*.72,R,z),vec(0,R*.92,z+55),vec(R*.72,R,z)],N?'#9eaeaf':'#ded9c8',.8)}
  }else if(lm.id==='ft_bay'){
   const mesh=CM.SZ_ROOF_MESH;
   // One continuous, low shell. Open pitch + two glazed oval roof lights.
   const heightCache=new Map();
   const height=(x,y)=>{
    const key=x.toFixed(3)+','+y.toFixed(3);if(heightCache.has(key))return heightCache.get(key);
    let dist=Infinity;const p=mesh.outer;
    for(let i=0,j=p.length-1;i<p.length;j=i++){
     const A=p[j],B=p[i],dx=B[0]-A[0],dy=B[1]-A[1],t=Math.max(0,Math.min(1,((x-A[0])*dx+(y-A[1])*dy)/(dx*dx+dy*dy||1)));
     dist=Math.min(dist,Math.hypot(x-A[0]-dx*t,y-A[1]-dy*t));
    }
    const z=3+35*Math.sin(Math.min(1,Math.sqrt(dist/57))*Math.PI/2);heightCache.set(key,z);return z;
   };
   const roofPoint=q=>[q[0],q[1],height(...q)];
   join(mesh.outer.map(q=>[...q,0]),mesh.outer.map(roofPoint),glass);
   for(const tri of mesh.triangles){const c=tri.reduce((a,b)=>[a[0]+b[0]/3,a[1]+b[1]/3],[0,0]);poly(tri.map(roofPoint),silver,.91+.11*Math.max(0,Math.min(1,(c[1]+120)/240)));}
   for(const h of mesh.holes){
    const top=h.p.map(roofPoint);
    if(h.type==='glass'){
     poly(top,N?[68,105,127]:[192,219,217]);path([...top,top[0]],N?'#bed8df':'#f9f9f2',.8);
     for(let k=0;k<top.length;k+=8)path([top[k],top[(k+32)%64]],N?'#9fb7c7':'#e8efea',.45);
    }else{
     const inner=ring(h.cx,h.cy,h.rx*.81,h.ry*.81,5,64);
     join(inner,top,N?[65,93,117]:[118,143,172]);
     poly(inner,N?[38,75,58]:[86,150,91]);
     const field=[[h.cx-47,h.cy-30,5.2],[h.cx+47,h.cy-30,5.2],[h.cx+47,h.cy+30,5.2],[h.cx-47,h.cy+30,5.2],[h.cx-47,h.cy-30,5.2]];
     path(field,'#eef2df',.9);path([[h.cx,h.cy-30,5.3],[h.cx,h.cy+30,5.3]],'#eef2df',.7);
    }
   }
   for(const strip of mesh.lattice)path(strip.map(q=>[q[0],q[1],height(...q)+.15]),N?'#acbdce':'#f8faf4',s>=32?.65:.4);
  }else if(lm.id==='ft_szh'){
   const red=N?[132,49,37]:[179,51,37],roof=N?[147,160,178]:[220,222,229];
   // Low office wings under a broad undulating silver roof with red soffits.
   parts.forEach((part,index)=>{if(index===10||index<2)return;const p=part.p;prism(p,Math.min(part.h||18,18),glass,roof)});
   const W=lm.w*.49,D=lm.d*.48;
   const roofAt=(x,y)=>{const u=Math.abs(x/W);return[x,y,30+12*Math.exp(-Math.pow(u/.32,2))+8*Math.pow(u,7)-2*Math.cos(y/D*Math.PI/2)]};
   const holes=[{x:-46,y:-7,rx:22,ry:22,type:'round'},{x:61,y:-7,rx:24,ry:23,type:'square'}];
   for(let i=0;i<72;i++)for(let j=0;j<16;j++){
    const x=-W+2*W*i/72,y=-D+2*D*j/16,dx=2*W/72,dy=2*D/16;
    if(holes.some(h=>h.type==='round'?Math.hypot((x+dx/2-h.x)/h.rx,(y+dy/2-h.y)/h.ry)<1:Math.abs(x+dx/2-h.x)<h.rx&&Math.abs(y+dy/2-h.y)<h.ry))continue;
    // The four long rectangular roof courts are open.
    if(Math.abs(x+dx/2)>W*.54&&Math.abs(x+dx/2)<W*.77&&Math.abs(y+dy/2)<D*.57)continue;
    poly([roofAt(x,y),roofAt(x+dx,y),roofAt(x+dx,y+dy),roofAt(x,y+dy)],roof,.98+.04*j/16);
   }
   for(let i=0;i<72;i++){const x=-W+2*W*i/72,dx=2*W/72;for(const yy of [-D,D]){const A=roofAt(x,yy),B=roofAt(x+dx,yy);poly([A,B,[B[0],B[1],B[2]-3],[A[0],A[1],A[2]-3]],red)}}
   for(const h of holes){
    const H=h.type==='round'?58:62;
    const p=h.type==='round'?ring(h.x,h.y,h.rx,h.ry,0,48):[[h.x-h.rx,h.y-h.ry],[h.x+h.rx,h.y-h.ry],[h.x+h.rx,h.y+h.ry],[h.x-h.rx,h.y+h.ry]];
    const col=h.type==='round'?(N?[151,120,49]:[225,187,69]):(N?[141,44,38]:[196,48,35]);
    const top=p.map(q=>[q[0],q[1],H+(h.type==='square'?(q[0]-h.x)/h.rx*4:0)]);
    join(p.map(q=>[q[0],q[1],0]),top,col);poly(top,col,1.08);
    path([...top,top[0]],h.type==='round'?'#e3c471':'#db7454',.6);
   }
   for(let x=-W+20;x<W;x+=36)path([[x,D*.8,0],[x,D*.8,roofAt(x,D*.8)[2]-3]],N?'#aab8bf':'#e0e4e3',1.3);
   for(let x=-W+20;x<W-32;x+=28){const y=D*.8;path([[x,y,18],[x+14,y,roofAt(x+14,y)[2]-3],[x+28,y,18]],N?'#b3c1cb':'#e3e8eb',.7)}
  }else if(lm.id==='ns_culture'){
   const p=parts[0].p,b=bounds(p);
   // Landscaped roof at grade, with winding walks between the north/south groups.
   prism(p,1.2,N?[57,80,65]:[164,188,137]);
   const stone=(cx,cy,rx,ry,H,lean,seed)=>{
    const n=64,profiles=[[0,.73],[.12,.91],[.30,1],[.58,.97],[.80,.79],[.94,.48],[1,.015]],rr=[];
    for(const [t,sc] of profiles)rr.push(Array.from({length:n},(_,i)=>{const ang=i/n*Math.PI*2;
     const lobe=1+.10*Math.cos(ang*2+seed)+.04*Math.sin(ang*3);
     return[cx+Math.cos(ang)*rx*sc*lobe+lean*t,cy+Math.sin(ang)*ry*sc,H*t+1.3]}));
    for(let i=1;i<rr.length;i++)join(rr[i-1],rr[i],white);poly(rr.at(-1),white);
    // dark undercut glazing beneath the projecting stone head
    path(rr[1].slice(0,33),N?'#f1d2a0':'#557582',1.4);
   };
   // Measured layout: tall north head and broad, low south hall; satellites are deliberately lower.
   stone(125,-12,39,32,29,-12,.3);stone(120,26,15,17,12,7,1.1);
   stone(-91,-14,62,39,19,-9,1.7);stone(-145,15,29,17,9,-9,.7);
   stone(-165,-23,19,24,7,0,.4);stone(-57,25,22,18,7,0,.9);
   stone(75,-48,22,15,7,0,1.3);stone(12,42,18,15,5,0,.8);
   // The characteristic oval light wells and pedestrian loops remain at landscape level.
   for(const [x,y,rx,ry] of [[-10,-9,24,34],[65,29,22,25],[-80,44,25,17]]){
    poly(ring(x,y,rx,ry,1.5),N?[46,67,65]:[116,150,123]);path([...ring(x,y,rx,ry,1.7),ring(x,y,rx,ry,1.7)[0]],N?'#b5bbae':'#e9e8dc',2);
   }
  }else if(lm.id==='ft_cocopark'){
   const p=parts[0].p,b=bounds(p),[cx,cy]=center(p),H=24;
   const wall=N?[91,81,70]:[204,186,156],roof=N?[114,127,107]:[192,205,168];
   // Open central atrium, stepped terraces and glass skylights within the retail footprint.
   const w=(b[2]-b[0])*.43,d=(b[3]-b[1])*.43;
   const hole=[[cx-w/2,cy-d/2],[cx+w/2,cy-d/2],[cx+w/2,cy+d/2],[cx-w/2,cy+d/2]];
   join(p.map(q=>[q[0],q[1],0]),p.map(q=>[q[0],q[1],H]),wall);
   poly(p.map(q=>[q[0],q[1],H]),roof,1,[hole.map(q=>[q[0],q[1],H])]);
   join(hole.map(q=>[q[0],q[1],3]),hole.map(q=>[q[0],q[1],H]),wall);
   poly(hole.map(q=>[q[0],q[1],3]),N?[57,52,46]:[161,145,122]);
   for(let k=0;k<3;k++){const ww=w+12*k,dd=d+12*k,z=H+1+k*.5;path([[cx-ww/2,cy-dd/2,z],[cx+ww/2,cy-dd/2,z],[cx+ww/2,cy+dd/2,z],[cx-ww/2,cy+dd/2,z],[cx-ww/2,cy-dd/2,z]],N?'#d8bb88':'#f3ead3',1)}
   for(let x=b[0]+15;x<b[2]-15;x+=23)for(let y=b[1]+15;y<b[3]-15;y+=24){if(Math.abs(x-cx)<w*.65&&Math.abs(y-cy)<d*.65||!inside(x,y,p))continue;box(x,y,12,8,H,H+2,glass,silver)}
   roofMarks.push(()=>{const q=P(cx,cy,H+3);ctx.font='bold '+Math.max(7,s*.12)+'px sans-serif';ctx.textAlign='center';ctx.fillStyle=N?'#f7d38b':'#577044';ctx.fillText('COCO PARK',q[0],q[1])});
  }else if(lm.id==='ba_cec2'||lm.id==='ft_cec'){
   parts.forEach(part=>{
    const p=part.p,H=part.h||32,b=bounds(p);prism(p,H,glass,silver);
    roofMarks.push(()=>{
     ctx.save();ctx.beginPath();p.forEach((q,i)=>{const v=P(q[0],q[1],H+.1);i?ctx.lineTo(...v):ctx.moveTo(...v)});ctx.closePath();ctx.clip();
     const along=lm.id==='ba_cec2',min=along?b[0]:b[1],max=along?b[2]:b[3],step=along?140:42;
     for(let a=min;a<max;a+=step)for(const side of [-1,1]){
      const t0=side<0?(along?b[1]:b[0]):20,t1=side<0?-20:(along?b[3]:b[2]);
      const pts=along?[[a,t0],[a+step-9,t0],[a+step-9,t1],[a,t1]]:[[t0,a],[t1,a],[t1,a+step-5],[t0,a+step-5]];
      ctx.fillStyle=N?'#637b94':'#c9d3e3';ctx.beginPath();pts.forEach((q,i)=>{const v=P(Math.max(b[0],Math.min(b[2],q[0])),Math.max(b[1],Math.min(b[3],q[1])),H+.2);i?ctx.lineTo(...v):ctx.moveTo(...v)});ctx.closePath();ctx.fill();
     }
     ctx.restore();
    });
   });
  }else{
   // The airport terminals retain their actual piers, faceted glazed walls and patterned roofs.
   parts.forEach(part=>{
    const p=part.p,H=part.h||28,b=bounds(p);prism(p,H,glass,white);
    for(let k=0;k<p.length;k++){const A=p[k],B=p[(k+1)%p.length],dist=Math.hypot(B[0]-A[0],B[1]-A[1]);if(dist<12)continue;for(let t=0;t<=1;t+=Math.max(.04,12/dist)){const x=A[0]+(B[0]-A[0])*t,y=A[1]+(B[1]-A[1])*t;path([[x,y,3],[x,y,H-.7]],N?'#7f9caf':'#dce7e5',.55)}}
    // Enclosed jet bridges branch off the concourse instead of reading as solid side walls.
    for(let k=0;k<p.length;k++){
     const A=p[k],B=p[(k+1)%p.length],dx=B[0]-A[0],dy=B[1]-A[1],len=Math.hypot(dx,dy);if(len<45)continue;
     const count=Math.max(1,Math.floor(len/48));
     for(let j=0;j<count;j++){
      const t=(j+.5)/count,x=A[0]+dx*t,y=A[1]+dy*t;let nx=-dy/len,ny=dx/len;
      if(inside(x+nx*2,y+ny*2,p)){nx=-nx;ny=-ny;}
      const ex=x+nx*21,ey=y+ny*21,tx=dx/len*2.2,ty=dy/len*2.2;
      const q=[[x-tx,y-ty],[x+tx,y+ty],[ex+tx,ey+ty],[ex-tx,ey-ty]].map(v=>[Math.max(-lm.w/2,Math.min(lm.w/2,v[0])),Math.max(-lm.d/2,Math.min(lm.d/2,v[1]))]);
      prism(q,7.5,N?[91,115,135]:[187,207,214],white,5);
     }
    }
    roofMarks.push(()=>{
     const q=p.map(v=>P(v[0],v[1],H+.1));ctx.save();ctx.beginPath();q.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.clip();
     const spacing=lm.id==='ba_t3'?16:54;
     ctx.strokeStyle=N?'rgba(171,199,219,.5)':'rgba(132,161,176,.65)';ctx.lineWidth=.55;
     for(let y=b[1];y<b[3];y+=spacing*.86)for(let x=b[0];x<b[2];x+=spacing){if(!inside(x,y,p))continue;const r=lm.id==='ba_t3'?spacing*.35:spacing*.13,pts=ring(x,y,r,r*(lm.id==='ba_t3'?.72:.32),H+.2,lm.id==='ba_t3'?6:16).map(v=>P(Math.max(b[0],Math.min(b[2],v[0])),Math.max(b[1],Math.min(b[3],v[1])),v[2]));ctx.beginPath();pts.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.stroke()}
     ctx.restore();
    });
   });
  }
  faces.sort((a,b)=>a.layer-b.layer||a.d-b.d);
  for(const f of faces){ctx.fillStyle=f.c;ctx.beginPath();f.p.forEach((q,i)=>{const p=P(...q);if(i)ctx.lineTo(...p);else ctx.moveTo(...p)});ctx.closePath();for(const hole of f.holes||[]){hole.forEach((q,i)=>{const p=P(...q);if(i)ctx.lineTo(...p);else ctx.moveTo(...p)});ctx.closePath()}ctx.fill('evenodd');}
  for(const l of ink){ctx.strokeStyle=l.c;ctx.lineWidth=l.w;ctx.beginPath();l.p.forEach((q,i)=>{const p=P(...q);if(i)ctx.lineTo(...p);else ctx.moveTo(...p)});ctx.stroke()}
  for(const mark of roofMarks)mark();
  return true;
 }
})(window.CM);
