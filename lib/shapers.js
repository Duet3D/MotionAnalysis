"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInputShaperDamping = exports.getInputShaperFactors = exports.InputShaperType = void 0;
/**
 * Supported input shaper types
 * TODO: Replace this with enum from @duet3d/objectmodel
 */
var InputShaperType;
(function (InputShaperType) {
    InputShaperType[InputShaperType["ei2"] = 0] = "ei2";
    InputShaperType[InputShaperType["ei3"] = 1] = "ei3";
    InputShaperType[InputShaperType["mzv"] = 2] = "mzv";
    InputShaperType[InputShaperType["zvd"] = 3] = "zvd";
    InputShaperType[InputShaperType["zvdd"] = 4] = "zvdd";
    InputShaperType[InputShaperType["zvddd"] = 5] = "zvddd";
})(InputShaperType = exports.InputShaperType || (exports.InputShaperType = {}));
/***
 * Compute input shaper amplitudes and durations like RepRapFirmware does
 * @param type Input shaper type
 * @param frequency Target frequency (in Hz)
 * @param dampingFactor Optional damping factor (zeta)
 * @returns Input shaper factors
 */
function getInputShaperFactors(type, frequency, dampingFactor = 0.1) {
    const result = {
        amplitudes: [],
        durations: []
    };
    const sqrtOneMinusZetaSquared = Math.sqrt(1 - Math.sqrt(dampingFactor));
    const dampedFrequency = frequency * sqrtOneMinusZetaSquared;
    const dampedPeriod = 1 / dampedFrequency;
    const k = Math.exp(-dampingFactor * Math.PI / sqrtOneMinusZetaSquared);
    switch (type) {
        case InputShaperType.mzv:
            {
                // Klipper gives amplitude steps of [a3 = k^2 * (1 - 1/sqrt(2)), a2 = k * (sqrt(2) - 1), a1 = 1 - 1/sqrt(2)] all divided by (a1 + a2 + a3)
                // Rearrange to: a3 = k^2 * (1 - sqrt(2)/2), a2 = k * (sqrt(2) - 1), a1 = (1 - sqrt(2)/2)
                const kMzv = Math.exp(-dampingFactor * 0.75 * Math.PI / sqrtOneMinusZetaSquared);
                const a1 = 1.0 - 0.5 * Math.sqrt(2);
                const a2 = (Math.sqrt(2) - 1) * kMzv;
                const a3 = a1 * kMzv * kMzv;
                const sum = (a1 + a2 + a3);
                result.amplitudes.push(a3 / sum);
                result.amplitudes.push((a2 + a3) / sum);
            }
            result.durations.push(0.375 * dampedPeriod);
            result.durations.push(0.375 * dampedPeriod);
            break;
        case InputShaperType.zvd:
            {
                const j = Math.pow(1 + k, 2);
                result.amplitudes.push(1 / j);
                result.amplitudes.push(1 / j + 2 * k / j);
            }
            result.durations.push(0.5 * dampedPeriod);
            result.durations.push(0.5 * dampedPeriod);
            break;
        case InputShaperType.zvdd:
            {
                const j = Math.pow(1 + k, 3);
                result.amplitudes.push(1 / j);
                result.amplitudes.push(result.amplitudes[0] + 3 * k / j);
                result.amplitudes.push(result.amplitudes[1] + 3 * Math.pow(k, 2) / j);
            }
            result.durations.push(0.5 * dampedPeriod);
            result.durations.push(0.5 * dampedPeriod);
            result.durations.push(0.5 * dampedPeriod);
            break;
        case InputShaperType.zvddd:
            {
                const j = Math.pow(1 + k, 4);
                result.amplitudes.push(1 / j);
                result.amplitudes.push(result.amplitudes[0] + 4 * k / j);
                result.amplitudes.push(result.amplitudes[1] + 6 * Math.pow(k, 2) / j);
                result.amplitudes.push(result.amplitudes[2] + 4 * Math.pow(k, 3) / j);
            }
            result.durations.push(0.5 * dampedPeriod);
            result.durations.push(0.5 * dampedPeriod);
            result.durations.push(0.5 * dampedPeriod);
            result.durations.push(0.5 * dampedPeriod);
            break;
        case InputShaperType.ei2: // see http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.465.1337&rep=rep1&type=pdf. United States patent #4,916,635.
            {
                const zetaSquared = Math.pow(dampingFactor, 2), zetaCubed = zetaSquared * dampingFactor;
                result.amplitudes.push((0.16054) + (0.76699) * dampingFactor + (2.26560) * zetaSquared + (-1.22750) * zetaCubed);
                result.amplitudes.push((0.16054 + 0.33911) + (0.76699 + 0.45081) * dampingFactor + (2.26560 - 2.58080) * zetaSquared + (-1.22750 + 1.73650) * zetaCubed);
                result.amplitudes.push((0.16054 + 0.33911 + 0.34089) + (0.76699 + 0.45081 - 0.61533) * dampingFactor + (2.26560 - 2.58080 - 0.68765) * zetaSquared + (-1.22750 + 1.73650 + 0.42261) * zetaCubed);
                result.durations.push(((0.49890) + (0.16270) * dampingFactor + (-0.54262) * zetaSquared + (6.16180) * zetaCubed) * dampedPeriod);
                result.durations.push(((0.99748 - 0.49890) + (0.18382 - 0.16270) * dampingFactor + (-1.58270 + 0.54262) * zetaSquared + (8.17120 - 6.16180) * zetaCubed) * dampedPeriod);
                result.durations.push(((1.49920 - 0.99748) + (-0.09297 - 0.18382) * dampingFactor + (-0.28338 + 1.58270) * zetaSquared + (1.85710 - 8.17120) * zetaCubed) * dampedPeriod);
            }
            break;
        case InputShaperType.ei3: // see http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.465.1337&rep=rep1&type=pdf. United States patent #4,916,635
            {
                const zetaSquared = Math.pow(dampingFactor, 2);
                const zetaCubed = zetaSquared * dampingFactor;
                result.amplitudes.push((0.11275) + 0.76632 * dampingFactor + (3.29160) * zetaSquared + (-1.44380) * zetaCubed);
                result.amplitudes.push((0.11275 + 0.23698) + (0.76632 + 0.61164) * dampingFactor + (3.29160 - 2.57850) * zetaSquared + (-1.44380 + 4.85220) * zetaCubed);
                result.amplitudes.push((0.11275 + 0.23698 + 0.30008) + (0.76632 + 0.61164 - 0.19062) * dampingFactor + (3.29160 - 2.57850 - 2.14560) * zetaSquared + (-1.44380 + 4.85220 + 0.13744) * zetaCubed);
                result.amplitudes.push((0.11275 + 0.23698 + 0.30008 + 0.23775) + (0.76632 + 0.61164 - 0.19062 - 0.73297) * dampingFactor + (3.29160 - 2.57850 - 2.14560 + 0.46885) * zetaSquared + (-1.44380 + 4.85220 + 0.13744 - 2.08650) * zetaCubed);
                result.durations.push(((0.49974) + (0.23834) * dampingFactor + (0.44559) * zetaSquared + (12.4720) * zetaCubed) * dampedPeriod);
                result.durations.push(((0.99849 - 0.49974) + (0.29808 - 0.23834) * dampingFactor + (-2.36460 - 0.44559) * zetaSquared + (23.3990 - 12.4720) * zetaCubed) * dampedPeriod);
                result.durations.push(((1.49870 - 0.99849) + (0.10306 - 0.29808) * dampingFactor + (-2.01390 + 2.36460) * zetaSquared + (17.0320 - 23.3990) * zetaCubed) * dampedPeriod);
                result.durations.push(((1.99960 - 1.49870) + (-0.28231 - 0.10306) * dampingFactor + (0.61536 + 2.01390) * zetaSquared + (5.40450 - 17.0320) * zetaCubed) * dampedPeriod);
            }
            break;
        default:
            // Other shaper types are not supported
            return result;
    }
    return result;
}
exports.getInputShaperFactors = getInputShaperFactors;
/**
 * Compute the damping for the given frequencies with the given input shaper amplitudes and durations
 * @param frequencies Frequencies to compute the damping for
 * @param amplitudes Input shaper amplitudes (coefficients)
 * @param durations Input shaper durations (in s)
 * @returns Damping factor (0..1) per frequency
 */
