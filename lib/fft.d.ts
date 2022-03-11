export declare function transform(real: Array<number> | Float64Array, imag: Array<number> | Float64Array): void;
export declare function inverseTransform(real: Array<number> | Float64Array, imag: Array<number> | Float64Array): void;
export declare function transformRadix2(real: Array<number> | Float64Array, imag: Array<number> | Float64Array): void;
export declare function transformBluestein(real: Array<number> | Float64Array, imag: Array<number> | Float64Array): void;
export declare function convolveReal(xvec: Array<number> | Float64Array, yvec: Array<number> | Float64Array, outvec: Array<number> | Float64Array): void;
export declare function convolveComplex(xreal: Array<number> | Float64Array, ximag: Array<number> | Float64Array, yreal: Array<number> | Float64Array, yimag: Array<number> | Float64Array, outreal: Array<number> | Float64Array, outimag: Array<number> | Float64Array): void;
export declare function newArrayOfZeros(n: number): Array<number>;
