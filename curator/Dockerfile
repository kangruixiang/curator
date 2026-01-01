# === Builder stage ===
FROM node:alpine AS builder
WORKDIR /app

# Copy package.json and install
COPY package*.json ./
RUN npm install

# Copy rest of the app
COPY . .
# COPY .env .env

# Build the app
RUN npm run build
# RUN npm prune --production

# === Runner stage ===
FROM node:alpine AS runner
WORKDIR /app

# Copy built output from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Expose app port
EXPOSE 3000
# ENV NODE_ENV=production
CMD ["node", "build"]