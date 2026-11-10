/** Shared contextual graph contract. This layer does not add semantic component slots. */
export type ForegroundEvent = {id: string; componentId: string; variantId: string; payload: Record<string, unknown>; style?: Record<string, unknown>; elementOverrides?: Record<string,{x?:number;y?:number;scale?:number;color?:string}>};
export type EditAsset = {id:string;path:string;status:string;type:string};
import {validateMetricBar, type MetricBarSpec} from './metric-bar';
import type {ScreenshotDetailSpec,ChatPanelSpec} from './screen-demonstrations';

/** Experimental rendering capability. It is not a new semantic category. */
export const isGraphicScene = (event: ForegroundEvent) =>
  event.componentId === 'GraphicScene' && event.variantId === 'freeformV1';

export type GraphicRect = {x: number; y: number; width: number; height: number};
export type GraphicKind = 'document' | 'passage' | 'image' | 'diagram' | 'film' | 'text' | 'metricBar' | 'crossMark' | 'focusRing' | 'focusBox' | 'focusTag' | 'screenshotDetail' | 'chatPanel';
export type GraphicPose = GraphicRect & {
  atMs: number; opacity?: number; labelOpacity?: number; reveal?: number;
  easing?: 'smooth' | 'linear';
  /** Cubic path controls are in document coordinates; attached to the arrival pose. */
  curve?: {c1: {x: number; y: number}; c2: {x: number; y: number}};
  /** A sampled source region gives a child a traceable birth pose. */
  origin?: {objectId: string; atMs: number; region: GraphicRect};
};
export type GraphicAppearance = {atMs: number; kind: GraphicKind; transitionMs?: number};
export type GraphicObject = {
  id: string; name: string; label: string; labelAtMs?: number; labelHideAtMs?: number;
  labelPosition?: 'below' | 'above' | 'inside' | 'none'; labelSize?: number; labelShadow?: boolean;
  showAtMs: number; hideAtMs?: number; sourceObjectId?: string;
  appearances: GraphicAppearance[]; poses: GraphicPose[];
  metric?: MetricBarSpec;
  screenshot?: ScreenshotDetailSpec; chat?: ChatPanelSpec;
  assetId?: string; assetFit?: 'contain' | 'cover';
  accentColor?: string; zIndex?: number;
};
export type GraphicConnection = {
  id: string; from: string; to: string; showAtMs: number; hideAtMs?: number;
  fromSide?: 'left' | 'right' | 'top' | 'bottom'; toSide?: 'left' | 'right' | 'top' | 'bottom';
  bend?: number; dashed?: boolean; arrow?: boolean;
};
export type GraphicSceneDocument = {
  schemaVersion: 1; designWidth: number; designHeight: number;
  accentColor: string; fontFamily?: string; labelSize?: number;
  objects: GraphicObject[]; connections?: GraphicConnection[];
};
const kinds = new Set(['document','passage','image','diagram','film','text','metricBar','crossMark','focusRing','focusBox','focusTag','screenshotDetail','chatPanel']);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const obj = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));
const time = (v: unknown) => finite(v) && v >= 0;
const rect = (v: unknown) => obj(v) && ['x','y','width','height'].every(k => finite(v[k])) && Number(v.width) > 0 && Number(v.height) > 0;
const hex = (v: unknown) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

