# Use Bun's official image (alternatively, use node:alpine and install bun yourself)
FROM jarredsumner/bun:latest AS builder

# Set working directory to /app in the container
WORKDIR /app

# Copy package files and lockfile to leverage caching
COPY package.json bun.lockb ./

# Install dependencies using Bun
RUN bun install

# Copy the rest of the app's source code
COPY . .

# Build the project (optional; if you're pre-compiling TS)
# Uncomment the next line if you are generating a JS build output:
# RUN bun build

# Use the same image for production (or an even slimmer runtime if available)
FROM jarredsumner/bun:latest

# Set working directory
WORKDIR /app

# Copy the built artifacts and all source code from the builder stage
COPY --from=builder /app .

# Expose the port your app is listening on
EXPOSE 3000

# Run the Bun application
CMD ["bun", "run", "src/app.ts"]
