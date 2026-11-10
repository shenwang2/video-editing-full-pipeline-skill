import {estimateTextWidth} from './content-sizing';
import {getAlignedX,getForegroundZone,type ForegroundPlacement} from './layout';

export type StatementFocusCopy = {headline:string;highlight?:string;setup?:string;payoff?:string};
type Row = {kind:'setup'|'lead'|'main'|'payoff';text:string;start:number;x:number;y:number;width:number;height:number;fontSize:number;spacing:number};

/** The renderer and edit handles consume one stable, content-sized layout. */
export function getStatementFocusLayout({width,height,placement,...copy}:StatementFocusCopy&{width:number;height:number;placement:ForegroundPlacement}) {
  const zone=getForegroundZone({width,height,placement});
  const u=Math.min(zone.width/700,Math.max(.52,Math.min(width/1920,height/1080,1.4)));
  const maxWidth=680*u,pad=5*u,rows:Row[]=[];
  const hit=copy.highlight?copy.headline.indexOf(copy.highlight):-1;
  const lead=hit>0?copy.headline.slice(0,hit).trim():'';
  const main=hit>0?copy.headline.slice(hit):copy.headline;
  const highlight=hit>=0?copy.highlight||'':'';
  let y=pad;
  const add=(kind:Row['kind'],text:string,size:number,gap:number)=>{
    if(!text)return;
    const fontSize=size*u,spacing=(kind==='main'?2:1)*u;
    const tokens=text.match(/[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*|[^\r\n]|\n/gu)||[];
    let line='',start=0;
    const flush=()=>{
      if(!line)return;
      const h=fontSize*(kind==='main'?1.18:1.25);
      rows.push({kind,text:line,start,x:pad,y,width:estimateTextWidth(line,fontSize,spacing)+spacing,height:h,fontSize,spacing});
      start+=line.length;y+=h+(kind==='main'?10*u:0);line='';
    };
    for(const token of tokens){
      if(token==='\n'){flush();start++;continue;}
      if(line && estimateTextWidth(line+token,fontSize,spacing)>maxWidth)flush();
      line+=token;
    }
    flush();y+=gap*u;
  };
  add('setup',copy.setup||'',28,10);
  add('lead',lead,48,9);
  add('main',main,88,0);
  const mainRows=rows.filter(r=>r.kind==='main');
  const underlines=highlight?mainRows.flatMap(r=>{
    const length=Math.max(0,Math.min(r.text.length,highlight.length-r.start));
    return length?[{x:pad,y:r.y+r.height+3*u,width:estimateTextWidth(r.text.slice(0,length),r.fontSize,r.spacing),height:4*u}]:[];
  }):[];
  y+=highlight?2*u:0;
  if(copy.payoff){y+=14*u;add('payoff',copy.payoff,28,0);}
  const w=Math.max(1,...rows.map(r=>r.width))+2*pad,h=Math.max(1,y+pad);
  const x=getAlignedX({zone,itemWidth:w,placement});
  return {u,rows,underlines,highlight,main,bounds:{x,y:zone.y+(zone.height-h)/2,width:w,height:h}};
}
