# Multi-stage Dockerfile for Google Cloud Run Deployment
# Combines Node.js 20 LTS runtime with Python 3 for the cryptographic engine

FROM node:20-slim

# Install Python 3 standard library and required system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies including build tools
RUN npm install --legacy-peer-deps

# Copy application source and Python engine
COPY . .

# Build Vite frontend and compile server.ts to dist/server.cjs via esbuild
RUN npm run build

# Cloud Run sets container port to 3000 or defaults to 8080
ENV PORT=3000
ENV NODE_ENV=production

# Expose the application port
EXPOSE 3000

# Start compiled server
CMD ["node", "dist/server.cjs"]
