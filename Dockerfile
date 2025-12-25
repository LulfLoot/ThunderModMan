FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY src/ ./src/
COPY public/ ./public/

# Create data and mods directories
RUN mkdir -p /data /mods

# Environment variables
ENV PORT=9876
ENV MODS_DIR=/mods
ENV DATA_DIR=/data

EXPOSE 9876

CMD ["node", "src/server.js"]
