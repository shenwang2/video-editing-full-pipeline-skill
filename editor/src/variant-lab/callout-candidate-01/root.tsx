import React from 'react';
import {Composition} from 'remotion';
import {CalloutCornerFocusCandidate} from './CalloutCornerFocusCandidate';

export const CalloutVariantLabRoot: React.FC = () => (
  <Composition
    id="CalloutCornerFocusCandidate"
    component={CalloutCornerFocusCandidate}
    width={1280}
    height={720}
    fps={30}
    durationInFrames={120}
  />
);