function getInputShaperDamping(frequencies, amplitudes, durations) {
    // Perform input check
    if (amplitudes.length < 1) {
        throw new Error("Insufficient number of amplitudes");
    }
    if (amplitudes.length !== durations.length) {
        throw new Error("Number of amplitudes must match the number of durations");
    }
    // Compute step sizes
    const stepSizes = [amplitudes[0]];
    for (let i = 1; i < amplitudes.length; i++) {
        stepSizes[i] = amplitudes[i] - amplitudes[i - 1];
    }
    stepSizes.push(1 - amplitudes[amplitudes.length - 1]);
    // Compute the accumulated times in seconds
    const accTimes = [0];
    for (let duration of durations) {
        accTimes.push(duration + accTimes[accTimes.length - 1]);
    }
    // Calculate the actual damping per frequency
    const result = new Array(frequencies.length);
    for (let i = 0; i < frequencies.length; i++) {
        const frequency = frequencies[i];
        let totalSine = 0, totalCosine = 0;
        for (let k = 0; k < stepSizes.length; k++) {
            totalSine += stepSizes[k] * Math.sin(2 * Math.PI * frequency * accTimes[k]);
            totalCosine += stepSizes[k] * Math.cos(2 * Math.PI * frequency * accTimes[k]);
        }
        result[i] = Math.sqrt(totalSine * totalSine + totalCosine * totalCosine);
    }
    return result;
}
exports.getInputShaperDamping = getInputShaperDamping;
