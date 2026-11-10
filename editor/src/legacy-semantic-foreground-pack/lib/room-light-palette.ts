/**
 * The seven approved chromatic swatches sampled from the user's room light.
 * New reviewed variants choose from these named colors instead of inventing
 * blended hue names. Black, white, and alpha-only transparency remain neutral.
 */
export const ROOM_LIGHT_PALETTE = {
  粉红: {hex: "#FF5CCB", rgb: "255,92,203"},
  浅紫: {hex: "#C55BFF", rgb: "197,91,255"},
  青蓝: {hex: "#24E5EE", rgb: "36,229,238"},
  荧光绿: {hex: "#D8FF3F", rgb: "216,255,63"},
  亮红: {hex: "#FF4D55", rgb: "255,77,85"},
  深紫: {hex: "#8D42FF", rgb: "141,66,255"},
  电光蓝: {hex: "#3D5BFF", rgb: "61,91,255"},
} as const;

export type RoomLightColorName = keyof typeof ROOM_LIGHT_PALETTE;

/**
 * Shared optional palette parameters for either delivery mode.
 * CSS fallbacks preserve the named room-light defaults above.
 * Consumers may supply a selected event accent without forking components.
 */
export const EDITABLE_ROOM_LIGHT_PALETTE = {
  粉红: {hex: "var(--component-accent, #FF5CCB)", rgb: "var(--component-accent-rgb, 255,92,203)"},
  浅紫: {hex: "var(--component-accent, #C55BFF)", rgb: "var(--component-accent-rgb, 197,91,255)"},
  青蓝: {hex: "var(--component-accent, #24E5EE)", rgb: "var(--component-accent-rgb, 36,229,238)"},
  荧光绿: {hex: "var(--component-accent, #D8FF3F)", rgb: "var(--component-accent-rgb, 216,255,63)"},
  亮红: {hex: "var(--component-accent, #FF4D55)", rgb: "var(--component-accent-rgb, 255,77,85)"},
  深紫: {hex: "var(--component-accent, #8D42FF)", rgb: "var(--component-accent-rgb, 141,66,255)"},
  电光蓝: {hex: "var(--component-accent, #3D5BFF)", rgb: "var(--component-accent-rgb, 61,91,255)"},
} as const;

