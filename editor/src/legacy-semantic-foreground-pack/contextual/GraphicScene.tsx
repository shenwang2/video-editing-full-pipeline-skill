import React from 'react';
import {AbsoluteFill,Img,useCurrentFrame,useVideoConfig} from 'remotion';
import type {EditAsset,ForegroundEvent} from './graphic-scene-model';
import {MetricBar} from './metric-bar';
import {ScreenshotDetail,ChatPanel} from './screen-demonstrations';
import {readGraphicScene,resolveGraphicScene,resolveGraphicConnections,type GraphicKind,type ResolvedGraphicObject} from './graphic-scene-model';

const safeId=(s:string)=>Array.from(s).map(c=>c.codePointAt(0)!.toString(16)).join('-');
const assetPath=(base:string,path:string)=>base+path.split('/').map(encodeURIComponent).join('/');

/** Vector material primitives; no script text, object count, coordinates or beat defaults. */
const GraphicMaterial:React.FC<{kind:GraphicKind;node:ResolvedGraphicObject;unit:number;prefix:string;asset?:EditAsset;assetBaseUrl:string}>=({kind,node,unit,prefix,asset,assetBaseUrl})=>{
  const scale=unit*node.scale,w=node.body.width/scale,h=node.body.height/scale,c=node.color;
  const pad=Math.max(9,Math.min(w,h)*.055),fold=Math.min(62,w*.16,h*.16);
  const paper=`M14 2H${w-fold}L${w-2} ${fold}V${h-14}Q${w-2} ${h-2} ${w-16} ${h-2}H16Q2 ${h-2} 2 ${h-16}V16Q2 2 14 2Z`;
  return <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{overflow:'visible'}}>
    <defs>
      <linearGradient id={`${prefix}-paper`} x1="0" y1="0" x2=".9" y2="1"><stop stopColor="#F2F8FF"/><stop offset=".5" stopColor="#D9E8F6"/><stop offset="1" stopColor="#AFC6DE"/></linearGradient>
      <linearGradient id={`${prefix}-glass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#091A30" stopOpacity=".82"/><stop offset=".6" stopColor="#091322" stopOpacity=".54"/><stop offset="1" stopColor={c} stopOpacity=".2"/></linearGradient>
      <linearGradient id={`${prefix}-edge`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#DBF2FF"/><stop offset=".35" stopColor={c}/><stop offset="1" stopColor={c} stopOpacity=".35"/></linearGradient>
    </defs>
    {kind==='focusBox'?<g fill="none" stroke={c} opacity={node.reveal}>
      <rect x="2" y="2" width={Math.max(1,w-4)} height={Math.max(1,h-4)} rx="2" strokeWidth=".8" strokeOpacity=".5"/>
      <path d={`M2 17V2H17 M${w-17} 2H${w-2}V17 M2 ${h-17}V${h-2}H17 M${w-17} ${h-2}H${w-2}V${h-17}`}
        strokeWidth="2.5" strokeLinecap="square"/>
    </g>:kind==='focusTag'?<g opacity={node.reveal}>
      <rect x="1" y="1" width={Math.max(1,w-2)} height={Math.max(1,h-2)} rx="4" fill="#07131F" fillOpacity=".88" stroke={c} strokeWidth="1" strokeOpacity=".65"/>
      <path d={`M2 10V${h-10}`} stroke={c} strokeWidth="3"/>
    </g>:kind==='focusRing'?<ellipse
      cx={w/2} cy={h/2} rx={Math.max(1,w/2-3)} ry={Math.max(1,h/2-3)}
      fill="none" stroke={c} strokeWidth="4" strokeLinecap="round"
      pathLength="1" strokeDasharray="1" strokeDashoffset={1-node.reveal}
    />:kind==='crossMark'?<g fill="none" stroke={c} strokeWidth={Math.min(w,h)*.085} strokeLinecap="round">
      {/* Two sequential strokes; reveal is authored per object, never tied to script text. */}
      <path d={`M${w*.18} ${h*.18}L${w*.82} ${h*.82}`} pathLength="1" strokeDasharray="1" strokeDashoffset={1-Math.min(1,node.reveal*2)}/>
      <path d={`M${w*.82} ${h*.18}L${w*.18} ${h*.82}`} pathLength="1" strokeDasharray="1" strokeDashoffset={1-Math.max(0,node.reveal*2-1)}/>
    </g>:kind==='document'?<>
      <path d={paper} transform="translate(5 6)" fill="#091526" fillOpacity=".38"/>
      <path d={paper} fill={`url(#${prefix}-paper)`} stroke="#BBD6E8" strokeWidth="2"/>
      <path d={`M${w-fold} 3v${fold-9}q0 6 6 6h${fold-10}`} fill="#A6C5DF" stroke="#FFFFFF" strokeOpacity=".65" strokeWidth="2"/>
      <path d={`M${pad*1.4} ${h*.1}h${w*.32}`} stroke="#173652" strokeWidth="11" strokeLinecap="round"/>
      {[.24,.47,.70].map((y,i)=><g key={y}>
        <rect x={pad*1.3} y={h*y-10} width="7" height={h*.135} rx="3" fill={c}/>
        {[0,.052,.104].map((dy,j)=><path key={dy} d={`M${pad*2.2} ${h*(y+dy)}h${w*(j===2?.42:.67)}`} stroke="#3B5975" strokeWidth={j===0?6:4} strokeOpacity={j===0?.8:.43} strokeLinecap="round"/>) }
        {i<2?<path d={`M${pad} ${h*(y+.18)}h${w-pad*2}`} stroke={c} strokeWidth="2" strokeDasharray="6 9" opacity={node.reveal}/>:null}
      </g>)}
    </>:kind==='passage'?<>
      <path d={`M3 11 16 3H${w-7}V${h-13}L${w-16} ${h-3}H3Z`} fill="#1C3B57" fillOpacity=".72" stroke={c} strokeWidth="1.5"/>
      <rect x="3" y="3" width={w-17} height={h-14} rx="9" fill={`url(#${prefix}-paper)`} stroke="#D7EBFC" strokeWidth="1.7"/>
      <path d={`M${pad*1.2} ${pad}v${h-pad*2-14}`} stroke={c} strokeWidth="7" strokeLinecap="round"/>
      {[.31,.53,.75].map((y,i)=><path key={y} d={`M${pad*2.4} ${h*y}h${w*(i===2?.48:.67)}`} stroke="#244766" strokeOpacity={i===0?.87:.47} strokeWidth={i===0?6:4} strokeLinecap="round"/>)}
    </>:kind==='image'?<>
      <path d={`M8 18 ${w-6} 5V${h-14}L${w-18} ${h-3}H8Z`} fill="#07192D" stroke={c} strokeWidth="2"/>
      <rect x="2" y="2" width={w-16} height={h-16} rx="10" fill={`url(#${prefix}-glass)`} stroke={`url(#${prefix}-edge)`} strokeWidth="2.5"/>
      {asset?.status==='ready'&&asset.type==='image'?<foreignObject x="8" y="8" width={w-28} height={h-28}>
        <Img src={assetPath(assetBaseUrl,asset.path)} style={{width:'100%',height:'100%',objectFit:node.object.assetFit??'cover',borderRadius:5}}/>
      </foreignObject>:<g fill="none" stroke={c} strokeWidth="3.8" strokeLinejoin="round">
        <rect x={w*.24} y={h*.18} width={w*.5} height={h*.60} rx="9"/>
        <circle cx={w*.61} cy={h*.36} r={h*.065}/>
        <path d={`M${w*.27} ${h*.69}l${w*.16} ${-h*.24} ${w*.12} ${h*.14} ${w*.075} ${-h*.10} ${w*.10} ${h*.20}`}/>
      </g>}
      <path d={`M20 ${h-8}H${w*.30}`} stroke={c} strokeWidth="3" strokeLinecap="round"/>
    </>:kind==='diagram'?<g strokeLinejoin="round" strokeLinecap="round">
      <path d={`M${w*.09} ${h*.77} ${w*.27} ${h*.89} ${w*.90} ${h*.71} ${w*.72} ${h*.59}Z`} fill={`url(#${prefix}-glass)`} stroke={c} strokeOpacity=".4" strokeWidth="1.4"/>
      <g fill="none" stroke={c} strokeWidth="5">
        <path d={`M${w*.24} ${h*.18} ${w*.10} ${h*.43} ${w*.24} ${h*.68}M${w*.76} ${h*.18} ${w*.9} ${h*.43} ${w*.76} ${h*.68}`}/>
        <path d={`M${w*.53} ${h*.15} ${w*.43} ${h*.71}`} strokeWidth="4" opacity=".7"/>
      </g>
      <path d={`M${w*.39} ${h*.26} ${w*.55} ${h*.15} ${w*.69} ${h*.27}V${h*.56}L${w*.54} ${h*.70} ${w*.39} ${h*.57}Z`} fill={`url(#${prefix}-glass)`} stroke="#C9E9FF" strokeWidth="2.5"/>
      <path d={`M${w*.39} ${h*.26} ${w*.54} ${h*.39} ${w*.69} ${h*.27}M${w*.54} ${h*.39}V${h*.70}`} fill="none" stroke={c} strokeWidth="3"/>
    </g>:kind==='film'?<g strokeLinejoin="round">
      <path d={`M${w*.12} ${h*.12} ${w*.77} ${h*.03} ${w*.90} ${h*.14}V${h*.81}L${w*.25} ${h*.96} ${w*.12} ${h*.84}Z`} fill={`url(#${prefix}-glass)`} stroke={`url(#${prefix}-edge)`} strokeWidth="2.6"/>
      <path d={`M${w*.12} ${h*.12} ${w*.25} ${h*.24} ${w*.90} ${h*.14}M${w*.25} ${h*.24}V${h*.96}`} fill="none" stroke={c} strokeWidth="2"/>
      {[0,1,2,3,4,5].map(i=><path key={i} d={`M${w*(.32+i*.084)} ${h*(.29-i*.014)}v${h*.06}m0 ${h*.45}v${h*.06}`} stroke={c} strokeOpacity=".78" strokeWidth={Math.max(5,w*.017)}/>)}
      <path d={`M${w*.50} ${h*.43} ${w*.50} ${h*.73} ${w*.66} ${h*.55}Z`} fill={c} fillOpacity=".24" stroke={c} strokeWidth="3"/>
    </g>:null}
  </svg>;
};

