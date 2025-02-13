# Base stage
FROM node:18 AS base

WORKDIR /app

# Install ionic CLI globally
RUN npm install -g @ionic/cli

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development

RUN npm install
COPY . .

EXPOSE 8100
CMD ["ionic", "serve", "--external"]

# Production stage
FROM base AS production

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# outputPath should set in angular.json to /app/www/frontend
RUN npm run build --configuration=production --output-path=/app/www/frontend