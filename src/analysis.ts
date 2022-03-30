import { transform } from "./fft";

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
export function analyzeAccelerometerData(samples: number[][], samplingRate: number, wideBand: boolean = false): FrequencyAnalysisResult {
    if (samples.length < 1) {
        throw new Error("Too few samples to perform frequency analysis");
    }

    // Determine number of axes, frequency resolution, and number of frequencies to compute
    const numSamples = samples[0].length, freqResolution = samplingRate / numSamples;
    const numFreqs = Math.floor(Math.min(numSamples / 2, (wideBand ? (samplingRate / 2) : 200) / freqResolution));

    // Prepare result
    const result = {
        frequencies: new Array(numFreqs),
        amplitudes: new Array(samples.length)
    };
    for (let i = 0; i < numFreqs; i++) {
        result.frequencies[i] = i * freqResolution + freqResolution / 2;
    }

    for (let axis = 0; axis < samples.length; axis++) {
        // Perform FFT on the samples per axis
        const real = samples[axis].slice(), imag = new Array(numSamples);
        imag.fill(0);
        transform(real, imag);

        // Compute amplitudes
        const amplitudes = new Array(numFreqs);
        for (let k = 1; k <= numFreqs; k++) {
            amplitudes[k - 1] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]) / numSamples;
        }
        result.amplitudes[axis] = amplitudes;
    }

    return result;
}
