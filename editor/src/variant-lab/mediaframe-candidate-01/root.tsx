import React from 'react';
import {Composition} from 'remotion';
import {MediaFrameFloatingWindowCandidate} from './MediaFrameFloatingWindowCandidate';

export const VariantLabRoot: React.FC = () => (
  <Composition
    id="MediaFrameFloatingWindowCandidate"
    component={MediaFrameFloatingWindowCandidate}
    width={1280}
    height={720}
    fps={30}
    durationInFrames={180}
  />
);
