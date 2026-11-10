import React from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const items = [
  {name: '语义导演', meta: '理解内容', glyph: '析', x: 0, y: 34, width: 248},
  {name: '前景组件', meta: '视觉表达', glyph: '景', x: 270, y: 0, width: 260},
  {name: 'H3动画', meta: '具象演示', glyph: '动', x: 552, y: 38, width: 246},
  {name: '时间对齐', meta: '跟随口播', glyph: '时', x: 108, y: 154, width: 256},
  {name: '素材包装', meta: '真实证据', glyph: '素', x: 388, y: 164, width: 262},
  {name: '手动微调', meta: '编辑台', glyph: '调', x: 674, y: 152, width: 250},
] as const;

export const LogoWallMagneticClusterCandidate: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const heading = interpolate(frame, [0, 14], [0, 1], {easing: Easing.out(Easing.cubic), ...clamp});
  const groupLock = interpolate(frame, [76, 105], [0, 1], {easing: Easing.out(Easing.cubic), ...clamp});
  const originX = 462;
  const originY = 130;

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#17191d', fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif'}}>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 53% 56%, rgba(232,184,109,${0.04 + groupLock * 0.09}), transparent 42%)`}} />

      <div style={{position: 'absolute', left: 154, top: 82, opacity: heading, translate: `0px ${(1 - heading) * 10}px`}}>
        <div style={{color: '#e8b86d', fontSize: 14, fontWeight: 800, letterSpacing: 3}}>并列集合</div>
        <div style={{marginTop: 6, color: '#f7f4ee', fontSize: 37, lineHeight: 1, fontWeight: 880, letterSpacing: '-.04em'}}>一套完整的剪辑能力</div>
      </div>
      <div style={{position: 'absolute', right: 154, top: 105, display: 'flex', alignItems: 'baseline', gap: 8, color: 'rgba(255,255,255,.30)', opacity: heading}}>
        <b style={{color: '#e8b86d', fontSize: 21}}>06</b><span style={{fontSize: 12, letterSpacing: 2}}>PEERS</span>
      </div>

      <div style={{position: 'absolute', left: 170, top: 213, width: 940, height: 308}}>
        <div style={{position: 'absolute', left: -14, top: -16, right: -14, bottom: -16, borderRadius: 42, border: '1px solid rgba(232,184,109,.22)', boxShadow: 'inset 0 0 46px rgba(232,184,109,.045), 0 0 38px rgba(232,184,109,.07)', opacity: groupLock, scale: .975 + groupLock * .025}} />
        <div style={{position: 'absolute', left: 22, right: 22, top: '50%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(232,184,109,.16), transparent)', opacity: groupLock}} />

        {items.map((item, index) => {
          const start = 10 + index * 11;
          const arrive = Math.min(spring({frame: frame - start, fps, config: {damping: 17, stiffness: 150, mass: .75}}), 1);
          const warm = interpolate(frame, [start + 12, start + 30], [0, 1], {easing: Easing.out(Easing.cubic), ...clamp});
          const startLeft = originX - item.width / 2;
          const startTop = originY - 42;
          const left = interpolate(arrive, [0, 1], [startLeft, item.x]);
          const top = interpolate(arrive, [0, 1], [startTop, item.y]);
          const rotate = interpolate(arrive, [0, 1], [(index % 2 === 0 ? -1 : 1) * (7 + index), 0]);
          return (
            <div key={item.name} style={{position: 'absolute', left, top, width: item.width, height: 88, boxSizing: 'border-box', padding: '0 19px 0 14px', borderRadius: 44, display: 'flex', alignItems: 'center', gap: 13, background: 'linear-gradient(145deg, rgba(11,14,20,.88), rgba(20,24,31,.70))', border: `1px solid rgba(232,184,109,${0.18 + warm * 0.34})`, boxShadow: `inset 0 1px rgba(255,255,255,.07), 0 16px 34px rgba(0,0,0,.28), 0 0 ${warm * 22}px rgba(232,184,109,.11)`, opacity: arrive, scale: .62 + arrive * .38, rotate: `${rotate}deg`, zIndex: 20 + index}}>
              <div style={{width: 54, height: 54, flex: '0 0 54px', display: 'grid', placeItems: 'center', borderRadius: 27, background: `linear-gradient(145deg, rgba(232,184,109,${.28 + warm * .48}), rgba(232,184,109,.12))`, color: warm > .55 ? '#161109' : '#f1c987', boxShadow: `0 0 ${warm * 18}px rgba(232,184,109,.24)`, fontSize: 21, fontWeight: 900}}>{item.glyph}</div>
              <div style={{minWidth: 0}}>
                <div style={{color: '#f7f4ee', fontSize: 25, lineHeight: 1, fontWeight: 850, whiteSpace: 'nowrap'}}>{item.name}</div>
                <div style={{marginTop: 7, color: 'rgba(255,255,255,.42)', fontSize: 13, lineHeight: 1, fontWeight: 650, whiteSpace: 'nowrap'}}>{item.meta}</div>
              </div>
            </div>
          );
        })}

        <div style={{position: 'absolute', left: -14, top: -16, width: 38, height: 38, borderLeft: '3px solid #e8b86d', borderTop: '3px solid #e8b86d', borderRadius: '16px 0 0 0', opacity: groupLock}} />
        <div style={{position: 'absolute', right: -14, bottom: -16, width: 38, height: 38, borderRight: '3px solid #e8b86d', borderBottom: '3px solid #e8b86d', borderRadius: '0 0 16px 0', opacity: groupLock}} />
      </div>

      <div style={{position: 'absolute', left: 154, bottom: 96, display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,.42)', fontSize: 14, fontWeight: 650, opacity: groupLock, translate: `${(1 - groupLock) * -12}px 0px`}}>
        <span style={{width: 36, height: 3, borderRadius: 99, background: '#e8b86d', boxShadow: '0 0 12px rgba(232,184,109,.5)'}} />
        六项同级能力，共同组成一套系统
      </div>
    </div>
  );
};
