FROM node:20-alpine

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files for dependency caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy bot source code
COPY . .

# Build TypeScript
RUN pnpm build

# Start the bot
CMD ["pnpm", "start"]
