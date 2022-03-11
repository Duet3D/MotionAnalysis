/**
 * Supported input shaper types
 * TODO: Replace this with enum from @duet3d/objectmodel
 */
export declare enum InputShaperType {
    ei2 = 0,
    ei3 = 1,
    mzv = 2,
    zvd = 3,
    zvdd = 4,
    zvddd = 5
}
/**
 * Computed factors of an input shaper
 */
export interface InputShaperFactors {
    /**
     * Input shaper amplitudes (coefficients)
     */
    amplitudes: number[];
    /**
     * Input shaper durations (in s)
     */
    durations: number[];
}
/***
 * Compute input shaper amplitudes and durations like RepRapFirmware does
 * @param type Input shaper type
 * @param frequency Target frequency (in Hz)
 * @param dampingFactor Optional damping factor (zeta)
 * @returns Input shaper factors
 */
export declare function getInputShaperFactors(type: InputShaperType, frequency: number, dampingFactor?: number): InputShaperFactors;
/**
 * Compute the damping for the given frequencies with the given input shaper amplitudes and durations
 * @param frequencies Frequencies to compute the damping for
 * @param amplitudes Input shaper amplitudes (coefficients)
 * @param durations Input shaper durations (in s)
 * @returns Damping factor (0..1) per frequency
 */
export declare function getInputShaperDamping(frequencies: number[], amplitudes: number[], durations: number[]): number[];
