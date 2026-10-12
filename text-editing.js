import { canvasFont, detectFont } from './text-font.js';
export function setupTextEditing(api) {
  const $ = id => document.getElementById(id);
  const layer = $('textObjects');
  let selected = null, pageId = null, originals = [], drag = null, generation = 0;
  const dialog = document.createElement('dialog');
  dialog.id = 'editTextDialog';
  dialog.innerHTML = `<form method="dialog"><h2 id="editTitle">Edit text</h2><p id="editDescription"></p><label>Text<textarea id="editValue" rows="4" required></textarea></label><p id="fontMatchInfo"></p><div class="text-properties"><label>Font<select id="editFontFamily"><option value="original">Match original</option><option value="Arial, sans-serif">Arial</option><option value="Times New Roman, serif">Times New Roman</option><option value="Courier New, monospace">Courier New</option><option value="Calibri, sans-serif">Calibri</option><option value="Georgia, serif">Georgia</option></select></label><label>Style<select id="editFontStyle"><option value="normal">Regular</option><option value="bold">Bold</option><option value="italic">Italic</option><option value="bolditalic">Bold italic</option></select></label><label>Font size<input id="editFontSize" type="number" min="0.1" max="1000" step="any" required></label><label>Text color<input id="editColor" type="color"></label><label id="backgroundLabel">Cover color<input id="editBackground" type="color"></label></div><div class="dialog-actions"><button value="cancel" class="secondary" formnovalidate>Cancel</button><button value="save" class="primary">Save text</button></div></form>`;
  document.body.append(dialog);
  function current() { const s=api.getState(); return {...s,page:s.doc?.pages[s.index]}; }
  function activeMark() { return current().page?.marks.find(m=>m.id===selected); }
  function dimensions(m) {
    if(m.type==='image')return {w:m.w,h:m.h};
    const {view}=current(),c=document.createElement('canvas').getContext('2d');
    c.font=canvasFont(m,m.size*view.width);
    return {w:Math.max(12,...m.text.split('\n').map(l=>c.measureText(l).width))/view.width,h:m.text.split('\n').length*m.size*view.width*1.2/view.height};
  }
  function panel() {
    const m=activeMark();$('textSelection').hidden=!m;
    const image=m?.type==='image';
    $('selectionHeading').textContent=image?'SELECTED IMAGE':'SELECTED TEXT';
    $('selectionPreview').textContent=m?(image?'Drag to move. Drag the corner to resize.':m.text.slice(0,90)):'';
    $('editSelected').hidden=image;$('imageSizeControl').hidden=!image;
    $('removeSelected').textContent=image?'⌫ Remove image':'⌫ Remove text';
    if(image)$('selectedImageWidth').value=Math.round(m.w*100);
  }
  function drawObjects() {
    layer.replaceChildren();const {page,tool,view}=current();if(!page||!view)return;
    layer.className=tool==='replace'?'replace-mode':tool==='select'?'select-mode':'';
    if(tool==='replace')for(const o of originals){
      if(page.marks.some(m=>m.originalKey===o.key))continue;
      const b=box(o,o.text,true);b.onclick=()=>editOriginal(o);layer.append(b);
    }
    if(tool==='select')for(const m of page.marks.filter(m=>m.type==='text'||m.type==='image')){
      if(!m.id)m.id=crypto.randomUUID();const d=dimensions(m),b=box({...m,...d},m.text,false);
      b.classList.toggle('is-selected',selected===m.id);
      if(m.type==='image'){const handle=document.createElement('span');handle.className='resize-handle';handle.title='Drag to resize image';handle.onpointerdown=e=>startResize(e,m,b);b.append(handle)}
      b.onpointerdown=e=>{if(!e.target.closest('.resize-handle'))startDrag(e,m,b)};b.ondblclick=()=>editMark(m);
      b.onkeydown=e=>{
        if(e.key==='Enter'){e.preventDefault();editMark(m)}
        if(e.key==='Escape'){selected=null;drawObjects()}
        if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove(m)}
        const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
        if(delta){e.preventDefault();api.checkpoint();const v=current().view,step=e.shiftKey?10:1;m.x+=delta[0]*step/v.width;m.y+=delta[1]*step/v.height;constrain(m);api.changed().then(()=>layer.querySelector('.is-selected')?.focus())}
      };layer.append(b);
    }
    panel();
  }
  function box(m,text,original){
    const b=document.createElement('button');b.type='button';b.className='text-object'+(original?' original':'');b.setAttribute('aria-label',m.type==='image'?'Select added image':(original?'Replace PDF text: ':'Select added text: ')+text);
    b.title=original?'Click to replace appearance (original remains underneath)':m.type==='image'?'Drag to move · corner to resize · Delete to remove':'Drag to move · double-click to edit';
    Object.assign(b.style,{left:m.x*100+'%',top:m.y*100+'%',width:m.w*100+'%',height:m.h*100+'%',transform:`rotate(${m.angle||0}deg)`});return b;
  }
  function constrain(m){
    const {view}=current(),d=dimensions(m),a=(m.angle||0)*Math.PI/180;
    const dx=d.w*Math.cos(a),dy=d.w*view.width/view.height*Math.sin(a),hx=-d.h*view.height/view.width*Math.sin(a),hy=d.h*Math.cos(a);
    const minX=Math.min(0,dx,hx,dx+hx),maxX=Math.max(0,dx,hx,dx+hx),minY=Math.min(0,dy,hy,dy+hy),maxY=Math.max(0,dy,hy,dy+hy);
    m.x=Math.max(-minX,Math.min(Math.max(-minX,1-maxX),m.x));m.y=Math.max(-minY,Math.min(Math.max(-minY,1-maxY),m.y));
  }
  function startDrag(e,m,b){
    if(e.button!==0)return;e.preventDefault();e.stopPropagation();selected=m.id;
    layer.querySelectorAll('.text-object').forEach(el=>el.classList.toggle('is-selected',el===b));panel();b.focus();
    const rect=layer.getBoundingClientRect();drag={m,b,x:e.clientX,y:e.clientY,oldX:m.x,oldY:m.y,rect,moved:false};b.setPointerCapture(e.pointerId);
    b.onpointermove=e=>{if(!drag)return;const dx=(e.clientX-drag.x)/rect.width,dy=(e.clientY-drag.y)/rect.height;
      if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<3)return;
      if(!drag.moved){api.checkpoint();drag.moved=true}m.x=drag.oldX+dx;m.y=drag.oldY+dy;constrain(m);b.style.left=m.x*100+'%';b.style.top=m.y*100+'%';api.paint($('overlay'),current().page.marks);
    };
    b.onpointerup=async()=>{if(!drag)return;const moved=drag.moved;drag=null;if(moved){await api.changed();layer.querySelector('.is-selected')?.focus()}};
    b.onpointercancel=async()=>{if(!drag)return;m.x=drag.oldX;m.y=drag.oldY;drag=null;await api.changed()};
  }
  function resizeImage(m,ratio){
    const {view}=current(),a=(m.angle||0)*Math.PI/180;
    m.w*=ratio;m.h*=ratio;
    const boundW=Math.abs(m.w*Math.cos(a))+Math.abs(m.h*view.height/view.width*Math.sin(a));
    const boundH=Math.abs(m.w*view.width/view.height*Math.sin(a))+Math.abs(m.h*Math.cos(a));
    const fit=Math.min(1,1/boundW,1/boundH);m.w*=fit;m.h*=fit;constrain(m);
  }
  function startResize(e,m,b){
    if(e.button!==0)return;e.preventDefault();e.stopPropagation();
    selected=m.id;panel();b.focus();b.setPointerCapture(e.pointerId);
    const rect=layer.getBoundingClientRect(),startX=e.clientX,startY=e.clientY,original={x:m.x,y:m.y,w:m.w,h:m.h};let moved=false;
    const angle=(m.angle||0)*Math.PI/180,localW=m.w*rect.width,localH=m.h*rect.height;
    b.onpointermove=e=>{const dx=e.clientX-startX,dy=e.clientY-startY;if(!moved&&Math.hypot(dx,dy)<3)return;if(!moved){api.checkpoint();moved=true}
      const lx=dx*Math.cos(angle)+dy*Math.sin(angle),ly=-dx*Math.sin(angle)+dy*Math.cos(angle);
      const ratio=Math.max(.02/original.w,.02/original.h,1+(lx*localW+ly*localH)/(localW*localW+localH*localH));
      Object.assign(m,original);resizeImage(m,ratio);Object.assign(b.style,{left:m.x*100+'%',top:m.y*100+'%',width:m.w*100+'%',height:m.h*100+'%'});panel();api.paint($('overlay'),current().page.marks);
    };
    b.onpointerup=async()=>{b.onpointermove=null;b.onpointerup=null;b.onpointercancel=null;if(moved){await api.changed();layer.querySelector('.is-selected')?.focus()}};
    b.onpointercancel=async()=>{Object.assign(m,original);b.onpointermove=null;await api.changed()};
  }
  function editMark(m){if(m.type==='image'){const p=document.querySelector('.page-actions');p.hidden=false;$('toggleInspector').setAttribute('aria-expanded','true');api.changed().then(()=>$('selectedImageWidth').focus());return}openEditor(m,false)}
  function editOriginal(o){
    const {view}=current();openEditor({id:crypto.randomUUID(),type:'text',text:o.text,x:o.x,y:o.y,size:o.size/view.width,angle:o.angle,...o.font,fontAscent:o.ascent,color:'#253d37',originalKey:o.key,cover:{x:o.left,y:o.top,w:o.right-o.left,h:o.bottom-o.top,color:o.background}},true);
  }
  function openEditor(m,isNew){
    const s=current(),target=s.page;
    $('editTitle').textContent=isNew?'Replace PDF text':'Edit text';
    $('editDescription').textContent=isNew?'This adds a cover and replacement text. Original text remains underneath. Font size and style are matched automatically; unavailable fonts use a similar substitute.':'Your text stays selectable and movable in this browser workspace.';
    const originalSize=m.size*s.view.width;const displayedSize=String(Number(originalSize.toFixed(4)));
    $('editFontFamily').options[0].textContent='Match original: '+(m.fontLabel||'Arial');$('editFontFamily').value='original';$('editFontStyle').value=(m.fontWeight==='bold'||m.fontWeight==='900'?'bold':'')+(m.fontStyle==='italic'?'italic':'')||'normal';
    $('fontMatchInfo').textContent=m.originalFont?'PDF font: '+m.originalFont+'. Uses an available matching font; embedded-only fonts may differ.':'Font: '+(m.fontLabel||'Arial');
    $('editValue').value=m.text;$('editFontSize').value=displayedSize;$('editColor').value=m.color;$('backgroundLabel').hidden=!m.cover;if(m.cover)$('editBackground').value=m.cover.color;
    dialog.showModal();
    dialog.onclose=async()=>{if(dialog.returnValue!=='save'||!$('editValue').value.trim())return;api.checkpoint();m.text=$('editValue').value;m.size=($('editFontSize').value===displayedSize?originalSize:Number($('editFontSize').value))/s.view.width;const choice=$('editFontFamily').value;if(choice!=='original'){m.fontFamily=choice;m.fontLabel=$('editFontFamily').selectedOptions[0].textContent;}const styleChoice=$('editFontStyle').value;m.fontWeight=styleChoice.includes('bold')?(m.fontWeight==='900'?'900':'bold'):'normal';m.fontStyle=styleChoice.includes('italic')?'italic':'normal';m.color=$('editColor').value;if(m.cover)m.cover.color=$('editBackground').value;if(isNew)target.marks.push(m);selected=m.id;api.setTool('select');await api.changed();};
  }
  async function remove(m){api.checkpoint();const p=current().page;p.marks=p.marks.filter(x=>x!==m);selected=null;await api.changed()}
  $('editSelected').onclick=()=>{const m=activeMark();if(m)editMark(m)};
  $('removeSelected').onclick=()=>{const m=activeMark();if(m)remove(m)};
  $('selectedImageWidth').onchange=async()=>{const m=activeMark();if(m?.type!=='image')return;const width=Number($('selectedImageWidth').value);if(!Number.isFinite(width)||width<2||width>100){panel();return}api.checkpoint();resizeImage(m,width/100/m.w);await api.changed()};
  $('overlay').addEventListener('pointerdown',()=>{if(current().tool==='select'){selected=null;drawObjects()}});
  return {
    select(id){selected=id},
    toolChanged(){drawObjects()},
    async refresh(pdfPage,viewport,page,valid){
      if(!valid)return;const serial=++generation;if(pageId!==page.id){selected=null;pageId=page.id}originals=[];drawObjects();
      const text=await pdfPage.getTextContent();if(serial!==generation||current().page.id!==page.id)return;
      const cv=$('pdfCanvas'),ctx=cv.getContext('2d');
      for(const [i,item] of text.items.entries()){
        if(!item.str?.trim()||item.dir==='ttb')continue;
        const t=api.pdfjs.Util.transform(viewport.transform,item.transform),size=Math.hypot(t[2],t[3]),angle=Math.atan2(t[1],t[0]);
        const style=text.styles[item.fontName]||{};let font={};try{if(pdfPage.commonObjs.has(item.fontName))font=pdfPage.commonObjs.get(item.fontName)}catch{}
        const matchedFont=detectFont(font,style),ascentRatio=style.ascent??.8;const ascent=ascentRatio*size;
        const x=t[4]+ascent*Math.sin(angle),y=t[5]-ascent*Math.cos(angle),w=Math.abs(item.width),h=size*1.15;
        const corners=[[0,0],[w,0],[0,h],[w,h]].map(([a,b])=>[x+a*Math.cos(angle)-b*Math.sin(angle),y+a*Math.sin(angle)+b*Math.cos(angle)]);
        const left=Math.max(0,Math.min(...corners.map(p=>p[0]))-1)/viewport.width,top=Math.max(0,Math.min(...corners.map(p=>p[1]))-1)/viewport.height,right=Math.min(viewport.width,Math.max(...corners.map(p=>p[0]))+1)/viewport.width,bottom=Math.min(viewport.height,Math.max(...corners.map(p=>p[1]))+1)/viewport.height;
        let background='#ffffff';try{const pixel=ctx.getImageData(Math.max(0,Math.min(cv.width-1,Math.floor(left*cv.width))),Math.max(0,Math.min(cv.height-1,Math.floor(top*cv.height))),1,1).data;background='#'+[...pixel].slice(0,3).map(n=>n.toString(16).padStart(2,'0')).join('')}catch{}
        originals.push({key:`${page.source}:${page.page}:${i}`,text:item.str,x:x/viewport.width,y:y/viewport.height,w:w/viewport.width,h:h/viewport.height,angle:angle*180/Math.PI,size,left,top,right,bottom,background,font:matchedFont,ascent:ascentRatio});
      }
      drawObjects();if(current().tool==='replace'&&!originals.length)api.toast('No selectable text on this page. Scanned pages need OCR; use Add text instead.');
    }
  };
}
