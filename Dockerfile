FROM node:20-slim

WORKDIR /app

# Set Node memory limit to prevent OOM during Vite build
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy package files
COPY package*.json ./

# Install dependencies safely
RUN npm install --legacy-peer-deps

# Copy all source files
COPY . .

# Build Vite frontend & Express backend
RUN npm run build

# Set runtime environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/server.cjs"]
