/**
 * Color transformation and matrix calculation utilities.
 */
import { ColorChannels, NumStrColorChannels, ReadonlyColorMatrix, TriColorChannels, ValidateColorComponentsOptions } from '../typedef';
/**
 * Validates color component values against specified ranges and length.
 * @param arr - The color components array.
 * @param opt - The validation options.
 * @param opt.alpha - Whether to ensure an alpha channel exists.
 * @param opt.minLength - The minimum allowed array length.
 * @param opt.maxLength - The maximum allowed array length.
 * @param opt.minRange - The minimum allowed value range.
 * @param opt.maxRange - The maximum allowed value range.
 * @param opt.validateRange - Whether to validate component value ranges.
 * @returns The validated color components array.
 */
export declare const validateColorComponents: (arr: ColorChannels | TriColorChannels, opt?: ValidateColorComponentsOptions) => ColorChannels | TriColorChannels;
/**
 * Normalizes two color components arrays by handling missing or none values.
 * @param colorA - The first color components array [v1, v2, v3, v4].
 * @param colorB - The second color components array [v1, v2, v3, v4].
 * @param [skip] - Whether to skip validation.
 * @returns A tuple of normalized color components: [colorA, colorB].
 */
export declare const normalizeColorComponents: (colorA: NumStrColorChannels, colorB: NumStrColorChannels, skip?: boolean) => [ColorChannels, ColorChannels];
/**
 * Transforms a vector using a 3x3 color matrix.
 * @param mtx - The 3x3 color matrix.
 * @param vct - The vector to transform.
 * @param [skip] - Whether to skip validation.
 * @returns The transformed tri-color channels: [p1, p2, p3].
 */
export declare const transformMatrix: (mtx: ReadonlyColorMatrix, vct: TriColorChannels, skip?: boolean) => TriColorChannels;
/**
 * Transforms standard sRGB channels to linear sRGB.
 * @param rgb - The RGB channels: [r, g, b] (where r, g, b range from 0 to 255).
 * @param [skip] - Whether to skip validation.
 * @returns The linear RGB channels: [r, g, b] (ranging from 0 to 1).
 */
export declare const transformRgbToLinearRgb: (rgb: TriColorChannels, skip?: boolean) => TriColorChannels;
/**
 * Transforms sRGB channels to XYZ color space.
 * @param rgb - The RGB channels: [r, g, b] (where r, g, b range from 0 to 255).
 * @param [skip] - Whether to skip validation.
 * @returns The XYZ color channels: [x, y, z].
 */
export declare const transformRgbToXyz: (rgb: TriColorChannels, skip?: boolean) => TriColorChannels;
/**
 * Transforms sRGB channels to XYZ-D50 color space.
 * @param rgb - The RGB channels: [r, g, b, alpha] (where r, g, b range from 0 to 255, and alpha ranges from 0 to 1).
 * @returns The XYZ-D50 color channels: [x, y, z].
 */
export declare const transformRgbToXyzD50: (rgb: TriColorChannels) => TriColorChannels;
/**
 * Transforms linear sRGB channels to standard sRGB.
 * @param rgb - The linear RGB channels: [r, g, b] (ranging from 0 to 1).
 * @param [round] - Whether to round the resulting values.
 * @returns The standard RGB channels: [r, g, b] (ranging from 0 to 255).
 */
export declare const transformLinearRgbToRgb: (rgb: TriColorChannels, round?: boolean) => TriColorChannels;
/**
 * Transforms XYZ color space channels to standard sRGB.
 * @param xyz - The XYZ color channels: [x, y, z].
 * @param [skip] - Whether to skip validation.
 * @returns The standard RGB channels: [r, g, b] (ranging from 0 to 255).
 */
export declare const transformXyzToRgb: (xyz: TriColorChannels, skip?: boolean) => TriColorChannels;
/**
 * Transforms XYZ (D65) color channels to XYZ-D50.
 * @param xyz - The XYZ color channels: [x, y, z].
 * @returns The XYZ-D50 color channels: [x, y, z].
 */
export declare const transformXyzToXyzD50: (xyz: TriColorChannels) => TriColorChannels;
/**
 * Transforms XYZ color channels to HSL.
 * @param xyz - The XYZ color channels: [x, y, z].
 * @param [skip] - Whether to skip validation.
 * @returns The HSL color channels: [h, s, l].
 */
export declare const transformXyzToHsl: (xyz: TriColorChannels, skip?: boolean) => TriColorChannels;
/**
 * Transforms XYZ color channels to HWB.
 * @param xyz - The XYZ color channels: [x, y, z].
 * @param [skip] - Whether to skip validation.
 * @returns The HWB color channels: [h, w, b].
 */
export declare const transformXyzToHwb: (xyz: TriColorChannels, skip?: boolean) => TriColorChannels;
/**
 * Transforms XYZ color channels to Oklab.
 * @param xyz - The XYZ color channels: [x, y, z].
 * @param [skip] - Whether to skip validation.
 * @returns The Oklab color channels: [l, a, b].
 */