export const validateGraphicScene = (value: unknown): string[] => {
  if (!obj(value)) return ['graphicScene must be an object'];
  const errors: string[] = [];
  if (value.schemaVersion !== 1) errors.push('Unsupported graphicScene.schemaVersion');
  if (!finite(value.designWidth) || value.designWidth <= 0 || !finite(value.designHeight) || value.designHeight <= 0) errors.push('Positive design dimensions required');
  if (!hex(value.accentColor)) errors.push('accentColor must be #RRGGBB');
  if (value.labelSize !== undefined && (!finite(value.labelSize) || value.labelSize <= 0)) errors.push('labelSize must be positive');
  if (!Array.isArray(value.objects) || !value.objects.length) return [...errors,'At least one graphic object required'];
  const ids = new Set<string>();
  const dependencies = new Map<string,string[]>();
  for (const [index, raw] of value.objects.entries()) {
    if (!obj(raw)) { errors.push(`Object ${index} is invalid`); continue; }
    const id = String(raw.id || '');
    if (!id || ids.has(id)) errors.push(`Missing or duplicate object id: ${id}`);
    ids.add(id);
    if (typeof raw.name !== 'string' || typeof raw.label !== 'string') errors.push(`${id}: name and label must be strings`);
    if (!time(raw.showAtMs) || (raw.hideAtMs !== undefined && (!time(raw.hideAtMs) || Number(raw.hideAtMs) <= Number(raw.showAtMs)))) errors.push(`${id}: invalid lifetime`);
    for (const key of ['labelAtMs','labelHideAtMs']) if (raw[key] !== undefined && !time(raw[key])) errors.push(`${id}: invalid ${key}`);
    if (raw.labelShadow !== undefined && typeof raw.labelShadow !== 'boolean') errors.push(`${id}: labelShadow must be boolean`);
    if (raw.labelSize !== undefined && (!finite(raw.labelSize) || raw.labelSize <= 0)) errors.push(`${id}: invalid labelSize`);
    if (raw.accentColor !== undefined && !hex(raw.accentColor)) errors.push(`${id}: invalid accentColor`);
    if (raw.labelPosition !== undefined && !['below','above','inside','none'].includes(String(raw.labelPosition))) errors.push(`${id}: invalid labelPosition`);
    if (raw.assetFit !== undefined && !['cover','contain'].includes(String(raw.assetFit))) errors.push(`${id}: invalid assetFit`);
    if (raw.assetId !== undefined && typeof raw.assetId !== 'string') errors.push(`${id}: assetId must be a string`);
    const deps: string[] = raw.sourceObjectId ? [String(raw.sourceObjectId)] : [];
    if (!Array.isArray(raw.poses) || !raw.poses.length) errors.push(`${id}: poses required`);
    else {
      let previous = -1;
      for (const pose of raw.poses) {
        if (!obj(pose) || !rect(pose) || !time(pose.atMs)) {errors.push(`${id}: invalid pose`); continue;}
        if (Number(pose.atMs) <= previous) errors.push(`${id}: pose times must strictly increase`);
        previous = Number(pose.atMs);
        for (const key of ['opacity','labelOpacity','reveal']) if (pose[key] !== undefined && (!finite(pose[key]) || Number(pose[key]) < 0 || Number(pose[key]) > 1)) errors.push(`${id}: ${key} must be 0..1`);
        if (pose.easing !== undefined && !['smooth','linear'].includes(String(pose.easing))) errors.push(`${id}: unsupported easing`);
        if (pose.curve !== undefined && (!obj(pose.curve) || !['c1','c2'].every(k => obj(pose.curve) && obj(pose.curve[k]) && finite(pose.curve[k].x) && finite(pose.curve[k].y)))) errors.push(`${id}: invalid cubic controls`);
        if (pose.origin !== undefined) {
          if (!obj(pose.origin) || typeof pose.origin.objectId !== 'string' || !time(pose.origin.atMs) || !rect(pose.origin.region)) errors.push(`${id}: invalid origin reference`);
          else deps.push(pose.origin.objectId);
        }
      }
    }
    if (raw.metric !== undefined || (Array.isArray(raw.appearances) && raw.appearances.some(a => obj(a) && a.kind === 'metricBar'))) errors.push(...validateMetricBar(raw.metric).map(e => `${id}: ${e}`));
    const hasKind=(kind:string)=>Array.isArray(raw.appearances)&&raw.appearances.some(a=>obj(a)&&a.kind===kind);
    if (raw.screenshot !== undefined || hasKind('screenshotDetail')) {
      const s=raw.screenshot;
      if (!obj(s) || !finite(s.sourceWidth) || s.sourceWidth<=0 || !finite(s.sourceHeight) || s.sourceHeight<=0 || !time(s.zoomStartMs) || !time(s.zoomEndMs) || Number(s.zoomEndMs)<=Number(s.zoomStartMs)) errors.push(`${id}: invalid screenshot dimensions/timing`);
      else {
        for (const key of ['from','to',...(s.focus!==undefined?['focus']:[])]) {
          const r=s[key];
          if (!rect(r)||!obj(r)||Number(r.x)<0||Number(r.y)<0||Number(r.x)+Number(r.width)>s.sourceWidth||Number(r.y)+Number(r.height)>s.sourceHeight) errors.push(`${id}: invalid screenshot ${key} crop`);
        }
        if (s.focusAtMs!==undefined&&!time(s.focusAtMs)) errors.push(`${id}: invalid screenshot focus timing`);
      }
      if (!raw.assetId) errors.push(`${id}: screenshot assetId required`);
    }
    if (raw.chat !== undefined || hasKind('chatPanel')) {
      const c=raw.chat;
      if (!obj(c)||!['appName','title','prompt','status'].every(k=>typeof c[k]==='string'&&String(c[k]).trim())||!time(c.typeStartMs)||!time(c.typeEndMs)||!time(c.sendAtMs)||Number(c.typeEndMs)<=Number(c.typeStartMs)||Number(c.sendAtMs)<Number(c.typeEndMs)) errors.push(`${id}: invalid chat text/timing`);
    }
    dependencies.set(id,deps);
    if (!Array.isArray(raw.appearances) || !raw.appearances.length) errors.push(`${id}: appearances required`);
    else {
      let previous = -1;
      let settled = -1;
      for (const appearance of raw.appearances) {
        if (!obj(appearance) || !time(appearance.atMs) || !kinds.has(String(appearance.kind)) || (appearance.transitionMs !== undefined && !time(appearance.transitionMs))) {errors.push(`${id}: unsupported appearance`);continue;}
        if (Number(appearance.atMs) <= previous || Number(appearance.atMs) < settled) errors.push(`${id}: overlapping/unordered appearance transitions`);
        previous = Number(appearance.atMs); settled = previous + Number(appearance.transitionMs || 0);
      }
    }
  }
  const visited = new Set<string>(), pending = new Set<string>();
  const visit = (id: string) => {
    if (pending.has(id)) { errors.push(`Cyclic object reference: ${id}`); return; }
    if (visited.has(id)) return;
    pending.add(id);
    for (const dep of dependencies.get(id) || []) {
      if (!ids.has(dep)) errors.push(`${id}: unknown source object ${dep}`); else visit(dep);
    }
    pending.delete(id); visited.add(id);
  };
  for (const id of ids) visit(id);
  const edgeIds = new Set<string>();
  if (value.connections !== undefined && !Array.isArray(value.connections)) errors.push('connections must be an array');
  for (const edge of Array.isArray(value.connections) ? value.connections : []) {
    if (!obj(edge) || typeof edge.id !== 'string' || edgeIds.has(edge.id) || !ids.has(String(edge.from)) || !ids.has(String(edge.to)) || !time(edge.showAtMs)) {errors.push('Invalid connection');continue;}
    edgeIds.add(edge.id);
    if (edge.bend !== undefined && !finite(edge.bend)) errors.push(`${edge.id}: invalid bend`);
    if (edge.hideAtMs !== undefined && (!time(edge.hideAtMs) || Number(edge.hideAtMs) <= Number(edge.showAtMs))) errors.push(`${edge.id}: invalid lifetime`);
    for (const k of ['fromSide','toSide']) if (edge[k] !== undefined && !['left','right','top','bottom'].includes(String(edge[k]))) errors.push(`${edge.id}: invalid endpoint side`);
  }
  return errors;
};

