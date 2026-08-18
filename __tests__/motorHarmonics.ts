import { analyzeMotorHarmonics, getDisplacementAmplitude, getFullStepFrequency, summarizeMotorSweep } from "../src";

test("getFullStepFrequency", () => {
    // 1200mm/min at 80 steps/mm with x16 microstepping = 100 full steps per second
    expect(getFullStepFrequency(1200, 80, 16)).toBeCloseTo(100);
});

test("getDisplacementAmplitude", () => {
    // 1mm/s^2 at 1Hz -> 1 / (2 pi)^2 mm
    expect(getDisplacementAmplitude(1, 1)).toBeCloseTo(0.02533, 4);
});

test("analyzeMotorHarmonics", () => {
    const samplingRate = 1365, numSamples = 4096, fundamental = 103.7;
    const harmonics = [0.5, 0.15, 0.3, 0.05, 0.1];

    // Two axes with the same harmonic content at different levels, DC offset from gravity plus deterministic noise
    const samples = [1, 0.25].map(scale => Array.from({ length: numSamples }, (_, i) => {
        const t = i / samplingRate;
        let value = 1 + 0.02 * Math.sin(12345.678 * i);
        for (let k = 0; k < harmonics.length; k++) {
            value += scale * harmonics[k] * Math.sin(2 * Math.PI * (k + 1) * fundamental * t + k);
        }
        return value;
    }));

    // Nominal fundamental is off by 3%
    const result = analyzeMotorHarmonics(samples, samplingRate, 100, harmonics.length, 0.05, 1);
    expect(result.fundamental).toBeCloseTo(fundamental, 1);
    expect(result.orders).toEqual([1, 2, 3, 4, 5]);
    expect(result.frequencies.length).toBe(harmonics.length);
    expect(result.amplitudes.length).toBe(2);
    for (let k = 0; k < harmonics.length; k++) {
        expect(result.frequencies[k]).toBeCloseTo((k + 1) * fundamental, 1);
        expect(result.amplitudes[0][k]).toBeCloseTo(harmonics[k], 2);
        expect(result.amplitudes[1][k]).toBeCloseTo(0.25 * harmonics[k], 2);
    }

    // Electrical-cycle resolution: a component at half the full-step frequency shows up at order 0.5 only
    const withSubharmonic = samples.map(axisSamples => axisSamples.map((value, i) => value + 0.2 * Math.sin(2 * Math.PI * 0.5 * fundamental * i / samplingRate)));
    const subResult = analyzeMotorHarmonics(withSubharmonic, samplingRate, 100, 2);
    expect(subResult.orders).toEqual([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
    expect(subResult.amplitudes[0][0]).toBeLessThan(0.02);
    expect(subResult.amplitudes[0][1]).toBeCloseTo(0.2, 2);
    expect(subResult.amplitudes[0][3]).toBeCloseTo(harmonics[0], 2);

    // Harmonics beyond Nyquist are dropped (6 x 103.7Hz fits below 682.5Hz, 7 x does not)
    expect(analyzeMotorHarmonics(samples, samplingRate, 100, 20, 0.05, 1).frequencies.length).toBe(6);
    expect(analyzeMotorHarmonics(samples, samplingRate, 100, 20).orders.at(-1)).toBe(6.5);
    expect(() => analyzeMotorHarmonics(samples, samplingRate, 700)).toThrow();
    expect(() => analyzeMotorHarmonics([[1, 2, 3]], samplingRate, 100)).toThrow();
});

test("summarizeMotorSweep", () => {
    // Two recordings at 100Hz and 200Hz full-step frequency with orders in quarter steps; the 0.5x of the second lands on the 1x of the first
    const first = { fundamental: 100, orders: [0.25, 0.5, 0.75, 1, 2], frequencies: [25, 50, 75, 100, 200], amplitudes: [[0.01, 0.02, 0.01, 0.3, 0.05], [0, 0, 0, 0.4, 0]] };
    const second = { fundamental: 202, orders: [0.25, 0.5, 0.75, 1], frequencies: [50.5, 101, 151.5, 202], amplitudes: [[0.02, 0.1, 0.02, 0.6], [0, 0, 0, 0.8]] };
    const summary = summarizeMotorSweep([first, second]);
    expect(summary.orders).toEqual([0.25, 0.5, 0.75, 1, 2]);
    expect(summary.frequencies.map(f => Math.round(f))).toEqual([25, 50, 75, 101, 152, 201]);

    // 0.5x of the second recording is 0.1g at ~100Hz, 1x of the first is 0.5g there
    const at100 = 3, halfOrder = 1, fullOrder = 3;
    expect(summary.amplitudes[fullOrder][at100]).toBeCloseTo(0.5, 6);
    expect(summary.amplitudes[halfOrder][at100]).toBeCloseTo(0.1, 6);
    expect(summary.ratios[halfOrder][at100]).toBeCloseTo(0.2, 6);

    // 50Hz combines the 0.5x of the first and the 0.25x of the second, but there is no 1x there
    expect(summary.amplitudes[halfOrder][1]).toBeCloseTo(0.02, 6);
    expect(summary.amplitudes[0][1]).toBeCloseTo(0.02, 6);
    expect(summary.ratios[halfOrder][1]).toBeNull();

    // 200Hz: 2x of the first (0.05g) and 1x of the second (1.0g)
    expect(summary.ratios[4][5]).toBeCloseTo(0.05, 6);
});
