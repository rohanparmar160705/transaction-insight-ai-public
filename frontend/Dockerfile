# Multi-stage Dockerfile for React Frontend
# ==========================================
# Stage 1: Build the React app
# Stage 2: Serve with nginx

# ============================================================================
# Stage 1: Build
# ============================================================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (include devDependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build production bundle
# This creates optimized, minified files in the /dist directory
# Ensure API base uses nginx proxy inside container
ENV VITE_API_URL=/api
RUN npm run build

# ============================================================================
# Stage 2: Production - Nginx
# ============================================================================
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration (if needed)
# This enables client-side routing for React Router
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
    # API proxy (optional - if backend is on same host) \
    location /api { \
        proxy_pass http://backend:5000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# ============================================================================
# Build and Run Instructions
# ============================================================================
#
# Build image:
#   docker build -t transaction-frontend .
#
# Run container:
#   docker run -p 3000:80 transaction-frontend
#
# Run with environment variables (API URL):
#   docker run -p 3000:80 -e VITE_API_URL=http://api.example.com transaction-frontend
#
# Access app:
#   http://localhost:3000