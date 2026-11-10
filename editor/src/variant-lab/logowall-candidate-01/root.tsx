import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {LogoWallMagneticClusterCandidate} from './LogoWallMagneticClusterCandidate';

const Root: React.FC = () => <Composition id="LogoWallMagneticClusterCandidate" component={LogoWallMagneticClusterCandidate} width={1280} height={720} fps={30} durationInFrames={150} />;

registerRoot(Root);
