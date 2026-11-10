import React from 'react';
import {Img, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const items = [
  {src: 'variant-lab/broll-skill-repository.png', number: '01', label: '配置说明'},
  {src: 'variant-lab/broll-template-repository.png', number: '02', label: '模板仓库'},
  {src: 'variant-lab/broll-operation-proof.png', number: '03', label: '实际操作'},
] as const;

export const BRollEvidenceTrackCandidate: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = Math.min(spring({frame, fps, config: {damping: 18, stiffness: 130, mass: 0.78}}), 1);
  const moveOne = interpolate(frame, [1.65 * fps, 2.25 * fps], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.2, 0.88, 0.2, 1),
  });
  const moveTwo = interpolate(frame, [3.55 * fps, 4.18 * fps], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.2, 0.88, 0.2, 1),
  });
  const railPosition = moveOne + moveTwo;
  const active = railPosition < 0.5 ? 0 : railPosition < 1.5 ? 1 : 2;

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#17191d', fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif'}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 48%, rgba(232,184,109,.12), transparent 42%)'}} />
      <div style={{position: 'absolute', left: 76, top: 62, right: 76, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', opacity: enter}}>
        <div>
          <div style={{color: '#e8b86d', fontSize: 14, fontWeight: 800, letterSpacing: 3}}>真实证据组</div>
          <div style={{marginTop: 6, color: '#f7f4ee', fontSize: 34, lineHeight: 1, fontWeight: 850, letterSpacing: '-.04em'}}>三份素材，依次核验</div>
        </div>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 7, color: 'rgba(255,255,255,.33)', fontVariantNumeric: 'tabular-nums'}}>
          <b style={{color: '#f1c781', fontSize: 25}}>0{active + 1}</b>
          <span style={{fontSize: 13}}>/ 03</span>
        </div>
      </div>

      <div style={{position: 'absolute', left: 0, right: 0, top: 148, height: 444, opacity: enter, translate: `0px ${(1 - enter) * 24}px`}}>
        {items.map((item, index) => {
          const relative = index - railPosition;
          const distance = Math.abs(relative);
          const cardScale = interpolate(distance, [0, 1, 1.55], [1, 0.78, 0.68], clamp);
          const cardOpacity = interpolate(distance, [0, 1.3, 1.75], [1, 0.58, 0], clamp);
          const cardRotate = interpolate(relative, [-1, 0, 1], [-4.5, 0, 4.5], clamp);
          const cardLeft = 280 + relative * 660;
          const activeStrength = interpolate(distance, [0, 0.65], [1, 0], clamp);
          return (
            <div key={item.number} style={{position: 'absolute', left: cardLeft, top: 0, width: 720, height: 420, borderRadius: 17, overflow: 'hidden', background: '#0b0e13', border: `1px solid rgba(232,184,109,${0.2 + activeStrength * 0.45})`, boxShadow: `0 ${18 + activeStrength * 12}px ${48 + activeStrength * 28}px rgba(0,0,0,${0.34 + activeStrength * 0.18}), 0 0 ${activeStrength * 34}px rgba(232,184,109,.18)`, opacity: cardOpacity, scale: cardScale, rotate: `${cardRotate}deg`, zIndex: Math.round(100 - distance * 20), transformOrigin: 'center center'}}>
              <Img src={staticFile(item.src)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#090c11', filter: `brightness(${0.68 + activeStrength * 0.32}) saturate(${0.72 + activeStrength * 0.28})`}} />
              <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 54%, rgba(5,7,11,${0.7 + activeStrength * 0.16}) 100%)`}} />
              <div style={{position: 'absolute', left: 18, right: 18, bottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 11}}>
                  <b style={{height: 28, minWidth: 42, padding: '0 9px', display: 'grid', placeItems: 'center', borderRadius: 7, background: activeStrength > .5 ? '#e8b86d' : 'rgba(232,184,109,.18)', color: activeStrength > .5 ? '#171109' : '#e8b86d', fontSize: 12}}>{item.number}</b>
                  <span style={{color: '#fff8ec', fontSize: 21, fontWeight: 800}}>{item.label}</span>
                </div>
                <span style={{color: 'rgba(255,255,255,.46)', fontSize: 12, letterSpacing: 2}}>EVIDENCE</span>
              </div>
            </div>
          );
        })}
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 170, background: 'linear-gradient(90deg, #17191d 16%, transparent)', zIndex: 140, pointerEvents: 'none'}} />
        <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: 170, background: 'linear-gradient(-90deg, #17191d 16%, transparent)', zIndex: 140, pointerEvents: 'none'}} />
      </div>

      <div style={{position: 'absolute', left: 438, right: 438, bottom: 55, display: 'flex', alignItems: 'center', gap: 8, opacity: enter}}>
        {items.map((item, index) => (
          <div key={item.number} style={{height: 3, flex: index === active ? 2.2 : 1, borderRadius: 99, background: index === active ? '#e8b86d' : 'rgba(255,255,255,.13)', boxShadow: index === active ? '0 0 12px rgba(232,184,109,.58)' : 'none'}} />
        ))}
      </div>
    </div>
  );
};
