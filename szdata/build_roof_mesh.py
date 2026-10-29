import json,math
from pathlib import Path
from shapely.geometry import Polygon,Point,MultiPoint,LineString
from shapely.ops import triangulate,unary_union
ROOT=Path(__file__).resolve().parent.parent
p=ROOT/'js/landmarks_sz.js';s=p.read_text();d=json.loads(s.split('= ',1)[1].strip().rstrip(';'))
lm=d['ft_bay'];polys=[Polygon(part['p']) for part in lm['parts']]
# A continuous roof envelope spanning all three venues, within their measured site extent.
base=unary_union(polys).convex_hull
outer=base.buffer(-4).buffer(4,resolution=8)
# densify outer boundary, ensuring smooth surface gradients and a round stadium opening.
def densify(poly,step):
 c=list(poly.exterior.coords);out=[]
 for a,b in zip(c,c[1:]):
  n=max(1,math.ceil(math.dist(a,b)/step))
  out.extend([[a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n] for k in range(n)])
 return out
holes=[{'cx':-186,'cy':-45,'rx':41,'ry':47,'type':'glass'},{'cx':-79,'cy':-34,'rx':45,'ry':53,'type':'glass'},{'cx':145,'cy':3,'rx':73,'ry':87,'type':'field'}]
rings=[]
for h in holes:rings.append([[h['cx']+math.cos(k*math.pi/32)*h['rx'],h['cy']+math.sin(k*math.pi/32)*h['ry']] for k in range(64)])
roof=Polygon(densify(outer,12),rings)
assert roof.is_valid
pts=list(roof.exterior.coords)
for r in roof.interiors:pts+=list(r.coords)
b=roof.bounds
for x in range(math.ceil(b[0]),math.floor(b[2]),12):
 for y in range(math.ceil(b[1]),math.floor(b[3]),12):
  if roof.contains(Point(x,y)):pts.append((x,y))
tris=[list(t.exterior.coords)[:3] for t in triangulate(MultiPoint(pts)) if roof.covers(t)]
lines=[]
for sign in [-1,1]:
 for offset in range(-600,600,13):
  g=roof.intersection(LineString([(-600,offset-sign*600),(600,offset+sign*600)]))
  gs=[g] if g.geom_type=='LineString' else getattr(g,'geoms',[])
  for line in gs:
   if line.geom_type!='LineString':continue
   c=list(line.coords)
   for a,z in zip(c,c[1:]):
    n=max(1,math.ceil(math.dist(a,z)/10));lines.append([[a[0]+(z[0]-a[0])*k/n,a[1]+(z[1]-a[1])*k/n] for k in range(n+1)])
mesh={'outer':densify(outer,10),'holes':[dict(h,p=r) for h,r in zip(holes,rings)],'triangles':tris,'lattice':lines}
(ROOT/'js/landmark_meshes_sz.js').write_text("'use strict';\n// Continuous roof mesh, built by szdata/build_roof_mesh.py (OSM envelope + reference-based openings).\nwindow.CM.SZ_ROOF_MESH = "+json.dumps(mesh,separators=(',',':'))+';\n')
print('roof faces',len(tris),'lattice strips',len(lines))
# keep the original reference geometries for reproducibility; collision remains the measured site.
for id in ['ns_culture']:
 poly=Polygon(d[id]['parts'][0]['p']);print('culture valid centers',[(x,y,poly.contains(Point(x,y))) for x,y in [(130,-10),(-90,-12),(-145,10),(30,20),(75,50)]])
