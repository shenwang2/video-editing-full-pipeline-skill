import React from 'react';
import {AbsoluteFill,useCurrentFrame,useVideoConfig} from 'remotion';
import type {ForegroundEvent} from '../types';
import {getProcessTrialLayout,processEase,processProgress,type ProcessNode} from '../processTrialLayout';
import {SemanticGlyph,SceneLibrary,GlyphState} from './TrialVectorAssets';
import {resolveReferenceTemplateStyle} from './EditorialTrial';

export const ProcessTrial:React.FC<{event:ForegroundEvent;durationInFrames:number}>=({event,durationInFrames})=>{
 const frame=useCurrentFrame(),{width,height,fps}=useVideoConfig(),ms=frame*1000/fps;
 const layout=getProcessTrialLayout(event,width,height,ms);
 if(!layout)return null;
 const {nodes,u,color,beats,unfold,align,label}=layout;
 const style=resolveReferenceTemplateStyle(event.payload.templateStyle);
 const prefix=`process-${event.id.replace(/[^a-z0-9]/gi,'')}`;
 const fade=1-processProgress(frame,Math.max(0,durationInFrames-6),6);
 const progress=(at:number,duration=320)=>processProgress(ms,at,duration);
 const text=(x:number,y:number,value:string,size=48,fill='#F4F6F9',anchor:'start'|'middle'|'end'='start',weight=style.primaryWeight)=><text x={x} y={y} fill={fill} textAnchor={anchor} fontSize={size} fontWeight={weight}>{value}</text>;
 const line=(d:string,stroke=color,opacity=1)=><path d={d} fill="none" stroke={stroke} strokeWidth={3*u} strokeLinecap="round" strokeLinejoin="round" opacity={opacity}/>;
 const get=(kind:ProcessNode['kind'])=>nodes.find(n=>n.kind===kind);
 const script=get('script'),bank=get('library'),workflow=get('workflow'),shots=nodes.filter(n=>n.kind==='shot');
 const span=shots.length?{left:Math.min(...shots.map(n=>n.x)),right:Math.max(...shots.map(n=>n.x+n.width)),
  top:Math.min(...shots.map(n=>n.y)),bottom:Math.max(...shots.map(n=>n.y+n.height))}:null;
 const waves=Array.isArray(event.payload.waveform)?event.payload.waveform.map(x=>typeof x==='number'?Math.max(0,Math.min(1,x)):0):[];
 const draw=(n:ProcessNode)=>{
  if(n.opacity<=.001)return null;
  const c=n.color,w=n.baseWidth,h=n.baseHeight;
  const fillProgress=processEase(progress(beats.fill+n.index*100,450));
  return <div key={n.id} data-editable-card-id={n.id} data-editable-card-label={n.text} data-primary-text="true"
   style={{position:'absolute',left:n.x,top:n.y,width:n.width,height:n.height,opacity:n.opacity}}>
   <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{overflow:'visible'}}>
    {n.kind==='heading'?<>
     <rect width="4" height="25" fill={c}/>{text(20,23,String(event.payload.setup??''),22,c,'start',style.eyebrowWeight)}
     {text(0,94,n.text,52)}
    </>:n.kind==='library'?<>
     <svg width="306" height="249"><SceneLibrary color={c} progress={progress(beats.library,580)} id={`${prefix}-library`}/></svg>
     {text(153,292,n.text,48,'#F4F6F9','middle')}
    </>:n.kind==='workflow'?<>
     <rect x="0" y={18*(1-unfold)} width={370+(w-380)} height={152-(152-68)*unfold} rx="18"
      fill={`url(#${prefix}-glass)`} stroke={c} strokeOpacity={.64*(1-unfold)} strokeWidth="1.8" opacity={1-unfold}/>
     <svg x={32*(1-unfold)} y={56*(1-unfold)} width={71-7*unfold} height={71-7*unfold}>
      <SemanticGlyph name="relations" color={c} size={71-7*unfold} draw={1} stroke={style.iconStroke}/>
     </svg>
     {text(128-43*unfold,104-60*unfold,unfold>.55?label('selectedDone','工作流已选'):n.text,40-unfold)}
     <svg x={315+55*unfold} y="0" width={52-4*unfold} height={52-4*unfold}>
      <GlyphState kind="check" color={c} size={52-4*unfold} progress={progress(beats.selected+140,220)} stroke={style.stateStroke}/>
     </svg>
    </>:n.kind==='script'?<>
     <g opacity={1-unfold} transform="scale(1.13)">
      <path d="M15 10H148L195 58V234Q195 250 179 250H15Q0 250 0 234V26Q0 10 15 10Z"
       fill={`url(#${prefix}-paper)`} stroke={c} strokeWidth="2.8"/>
      <path d="M147 11v43q0 8 8 8h39" fill="#254A68" stroke={c} strokeWidth="2"/>
      <path d="M32 99h120M32 126h120M32 153h87M32 194h53" stroke="#BCDDF4" strokeWidth="6" strokeLinecap="round"/>
      <rect x="-5" y="73" width="9" height="100" rx="4" fill={c}/>
     </g>
     <g opacity={1-unfold}>{text(110,340,n.text,48,'#F4F6F9','middle')}</g>
     <g opacity={unfold}>
      {text(0,35,label('script','原文案'),46)}
      <path d={Array.from({length:21},(_,i)=>`M${i*w/20} 78v${i%5===0?18:9}`).join(' ')} stroke="#B7D4EA" strokeOpacity=".6" strokeWidth="2"/>
      <rect x="0" y="112" width={w} height="84" rx="12" fill={`url(#${prefix}-glass)`} stroke={c} strokeWidth="2"/>
      {waves.map((v,i)=>{const hh=8+v*42;return <path key={i} d={`M${20+i*(w-40)/Math.max(1,waves.length-1)} ${154-hh/2}v${hh}`}
       stroke={c} strokeWidth="5" strokeLinecap="round"/>;})}
     </g>
    </>:<>
     <rect width={w} height={h} rx="10" fill={`url(#${prefix}-glass)`} stroke={c} strokeOpacity=".55" strokeWidth="2"/>
     <rect width={w} height={h} rx="10" fill={`url(#${prefix}-film)`} stroke={c} strokeWidth="2" opacity={fillProgress}/>
     <g transform={`translate(${w/2} ${h/2})`} stroke={c} fill="none" strokeWidth="3" strokeLinejoin="round">
      <g fill={fillProgress>.01?c:'none'} fillOpacity={.3*fillProgress}>
       <path d={n.index===0?'M-25 24v-47h50v47zM-25-23l12-11h50v47l-12 11M25-23l12-11':
        n.index===1?'M-47 20h31v-45h31v45h31M-16-25l12-10h31v45l-12 10M15-25l12-10':
        'M-47 28V-8h31v-25h31v25h31v36zM-47-8l12-11h19M15-8l12-11h31v36l-12 11'}/>
      </g>
     </g>
     <path d={`M9 ${h-18}h${w-18}`} stroke={c} strokeWidth="2" opacity={.4*fillProgress}/>
     <rect y={h-5} width={w*fillProgress} height="3" rx="1.5" fill={c} opacity={.8*fillProgress}/>
    </>}
   </svg>
  </div>;
 };
 return <AbsoluteFill style={{pointerEvents:'none',fontFamily:'Microsoft YaHei,Segoe UI,Arial,sans-serif',opacity:fade}}>
  <svg width={width} height={height} style={{position:'absolute',inset:0,overflow:'visible'}}>
   <defs>
    <linearGradient id={`${prefix}-glass`} x2="1" y2="1"><stop stopColor="#030A15" stopOpacity=".86"/><stop offset="1" stopColor="#071423" stopOpacity=".64"/></linearGradient>
    <linearGradient id={`${prefix}-paper`} x2="1" y2=".5"><stop stopColor="#142F49"/><stop offset=".4" stopColor="#0B1C30"/><stop offset="1" stopColor="#112D45"/></linearGradient>
    <linearGradient id={`${prefix}-film`} x2="0" y2="1"><stop stopColor="#143B58"/><stop offset="1" stopColor="#071422"/></linearGradient>
   </defs>
   {script&&bank&&workflow&&bank.opacity>.001&&(()=>{
    const ax=script.x+script.width,bx=bank.x-41*u,ay=script.y+152*u*script.scale,by=bank.y+192*u*bank.scale;
    const c=event.elementOverrides?.[bank.id]?.color||script.color,p=progress(beats.match,600);
    const targetX=workflow.x+workflow.width/2,fromX=bank.x+bank.width/2,fromY=bank.y+bank.height+5*u;
    return <g opacity={bank.opacity}>
     <path d={`M${ax} ${ay}C${(ax+bx)/2} ${ay} ${(ax+bx)/2} ${by} ${bx} ${by}`} fill="none" stroke={c} strokeWidth={3*u}
      pathLength="1" strokeDasharray="1" strokeDashoffset={1-p}/>
     {p>.99&&line(`M${bx-13*u} ${by-8*u}l${13*u} ${8*u} ${-13*u} ${8*u}`,c)}
     <g transform={`translate(${(ax+bx)/2} ${(ay+by)/2-40*u}) scale(${u})`}>{text(0,0,label('match','匹配'),31,'#BED8EC','middle',600)}</g>
     <path d={`M${fromX} ${fromY}V${workflow.y-10*u}H${targetX}`} fill="none" stroke={workflow.color} strokeWidth={3*u}
      pathLength="1" strokeDasharray="1" strokeDashoffset={1-progress(beats.selected-250,280)}/>
     {workflow.opacity>.8&&line(`M${targetX-8*u} ${workflow.y-23*u}l${8*u} ${13*u} ${8*u} ${-13*u}`,workflow.color)}
    </g>;
   })()}
   {span&&script&&(()=>{
    const visible=progress(beats.shots,360),a=progress(beats.align,520),filled=progress(beats.fill,350);
    const c=event.elementOverrides?.[shots[0].id]?.color||script.color;
    const scriptY=script.y+script.height+25*u;
    return <g opacity={visible}>
     <g transform={`translate(${span.left} ${span.top-26*u}) scale(${u})`}>{text(0,0,filled>.5?label('result','辅助画面'):label('shots','镜头计划'),46)}</g>
     <g transform={`translate(${span.right} ${span.top-26*u}) scale(${u})`}>{text(0,0,label('schematic','示意'),24,'#B9CFE2','end',600)}</g>
     <g opacity={a} fill="none" stroke={c} strokeWidth={2*u} strokeDasharray={`${6*u} ${9*u}`}>
      <path d={`M${script.x} ${scriptY}L${span.left} ${span.top-10*u}V${span.bottom+15*u}`}/>
      <path d={`M${script.x+script.width} ${scriptY}L${span.right} ${span.top-10*u}V${span.bottom+15*u}`}/>
     </g>
     <g opacity={a}>
      {line(`M${span.left} ${span.bottom+21*u}v${16*u}H${span.right}v${-16*u}`,c)}
      <g transform={`translate(${(span.left+span.right)/2} ${span.bottom+95*u}) scale(${u})`}>
       {text(0,0,filled>.5?label('done','接回原片 · 边界不变'):label('align','同起点 · 同终点'),40,'#F4F6F9','middle')}
      </g>
     </g>
    </g>;
   })()}
  </svg>
  {nodes.map(draw)}
 </AbsoluteFill>;
};
