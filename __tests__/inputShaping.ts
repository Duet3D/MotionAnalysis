import { getInputShaperDamping, getInputShaperFactors, InputShaperType } from "../src/shapers";

// This test must not be too precise because we compute with doubles, and we don't need to convert to and from step timings
function testParameters(type: InputShaperType, frequency: number, amplitudes: number[], durations: number[]) {
    const factors = getInputShaperFactors(type, frequency);
    expect(factors.amplitudes.length).toBe(amplitudes.length);
    expect(factors.durations.length).toBe(durations.length);
    for (let i = 0; i < amplitudes.length; i++) {
        expect(factors.amplitudes[i]).toBeCloseTo(amplitudes[i], 1);
    }
    for (let i = 0; i < durations.length; i++) {
        expect(factors.durations[i]).toBeCloseTo(durations[i] / 1000, 2);
    }
}

const writeDampingToConsole = false;
function testDamping(start: number, end: number, threshold: number, amplitudes: number[], durations: number[]) {
    const frequencies: number[] = new Array(80);
    for (let i = 0; i < frequencies.length; i++) {
        frequencies[i] = i;
    }

    const damping = getInputShaperDamping(frequencies, amplitudes, durations.map(duration => duration / 1000));

    // Write output to the console on demand
    if (writeDampingToConsole) {
        let output = '';
        for (let i = 0; i < frequencies.length; i++) {
            output += `${frequencies[i]} ${damping[i].toFixed(8)}\n`;
        }
        console.info(output);
    }

    // Check if the damping thresholds roughly work out
    for (let i = 0; i < frequencies.length; i++) {
        try {
            if (frequencies[i] >= start && frequencies[i] <= end) {
                expect(damping[i]).toBeLessThanOrEqual(threshold);
            } else {
                expect(damping[i]).toBeGreaterThan(threshold);
            }
        } catch (e) {
            console.debug(`At data point ${i}:`);
            throw e;
        }
    }
}

test("inputShaper-ei2", () => {
    // Input shaping 'ei2' at 44.0Hz damping factor 0.10, min. acceleration 10.0, impulses 0.259 0.619 0.892 with durations (ms) 11.78 11.25 10.98
    testParameters(InputShaperType.ei2, 44, [0.259, 0.619, 0.892], [11.78, 11.25, 10.98]);

    // Input shaping 'ei2' at 40.0Hz damping factor 0.10, min. acceleration 10.0, impulses 0.259 0.619 0.892 with durations (ms) 12.96 12.37 12.08
    testDamping(23,54,0.15, [0.259, 0.619, 0.892], [12.96, 12.37, 12.08]);
});

test("inputShaper-ei3", () => {
    // Input shaping 'ei3' at 44.0Hz damping factor 0.10, min. acceleration 10.0, impulses 0.221 0.498 0.758 0.925 with durations (ms) 12.35 11.14 10.91 10.90
    testParameters(InputShaperType.ei3, 44, [0.221, 0.498, 0.758, 0.925], [12.35, 11.14, 10.91, 10.90]);

    // Input shaping 'ei3' at 40.0Hz damping factor 0.10, min. acceleration 10.0, impulses 0.221 0.498 0.758 0.925 with durations (ms) 13.58 12.25 12.01 11.99
    testDamping(18,51,0.15, [0.221, 0.498, 0.758, 0.925], [13.58, 12.25, 12.01, 11.99]);
});

test("inputShaper-mzv", () => {
    // Input shaping 'mzv' at 44.0Hz damping factor 0.10, min. acceleration 10.0, impulses 0.227 0.635 with durations (ms) 8.57 8.57
    testParameters(InputShaperType.mzv, 44, [0.227, 0.635], [8.57, 8.57]);

    // Input shaping 'mzv' at 40.0Hz damping factor 0.10, min. acceleration 10.0, impulses 0.227 0.635 with durations (ms) 9.42 9.42
    testDamping(34,72,0.2, [0.227, 0.635], [9.42, 9.42]);
});

test("inputShaper-zvd", () => {
    // Input shaping 'zvd' at 44.0Hz damping factor 0.10, min. acceleration 10.0, impulses 0.334 0.822 with durations (ms) 11.42 11.42
    testParameters(InputShaperType.zvd, 44, [0.334, 0.822], [11.42, 11.42]);

    // Input shaping 'zvd' at 40.0Hz damping factor 0.10, min. acceleration 10.0, impulses 0.334 0.822 with durations (ms) 12.56 12.56
    testDamping(33,46,0.1, [0.334, 0.822], [12.56, 12.56]);
});

test("inputShaper-zvdd", () => {
    // Input shaping 'zvdd' at 44.0Hz damping factor 0.10, min. acceleration 10.0, impulses 0.193 0.616 0.925 with durations (ms) 11.42 11.42 11.42
    testParameters(InputShaperType.zvdd, 44, [0.193, 0.616, 0.925], [11.42, 11.42, 11.42]);

    // Input shaping 'zvdd' at 40.0Hz damping factor 0.10, min. acceleration 10.0, impulses 0.193 0.616 0.925 with durations (ms) 12.56 12.56 12.56
    testDamping(29,51,0.1, [0.193, 0.616, 0.925], [12.56, 12.56, 12.56]);
});

test("inputShaper-zvddd", () => {
    // Input shaping 'zvddd' at 44.0Hz damping factor 0.10, min. acceleration 10.0, impulses 0.112 0.438 0.795 0.968 with durations (ms) 11.42 11.42 11.42 11.42
    testParameters(InputShaperType.zvddd, 44, [0.112, 0.438, 0.795, 0.968], [11.42, 11.42, 11.42, 11.42]);

    // Input shaping 'zvddd' at 40.0Hz damping factor 0.05, min. acceleration 10.0, impulses 0.085 0.374 0.744 0.955 with durations (ms) 12.52 12.52 12.52 12.52
    testDamping(32,47,0.01, [0.085, 0.374, 0.744, 0.955], [12.52, 12.52, 12.52, 12.52]);
});
