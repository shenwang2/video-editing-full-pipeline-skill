import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const MediaFrameFloatingWindowCandidate: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const enter = spring({frame: frame - 5, fps, config: {damping: 18, mass: 0.78, stiffness: 145}});
  const stackOne = spring({frame: frame - 1, fps, config: {damping: 19, mass: 0.8, stiffness: 132}});
  const stackTwo = spring({frame: frame - 3, fps, config: {damping: 19, mass: 0.8, stiffness: 138}});
  const chromeIn = interpolate(frame, [15, 30], [0, 1], {easing: Easing.bezier(0.16, 1, 0.3, 1), ...clamp});
  const captionIn = interpolate(frame, [32, 48], [0, 1], {easing: Easing.bezier(0.16, 1, 0.3, 1), ...clamp});
  const focusSweep = interpolate(frame, [38, 72], [-24, 112], {easing: Easing.bezier(0.16, 1, 0.3, 1), ...clamp});
  const exit = interpolate(frame, [durationInFrames - 18, durationInFrames - 1], [0, 1], {easing: Easing.bezier(0.7, 0, 0.84, 0), ...clamp});

  return (
    <AbsoluteFill style={{background: 'radial-gradient(circle at 78% 16%, #42352a 0%, #171b22 34%, #0b0e13 100%)', fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 54, top: 44, color: 'rgba(255,255,255,.46)', fontSize: 16, fontWeight: 760, letterSpacing: 4}}>MEDIAFRAME · 候选变体 01</div>
      <div style={{position: 'absolute', left: 54, top: 70, color: '#fffaf0', fontSize: 28, fontWeight: 900}}>悬浮窗口</div>

      <div style={{position: 'absolute', left: 190, top: 132, width: 900, height: 510, opacity: 1 - exit, translate: `0px ${exit * 28}px`, scale: 1 - exit * 0.025}}>
        <div style={{position: 'absolute', left: 30, top: 30, width: 840, height: 450, borderRadius: 28, background: 'rgba(255,184,74,.16)', border: '1px solid rgba(255,184,74,.34)', opacity: stackOne * 0.72, translate: `${(1 - stackOne) * 34}px ${(1 - stackOne) * 22}px`, rotate: `${2.2 - stackOne * 1.1}deg`}} />
        <div style={{position: 'absolute', left: 16, top: 17, width: 858, height: 466, borderRadius: 28, background: 'rgba(216,255,63,.09)', border: '1px solid rgba(216,255,63,.23)', opacity: stackTwo * 0.78, translate: `${(1 - stackTwo) * 22}px ${(1 - stackTwo) * 15}px`, rotate: `${-1.5 + stackTwo * 0.7}deg`}} />

        <div style={{position: 'absolute', left: 0, top: 0, width: 876, height: 478, overflow: 'hidden', borderRadius: 28, background: 'linear-gradient(145deg, rgba(22,25,31,.94), rgba(13,15,20,.92))', border: '1px solid rgba(255,255,255,.16)', boxShadow: '0 34px 90px rgba(0,0,0,.46), inset 0 1px 0 rgba(255,255,255,.08)', opacity: enter, translate: `${(1 - enter) * -26}px ${(1 - enter) * 18}px`, scale: 0.94 + enter * 0.06}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: '100%', height: 54, display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.035)', opacity: chromeIn}}>
            <div style={{display: 'flex', gap: 8, marginLeft: 20}}>
              <div style={{width: 11, height: 11, borderRadius: 99, background: '#ff6b62'}} />
              <div style={{width: 11, height: 11, borderRadius: 99, background: '#ffbd45'}} />
              <div style={{width: 11, height: 11, borderRadius: 99, background: '#63d36e'}} />
            </div>
            <div style={{marginLeft: 22, width: 510, height: 28, display: 'flex', alignItems: 'center', padding: '0 15px', boxSizing: 'border-box', borderRadius: 10, background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.48)', fontSize: 12, fontWeight: 650}}>真实素材 · 自动匹配原始宽高比</div>
            <div style={{marginLeft: 'auto', marginRight: 20, padding: '6px 12px', borderRadius: 9, color: '#ffbd61', background: 'rgba(255,184,74,.10)', border: '1px solid rgba(255,184,74,.22)', fontSize: 12, fontWeight: 850}}>展示</div>
          </div>

          <div style={{position: 'absolute', left: 18, top: 72, width: 840, height: 372, overflow: 'hidden', borderRadius: 19, background: '#0c1016'}}>
            <Img src={staticFile('variant-lab/mediaframe-sample.png')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 13%', scale: 1.025 - enter * 0.025}} />
            <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,184,74,.09), transparent 24%, transparent 76%, rgba(0,0,0,.28))'}} />
            <div style={{position: 'absolute', top: 0, bottom: 0, left: `${focusSweep}%`, width: 72, rotate: '8deg', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.14), transparent)', opacity: frame < 82 ? 1 : 0}} />
          </div>
        </div>

        <div style={{position: 'absolute', left: 0, top: 490, display: 'flex', alignItems: 'center', gap: 13, opacity: captionIn * (1 - exit), translate: `0px ${(1 - captionIn) * 12}px`}}>
          <div style={{width: 46, height: 5, borderRadius: 99, background: 'linear-gradient(90deg, #d8ff3f, #ffb44a)', boxShadow: '0 0 18px rgba(216,255,63,.28)'}} />
          <div style={{color: '#fffaf0', fontSize: 23, fontWeight: 850}}>素材保持可读，窗口只负责包装</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
