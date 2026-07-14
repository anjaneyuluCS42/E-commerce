# Stage 1: Build React Application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package descriptors for dependency caching
COPY package*.json ./

# Install dependencies deterministically
RUN npm ci

# Copy the rest of the frontend source code
COPY . .

# Run the production compilation using Vite
RUN npm run build

# Stage 2: Serve the production assets using Nginx
FROM nginx:alpine

# Copy static assets from build stage to Nginx default public directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy user defined nginx server configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
