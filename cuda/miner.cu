#include <iostream>
#include <stdint.h>
#include <cuda.h>
#include <cuda_runtime.h>

__device__ inline uint64_t mix(uint64_t x) {
    x ^= x >> 33;
    x *= 0xff51afd7ed558ccdULL;
    x ^= x >> 33;
    x *= 0xc4ceb9fe1a85ec53ULL;
    x ^= x >> 33;
    return x;
}

__global__ void search_nonce(
    uint64_t start_nonce,
    uint64_t target,
    uint64_t* found_nonce,
    int* found
) {
    uint64_t idx = blockIdx.x * blockDim.x + threadIdx.x;

    uint64_t nonce = start_nonce + idx;

    uint64_t hash = mix(nonce);

    if (hash < target) {
        if (atomicCAS(found, 0, 1) == 0) {
            *found_nonce = nonce;
        }
    }
}

int main(int argc, char** argv) {
    uint64_t* d_nonce;
    int* d_found;

    cudaMalloc(&d_nonce, sizeof(uint64_t));
    cudaMalloc(&d_found, sizeof(int));

    cudaMemset(d_found, 0, sizeof(int));

    uint64_t start_nonce = 0;

    while (true) {
        search_nonce<<<4096, 256>>>(
            start_nonce,
            0x0000FFFFFFFFFFFFULL,
            d_nonce,
            d_found
        );

        int found;
        cudaMemcpy(&found, d_found, sizeof(int), cudaMemcpyDeviceToHost);

        if (found) {
            uint64_t nonce;

            cudaMemcpy(&nonce, d_nonce, sizeof(uint64_t), cudaMemcpyDeviceToHost);

            std::cout << nonce << std::endl;

            break;
        }

        start_nonce += (4096ULL * 256ULL);
    }

    return 0;
}
