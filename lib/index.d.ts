/**
 * Result of a frequency analysis
 */
export interface FrequencyAnalysisResult {
    /**
     * Determined frequencies (in Hz)
     */
    frequencies: number[];
    /**
     * Amplitudes of each axis
     */
    amplitudes: number[][];
}
/**
 * Analyze the given accelerometer data by computing the ringing frequencies from the samples at a given sampling rate.
 * This effectively performs an FFT on the given data set
 * @param samples Accelerometer samples of each axis
 * @param samplingRate Sampling rate in Hz
 * @param wideBand Perform wide-band analysis (more frequencies)
 * @returns Frequency vs. amplitude per axis
 */
export declare function analyzeAccelerometerData(samples: number[][], samplingRate: number, wideBand?: boolean): FrequencyAnalysisResult;
