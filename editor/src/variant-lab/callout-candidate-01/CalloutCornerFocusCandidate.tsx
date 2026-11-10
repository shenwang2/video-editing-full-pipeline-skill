import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const Corner: React.FC<{left: number; top: number; flipX?: boolean; flipY?: boolean; progress: number}> = ({left, top, flipX, flipY, progress}) => (
  <div style={{position: 'absolute', left, top, width: 25, height: 25, scale: progress, transformOrigin: `${flipX ? 'right' : 'left'} ${flipY ? 'bottom' : 'top'}`}}>
    <div style={{position: 'absolute', left: flipX ? undefined : 0, right: flipX ? 0 : undefined, top: flipY ? undefined : 0, bottom: flipY ? 0 : undefined, width: 25, height: 4, borderRadius: 99, background: '#d8ff3f'}} />
    <div style={{position: 'absolute', left: flipX ? undefined : 0, right: flipX ? 0 : undefined, top: flipY ? undefined : 0, bottom: flipY ? 0 : undefined, width: 4, height: 25, borderRadius: 99, background: '#d8ff3f'}} />
  </div>
);

export const CalloutCornerFocusCandidate: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const enter = spring({frame: frame - 3, fps, config: {damping: 20, mass: 0.82, stiffness: 145}});
  const dim = interpolate(frame, [14, 28], [0, 0.46], clamp);
  const focus = spring({frame: frame - 20, fps, config: {damping: 17, mass: 0.7, stiffness: 175}});
  const labelIn = interpolate(frame, [28, 42], [0, 1], clamp);
  const exit = interpolate(frame, [durationInFrames - 14, durationInFrames - 1], [0, 1], clamp);
  const target = {x: 66, y: 3, width: 350, height: 48};

  return (
    <AbsoluteFill style={{background: 'linear-gradient(135deg, #171a20, #0b0e13)', fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 250, top: 46, width: 780, height: 624, opacity: enter * (1 - exit), translate: `0px ${(1 - enter) * 16 + exit * 14}px`, scale: 0.988 + enter * 0.012}}>
        <div style={{position: 'absolute', left: 26, top: 28, width: 728, height: 568, borderRadius: 34, background: 'radial-gradient(ellipse at 22% 16%, rgba(216,255,63,.28), transparent 55%), radial-gradient(ellipse at 78% 80%, rgba(255,180,74,.30), transparent 58%)', filter: 'blur(30px)', opacity: 0.64}} />
        <div style={{position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 18, background: '#fff', border: '1px solid rgba(255,255,255,.22)', boxShadow: '0 24px 68px rgba(0,0,0,.46), 0 0 44px rgba(255,180,74,.12)'}}>
          <Img src={staticFile('variant-lab/mediaframe-sample.png')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill'}} />
          <div style={{position: 'absolute', inset: 0, background: `rgba(5,8,12,${dim})`}} />
          <Img src={staticFile('variant-lab/mediaframe-sample.png')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', clipPath: `inset(${target.y}px ${780 - target.x - target.width}px ${624 - target.y - target.height}px ${target.x}px)`}} />
          <div style={{position: 'absolute', left: target.x - 8, top: target.y - 3, width: target.width + 16, height: target.height + 12, borderRadius: 11, boxShadow: '0 0 28px rgba(216,255,63,.22)', opacity: focus}}>
            <Corner left={0} top={0} progress={focus} />
            <Corner left={target.width - 9} top={0} flipX progress={focus} />
            <Corner left={0} top={target.height - 13} flipY progress={focus} />
            <Corner left={target.width - 9} top={target.height - 13} flipX flipY progress={focus} />
          </div>
          <div style={{position: 'absolute', left: 442, top: 11, padding: '8px 14px', borderRadius: 9, background: 'rgba(10,13,18,.78)', border: '1px solid rgba(216,255,63,.38)', color: '#efffb2', fontSize: 16, fontWeight: 850, opacity: labelIn, translate: `${(1 - labelIn) * -10}px 0px`}}>仓库名称</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
