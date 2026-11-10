import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const MediaFrameCleanBorderCandidate: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const enter = spring({frame: frame - 4, fps, config: {damping: 20, mass: 0.8, stiffness: 150}});
  const labelIn = interpolate(frame, [12, 24], [0, 1], clamp);
  const captionIn = interpolate(frame, [20, 34], [0, 1], clamp);
  const exit = interpolate(frame, [durationInFrames - 14, durationInFrames - 1], [0, 1], clamp);

  return (
    <AbsoluteFill style={{background: 'linear-gradient(135deg, #171a20, #0b0e13)', fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 150, top: 104, width: 980, opacity: enter * (1 - exit), translate: `0px ${(1 - enter) * 18 + exit * 16}px`, scale: 0.985 + enter * 0.015}}>
        <div style={{position: 'absolute', left: 30, top: 34, width: 920, height: 438, borderRadius: 42, background: 'radial-gradient(ellipse at 28% 18%, rgba(216,255,63,.30), transparent 52%), radial-gradient(ellipse at 76% 76%, rgba(255,180,74,.34), transparent 56%)', filter: 'blur(34px)', opacity: enter * 0.72, scale: 0.94 + enter * 0.06}} />
        <div style={{position: 'relative', width: 980, height: 500, overflow: 'hidden', borderRadius: 18, background: '#0d1117', border: '1px solid rgba(255,255,255,.20)', boxShadow: '0 24px 68px rgba(0,0,0,.48), 0 0 44px rgba(255,180,74,.16), 0 0 78px rgba(216,255,63,.10)'}}>
          <Img src={staticFile('variant-lab/mediaframe-sample.png')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 10%'}} />
          <div style={{position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)', borderRadius: 18}} />
          <div style={{position: 'absolute', left: 18, top: 18, padding: '8px 14px', borderRadius: 9, background: 'rgba(10,13,18,.72)', border: '1px solid rgba(255,184,74,.42)', color: '#ffbd61', fontSize: 16, fontWeight: 850, letterSpacing: 1, opacity: labelIn, translate: `${(1 - labelIn) * -8}px 0px`}}>真实素材</div>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, opacity: captionIn * (1 - exit), translate: `0px ${(1 - captionIn) * 8}px`}}>
          <div style={{width: 34, height: 4, borderRadius: 99, background: '#ffb44a'}} />
          <div style={{color: 'rgba(255,250,240,.84)', fontSize: 22, fontWeight: 760}}>素材展示清楚就够了</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
