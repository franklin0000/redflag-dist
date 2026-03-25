# Pre-built image — dist/ is built locally, no pipeline build needed
FROM node:20-alpine

WORKDIR /app

# Install server dependencies first (cached layer)
COPY server/package.json ./server/
RUN cd server && npm install --production

# Copy pre-built frontend and all server code
COPY dist/ ./dist/
COPY public/ ./public/
COPY server/ ./server/

EXPOSE 10000
ENV PORT=10000
ENV NODE_ENV=production

CMD ["node", "server/index.js"]
