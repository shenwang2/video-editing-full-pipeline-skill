import React from 'react';
import {Img} from 'remotion';

export type PixelCrop = {x:number;y:number;width:number;height:number};
export type ScreenshotDetailSpec = {
  sourceWidth:number;sourceHeight:number;from:PixelCrop;to:PixelCrop;
  zoomStartMs:number;zoomEndMs:number;focus?:PixelCrop;focusAtMs?:number;
};
export type ChatPanelSpec = {
  appName:string;title:string;prompt:string;status:string;
  typeStartMs:number;typeEndMs:number;sendAtMs:number;
};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const screenshotTransform=(spec:ScreenshotDetailSpec,atMs:number,width:number,height:number)=>{
  const t=clamp((atMs-spec.zoomStartMs)/Math.max(1,spec.zoomEndMs-spec.zoomStartMs));
  const p=t*t*(3-2*t);
  const crop=Object.fromEntries(['x','y','width','height'].map(k=>[k,spec.from[k as keyof PixelCrop]+(spec.to[k as keyof PixelCrop]-spec.from[k as keyof PixelCrop])*p])) as PixelCrop;
  const scale=Math.min(width/crop.width,height/crop.height);
  return {scale,left:(width-crop.width*scale)/2-crop.x*scale,top:(height-crop.height*scale)/2-crop.y*scale};
};
export const ScreenshotDetail:React.FC<{spec:ScreenshotDetailSpec;src?:string;atMs:number;width:number;height:number;color:string}>=({spec,src,atMs,width,height,color})=>{
  const m=screenshotTransform(spec,atMs,width,height),focus=spec.focus;
  const focusOpacity=clamp((atMs-(spec.focusAtMs??spec.zoomEndMs))/180);
  return <div style={{position:'absolute',inset:0,overflow:'hidden',borderRadius:16,background:'#0C121B',boxShadow:`0 0 0 2px ${color}99,0 18px 50px #0006`}}>
    {src?<Img src={src} style={{position:'absolute',maxWidth:'none',width:spec.sourceWidth*m.scale,height:spec.sourceHeight*m.scale,left:m.left,top:m.top}}/>:<div style={{color:'#fff',padding:30}}>待替换截图</div>}
    {focus&&focusOpacity>0?<div style={{position:'absolute',left:m.left+focus.x*m.scale,top:m.top+focus.y*m.scale,width:focus.width*m.scale,height:focus.height*m.scale,boxSizing:'border-box',border:`3px solid ${color}`,borderRadius:9,boxShadow:`0 0 18px ${color}55`,opacity:focusOpacity}}/>:null}
  </div>;
};

export const ChatPanel:React.FC<{spec:ChatPanelSpec;atMs:number;width:number;height:number;color:string;fontFamily:string}>=({spec,atMs,width,height,color,fontFamily})=>{
  const u=width/648, sent=atMs>=spec.sendAtMs;
  const letters=Array.from(spec.prompt),progress=clamp((atMs-spec.typeStartMs)/Math.max(1,spec.typeEndMs-spec.typeStartMs));
  const typed=sent?spec.prompt:letters.slice(0,Math.floor(letters.length*progress)).join('');
  const arrow=<svg width={24*u} height={24*u} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V4m-7 7 7-7 7 7"/></svg>;
  return <div style={{position:'absolute',inset:0,boxSizing:'border-box',border:`${u}px solid #47505B`,borderRadius:18*u,overflow:'hidden',background:'#17191D',color:'#F3F4F6',fontFamily,boxShadow:`0 ${12*u}px ${36*u}px #0006`}}>
    <div style={{height:60*u,borderBottom:`${u}px solid #34373F`,display:'flex',alignItems:'center',gap:12*u,padding:`0 ${24*u}px`,boxSizing:'border-box'}}>
      <svg width={26*u} height={26*u} viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 7-7 7 7 7m10-14 7 7-7 7m-4-15-2 16"/></svg>
      <span style={{fontSize:24*u,fontWeight:700}}>{spec.appName}</span>
      <span style={{fontSize:19*u,color:'#A9ADB7',marginLeft:6*u}}>{spec.title}</span>
      <span style={{marginLeft:'auto',fontSize:16*u,color:'#9399A4'}}>模拟操作</span>
    </div>
    <div style={{position:'absolute',left:24*u,right:24*u,top:80*u,bottom:22*u}}>
      <div style={{position:'absolute',right:0,left:sent?36*u:0,top:0,minHeight:116*u,boxSizing:'border-box',padding:`${18*u}px ${22*u}px`,paddingRight:sent?22*u:64*u,border:`${u}px solid ${sent?'#42474F':'#69727F'}`,borderRadius:18*u,background:sent?'#30343B':'#202329',fontSize:28*u,lineHeight:1.48,whiteSpace:'pre-wrap'}}>
        {typed}{!sent?<span style={{color,opacity:Math.floor(atMs/320)%2?1:.3}}>▏</span>:null}
        {!sent?<div style={{position:'absolute',right:15*u,bottom:15*u,width:36*u,height:36*u,display:'grid',placeItems:'center',borderRadius:'50%',background:progress>=1?'#E9EDF2':'#454B55',color:'#17191D'}}>{arrow}</div>:null}
      </div>
      {sent?<div style={{position:'absolute',left:0,top:148*u,display:'flex',alignItems:'center',gap:12*u,fontSize:25*u,color:'#CED4DC',opacity:clamp((atMs-spec.sendAtMs)/160)}}>
        <span style={{display:'block',width:10*u,height:10*u,borderRadius:'50%',background:color,opacity:.55+.45*Math.sin(atMs/200)**2}}/>{spec.status}
      </div>:null}
    </div>
  </div>;
};
