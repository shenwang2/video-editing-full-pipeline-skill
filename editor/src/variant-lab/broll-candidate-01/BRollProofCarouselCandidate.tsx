import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const evidence = [
  {src: 'variant-lab/broll-skill-repository.png', number: '01', label: '配置说明'},
  {src: 'variant-lab/broll-template-repository.png', number: '02', label: '模板仓库'},
] as const;

export const BRollProofCarouselCandidate: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = Math.min(spring({frame, fps, config: {damping: 20, stiffness: 140, mass: 0.8}}), 1);
  const secondReveal = interpolate(frame, [2.25 * fps, 2.72 * fps], [0, 1], {
    ...clamp,
    easing: (value) => 1 - Math.pow(1 - value, 4),
  });
  const activeIndex = secondReveal > 0.55 ? 1 : 0;

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#17191d', fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif'}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 64% 43%, rgba(232,184,109,.10), transparent 36%), linear-gradient(120deg, rgba(255,255,255,.025), transparent 48%)'}} />
      <div style={{position: 'absolute', left: 80, top: 72, color: 'rgba(255,255,255,.34)', fontSize: 16, fontWeight: 760, letterSpacing: 4}}>B-ROLL STACK · 候选变体</div>

      <div style={{position: 'absolute', left: 244, top: 100, width: 792, height: 516, opacity: enter, translate: `0px ${(1 - enter) * 24}px`, scale: 0.975 + enter * 0.025}}>
        <div style={{position: 'absolute', left: 8, right: 8, top: 54, bottom: 38, borderRadius: 23, background: 'rgba(232,184,109,.17)', filter: 'blur(28px)', opacity: .8}} />

        <div style={{height: 76, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'}}>
          <div>
            <div style={{color: '#e8b86d', fontSize: 14, fontWeight: 800, letterSpacing: 3}}>真实证据</div>
            <div style={{marginTop: 6, color: '#f7f4ee', fontSize: 34, lineHeight: 1, fontWeight: 850, letterSpacing: '-.04em'}}>两份材料，逐一验证</div>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, paddingTop: 5, color: 'rgba(255,255,255,.42)', fontSize: 13, fontVariantNumeric: 'tabular-nums'}}>
            <b style={{color: '#f1cb8e', fontSize: 18}}>0{activeIndex + 1}</b>
            <span>/ 02</span>
          </div>
        </div>

        <div style={{position: 'relative', height: 376, overflow: 'hidden', borderRadius: 15, background: '#090b0e', border: '1px solid rgba(255,255,255,.13)', boxShadow: '0 24px 65px rgba(0,0,0,.46), inset 0 1px rgba(255,255,255,.06)'}}>
          <Img src={staticFile(evidence[0].src)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top'}} />
          <Img src={staticFile(evidence[1].src)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', clipPath: `inset(0 ${(1 - secondReveal) * 100}% 0 0)`, filter: `brightness(${0.9 + secondReveal * 0.1})`}} />
          <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#e8b86d', boxShadow: '0 0 18px rgba(232,184,109,.75)'}} />
          <div style={{position: 'absolute', right: 14, top: 14, padding: '7px 11px', borderRadius: 8, background: 'rgba(8,10,14,.76)', border: '1px solid rgba(232,184,109,.36)', color: '#fff7e9', fontSize: 13, fontWeight: 760, backdropFilter: 'blur(12px)'}}>
            {evidence[activeIndex].label}
          </div>
        </div>

        <div style={{height: 64, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end'}}>
          {evidence.map((item, index) => {
            const selected = index === activeIndex;
            return (
              <div key={item.number} style={{position: 'relative', height: 43, display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px', color: selected ? '#f6f1e8' : 'rgba(255,255,255,.35)', fontSize: 14, fontWeight: 700}}>
                <b style={{color: selected ? '#e8b86d' : 'rgba(232,184,109,.32)', fontSize: 12}}>{item.number}</b>
                <span>{item.label}</span>
                <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, borderRadius: 99, background: 'rgba(255,255,255,.08)', overflow: 'hidden'}}>
                  <div style={{width: selected ? '100%' : '0%', height: '100%', background: '#e8b86d', boxShadow: '0 0 10px rgba(232,184,109,.6)'}} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