export declare const transformXyzToOklab: (xyz: TriColorChannels, skip?: boolean) => TriColorChannels;
/**
 * Transforms XYZ color channels to Oklch.
 * @param xyz - The XYZ color channels: [x, y, z].
 * @param [skip] - Whether to skip validation.
 * @returns The Oklch color channels: [l, c, h].
 */
export declare const transformXyzToOklch: (xyz: TriColorChannels, skip?: boolean) => TriColorChannels;
/**
 * Transforms XYZ-D50 color channels to standard sRGB.
 * @param xyz - The XYZ-D50 color channels: [x, y, z].
 * @param [skip] - Whether to skip validation.
 * @returns The standard RGB channels: [r, g, b] (ranging from 0 to 255).
 */
export declare const transformXyzD50ToRgb: (xyz: TriColorChannels, skip?: boolean) => TriColorChannels;
/**
 * Transforms XYZ-D50 color channels to CIELAB.
 * @param xyz - The XYZ-D50 color channels: [x, y, z].
 * @param [skip] - Whether to skip validation.
 * @returns The CIELAB color channels: [l, a, b].
 */
export declare const transformXyzD50ToLab: (xyz: TriColorChannels, skip?: boolean) => TriColorChannels;
/**
 * Transforms XYZ-D50 color channels to CIELCH.
 * @param xyz - The XYZ-D50 color channels: [x, y, z].
 * @param [skip] - Whether to skip validation.
 * @returns The CIELCH color channels: [l, c, h].
 */
export declare const transformXyzD50ToLch: (xyz: TriColorChannels, skip?: boolean) => TriColorChannels;
/**
 * Transforms linear Display P3 channels to standard Display P3.
 * @param p3 - The linear Display P3 channels: [r, g, b] (ranging from 0 to 1).
 * @returns The Display P3 channels: [r, g, b] (ranging from 0 to 1).
 */
export declare const transformLinearP3ToP3: (p3: TriColorChannels) => TriColorChannels;
/**
 * Transforms XYZ color space channels to Display P3.
 * @param xyz - The XYZ color channels: [x, y, z].
 * @param [skip] - Whether to skip validation.
 * @returns The Display P3 color channels: [r, g, b] (ranging from 0 to 1).
 */
export declare const transformXyzToDisplayP3: (xyz: TriColorChannels, skip?: boolean) => TriColorChannels;
/**
 * Transforms XYZ color space channels to linear Display P3.
 * @param xyz - The XYZ color channels: [x, y, z].
 * @param [skip] - Whether to skip validation.
 * @returns The linear Display P3 channels: [r, g, b] (ranging from 0 to 1).
 */
export declare const transformXyzToLinearP3: (xyz: TriColorChannels, skip?: boolean) => TriColorChannels;
/**
 * Transforms linear Adobe RGB channels to standard Adobe RGB (1998).
 * @param a98 - The linear Adobe RGB channels: [r, g, b] (ranging from 0 to 1).
 * @returns The Adobe RGB channels: [r, g, b] (ranging from 0 to 1).
 */
export declare const transformLinearA98ToA98: (a98: TriColorChannels) => TriColorChannels;
/**
 * Transforms XYZ color space channels to Adobe RGB (1998).
 * @param xyz - The XYZ color channels: [x, y, z].
 * @param [skip] - Whether to skip validation.
 * @returns The Adobe RGB color channels: [r, g, b] (ranging from 0 to 1).
 */
export declare const transformXyzToA98Rgb: (xyz: TriColorChannels, skip?: boolean) => TriColorChannels;
/**
 * Transforms linear ProPhoto RGB channels to standard ProPhoto RGB.
 * @param prophoto - The linear ProPhoto RGB channels: [r, g, b] (ranging from 0 to 1).
 * @returns The ProPhoto RGB channels: [r, g, b] (ranging from 0 to 1).
 */
export declare const transformLinearProphotoToProphoto: (prophoto: TriColorChannels) => TriColorChannels;
/**
 * Transforms linear Rec. 2020 channels to standard Rec. 2020.
 * @param rec2020 - The linear Rec. 2020 channels: [r, g, b] (ranging from 0 to 1).
 * @returns The Rec. 2020 channels: [r, g, b] (ranging from 0 to 1).
 */
export declare const transformLinearRec2020ToRec2020: (rec2020: TriColorChannels) => TriColorChannels;
/**
 * Transforms XYZ color space channels to Rec. 2020.
 * @param xyz - The XYZ color channels: [x, y, z].
 * @param [skip] - Whether to skip validation.
 * @returns The Rec. 2020 color channels: [r, g, b] (ranging from 0 to 1).
 */
export declare const transformXyzToRec2020: (xyz: TriColorChannels, skip?: boolean) => TriColorChannels;
/**
 * Transforms XYZ color space channels to ProPhoto RGB.
 * @param xyz - The XYZ color channels: [x, y, z].
 * @param [skip] - Whether to skip validation.
 * @returns The ProPhoto RGB color channels: [r, g, b] (ranging from 0 to 1).
 */
export declare const transformXyzToProphotoRgb: (xyz: TriColorChannels, skip?: boolean) => TriColorChannels;
