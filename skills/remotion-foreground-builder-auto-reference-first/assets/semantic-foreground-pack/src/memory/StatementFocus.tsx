import React from 'react';
import {AbsoluteFill,interpolate,Easing,useCurrentFrame,useVideoConfig} from 'remotion';
import {getStatementFocusLayout,type StatementFocusCopy} from '../lib/statement-focus-layout';
import type {ForegroundPlacement} from '../lib/layout';

const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const ease=Easing.bezier(.16,1,.3,1);

/** A typographic claim variant: a quiet lead, then focused words settle and underline. */
export const StatementFocus:React.FC<StatementFocusCopy&{placement:ForegroundPlacement;accentColor:string;showAtInFrames:number;exitAtInFrames?:number;exitInFrames:number}>=props=>{
  const frame=useCurrentFrame(),{width,height}=useVideoConfig();
  const {u,rows,underlines,highlight,bounds}=getStatementFocusLayout({...props,width,height});
  const t=frame-props.showAtInFrames;
  const fade=props.exitAtInFrames===undefined?1:1-interpolate(frame,[props.exitAtInFrames,props.exitAtInFrames+props.exitInFrames],[0,1],clamp);
  const focus=interpolate(t,[15,28],[0,1],{...clamp,easing:ease});
  const sweep=interpolate(t,[18,34],[0,1],{...clamp,easing:ease});
  return <AbsoluteFill data-foreground-overlay-root="true" style={{background:'transparent',pointerEvents:'none',fontFamily:'"Microsoft YaHei", "Segoe UI", Arial, sans-serif'}}>
    <div data-content-sized-surface="statement-focus" data-statement-focus="true" style={{position:'absolute',left:bounds.x,top:bounds.y,width:bounds.width,height:bounds.height,opacity:fade}}>
      {rows.map((row,ri)=>{
        const isMain=row.kind==='main',entrance=interpolate(t,[isMain?5:0,isMain?21:12],[0,1],{...clamp,easing:ease});
        return <div key={ri} data-primary-text={isMain?'true':undefined} style={{position:'absolute',left:row.x,top:row.y,width:row.width+2*u,height:row.height,fontSize:row.fontSize,lineHeight:`${row.height}px`,letterSpacing:row.spacing,whiteSpace:'pre',fontWeight:isMain?950:650,color:isMain?'#F4F8FC':'#CFD9E0',opacity:entrance,transform:`translateY(${(1-entrance)*(isMain?14:7)*u}px)`,textShadow:`0 ${2*u}px ${5*u}px rgba(0,5,12,.88)`}}>
          {isMain?Array.from(row.text).map((char,index)=>{
            const accented=Boolean(highlight)&&row.start+index<highlight.length;
            const land=interpolate(t,[5+index*.65,18+index*.65],[0,1],{...clamp,easing:ease});
            return <span key={index} style={{position:'relative',display:'inline-block',opacity:land,transform:`translateY(${(1-land)*10*u}px)`}}>{char}{accented?<span aria-hidden="true" style={{position:'absolute',inset:0,color:props.accentColor,opacity:focus,textShadow:`0 0 ${10*u}px ${props.accentColor}40`}}>{char}</span>:null}</span>;
          }):row.text}
        </div>;
      })}
      {underlines.map((line,i)=><div key={i} data-statement-underline="true" style={{position:'absolute',left:line.x,top:line.y,width:line.width,height:line.height,borderRadius:99,background:props.accentColor,opacity:.72*focus,transform:`scaleX(${sweep})`,transformOrigin:'left center',boxShadow:`0 0 ${9*u}px ${props.accentColor}50`}}/>)}
    </div>
  </AbsoluteFill>;
};
