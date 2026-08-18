import { analyzeAccelerometerData, analyzeAccelerometerDatasets, parseAccelerometerCsv } from "../src";

function makeCsv(samplingRate: number, numSamples: number, frequency: number, overflows: number = 0): string {
    let content = "Sample,X,Y,Z\n";
    for (let i = 0; i < numSamples; i++) {
        const t = i / samplingRate;
        content += `${i},${Math.sin(2 * Math.PI * frequency * t).toFixed(3)},${(0.5 * Math.sin(2 * Math.PI * frequency * t)).toFixed(3)},1.000\n`;
    }
    return content + `Rate ${samplingRate}, overflows ${overflows}\n`;
}

test("parseAccelerometerCsv", () => {
    const dataset = parseAccelerometerCsv(makeCsv(1000, 500, 45, 12));
    expect(dataset.axes).toEqual(["X", "Y", "Z"]);
    expect(dataset.samplingRate).toBe(1000);
    expect(dataset.overflows).toBe(12);
    expect(dataset.samples.length).toBe(3);
    expect(dataset.samples[0].length).toBe(500);
    expect(dataset.samples[2][0]).toBe(1);

    expect(() => parseAccelerometerCsv("foo")).toThrow();
});

test("analyzeAccelerometerDatasets", () => {
    // Different rates and lengths must combine without complaint
    const datasets = [
        parseAccelerometerCsv(makeCsv(1000, 1000, 45)),
        parseAccelerometerCsv(makeCsv(1365, 800, 45)),
        parseAccelerometerCsv(makeCsv(2000, 3000, 45))
    ];
    const result = analyzeAccelerometerDatasets(datasets);
    expect(result.amplitudes.length).toBe(3);

    // Grid must be uniform with the coarsest resolution (1365 / 800 Hz)
    const resolution = result.frequencies[1] - result.frequencies[0];
    expect(resolution).toBeCloseTo(1365 / 800, 5);
    for (let i = 1; i < result.frequencies.length; i++) {
        expect(result.frequencies[i] - result.frequencies[i - 1]).toBeCloseTo(resolution, 5);
    }

    // Peak must stay at 45Hz with roughly the original amplitude ratio between X and Y
    let peakIndex = 0;
    for (let i = 1; i < result.frequencies.length; i++) {
        if (result.amplitudes[0][i] > result.amplitudes[0][peakIndex]) {
            peakIndex = i;
        }
    }
    expect(Math.abs(result.frequencies[peakIndex] - 45)).toBeLessThan(resolution);
    expect(result.amplitudes[1][peakIndex] / result.amplitudes[0][peakIndex]).toBeCloseTo(0.5, 1);

    // A single dataset passes through unchanged
    expect(analyzeAccelerometerDatasets([datasets[0]])).toEqual(analyzeAccelerometerDatasets([datasets[0]]));
    expect(() => analyzeAccelerometerDatasets([])).toThrow();
    expect(() => analyzeAccelerometerDatasets([datasets[0], { samplingRate: 1000, samples: [datasets[0].samples[0]] }])).toThrow();
});

test("analyzeAccelerometerData with window", () => {
    // Cut mid-cycle so the plain FFT leaks, the windowed one must still report the right amplitude at the peak
    const dataset = parseAccelerometerCsv(makeCsv(1000, 1234, 45.6));
    const result = analyzeAccelerometerData(dataset.samples, dataset.samplingRate, false, true);
    let peakIndex = 0;
    for (let i = 1; i < result.frequencies.length; i++) {
        if (result.amplitudes[0][i] > result.amplitudes[0][peakIndex]) {
            peakIndex = i;
        }
    }
    expect(Math.abs(result.frequencies[peakIndex] - 45.6)).toBeLessThan(1000 / 1234);
    expect(result.amplitudes[0][peakIndex]).toBeGreaterThan(0.8);
    expect(result.amplitudes[0][peakIndex]).toBeLessThanOrEqual(1.01);
    // The DC offset of 1g on Z must not show up at the lowest bins any more
    expect(result.amplitudes[2][0]).toBeLessThan(0.01);
});
