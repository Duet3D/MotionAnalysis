import { applyHannWindow } from "./analysis";
import { transform } from "./fft";

/**
 * Result of a motor harmonic analysis
 */
export interface MotorHarmonicsResult {
    /**
     * Refined full-step frequency (in Hz)
     */
    fundamental: number;

    /**
     * Analyzed harmonic orders as multiples of the fundamental (e.g. 0.25, 0.5, 0.75, 1, ...)
     */
    orders: number[];

    /**
     * Analyzed harmonic frequencies (in Hz), i.e. orders times the fundamental
     */
    frequencies: number[];

    /**
     * Acceleration amplitude of each axis at each harmonic frequency (in the units of the samples)
     */
    amplitudes: number[][];
}

/**
 * Compute the full-step frequency of a motor moving at constant speed
 * @param feedrate Feedrate (in mm/min)
 * @param stepsPerMm Configured microsteps per mm
 * @param microstepping Configured microstepping (e.g. 16)
 * @returns Full steps per second (in Hz)
 */
export function getFullStepFrequency(feedrate: number, stepsPerMm: number, microstepping: number): number {
    return feedrate / 60 * stepsPerMm / microstepping;
}

/**
 * Convert an acceleration amplitude of a sinusoidal vibration to its displacement amplitude
 * @param accelerationAmplitude Acceleration amplitude (in length units per s^2)
 * @param frequency Frequency (in Hz)
 * @returns Displacement amplitude (in the same length units)
 */
export function getDisplacementAmplitude(accelerationAmplitude: number, frequency: number): number {
    return accelerationAmplitude / Math.pow(2 * Math.PI * frequency, 2);
}

/**
 * Analyze accelerometer samples of a constant-speed move for vibrations at multiples of the full-step frequency.
 * The samples are mean-corrected and Hann-windowed, the fundamental is refined around the nominal value and the amplitudes are then evaluated at the exact harmonic frequencies.
 * Since current waveform errors repeat once per electrical cycle (four full steps), the harmonics are evaluated in steps of a quarter full-step frequency by default
 * @param samples Accelerometer samples of each axis, ideally covering only the constant-speed part of the move
 * @param samplingRate Sampling rate in Hz
 * @param fullStepFrequency Nominal full-step frequency (in Hz), see getFullStepFrequency
 * @param numHarmonics Number of full-step harmonics to evaluate, including the fundamental. Harmonics above the Nyquist frequency are dropped
 * @param searchRange Relative range around the nominal full-step frequency in which the actual fundamental is searched
 * @param subdivisions Number of harmonic orders per full step (4 = electrical cycle resolution, 1 = full-step harmonics only)
 * @returns Harmonic amplitudes per axis
 */
export function analyzeMotorHarmonics(samples: number[][], samplingRate: number, fullStepFrequency: number, numHarmonics: number = 8, searchRange: number = 0.05, subdivisions: number = 4): MotorHarmonicsResult {
    if (samples.length < 1 || samples[0].length < 16) {
        throw new Error("Too few samples to perform harmonic analysis");
    }
    if (fullStepFrequency <= 0 || fullStepFrequency * (1 + searchRange) >= samplingRate / 2) {
        throw new Error("Full-step frequency exceeds the Nyquist frequency of the sampling rate");
    }
    subdivisions = Math.max(1, Math.round(subdivisions));
    const numOrders = Math.min(numHarmonics * subdivisions, Math.floor(samplingRate / 2 / (fullStepFrequency * (1 + searchRange)) * subdivisions));
    numHarmonics = Math.max(1, Math.floor(numOrders / subdivisions));

    const windowed = samples.map(axisSamples => applyHannWindow(axisSamples));
    const numSamples = samples[0].length, windowSum = numSamples / 2;

    // Coarse search on FFT bins first, then refine with exact DFTs around the best bin
    const binWidth = samplingRate / numSamples;
    const spectra = windowed.map(axisSamples => {
        const real = axisSamples.slice(), imag = new Array<number>(numSamples).fill(0);
        transform(real, imag);
        return real.map((value, index) => value * value + imag[index] * imag[index]);
    });
    let bestBin = 0, bestEnergy = -1;
    const minBin = Math.max(1, Math.floor(fullStepFrequency * (1 - searchRange) / binWidth)), maxBin = Math.ceil(fullStepFrequency * (1 + searchRange) / binWidth);
    for (let bin = minBin; bin <= maxBin; bin++) {
        let energy = 0;
        for (let k = 1; k <= numHarmonics && bin * k < numSamples / 2; k++) {
            for (const spectrum of spectra) {
                energy += spectrum[bin * k];
            }
        }
        if (energy > bestEnergy) {
            bestBin = bin;
            bestEnergy = energy;
        }
    }

    const fineStep = binWidth / 16;
    let fundamental = bestBin * binWidth;
    bestEnergy = -1;
    for (let frequency = (bestBin - 1) * binWidth; frequency <= (bestBin + 1) * binWidth + 1e-9; frequency += fineStep) {
        let energy = 0;
        for (let k = 1; k <= numHarmonics; k++) {
            for (const axisSamples of windowed) {
                energy += dftEnergy(axisSamples, k * frequency / samplingRate);
            }
        }
        if (energy > bestEnergy) {
            fundamental = frequency;
            bestEnergy = energy;
        }
    }

    const orders = Array.from({ length: numOrders }, (_, k) => (k + 1) / subdivisions);
    const frequencies = orders.map(order => order * fundamental);
    return {
        fundamental,
        orders,
        frequencies,
        amplitudes: windowed.map(axisSamples => frequencies.map(frequency => 2 * Math.sqrt(dftEnergy(axisSamples, frequency / samplingRate)) / windowSum))
    };
}

