import React from 'react';
import {Composition, type CalculateMetadataFunction} from 'remotion';
import sampleManifest from '../../examples/minimal-project/edit-project.json';
import type {EditProject} from '../types';
import {EditComposition, type EditCompositionProps} from './EditComposition';

const defaultProject = sampleManifest as EditProject;
const defaultProps: EditCompositionProps = {
  project: defaultProject,
  assetBaseUrl: 'http://127.0.0.1:4312/project-assets/minimal-demo/',
  renderMode: 'composite',
};

const calculateMetadata: CalculateMetadataFunction<EditCompositionProps> = ({props}) => ({
  width: props.project.composition.width,
  height: props.project.composition.height,
  fps: props.project.composition.fps,
  durationInFrames: Math.max(
    1,
    Math.ceil((props.project.composition.durationMs / 1000) * props.project.composition.fps),
  ),
});

export const RenderRoot: React.FC = () => (
  <Composition
    id="EditDeskVideo"
    component={EditComposition}
    width={defaultProject.composition.width}
    height={defaultProject.composition.height}
    fps={defaultProject.composition.fps}
    durationInFrames={Math.ceil((defaultProject.composition.durationMs / 1000) * defaultProject.composition.fps)}
    defaultProps={defaultProps}
    calculateMetadata={calculateMetadata}
  />
);
