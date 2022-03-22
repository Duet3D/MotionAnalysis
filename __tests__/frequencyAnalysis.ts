import { analyzeAccelerometerData } from "../src";

// These are converted accelerations with a nice peak around 44.4Hz:
const yAxisSamples = [0.000,0.004,0.004,0.008,0.012,0.008,0.008,0.012,0.012,0.004,0.012,0.008,0.008,0.016,0.000,0.000,0.004,0.012,0.008,0.008,0.012,0.008,0.012,0.066,0.023,0.023,0.000,-0.020,0.016,0.004,0.012,0.004,-0.004,0.066,0.273,0.559,0.699,0.574,0.652,1.051,1.363,1.270,1.121,1.363,1.781,1.570,0.754,0.418,1.023,1.023,1.629,1.629,0.734,-0.336,-0.418,0.645,1.477,0.539,-0.773,-0.516,0.387,0.586,0.215,-0.113,0.035,0.566,0.879,0.523,0.262,0.715,1.320,1.410,1.020,0.711,0.816,1.309,1.824,1.461,0.473,0.113,0.746,1.324,1.191,0.445,0.051,0.234,0.586,0.352,0.156,0.121,0.238,0.348,0.145,0.098,0.285,0.309,0.418,0.652,0.422,0.375,0.590,0.898,1.094,1.031,0.746,0.527,0.805,1.250,1.059,0.465,0.156,0.121,-0.035,-0.379,-0.219,-0.008,-0.676,-1.211,-1.031,-0.781,-0.359,-0.125,-0.711,-0.941,-0.422,-0.016,0.070,0.074,0.234,0.273,0.219,0.406,0.590,0.496,0.566,0.758,0.633,0.379,0.230,0.281,0.340,0.016,0.172,-0.023,-0.492,-0.492,-0.480,-0.426,-0.559,-0.414,-0.555,-0.570,-0.445,-0.383,-0.141,-0.109,-0.379,-0.352,-0.066,0.098,0.512,0.477,0.086,0.180,0.402,0.574,0.711,0.516,0.348,0.129,0.145,0.312,0.145,0.113,0.059,-0.105,-0.152,-0.238,-0.539,-0.566,-0.402,-0.035,0.098,-0.473,-0.340,-0.070,0.184,0.277,-0.137,-0.113,-0.012,0.281,0.676,0.676,0.453,0.109,-0.062,0.012,0.383,0.312,0.348,0.320,-0.238,-0.203,-0.113,0.148,0.375,-0.402,-0.711,-0.270,0.062,0.102,-0.215,-0.516,-0.301,-0.133,0.078,0.078,0.344,0.133,-0.090,-0.141,-0.199,0.262,0.312,0.012,0.156,0.188,0.109,-0.082,0.012,0.328,0.191,0.074,-0.016,-0.098,0.016,0.102,-0.066,-0.207,-0.141,-0.141,-0.180,-0.145,0.141,0.211,-0.121,-0.344,-0.152,0.176,0.250,0.137,0.133,0.059,0.137,0.156,-0.148,-0.059,0.082,0.230,0.246,-0.133,-0.219,0.008,0.160,0.172,-0.102,-0.355,-0.141,0.102,0.180,0.008,-0.367,-0.301,-0.109,0.055,0.223,0.125,0.059,0.051,0.008,0.117,-0.023,0.199,0.418,0.191,0.102,-0.113,-0.305,-0.305,-0.066,0.293,0.145,-0.199,-0.320,-0.105,0.184,0.152,0.070,-0.406,-0.500,0.207,0.430,0.285,-0.199,-0.617,-0.223,0.211,0.352,0.191,0.004,0.027,0.066,0.188,0.328,0.184,0.078,0.074,0.078,-0.066,-0.035,0.082,0.008,-0.242,-0.277,-0.090,0.219,0.059,-0.297,-0.402,-0.320,-0.125,0.043,0.141,-0.066,-0.086,0.078,-0.074,-0.145,0.219,0.574,0.230,0.023,-0.121,-0.023,0.191,0.316,0.066,-0.152,0.031,0.223,0.277,0.215,-0.195,-0.375,-0.230,-0.074,0.195,-0.008,-0.105,-0.121,-0.207,-0.086,0.074,0.035,0.219,0.137,-0.043,-0.121,-0.082,0.195,0.176,-0.152,-0.121,0.105,0.270,0.129,0.008,-0.125,0.094,0.371,0.145,-0.145,-0.113,0.121,0.121,0.113,-0.141,-0.227,-0.043,0.023,-0.141,-0.270,-0.258,0.113,0.203,-0.168,-0.168,-0.008,0.012,0.184,0.086,0.031,-0.051,-0.121,0.090,0.113,0.066,0.297,0.203,-0.039,-0.066,-0.020,0.098,0.297,0.012,-0.152,-0.156,0.066,0.031,-0.125,0.016,-0.172,-0.137,0.270,0.199,-0.168,-0.348,-0.211,0.285,0.168,-0.078,-0.070,-0.168,0.051,0.258,-0.270,-0.199,0.141,0.211,0.379,0.066,-0.191,-0.078,-0.211,-0.082,-0.273,-0.633,-0.500,-0.758,-1.051,-0.930,-1.141,-1.328,-1.223,-1.023,-0.922,-1.148,-1.180,-0.867,-0.645,-0.781,-0.828,-0.801,-0.562,-0.012,-0.016,-0.492,-0.637,-0.160,0.156,0.023,-0.227,-0.402,-0.320,-0.379,-0.465,-0.570,-0.742,-0.766,-0.969,-1.203,-1.105,-0.945,-0.844,-0.984,-1.207,-1.160,-0.816,-0.500,-0.660,-0.855,-0.574,-0.535,-0.617,-0.254,0.000,-0.406,-0.898,-0.492,0.301,0.309,-0.469,-1.027,-0.758,-0.008,0.449,-0.012,-1.008,-1.645,-1.211,-0.270,0.012,-0.570,-1.398,-1.453,-0.695,-0.289,-0.371,-0.176,0.156,-0.066,-0.387,-0.012,0.695,0.859,0.531,0.156,0.070,0.070,0.504,0.828,0.258,-0.039,0.289,0.230,-0.012,-0.125,-0.051,-0.035,-0.266,-0.254,-0.309,-0.465,-0.176,-0.141,-0.395,-0.086,0.250,0.129,0.012,0.125,0.285,0.285,0.273,0.258,0.297,0.113,0.117,0.223,0.031,-0.082,0.000,-0.047,-0.133,-0.074,0.000,-0.043,-0.078,0.055,0.113,0.000,-0.059,-0.012,0.000,-0.031,-0.094,-0.082,-0.027,0.008,0.047,0.031,0.047,0.031,0.051,0.035,0.000,-0.012,-0.016,-0.020,-0.043,-0.012,-0.016,-0.027,0.008,0.039,0.020,-0.020,-0.008,0.023,-0.008,-0.078,-0.102,-0.074,-0.016,-0.012,0.008,0.020,0.027,0.074,0.086,0.062,0.059,0.078,0.070,0.082,0.066,0.047,0.039,0.035,0.031,0.035,0.039,0.090,0.031,0.012,0.090,0.012,0.016,0.000,0.004,-0.008,-0.035,-0.051,-0.047,-0.039,-0.031,-0.016,-0.020,-0.020,0.012,0.039,0.027,0.031,0.043,0.047,0.047,0.102,0.012,0.047,0.027,0.004,-0.004,-0.004,-0.016,-0.020,0.004,0.004,0.008,0.000,0.004,0.008,0.004,0.000,0.012,0.000,-0.020,-0.012,-0.020,-0.012,-0.012,0.016,-0.004,0.012,0.047,-0.008,-0.008,0.039,0.047,0.031,0.035,0.035,0.031,0.023,0.027,0.004,0.012,0.016,0.012,0.012,0.012,0.008,-0.004,-0.016,-0.035,-0.023,-0.016,-0.008,-0.004,-0.031,-0.020,0.016,-0.008,0.012,0.012,0.031,0.051,0.047,0.043,0.047,0.039,0.039,0.043,0.055,0.062,0.047,0.031,0.031,0.016,-0.012,-0.027,0.023,-0.035,-0.051,-0.020,-0.027,-0.027,-0.020,-0.008,0.004,0.004,0.023,0.027,0.027,0.023,0.020,0.035,0.023,0.035,0.051,0.062,0.027,0.039,0.074,0.031,0.023,0.027,0.062,0.035,0.000,0.016,0.004,-0.020,-0.020,-0.016,-0.027,-0.023,-0.016,-0.016,-0.016,-0.016,-0.016,0.004,0.008,0.004,0.004,0.008,0.016,0.039,0.039,-0.020,0.031,0.039,0.066,0.031,0.031,0.039,0.031,0.027,0.020,0.027,0.008,0.012,0.012,0.016,-0.008,0.000,-0.004,0.004,0.000,0.008,0.012,0.020,0.031,0.008,0.027,0.047,0.027,0.016,0.027,0.035,0.031,0.027,0.027,0.027,0.023,0.031,0.035,0.031,0.043,0.031,0.012,0.004,0.004,0.016,0.027,0.043,-0.020,0.012,0.000,-0.023,-0.004,-0.004,0.000,-0.008,0.012,0.004,0.016,0.008,0.031,0.020,0.012,0.031,0.020,0.031,0.016,0.016,0.027,0.012,0.023,0.020,-0.023,0.012,-0.020,-0.027,-0.008,0.000,-0.008,-0.004,0.004,0.012,0.000,0.000,0.000,0.008,0.012,-0.004,0.004,0.004,-0.004,0.004,0.012,0.016,0.016,0.008,0.008,0.016,-0.008,0.074,0.035,0.023,0.031,0.020,0.016,0.020,0.016,0.023,0.031,0.020,0.020,0.020,0.012,0.012,0.027,0.012,0.004,0.008,-0.012,0.004,-0.004,-0.020,0.008,0.027,0.012,0.020,0.027,0.031,0.031,0.027,0.035,0.016,0.016,0.020,0.020,0.004,0.004,0.012,0.012,0.016,0.008,0.008,0.004,-0.035,-0.008,-0.008,0.008,0.016,0.004,-0.004,0.008,0.004,0.000,0.012,0.012,0.016,0.000,0.012,0.020,0.035,0.020,0.008,0.020,0.016,0.012,0.004,0.020,-0.023,-0.047,0.031,0.027,-0.020,0.004,0.016,0.012,0.012,0.004,0.008,0.012,0.016,0.020,0.020,0.016,0.008,0.012,0.027,0.020,0.008,0.012,0.027,0.016,-0.008,-0.008,0.059,0.031,0.066,0.008,0.016,0.000,0.008,0.012,0.020,0.023,0.016,0.008,0.000,0.008,0.008,0.004,-0.004,0.008,0.016,0.008,0.004,0.004,0.031,-0.031,0.027,0.027,-0.004,0.043,0.020,0.027,0.023,0.008,0.016,0.004,0.004,0.012,0.012];
const samplingRate = 1365;

const writeToConsole = false;
test("analyzeAccelerometerData", () => {
    const result = analyzeAccelerometerData([yAxisSamples], samplingRate);
    expect(result.amplitudes.length).toBe(1);

    // Write output to the console on demand
    if (writeToConsole) {
        let output = '';
        for (let i = 0; i < result.frequencies.length; i++) {
            output += `${result.frequencies[i].toFixed(1)} ${result.amplitudes[0][i].toFixed(5)}\n`;
        }
        console.info(output);
    }

    // Check if there is the only peak after 10Hz is around 44Hz
    let peakFrequency = 10, peakValue = 0;
    for (let i = 0; i < result.frequencies.length; i++) {
        const frequency = result.frequencies[i], value = result.amplitudes[0][i];
        if (frequency > 10 && value > peakValue) {
            peakFrequency = frequency;
            peakValue = value;
        }
    }
    expect(peakFrequency).toBeCloseTo(44, 0);
});