export const GraphicScene:React.FC<{event:ForegroundEvent;assets:EditAsset[];assetBaseUrl:string}>=({event,assets,assetBaseUrl})=>{
  const frame=useCurrentFrame(),{width,height,fps}=useVideoConfig(),ms=frame*1000/fps;
  const parsed=readGraphicScene(event);
  if(!parsed.document)throw new Error(`GraphicScene: ${parsed.errors.join('; ')}`);
  const layout=resolveGraphicScene(event,width,height,ms)!;
  const fontFamily=layout.document.fontFamily||'Microsoft YaHei, Segoe UI, Arial, sans-serif';
  return <AbsoluteFill style={{pointerEvents:'none'}}>
    <svg width={width} height={height} style={{position:'absolute',inset:0,overflow:'visible'}}>
      {resolveGraphicConnections(event,width,height,ms).map(({edge,start,end,c1,c2,color,opacity,u})=>{
        const d=`M${start.x} ${start.y}C${c1.x} ${c1.y},${c2.x} ${c2.y},${end.x} ${end.y}`;
        const angle=Math.atan2(end.y-c2.y,end.x-c2.x),length=10*u;
        const arrow=`M${end.x-Math.cos(angle-.45)*length} ${end.y-Math.sin(angle-.45)*length}L${end.x} ${end.y}L${end.x-Math.cos(angle+.45)*length} ${end.y-Math.sin(angle+.45)*length}`;
        return <g key={edge.id} opacity={opacity} fill="none" stroke={color} strokeWidth={2.5*u} strokeLinecap="round" strokeLinejoin="round">
          <path d={d} strokeDasharray={edge.dashed?`${7*u} ${9*u}`:undefined}/>{edge.arrow?<path d={arrow}/>:null}
        </g>;
      })}
    </svg>
    {[...layout.nodes].sort((a,b)=>(a.object.zIndex??0)-(b.object.zIndex??0)).map(node=>{
      if(node.opacity<=0||!node.appearances.length)return null;
      const {body,labelBox,object}=node;
      const bounds=node.labelOpacity>0?node.bounds:body;
      const prefix='free-'+safeId(event.id)+'-'+safeId(object.id);
      const asset=object.assetId?assets.find(a=>a.id===object.assetId):undefined;
      return <div key={object.id} data-editable-card-id={object.id} data-editable-card-label={object.name}
        data-graphic-object-id={object.id} data-primary-text="true"
        style={{position:'absolute',left:bounds.x,top:bounds.y,width:bounds.width,height:bounds.height,opacity:node.opacity}}>
        <div style={{position:'absolute',left:body.x-bounds.x,top:body.y-bounds.y,width:body.width,height:body.height}}>
          {node.appearances.map(({kind,opacity},index)=>opacity>0?<div key={kind+index} style={{position:'absolute',inset:0,opacity,filter:'drop-shadow(0 3px 4px rgba(0,8,18,.24))'}}>
            {kind==='screenshotDetail' ? <ScreenshotDetail spec={object.screenshot!} src={asset?.status==='ready'&&asset.type==='image'?assetPath(assetBaseUrl,asset.path):undefined} atMs={ms} width={body.width} height={body.height} color={node.color}/>
            : kind==='chatPanel' ? <ChatPanel spec={object.chat!} atMs={ms} width={body.width} height={body.height} color={node.color} fontFamily={fontFamily}/>
            : kind==='metricBar' ? <MetricBar spec={object.metric!} atMs={ms} color={node.color} fontFamily={fontFamily}/> : <GraphicMaterial kind={kind} node={node} unit={layout.u} prefix={prefix+'-'+kind} asset={asset} assetBaseUrl={assetBaseUrl}/>}
          </div>:null)}
          {object.assetId&&node.appearances.some(a=>a.kind==='image'&&a.opacity>0)&&(!asset||asset.status!=='ready'||asset.type!=='image')?<div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',fontFamily,fontSize:24*layout.u*node.scale,color:'#fff',background:'rgba(12,20,32,.72)'}}>待替换图片 · {object.assetId}</div>:null}
        </div>
        {node.labelOpacity>0?<div style={{position:'absolute',left:labelBox.x-bounds.x,top:labelBox.y-bounds.y,width:labelBox.width,height:labelBox.height,display:'flex',justifyContent:'center',alignItems:'center',fontFamily,fontSize:node.fontSize,fontWeight:850,lineHeight:1.25,letterSpacing:0,whiteSpace:'nowrap',color:object.labelPosition==='inside'&&node.appearances.some(a=>a.kind==='document'||a.kind==='passage')?'#183951':'#F4F8FE',opacity:node.labelOpacity,textShadow:object.labelPosition==='inside'&&!object.labelShadow?'none':'0 2px 4px rgba(0,0,0,.72), 0 0 12px rgba(0,0,0,.22)'}}>{object.label}</div>:null}
      </div>;
    })}
  </AbsoluteFill>;
};
