# 🚀 Fast build Dockerfile
FROM oven/bun:latest
WORKDIR /app

# Only copy dependency files first to leverage Docker cache
COPY bun.lock package.json ./

# Install dependencies (cached if lockfile didn't change)
RUN bun install --frozen-lockfile

# Copy the rest of your source code
COPY . .

# Expose your app's port
EXPOSE 3000

# Run your Bun app (adjust the entrypoint if necessary)
CMD ["bun", "run", "src/app.ts"]
