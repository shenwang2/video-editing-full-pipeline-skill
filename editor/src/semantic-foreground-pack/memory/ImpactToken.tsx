import React from "react";
import {useCurrentFrame} from "remotion";
import type {ForegroundPlacement} from "../lib/layout";
import {ImpactVisual} from "../atomic/ApprovedSemanticVisuals";
export type ImpactMilestone={label:string;value:number;showAtInFrames?:number};
export type ImpactTokenProps={mode:"keyword"|"number";text?:string;value?:number;countFrom?:number;unit?:string;eyebrow?:string;caption?:string;milestones?:ImpactMilestone[];placement?:ForegroundPlacement;accentColor?:string;secondaryAccentColor?:string;visualVariant?:"keywordImpact"|"numberLanding"|"focusBeacon";showAtInFrames?:number;exitAtInFrames?:number;exitInFrames?:number};
export const ImpactToken:React.FC<ImpactTokenProps>=({mode,text,value,countFrom,unit,eyebrow,caption,milestones,placement="centerSafe",accentColor="#C8F43D",visualVariant,showAtInFrames=0,exitAtInFrames,exitInFrames})=>{const frame=useCurrentFrame();if(frame<showAtInFrames)return null;const variant=mode==="number"||visualVariant==="numberLanding"?"numberLanding":"keywordImpact";return <ImpactVisual variant={variant} text={text} value={value} countFrom={countFrom} unit={unit} eyebrow={eyebrow} caption={caption} milestones={milestones} accentColor={accentColor} placement={placement} showAtInFrames={showAtInFrames} exitAtInFrames={exitAtInFrames} exitInFrames={exitInFrames}/>;};
