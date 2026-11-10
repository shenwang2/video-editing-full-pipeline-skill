import React from 'react';
import type {EditAsset,ForegroundEvent} from './types';
import {isGraphicScene,readGraphicScene,type GraphicObject,type GraphicSceneDocument} from './graphicSceneModel';
import {validateMetricBar,type MetricBarSpec} from './legacy-semantic-foreground-pack/contextual/metric-bar';

export const GraphicSceneInspector:React.FC<{
  event:ForegroundEvent;selectedObjectId:string|null;assets:EditAsset[];
  onChange:(payload:Record<string,unknown>)=>void;
}>=({event,selectedObjectId,assets,onChange})=>{
  if(!isGraphicScene(event))return null;
  const {document,errors}=readGraphicScene(event);
  if(!document)return <p role="alert">自由场景数据错误：{errors.join('；')}</p>;
  const object=document.objects.find(o=>o.id===selectedObjectId);
  const change=(patch:Partial<GraphicObject>)=>{
    if(!object)return;
    const next:GraphicSceneDocument={...document,objects:document.objects.map(o=>o.id===object.id?{...o,...patch}:o)};
    onChange({...event.payload,graphicScene:next});
  };
  const pictures=assets.filter(a=>a.type==='image');
  const changeMetric=(patch:Partial<MetricBarSpec>)=>{
    if(!object?.metric)return;
    const metric={...object.metric,...patch};
    if(!validateMetricBar(metric).length)change({metric});
  };
  return <section style={{display:'grid',gap:10,padding:'12px 0',borderTop:'1px solid #293749'}} aria-label="自由场景对象编辑">
    <strong>实验 · 对象编排</strong>
    <small>对象数量、路径、形态与时机来自项目数据，不套固定布局。</small>
    {!object?<p style={{fontSize:12,color:'#aab9cc'}}>在画布中选择一个内部对象，可改文字、绑定图片；位置、大小和颜色仍使用上面的内部编辑控件。</p>:<>
      <span style={{fontSize:12,color:'#aab9cc'}}>{object.name} · {object.id}</span>
      {object.metric?<>
        <label>指标名称<input aria-label="累积指标名称" value={object.metric.label} onChange={e=>changeMetric({label:e.target.value})}/></label>
        <label>起始数值<input aria-label="累积起始数值" type="number" min="0" value={object.metric.fromValue} onChange={e=>changeMetric({fromValue:Number(e.target.value)})}/></label>
        <label>到达数值<input aria-label="累积到达数值" type="number" min="1" value={object.metric.toValue} onChange={e=>changeMetric({toValue:Number(e.target.value)})}/></label>
        <label>数值含义<select aria-label="累积数值含义" value={object.metric.valueMode} onChange={e=>changeMetric({valueMode:e.target.value as MetricBarSpec['valueMode']})}><option value="exact">确切数值</option><option value="atLeast">达到或超过（+）</option></select></label>
        <label>开始累积（毫秒）<input aria-label="开始累积毫秒" type="number" min="0" value={object.metric.startMs} onChange={e=>changeMetric({startMs:Number(e.target.value)})}/></label>
        <label>完成累积（毫秒）<input aria-label="完成累积毫秒" type="number" min="1" value={object.metric.completeMs} onChange={e=>changeMetric({completeMs:Number(e.target.value)})}/></label>
        <small>时间相对这一段开始；中途数字表示动画累积过程。</small>
      </>:<>
      <label>对象文字<input aria-label="自由对象文字" value={object.label} onChange={e=>change({label:e.target.value})}/></label>
      <label>文字字号<input aria-label="自由对象字号" type="number" min="12" max="160" step="1" value={object.labelSize??document.labelSize??54} onChange={e=>{const n=Number(e.target.value);if(n>=12&&n<=160)change({labelSize:n});}}/></label>
      <span style={{fontSize:12,color:'#aab9cc'}}>图片素材（在 image 形态时显示）</span>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        <button type="button" aria-pressed={!object.assetId} onClick={()=>change({assetId:undefined})}>使用矢量图形</button>
        {pictures.map(asset=><button key={asset.id} type="button" aria-pressed={object.assetId===asset.id} onClick={()=>change({assetId:asset.id})}>{asset.label||asset.id}</button>)}
      </div>
      </>}
      <small>替换文件请用编辑台原有的素材区；绑定和画面数据一起保存。动作时间在下方内容 JSON 中编辑，单位为事件内毫秒。</small>
    </>}
  </section>;
};
