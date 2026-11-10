import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {BRollProofCarouselCandidate} from './BRollProofCarouselCandidate';

const Root: React.FC = () => (
  <Composition
    id="BRollProofCarouselCandidate"
    component={BRollProofCarouselCandidate}
    width={1280}
    height={720}
    fps={30}
    durationInFrames={150}
  />
);

registerRoot(Root);
