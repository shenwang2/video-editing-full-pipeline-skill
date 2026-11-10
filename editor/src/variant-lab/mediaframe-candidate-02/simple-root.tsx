import React from 'react';
import {Composition} from 'remotion';
import {MediaFrameCleanBorderCandidate} from './MediaFrameCleanBorderCandidate';

export const SimpleVariantLabRoot: React.FC = () => (
  <Composition
    id="MediaFrameCleanBorderCandidate"
    component={MediaFrameCleanBorderCandidate}
    width={1280}
    height={720}
    fps={30}
    durationInFrames={120}
  />
);