/**
 * Combine the per-axis amplitudes of a harmonic analysis into a single magnitude per order (root sum of squares)
 * @param result Harmonic analysis result
 * @returns Combined amplitude per order
 */
export function combineAxes(result: MotorHarmonicsResult): number[] {
    return result.frequencies.map((_, index) => Math.sqrt(result.amplitudes.reduce((sum, axisAmplitudes) => sum + axisAmplitudes[index] * axisAmplitudes[index], 0)));
}

/**
 * Harmonic amplitudes of a speed sweep compared at equal absolute frequencies.
 * The mechanical response of the machine only depends on the absolute frequency, so comparing orders that land on the same frequency cancels it out
 */
export interface MotorSweepSummary {
    /**
     * Harmonic orders (rows)
     */
    orders: number[];

    /**
     * Absolute frequencies (columns, in Hz)
     */
    frequencies: number[];

    /**
     * Combined amplitude per order and absolute frequency, null where no recording of the sweep provides that combination
     */
    amplitudes: Array<Array<number | null>>;

    /**
     * Amplitude relative to the full-step (order 1) amplitude at the same absolute frequency, null where either is missing
     */
    ratios: Array<Array<number | null>>;
}

/**
 * Compare the harmonic analyses of a speed sweep at equal absolute frequencies, see MotorSweepSummary
 * @param results Harmonic analyses of the same motor at different full-step frequencies
 * @param tolerance Relative frequency tolerance for treating two harmonics as the same absolute frequency
 * @returns Sweep summary
 */
export function summarizeMotorSweep(results: MotorHarmonicsResult[], tolerance: number = 0.05): MotorSweepSummary {
    const orders = Array.from(new Set(results.flatMap(result => result.orders))).sort((a, b) => a - b);

    // Cluster the absolute frequencies of all orders
    const points = results.flatMap(result => {
        const combined = combineAxes(result);
        return result.orders.map((order, index) => ({ order, frequency: result.frequencies[index], amplitude: combined[index] }));
    }).sort((a, b) => a.frequency - b.frequency);
    const clusters: Array<{ frequency: number; points: typeof points }> = [];
    for (const point of points) {
        const last = clusters[clusters.length - 1];
        if (last && Math.abs(point.frequency - last.frequency) <= tolerance * last.frequency) {
            last.points.push(point);
            last.frequency = last.points.reduce((sum, p) => sum + p.frequency, 0) / last.points.length;
        } else {
            clusters.push({ frequency: point.frequency, points: [point] });
        }
    }

    // Average the amplitudes per order within each cluster
    const amplitudes = orders.map(order => clusters.map(cluster => {
        const matching = cluster.points.filter(point => point.order === order);
        return (matching.length > 0) ? matching.reduce((sum, point) => sum + point.amplitude, 0) / matching.length : null;
    }));
    const fundamentalRow = amplitudes[orders.indexOf(1)];
    return {
        orders,
        frequencies: clusters.map(cluster => cluster.frequency),
        amplitudes,
        ratios: amplitudes.map(row => row.map((amplitude, index) => (amplitude !== null && fundamentalRow && fundamentalRow[index]) ? amplitude / fundamentalRow[index]! : null))
    };
}

// Squared magnitude of the DFT at a normalized frequency (cycles per sample), evaluated by phasor rotation
function dftEnergy(samples: number[], normalizedFrequency: number): number {
    const cosStep = Math.cos(2 * Math.PI * normalizedFrequency), sinStep = Math.sin(2 * Math.PI * normalizedFrequency);
    let real = 0, imag = 0, phasorReal = 1, phasorImag = 0;
    for (const value of samples) {
        real += value * phasorReal;
        imag -= value * phasorImag;
        const nextReal = phasorReal * cosStep - phasorImag * sinStep;
        phasorImag = phasorReal * sinStep + phasorImag * cosStep;
        phasorReal = nextReal;
    }
    return real * real + imag * imag;
}
