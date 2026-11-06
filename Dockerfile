FROM node:20-alpine

WORKDIR /app

# Install dependencies (package-lock.json is allowed to drift in development,
# so npm install is used instead of the stricter npm ci)
COPY package.json package-lock.json* ./
RUN npm install

# Copy application source (node_modules, .next, .env.local are excluded by .dockerignore)
COPY . .

# Expose frontend port
EXPOSE 3001

# Development mode: Next.js dev with hot reload.
# --hostname 0.0.0.0 makes the dev server reachable from outside the container.
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
