/** Section titles are independent of the 24 semantic component slots. */
export const SECTION_TITLE_DEFAULT_VARIANT = 'referenceV2';
export const SECTION_TITLE_VARIANTS = [
  {id: 'referenceV2', label: 'V2 中英标题', mode: undefined},
  {id: 'standard', label: '经典标题', mode: undefined},
];

/** Migrate the former per-project V2 flag once; explicit variants then persist. */
export const normalizeSectionTitleData = (event: {variantId?: string; payload: Record<string, any>}) => {
  const {referenceHeader, titleMode: _titleMode, visualVariant: _visualVariant, ...payload} = event.payload;
  const legacyV2 = referenceHeader && typeof referenceHeader === 'object' && typeof referenceHeader.eyebrow === 'string';
  if (legacyV2) {
    payload.setup ??= referenceHeader.eyebrow;
    payload.sectionIndex ??= referenceHeader.index || '';
    payload.chineseFontSize ??= referenceHeader.chineseFontSize ?? 38;
  }
  const variantId = legacyV2 ? 'referenceV2'
    : SECTION_TITLE_VARIANTS.some((variant) => variant.id === event.variantId)
      ? event.variantId! : SECTION_TITLE_DEFAULT_VARIANT;
  return {variantId, payload};
};
