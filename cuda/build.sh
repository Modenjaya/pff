#!/bin/bash

nvcc -O3 \
-arch=sm_86 \
miner.cu \
-o miner
