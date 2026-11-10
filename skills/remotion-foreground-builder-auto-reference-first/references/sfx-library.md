# Bundled SFX Library

The renderer installer copies these real assets from `assets/sfx` to `<project>/public/sfx`. Cue `src` values are therefore stable across video folders.

| Cue type | Installed file | Best semantic use | Starting cue volume |
|---|---|---|---:|
| `soft-pop` | `sfx/soft-pop.mp3` | compact text, tag, list item, small card | `0.08-0.11` |
| `soft-whoosh` | `sfx/soft-whoosh.mp3` | title change, larger material entry, takeover | `0.07-0.10` |
| `mechanical-build` | `sfx/mechanical-build.mp3` | process assembly, branching, routing, structural construction | `0.05-0.07` |
| `mechanical-lock` | `sfx/mechanical-lock.mp3` | installation, completion, confirmation, final locked state | `0.06-0.08` |

## Routing

- Route from the visible action, not from a generic “tech” topic.
- Use `mechanical-build` once at the start of a meaningful multi-part construction. Let small later items use `soft-pop` only when the build sound no longer supplies sufficient feedback.
- Use `mechanical-lock` at the result or confirmation state, not at both the setup and result.
- Use `soft-pop` for individually spoken enumeration items. Each item cue follows its item-level `showAtMs`.
- Use `soft-whoosh` for a whole material or title entering as one object.
- Avoid overlapping two long mechanical cues. When a long cue would collide with the next semantic beat, prefer a shorter cue, reduce the number of cues, or use a restrained `playbackRate` (normally no more than `1.5`) so the complete sound resolves before the next beat instead of cutting off its result accent.

## Mix

Keep the source speech dominant. Start from the per-cue ranges above and a `sfxMasterGain` around `1.4-2.2`, clamp the effective volume to `1`, then audition the final composite on an ordinary phone speaker.

## Foreground cue coverage review

Before delivery, make a cue sheet from every enabled foreground event and its internal visible beats (`showAtMs`, verdict/stamp times, number completion, and graphic-object poses). Assign a sound to meaningful text, item, number, and confirmation arrivals, or record why the beat should remain silent. A section-title cue does not cover later keywords or list items simply because the title remains on screen. Align the audible transient, not just the file start, with the visible beat; audition it against narration and de-duplicate cues when two components arrive together. Keep source-result showcase audio clear of redundant SFX. Verify the resulting cue IDs, asset references, timing, effective gain, and final composite for clipping before handing off.
