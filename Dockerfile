# Use Node.js 20 explicitly as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy root package.json for frontend build
COPY package*.json ./
# Install frontend dependencies
RUN npm ci --include=dev

# Copy server package.json
COPY server/package*.json ./server/
# Install server dependencies
RUN cd server && npm ci

# Copy entire application
COPY . .

# Build the frontend (Vite)
RUN npm run build

# Expose backend port
EXPOSE 10000

# Start the server (which serves the frontend from dist/)
CMD ["node", "server/index.js"]
