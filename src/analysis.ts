import { transform } from "./fft";

/**
 * Accelerometer dataset as recorded by RepRapFirmware
 */
export interface AccelerometerDataset {
    /**
     * Names of the recorded axes
     */
    axes: string[];

    /**
     * Sampling rate in Hz
     */
    samplingRate: number;

    /**
     * Number of sample overflows that occurred while recording
     */
    overflows: number;

    /**
     * Accelerometer samples per axis
     */
    samples: number[][];
}

/**
 * Parse an accelerometer CSV file written by RepRapFirmware.
 * The file starts with a "Sample,X,Y,Z" header (axes may be a subset), continues with one row per sample and ends with a "Rate <n>, overflows <n>" line
 * @param content File content
 * @returns Parsed dataset
 */
export function parseAccelerometerCsv(content: string): AccelerometerDataset {
    const lines = content.split(/\r?\n/).filter(line => line.length > 0);
    if (lines.length < 3 || !lines[0].startsWith("Sample,")) {
        throw new Error("Invalid accelerometer CSV");
    }

    const details = /^Rate (\d+),? overflows (\d+)/.exec(lines[lines.length - 1]);
    if (!details) {
        throw new Error("Failed to read rate and overflows");
    }

    const axes = lines[0].split(",").slice(1);
    const samples = axes.map(() => new Array<number>(lines.length - 2));
    for (let i = 1; i < lines.length - 1; i++) {
        const values = lines[i].split(",");
        if (values.length !== axes.length + 1) {
            throw new Error(`Invalid number of values in line ${i + 1}`);
        }
        for (let axis = 0; axis < axes.length; axis++) {
            samples[axis][i - 1] = parseFloat(values[axis + 1]);
        }
    }

    return {
        axes,
        samplingRate: parseFloat(details[1]),
        overflows: parseFloat(details[2]),
        samples
    };
}

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
 * @param applyWindow Remove the mean and apply a Hann window first, recommended for segments cut out of a longer recording
 * @returns Frequency vs. amplitude per axis
 */
export function analyzeAccelerometerData(samples: number[][], samplingRate: number, wideBand: boolean = false, applyWindow: boolean = false): FrequencyAnalysisResult {
    if (samples.length < 1 || samples[0].length < 2) {
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
        result.frequencies[i] = (i + 1) * freqResolution;
    }

    for (let axis = 0; axis < samples.length; axis++) {
        // Perform FFT on the samples per axis
        const real = applyWindow ? applyHannWindow(samples[axis]) : samples[axis].slice(), imag = new Array(numSamples);
        imag.fill(0);
        transform(real, imag);

        // Compute amplitudes, the Hann window halves the coherent gain
        const amplitudes = new Array(numFreqs), scale = applyWindow ? 4 / numSamples : 2 / numSamples;
        for (let k = 1; k <= numFreqs; k++) {
            amplitudes[k - 1] = scale * Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
        }
        result.amplitudes[axis] = amplitudes;
    }

    return result;
}

/**
 * Analyze multiple accelerometer datasets and average their spectra.
 * Each dataset is analyzed at its own sampling rate and length, the spectra are then resampled onto the coarsest common frequency grid via linear interpolation
 * @param datasets Datasets to analyze, all with the same number of axes
 * @param wideBand Perform wide-band analysis (more frequencies)
 * @param applyWindow Remove the mean and apply a Hann window first, see analyzeAccelerometerData
 * @returns Averaged frequency vs. amplitude per axis
 */
export function analyzeAccelerometerDatasets(datasets: Array<Pick<AccelerometerDataset, "samplingRate" | "samples">>, wideBand: boolean = false, applyWindow: boolean = false): FrequencyAnalysisResult {
    if (datasets.length < 1) {
        throw new Error("No datasets to analyze");
    }

    const results = datasets.map(dataset => analyzeAccelerometerData(dataset.samples, dataset.samplingRate, wideBand, applyWindow));
    const numAxes = results[0].amplitudes.length;
    if (results.some(result => result.amplitudes.length !== numAxes)) {
        throw new Error("Datasets must have the same number of axes");
    }
    if (results.length === 1) {
        return results[0];
    }

    // Use the coarsest resolution as the target grid and stop where the first spectrum ends
    const resolution = Math.max(...results.map(result => result.frequencies[0]));
    const maxFrequency = Math.min(...results.map(result => result.frequencies[result.frequencies.length - 1]));
    const frequencies: number[] = [];
    for (let frequency = resolution; frequency <= maxFrequency + 1e-9; frequency += resolution) {
        frequencies.push(frequency);
    }

    const amplitudes = Array.from({ length: numAxes }, () => new Array<number>(frequencies.length).fill(0));
    for (const result of results) {
        for (let axis = 0; axis < numAxes; axis++) {
            for (let i = 0; i < frequencies.length; i++) {
                amplitudes[axis][i] += interpolate(result.frequencies, result.amplitudes[axis], frequencies[i]) / results.length;
            }
        }
    }
    return { frequencies, amplitudes };
}

/**
 * Remove the mean and apply a Hann window so cut-off segments don't smear the spectrum
 * @param samples Samples to window
 * @returns Windowed copy of the samples
 */
export function applyHannWindow(samples: number[]): number[] {
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    return samples.map((value, index) => (value - mean) * (0.5 - 0.5 * Math.cos(2 * Math.PI * index / samples.length)));
}

// Linear interpolation on a uniform ascending grid, clamped to the ends
function interpolate(xValues: number[], yValues: number[], x: number): number {
    const position = (x - xValues[0]) / (xValues[1] - xValues[0]);
    const index = Math.floor(position);
    if (index < 0) {
        return yValues[0];
    }
    if (index >= xValues.length - 1) {
        return yValues[yValues.length - 1];
    }
    const fraction = position - index;
    return yValues[index] * (1 - fraction) + yValues[index + 1] * fraction;
}