const validated = new WeakMap<object,{document: GraphicSceneDocument | null; errors: string[]}>();
export const readGraphicScene = (event: ForegroundEvent) => {
  if (!isGraphicScene(event)) return {document: null,errors: ['Not a GraphicScene event']};
  const payload = event.payload;
  const prior = validated.get(payload); if (prior) return prior;
  const errors = validateGraphicScene(payload.graphicScene);
  const result = {document: errors.length ? null : payload.graphicScene as GraphicSceneDocument,errors};
  validated.set(payload,result); return result;
};
const clamp = (x: number) => Math.max(0,Math.min(1,x));
const smooth = (x: number) => x*x*(3-2*x);
const mix = (a: number,b: number,p: number) => a+(b-a)*p;
export const cubic = (a: number,b: number,c: number,d: number,p: number) => (1-p)**3*a+3*(1-p)**2*p*b+3*(1-p)*p*p*c+p**3*d;
const textUnits = (s: string) => Array.from(s).reduce((n,c)=>n+(/[\u0000-\u007f]/.test(c)?.57:1),0);
export const unionGraphicRects = (rects: GraphicRect[]): GraphicRect => {
  if (!rects.length) return {x:0,y:0,width:1,height:1};
  const x=Math.min(...rects.map(r=>r.x)),y=Math.min(...rects.map(r=>r.y));
  return {x,y,width:Math.max(...rects.map(r=>r.x+r.width))-x,height:Math.max(...rects.map(r=>r.y+r.height))-y};
};
type NumericPose = GraphicRect & {opacity: number; labelOpacity: number; reveal: number};
const poseDefaults = (p: GraphicPose): NumericPose => ({x:p.x,y:p.y,width:p.width,height:p.height,opacity:p.opacity??1,labelOpacity:p.labelOpacity??1,reveal:p.reveal??1});

