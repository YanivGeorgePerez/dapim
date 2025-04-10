# Use the official Bun image from Oven (edge tag used as an example; adjust if needed)
FROM oven-sh/bun:latest AS builder

# Set working directory in the container
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json bun.lockb ./

# Install dependencies with Bun
RUN bun install

# Copy the rest of the source code
COPY . .

# Optionally, build the TypeScript files if you have a build step (uncomment if needed)
# RUN bun build

# Use the same image for the final runtime
FROM oven-sh/bun:latest

WORKDIR /app

# Copy the source code and dependencies from the builder stage
COPY --from=builder /app .

# Expose the port (adjust if different)
EXPOSE 3000

# Command to run the Bun application
CMD ["bun", "run", "src/app.ts"]
