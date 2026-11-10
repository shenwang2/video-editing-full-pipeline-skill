import React from 'react';
import {AbsoluteFill, Composition, registerRoot, staticFile} from 'remotion';
import {BRollStack} from '../../semantic-foreground-pack/real-object/BRollStack';

const Preview: React.FC = () => (
  <AbsoluteFill style={{background: '#17191d'}}>
    <BRollStack
      visualVariant="evidenceTrack"
      placement="centerSafe"
      kicker="真实证据组"
      title="三份素材，依次核验"
      aspect={16 / 9}
      items={[
        {src: staticFile('variant-lab/broll-skill-repository.png'), title: '配置说明', fit: 'contain'},
        {src: staticFile('variant-lab/broll-template-repository.png'), title: '模板仓库', fit: 'contain', showAtInFrames: 50},
        {src: staticFile('variant-lab/broll-operation-proof.png'), title: '实际操作', fit: 'contain', showAtInFrames: 108},
      ]}
    />
  </AbsoluteFill>
);

const Root: React.FC = () => <Composition id="BRollEvidenceTrackApproved" component={Preview} width={1280} height={720} fps={30} durationInFrames={180} />;

registerRoot(Root);
