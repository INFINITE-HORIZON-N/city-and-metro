//! Exact counterpart of sim.js carTree/carOriginRow. No fast math or reordered sums.
use std::cell::RefCell;
const INF: f64 = 1e30;
// Graph ranges are checked once, changing origins/costs before each solve.
// Positive costs finalize each node at most once; each improving arc and each
// initial connection can push at most once, so order[nn] and heap[na+nc+4] fit.
// These helpers remove redundant bounds checks only inside those invariants.
#[inline(always)] fn get<T:Copy>(a:&[T],i:usize)->T {debug_assert!(i<a.len());unsafe{*a.get_unchecked(i)}}
#[inline(always)] fn set<T>(a:&mut[T],i:usize,v:T) {debug_assert!(i<a.len());unsafe{*a.get_unchecked_mut(i)=v;}}
struct Road {
    out_start: Vec<i32>, out_arc: Vec<i32>, arc_to: Vec<i32>, arc_from: Vec<i32>,
    start: Vec<i32>, nodes: Vec<i32>, times: Vec<f64>, km: Vec<f64>, zones: Vec<i32>, arc_km: Vec<f64>,
    time: Vec<f32>, origins: Vec<i32>, dem: Vec<f32>, rows_t: Vec<f32>, rows_k: Vec<f32>, aux: Vec<f32>,
    dist: Vec<f64>, dkm: Vec<f32>, pred: Vec<i32>, order: Vec<usize>, acc: Vec<f64>,
    heap_k: Vec<f64>, heap_v: Vec<usize>, z: usize, validated: bool,
}
impl Road {
    fn new(nn: usize, na: usize, z: usize, nc: usize, nz: usize, rows: usize) -> Self {
        Self { out_start: vec![0;nn+1], out_arc: vec![0;na], arc_to: vec![0;na], arc_from: vec![0;na],
            start: vec![0;z+1], nodes: vec![0;nc], times: vec![0.;nc], km: vec![0.;nc], zones: vec![0;nz], arc_km: vec![0.;na],
            time: vec![0.;na], origins: vec![0;rows], dem: vec![0.;rows*z], rows_t: vec![f32::NAN;rows*z], rows_k: vec![f32::NAN;rows*z], aux: vec![0.;na],
            dist: vec![INF;nn], dkm: vec![0.;nn], pred: vec![0;nn], order: vec![0;nn], acc: vec![0.;nn],
            heap_k: vec![0.;na+nc+4], heap_v: vec![0;na+nc+4], z,validated:false }
    }
    fn validate(&self)->bool {
        let nn=self.dist.len() as i32;let na=self.time.len() as i32;let nc=self.nodes.len() as i32;
        let ranges=|a:&[i32],end:i32|a.first()==Some(&0)&&a.last()==Some(&end)&&a.windows(2).all(|p|p[0]>=0&&p[0]<=p[1]);
        ranges(&self.out_start,na)&&ranges(&self.start,nc)&&self.out_arc.iter().all(|&i|i>=0&&i<na)&&self.arc_to.iter().chain(&self.arc_from).chain(&self.nodes).all(|&i|i>=0&&i<nn)&&self.zones.iter().all(|&i|i>=0&&(i as usize)<self.z)&&self.times.iter().chain(&self.km).chain(&self.arc_km).all(|v|v.is_finite()&&*v>=0.)
    }
    #[inline(always)]
    fn push(&mut self, count: &mut usize, key: f64, val: usize) {
        let mut i=*count; *count+=1;
        while i>0 { let p=(i-1)>>1;let k=get(&self.heap_k,p);if k<=key {break;}let v=get(&self.heap_v,p);set(&mut self.heap_k,i,k);set(&mut self.heap_v,i,v);i=p; }
        set(&mut self.heap_k,i,key);set(&mut self.heap_v,i,val);
    }
    fn tree(&mut self, origin: usize) -> usize {
        self.dist.fill(INF); let mut count=0;
        for k in get(&self.start,origin) as usize..get(&self.start,origin+1) as usize {
            let v=get(&self.nodes,k) as usize; let t=get(&self.times,k);
            if t<get(&self.dist,v) {set(&mut self.dist,v,t);set(&mut self.dkm,v,get(&self.km,k) as f32);set(&mut self.pred,v,-1);self.push(&mut count,t,v);}
        }
        let mut no=0;
        while count>0 {
            let u=get(&self.heap_v,0); let du=get(&self.heap_k,0); count-=1;
            if count>0 {
                let key=get(&self.heap_k,count);let val=get(&self.heap_v,count);let mut i=0;
                loop {let left=i*2+1;if left>=count {break;} let right=left+1;let child=if right<count&&get(&self.heap_k,right)<get(&self.heap_k,left) {right}else{left};
                    let ck=get(&self.heap_k,child);if ck>=key {break;}let cv=get(&self.heap_v,child);set(&mut self.heap_k,i,ck);set(&mut self.heap_v,i,cv);i=child;}
                set(&mut self.heap_k,i,key);set(&mut self.heap_v,i,val);
            }
            if du>get(&self.dist,u) {continue;}set(&mut self.order,no,u);no+=1;
            for k in get(&self.out_start,u) as usize..get(&self.out_start,u+1) as usize {
                let a=get(&self.out_arc,k) as usize;let v=get(&self.arc_to,a) as usize;let nd=du+get(&self.time,a) as f64;
                if nd<get(&self.dist,v) {let km=(get(&self.dkm,u) as f64+get(&self.arc_km,a)) as f32;set(&mut self.dist,v,nd);set(&mut self.dkm,v,km);set(&mut self.pred,v,a as i32);self.push(&mut count,nd,v);}
            }
        }
        no
    }
    fn solve(&mut self, n: usize) -> bool {
        if n>self.origins.len() {return false;}
        if !self.validated {if !self.validate(){return false;}self.validated=true;}
        if self.origins[..n].iter().any(|&o|o<0||o as usize>=self.z)||self.time.iter().any(|&t|!t.is_finite()||t<=0.){return false;}
        self.rows_t.fill(f32::NAN);self.rows_k.fill(f32::NAN);self.aux.fill(0.);
        for i in 0..n {
            let o=self.origins[i] as usize;if o>=self.z {return false;}let no=self.tree(o);let off=i*self.z;
            for zi in 0..self.zones.len() {
                let d=self.zones[zi] as usize;if d==o {continue;}let mut best=INF;let mut bk=0.;let mut bn=None;
                for k in self.start[d] as usize..self.start[d+1] as usize {let node=self.nodes[k] as usize;let v=self.dist[node]+self.times[k];if v<best {best=v;bk=self.dkm[node] as f64+self.km[k];bn=Some(node);}}
                let Some(node)=bn else {continue;};if best>=INF {continue;}self.rows_t[off+d]=best as f32;self.rows_k[off+d]=bk as f32;
                let x=self.dem[off+d] as f64;if x>0. {self.acc[node]+=x;}
            }
            for q in (0..no).rev() {let node=self.order[q];let a=self.acc[node];if a>0. {let e=self.pred[node];if e>=0 {let e=e as usize;self.aux[e]=(self.aux[e] as f64+a) as f32;self.acc[self.arc_from[e] as usize]+=a;}self.acc[node]=0.;}}
        }
        true
    }
}
thread_local! {static ROAD: RefCell<Option<Road>>=const {RefCell::new(None)};}
#[no_mangle]
pub extern "C" fn init(nn: usize, na: usize, z: usize, nc: usize, nz: usize, rows: usize) -> i32 {
    let bytes=(nn as u64)*48+(na as u64)*44+(nc as u64)*40+(z as u64)*(rows as u64)*12;
    if nn==0||z==0||nz>z||rows>z||bytes>128*1024*1024 {return 0;}
    ROAD.with_borrow_mut(|r|*r=Some(Road::new(nn,na,z,nc,nz,rows)));1
}
#[no_mangle]
pub extern "C" fn ptr(field: u32) -> usize {
    ROAD.with_borrow_mut(|r|{let Some(r)=r else{return 0;};match field {
        0=>r.out_start.as_mut_ptr() as usize,1=>r.out_arc.as_mut_ptr() as usize,2=>r.arc_to.as_mut_ptr() as usize,3=>r.arc_from.as_mut_ptr() as usize,
        4=>r.start.as_mut_ptr() as usize,5=>r.nodes.as_mut_ptr() as usize,6=>r.times.as_mut_ptr() as usize,7=>r.km.as_mut_ptr() as usize,
        8=>r.zones.as_mut_ptr() as usize,9=>r.arc_km.as_mut_ptr() as usize,10=>r.time.as_mut_ptr() as usize,11=>r.origins.as_mut_ptr() as usize,
        12=>r.dem.as_mut_ptr() as usize,13=>r.rows_t.as_mut_ptr() as usize,14=>r.rows_k.as_mut_ptr() as usize,15=>r.aux.as_mut_ptr() as usize,_=>0}})
}
#[no_mangle]
pub extern "C" fn solve(rows: usize) -> i32 {ROAD.with_borrow_mut(|r|r.as_mut().is_some_and(|r|r.solve(rows)) as i32)}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn diamond_keeps_first_equal_path_and_float_rounding() {
        let mut r=Road::new(4,4,3,3,3,1);r.out_start.copy_from_slice(&[0,2,3,4,4]);r.out_arc.copy_from_slice(&[0,1,2,3]);r.arc_from.copy_from_slice(&[0,0,1,2]);r.arc_to.copy_from_slice(&[1,2,3,3]);r.time.fill(1.);r.arc_km.copy_from_slice(&[0.1,0.2,0.3,0.2]);r.start.copy_from_slice(&[0,1,2,3]);r.nodes.copy_from_slice(&[0,3,2]);r.zones.copy_from_slice(&[0,1,2]);r.dem.copy_from_slice(&[0.,3.25,1.1]);
        assert!(r.solve(1));assert!(r.rows_t[0].is_nan());assert_eq!(r.rows_t[1],2.);assert_eq!(r.rows_t[2],1.);assert_eq!(r.rows_k[1],(0.1_f32 as f64+0.3) as f32);assert_eq!(r.aux,[3.25,1.1,3.25,0.]);
    }
    #[test] fn unreachable_and_reused_scratch_remain_clean() {
        let mut r=Road::new(2,0,2,2,2,1);r.start.copy_from_slice(&[0,1,2]);r.nodes.copy_from_slice(&[0,1]);r.zones.copy_from_slice(&[0,1]);r.dem[1]=100.;assert!(r.solve(1));assert!(r.rows_t[1].is_nan());assert!(r.solve(1));assert_eq!(r.acc,[0.,0.]);assert!(!r.solve(2));
    }
    #[test] fn invalid_graph_and_dynamic_inputs_are_rejected() {
        let mut r=Road::new(2,1,2,2,2,1);r.out_start.copy_from_slice(&[0,1,1]);r.start.copy_from_slice(&[0,1,2]);r.nodes.copy_from_slice(&[0,1]);r.arc_to[0]=3;r.time[0]=1.;assert!(!r.solve(1));r.arc_to[0]=1;r.origins[0]=-1;assert!(!r.solve(1));r.origins[0]=0;r.time[0]=0.;assert!(!r.solve(1));r.time[0]=f32::NAN;assert!(!r.solve(1));
    }
}
