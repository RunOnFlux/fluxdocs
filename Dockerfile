FROM node:alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY fluxapi.yaml redocly.yaml flux.jpg ./

EXPOSE 4000

CMD ["npm", "start"]