export type ResolvedGraphicObject = {
  object: GraphicObject; body: GraphicRect; bounds: GraphicRect; labelBox: GraphicRect;
  opacity: number; labelOpacity: number; reveal: number; color: string; fontSize: number; scale: number;
  appearances: Array<{kind: GraphicKind; opacity: number}>;
};
const appearanceAt = (object: GraphicObject,atMs: number) => {
  let index=-1;
  object.appearances.forEach((a,i)=>{if(a.atMs<=atMs)index=i;});
  if(index<0)return [];
  const current=object.appearances[index];
  const p=current.transitionMs?smooth(clamp((atMs-current.atMs)/current.transitionMs)):1;
  return index>0&&p<1?[{kind:object.appearances[index-1].kind,opacity:1-p},{kind:current.kind,opacity:p}]:[{kind:current.kind,opacity:index===0?p:1}];
};

export const resolveGraphicScene = (event: ForegroundEvent,W: number,H: number,atMs: number) => {
  const {document}=readGraphicScene(event); if(!document)return null;
  const u=Math.min(W/document.designWidth,H/document.designHeight);
  const byId=new Map(document.objects.map(o=>[o.id,o]));
  const memo=new Map<string,NumericPose>();
  const getPose=(object: GraphicObject,ms: number): NumericPose=>{
    const key=object.id+'@'+ms; const cached=memo.get(key); if(cached)return cached;
    const expand=(pose: GraphicPose): NumericPose=>{
      const p=poseDefaults(pose);
      if(!pose.origin)return p;
      const source=byId.get(pose.origin.objectId)!;
      const base=getPose(source,pose.origin.atMs),region=pose.origin.region;
      return {...p,x:base.x+base.width*region.x,y:base.y+base.height*region.y,width:base.width*region.width,height:base.height*region.height};
    };
    const poses=object.poses;
    let i=0; while(i<poses.length-1&&poses[i+1].atMs<=ms)i++;
    const a=expand(poses[i]),next=poses[i+1];
    let result=a;
    if(next&&ms>poses[i].atMs){
      const b=expand(next),t=clamp((ms-poses[i].atMs)/(next.atMs-poses[i].atMs)),p=next.easing==='linear'?t:smooth(t);
      result={x:mix(a.x,b.x,p),y:mix(a.y,b.y,p),width:mix(a.width,b.width,p),height:mix(a.height,b.height,p),opacity:mix(a.opacity,b.opacity,p),labelOpacity:mix(a.labelOpacity,b.labelOpacity,p),reveal:mix(a.reveal,b.reveal,p)};
      if(next.curve){result.x=cubic(a.x,next.curve.c1.x,next.curve.c2.x,b.x,p);result.y=cubic(a.y,next.curve.c1.y,next.curve.c2.y,b.y,p);}
    }
    const override=event.elementOverrides?.[object.id],scale=Math.max(.1,override?.scale??1);
    result={...result,x:result.x+(override?.x??0)*W/u,y:result.y+(override?.y??0)*H/u,width:result.width*scale,height:result.height*scale};
    memo.set(key,result);return result;
  };
  const nodes: ResolvedGraphicObject[]=document.objects.map(object=>{
    const pose=getPose(object,atMs),override=event.elementOverrides?.[object.id],scale=Math.max(.1,override?.scale??1);
    const body={x:pose.x*u,y:pose.y*u,width:pose.width*u,height:pose.height*u};
    const fontSize=(object.labelSize??document.labelSize??54)*u*scale;
    const labelWidth=Math.max(1,textUnits(object.label)*fontSize+8*u*scale),labelHeight=fontSize*1.35;
    const labelPosition=object.labelPosition??'below';
    const labelBox={x:body.x+(body.width-labelWidth)/2,y:labelPosition==='above'?body.y-labelHeight-12*u*scale:labelPosition==='inside'?body.y+(body.height-labelHeight)/2:body.y+body.height+12*u*scale,width:labelWidth,height:labelHeight};
    const showLabel=object.label&&labelPosition!=='none';
    const bounds=unionGraphicRects(showLabel?[body,labelBox]:[body]);
    const visible=atMs>=object.showAtMs&&(object.hideAtMs===undefined||atMs<object.hideAtMs);
    const labelVisible=atMs>=(object.labelAtMs??object.showAtMs)&&(object.labelHideAtMs===undefined||atMs<object.labelHideAtMs);
    return {object,body,bounds,labelBox,fontSize,scale,opacity:visible?pose.opacity:0,labelOpacity:labelVisible&&showLabel?pose.labelOpacity:0,reveal:pose.reveal,color:override?.color||String(event.style?.accentColor||object.accentColor||document.accentColor),appearances:appearanceAt(object,atMs)};
  });
  return {document,nodes,u};
};

