import type {ForegroundEvent} from './types';

export const isProcessTrial = (e: ForegroundEvent) =>
  (e.componentId === 'FormFillSequence' && e.variantId === 'trialContentToShots') ||
  (e.semanticLayer === 'title' && e.variantId === 'trialProcessHeading');
const rec=(v: unknown): Record<string, unknown> => v && typeof v==='object' ? v as Record<string, unknown> : {};
const num=(v: unknown,fallback:number) => typeof v==='number' && Number.isFinite(v) ? v : fallback;
export const processProgress=(ms:number,at:number,duration=320) => Math.max(0,Math.min(1,(ms-at)/duration));
export const processEase=(v:number) => 1-(1-v)**3;
const mix=(a:number,b:number,p:number) => a+(b-a)*p;
export type ProcessRect={x:number;y:number;width:number;height:number};
export type ProcessNode=ProcessRect & {id:string;kind:'heading'|'script'|'library'|'workflow'|'shot';text:string;
  index:number;scale:number;color:string;opacity:number;baseWidth:number;baseHeight:number;};
const envelope=(boxes:ProcessRect[],pad=10):ProcessRect => {
 const x=Math.min(...boxes.map(n=>n.x))-pad,y=Math.min(...boxes.map(n=>n.y))-pad;
 return {x,y,width:Math.max(...boxes.map(n=>n.x+n.width))+pad-x,height:Math.max(...boxes.map(n=>n.y+n.height))+pad-y};
};
export const getProcessTrialLayout=(e:ForegroundEvent,W:number,H:number,timeMs=20000) => {
 if(!isProcessTrial(e)) return null;
 const p=e.payload,raw=rec(p.beats),labels=rec(p.labels),u=Math.min(W/2560,H/1440);
 const label=(key:string,fallback:string) => String(labels[key]??fallback);
 const color=typeof e.style?.accentColor==='string'?e.style.accentColor:'#4DB6FF';
 const beats={input:num(raw.input,133),library:num(raw.library,480),match:num(raw.match,850),
  selected:num(raw.selected,3473),unfold:num(raw.unfold,4593),shots:num(raw.shots,5453),
  align:num(raw.align,7533),fill:num(raw.fill,11073)};
 const unfold=processEase(processProgress(timeMs,beats.unfold,700));
 const align=processEase(processProgress(timeMs,beats.align,520));
 const nodes:ProcessNode[]=[],all:ProcessRect[]=[];
 const transform=(r:ProcessRect,id:string) => {
  const o=e.elementOverrides?.[id],s=o?.scale??1;
  return {x:r.x*u+(o?.x??0)*W,y:r.y*u+(o?.y??0)*H,width:r.width*u*s,height:r.height*u*s};
 };
 const add=(id:string,kind:ProcessNode['kind'],text:string,initial:ProcessRect,final:ProcessRect,
  interpolation:number,opacity:number,index=0) => {
  const current={x:mix(initial.x,final.x,interpolation),y:mix(initial.y,final.y,interpolation),
   width:mix(initial.width,final.width,interpolation),height:mix(initial.height,final.height,interpolation)};
  all.push(transform(initial,id),transform(final,id));
  nodes.push({...transform(current,id),id,kind,text,index,scale:e.elementOverrides?.[id]?.scale??1,
   color:e.elementOverrides?.[id]?.color||color,opacity,baseWidth:current.width,baseHeight:current.height});
 };
 if(e.semanticLayer==='title'){
  const text=String(p.headline??e.anchorText??'');
  const r={x:168,y:153,width:Math.max(620,Array.from(text).length*52+16),height:108};
  add('process-heading.1','heading',text,r,r,0,processProgress(timeMs,0,260));
 }else{
  add('process-script.1','script',label('input','口播文案'),{x:170,y:348,width:242,height:354},
   {x:180,y:416,width:780,height:196},unfold,processProgress(timeMs,beats.input,350));
  const bank={x:614,y:308,width:306,height:310};
  add('process-library.1','library',label('library','工作流库'),bank,bank,0,
   processProgress(timeMs,beats.library,440)*(1-processProgress(timeMs,beats.unfold,330)));
  add('process-workflow.1','workflow',label('selected','已选工作流'),{x:580,y:709,width:380,height:170},
   {x:145,y:305,width:430,height:70},unfold,processProgress(timeMs,beats.selected,300));
  for(let i=0;i<3;i++){
   const r={x:180+i*260,y:731,width:i===2?260:244,height:129};
   const pending={...r,x:r.x+20*(i+1),width:r.width-18};
   add(`process-shot.${i+1}`,'shot',`${label('shots','镜头计划')} ${i+1}`,pending,r,align,
    processProgress(timeMs,beats.shots+i*160,360),i);
  }
  // Stable envelope includes all poses and the derived alignment label below the strip.
  const shotRects=all.slice(-6),shotBox=envelope(shotRects,0);
  all.push({x:shotBox.x,y:shotBox.y+shotBox.height,width:shotBox.width,height:110*u});
 }
 const box=envelope(all,10*u);
 return {nodes,u,color,beats,unfold,align,label,
  bounds:{x:box.x/W,y:box.y/H,width:box.width/W,height:box.height/H}};
};
export const getProcessTrialBounds=(e:ForegroundEvent,W:number,H:number) => getProcessTrialLayout(e,W,H)?.bounds??null;
