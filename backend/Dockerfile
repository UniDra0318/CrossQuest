# Multi-stage Dockerfile for FastAPI + Charm-Crypto
FROM python:3.11-slim-bookworm AS base

# Install system dependencies required for building PBC, GMP, and Charm-Crypto
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    flex \
    bison \
    libgmp-dev \
    libssl-dev \
    wget \
    git \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PBC (Pairing-Based Cryptography library)
WORKDIR /tmp
RUN wget https://crypto.stanford.edu/pbc/files/pbc-0.5.14.tar.gz && \
    tar -xvf pbc-0.5.14.tar.gz && \
    cd pbc-0.5.14 && \
    ./configure && \
    make && \
    make install && \
    ldconfig && \
    rm -rf /tmp/pbc*

# Build and install charm-crypto from repository
WORKDIR /tmp
ARG CHARM_REF
RUN test -n "$CHARM_REF" || (echo "Build with --build-arg CHARM_REF=<tag-or-commit of Charm-Crypto matching spec v21>" && exit 1)
RUN git clone https://github.com/JHUISI/charm.git && \
    cd charm && \
    git checkout "$CHARM_REF" && \
    ./configure.sh && \
    make && \
    make install && \
    sh -c "for d in /usr/local/lib/python*/site-packages/*.egg/EGG-INFO; do [ -d \"\$d\" ] && printf 'Metadata-Version: 2.1\nName: charm-crypto\nVersion: 0.62\n' > \"\$d/PKG-INFO\"; done" && \
    rm -rf /tmp/charm

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
