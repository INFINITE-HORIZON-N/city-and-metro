// Copied into each road worker; only standard worker globals are used.
function roadKernelWorker(module,G){
  const e=new WebAssembly.Instance(module,{}).exports;let views,capacity=0;
  const fixed=['outStart','outArc','arcTo','arcFrom','start','nodes','times','km','zones','arcKm'];
  function configure(rows){
    capacity=Math.max(rows,Math.min(G.Z,Math.max(16,Math.ceil(G.Z/32))));
    if(!e.init(G.nN,G.nA,G.Z,G.nodes.length,G.zones.length,capacity))throw Error('Road kernel capacity');
    views=fixed.map((key,i)=>new G[key].constructor(e.memory.buffer,e.ptr(i),G[key].length));for(let i=0;i<fixed.length;i++)views[i].set(G[fixed[i]]);
    for(const [id,Type,len]of [[10,Float32Array,G.nA],[11,Int32Array,capacity],[12,Float32Array,capacity*G.Z],[13,Float32Array,capacity*G.Z],[14,Float32Array,capacity*G.Z],[15,Float32Array,G.nA]])views[id]=new Type(e.memory.buffer,e.ptr(id),len);
  }
  configure(1);
  return {solve(m){const n=m.origins.length;if(n>capacity)configure(n);views[10].set(m.time);views[11].set(m.origins);views[12].set(m.dem);if(!e.solve(n))throw Error('Road kernel input');return {rowsT:views[13].slice(0,n*G.Z),rowsK:views[14].slice(0,n*G.Z),aux:views[15].slice()};}};
}
