// Merge nearby PDF text fragments along their shared baseline, without crossing column gaps.
export function groupTextLines(items, width, height) {
  const lines=[];
  for(const item of items){
    const a=item.angle*Math.PI/180,ux=Math.cos(a),uy=Math.sin(a);
    const base={x:item.x*width-item.ascent*item.size*uy,y:item.y*height+item.ascent*item.size*ux};
    const start=base.x*ux+base.y*uy,baseline=-base.x*uy+base.y*ux;
    let line=lines.find(l=>Math.abs(l.angle-item.angle)<1 && Math.abs(l.baseline-baseline)<=Math.max(2,Math.min(l.size,item.size)*.22));
    if(!line){line={angle:item.angle,baseline,size:item.size,parts:[]};lines.push(line)}
    line.parts.push({...item,start,end:start+item.w*width});
  }
  const result=[];
  for(const line of lines){
    const parts=line.parts.sort((a,b)=>a.start-b.start);let group=[];
    const flush=()=>{
      if(!group.length)return;
      const first=group[0],last=group[group.length-1],dominant=group.reduce((a,b)=>a.text.trim().length>=b.text.trim().length?a:b);
      let text=first.text;
      for(let i=1;i<group.length;i++){const p=group[i-1],n=group[i];const gap=n.start-p.end;text+=(gap>Math.min(p.size,n.size)*.12&&!/\s$/.test(text)&&!/^\s/.test(n.text)?' ':'')+n.text}
      result.push({...first,text,font:dominant.font,keys:group.map(p=>p.key),w:(Math.max(...group.map(p=>p.end))-first.start)/width,h:Math.max(...group.map(p=>p.h)),left:Math.min(...group.map(p=>p.left)),top:Math.min(...group.map(p=>p.top)),right:Math.max(...group.map(p=>p.right)),bottom:Math.max(...group.map(p=>p.bottom))});group=[];
    };
    for(const p of parts){const prev=group[group.length-1];if(prev&&(p.start-prev.end>Math.max(5,Math.min(prev.size,p.size)*1.5)||p.start<prev.end-Math.min(prev.size,p.size)*.3))flush();group.push(p)}flush();
  }
  return result;
}