/** Sample analytic cubic extrema as well as key states; no transparent host bounds. */
const extrema = (a: number,b: number,c: number,d: number) => {
  const A=-a+3*b-3*c+d,B=2*(a-2*b+c),C=b-a;
  if(Math.abs(A)<1e-9)return Math.abs(B)>1e-9?[-C/B].filter(t=>t>0&&t<1):[];
  const disc=B*B-4*A*C;if(disc<0)return [];
  return [(-B+Math.sqrt(disc))/(2*A),(-B-Math.sqrt(disc))/(2*A)].filter(t=>t>0&&t<1);
};
const inverseSmooth = (p: number) => {let lo=0,hi=1;for(let i=0;i<35;i++){const mid=(lo+hi)/2;if(smooth(mid)<p)lo=mid;else hi=mid;}return (lo+hi)/2;};

export const resolveGraphicConnections = (event: ForegroundEvent,W: number,H: number,atMs: number) => {
  const layout=resolveGraphicScene(event,W,H,atMs);if(!layout)return [];
  const side=(r:GraphicRect,s:string)=>s==='left'?{x:r.x,y:r.y+r.height/2}:s==='right'?{x:r.x+r.width,y:r.y+r.height/2}:s==='top'?{x:r.x+r.width/2,y:r.y}:{x:r.x+r.width/2,y:r.y+r.height};
  const control=(p:{x:number;y:number},s:string,d:number)=>({x:p.x+(s==='left'?-d:s==='right'?d:0),y:p.y+(s==='top'?-d:s==='bottom'?d:0)});
  return (layout.document.connections||[]).flatMap(edge=>{
    const from=layout.nodes.find(n=>n.object.id===edge.from),to=layout.nodes.find(n=>n.object.id===edge.to);
    if(!from||!to||from.opacity<=0||to.opacity<=0||!from.appearances.some(a=>a.opacity>0)||!to.appearances.some(a=>a.opacity>0)||atMs<edge.showAtMs||(edge.hideAtMs!==undefined&&atMs>=edge.hideAtMs))return [];
    const start=side(from.body,edge.fromSide||'right'),end=side(to.body,edge.toSide||'left');
    const d=(edge.bend??120)*layout.u,c1=control(start,edge.fromSide||'right',d),c2=control(end,edge.toSide||'left',d);
    const ts=[0,1,...extrema(start.x,c1.x,c2.x,end.x),...extrema(start.y,c1.y,c2.y,end.y)];
    const points=ts.map(t=>({x:cubic(start.x,c1.x,c2.x,end.x,t),y:cubic(start.y,c1.y,c2.y,end.y,t)}));
    const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
    const bounds={x,y,width:Math.max(...points.map(p=>p.x))-x,height:Math.max(...points.map(p=>p.y))-y};
    const color=event.elementOverrides?.[edge.from]?.color||event.elementOverrides?.[edge.to]?.color||from.color;
    return [{edge,start,end,c1,c2,bounds,color,opacity:Math.min(from.opacity,to.opacity)*clamp((atMs-edge.showAtMs)/250),u:layout.u}];
  });
};
const boundsCache = new WeakMap<ForegroundEvent,Map<string,GraphicRect>>();
export const getGraphicSceneBounds = (event: ForegroundEvent,W: number,H: number) => {
  const {document}=readGraphicScene(event);if(!document)return null;
  const cacheKey=W+'x'+H,cached=boundsCache.get(event)?.get(cacheKey);if(cached)return cached;
  const times=new Set<number>();
  for(const object of document.objects){
    times.add(object.showAtMs);
    if(object.labelAtMs!==undefined)times.add(object.labelAtMs);
    if(object.hideAtMs!==undefined)times.add(Math.max(object.showAtMs,object.hideAtMs-.001));
    for(let i=0;i<object.poses.length;i++){
      const pose=object.poses[i];times.add(pose.atMs);
      if(!i)continue;
      const prev=object.poses[i-1];
      // Include geometry where body/label extents change with width or height.
      for(let s=1;s<16;s++)times.add(mix(prev.atMs,pose.atMs,s/16));
      if(pose.curve){
        const start=resolveGraphicScene(event,W,H,prev.atMs)!.nodes.find(n=>n.object.id===object.id)!.body;
        const end=resolveGraphicScene(event,W,H,pose.atMs)!.nodes.find(n=>n.object.id===object.id)!.body;
        const u=Math.min(W/document.designWidth,H/document.designHeight),o=event.elementOverrides?.[object.id];
        const dx=(o?.x??0)*W,dy=(o?.y??0)*H;
        const c1={x:pose.curve.c1.x*u+dx,y:pose.curve.c1.y*u+dy},c2={x:pose.curve.c2.x*u+dx,y:pose.curve.c2.y*u+dy};
        for(const axis of ['x','y'] as const){
          const size=axis==='x'?'width':'height';
          for(const factor of [0,.5,1]){
            const d=(end[size]-start[size])*factor;
            for(const t of extrema(start[axis],c1[axis]+d/3,c2[axis]+2*d/3,end[axis]+d))times.add(mix(prev.atMs,pose.atMs,pose.easing==='linear'?t:inverseSmooth(t)));
          }
        }
      }
    }
  }
  for(const edge of document.connections||[]){times.add(edge.showAtMs+250);if(edge.hideAtMs!==undefined)times.add(edge.hideAtMs-.001);}
  const boxes: GraphicRect[]=[];
  for(const t of times){
    const layout=resolveGraphicScene(event,W,H,t)!;
    for(const node of layout.nodes)if(node.opacity>0&&node.appearances.some(a=>a.opacity>0)){
      boxes.push(node.body);
      if(node.labelOpacity>0)boxes.push(node.labelBox);
    }
    for(const edge of resolveGraphicConnections(event,W,H,t))if(edge.opacity>0)boxes.push(edge.bounds);
  }
  const box=unionGraphicRects(boxes),pad=8*Math.min(W/document.designWidth,H/document.designHeight);
  const result={x:(box.x-pad)/W,y:(box.y-pad)/H,width:(box.width+pad*2)/W,height:(box.height+pad*2)/H};
  const cache=boundsCache.get(event)||new Map<string,GraphicRect>();cache.set(cacheKey,result);boundsCache.set(event,cache);
  return result;
};

export const createEmptyGraphicScene = (): GraphicSceneDocument => ({schemaVersion:1,designWidth:2560,designHeight:1440,accentColor:'#4DB6FF',labelSize:54,objects:[{id:'object-1',name:'图形对象',label:'图形对象',showAtMs:0,appearances:[{atMs:0,kind:'document'}],poses:[{atMs:0,x:108,y:340,width:400,height:500}]}]});
