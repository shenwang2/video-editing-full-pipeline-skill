import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {BRollEvidenceTrackCandidate} from './BRollEvidenceTrackCandidate';

const Root: React.FC = () => (
  <Composition
    id="BRollEvidenceTrackCandidate"
    component={BRollEvidenceTrackCandidate}
    width={1280}
    height={720}
    fps={30}
    durationInFrames={180}
  />
);

registerRoot(Root);
