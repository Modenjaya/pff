#include <iostream>
#include <stdint.h>
#include <cuda.h>
#include <cuda_runtime.h>
#include "keccak.cuh"

#define THREADS 256
#define BLOCKS 4096

__device__ int found = 0;
__device__ unsigned long long found_nonce = 0;

__device__ inline uint64_t simple_mix(uint64_t x)
{
    x ^= x >> 33;
    x *= 0xff51afd7ed558ccdULL;
    x ^= x >> 33;
    x *= 0xc4ceb9fe1a85ec53ULL;
    x ^= x >> 33;
    return x;
}

__global__ void mine_kernel(
    unsigned long long start_nonce,
    unsigned long long target
)
{
    unsigned long long idx =
        blockIdx.x * blockDim.x + threadIdx.x;

    unsigned long long nonce =
        start_nonce + idx;

    uint64_t hash = simple_mix(nonce);

    if (hash < target) {

        if (atomicCAS(&found, 0, 1) == 0) {
            found_nonce = nonce;
        }
    }
}

int main(int argc, char** argv)
{
    unsigned long long start_nonce =
        (unsigned long long)time(NULL);

    unsigned long long target =
        0x0000FFFFFFFFFFFFULL;

    while (true) {

        cudaMemsetToSymbol(found, 0, sizeof(int));

        mine_kernel<<<BLOCKS, THREADS>>>(
            start_nonce,
            target
        );

        cudaDeviceSynchronize();

        int h_found;

        cudaMemcpyFromSymbol(
            &h_found,
            found,
            sizeof(int)
        );

        if (h_found) {

            unsigned long long nonce;

            cudaMemcpyFromSymbol(
                &nonce,
                found_nonce,
                sizeof(unsigned long long)
            );

            std::cout << nonce << std::endl;

            return 0;
        }

        start_nonce +=
            (THREADS * BLOCKS);
    }
}
