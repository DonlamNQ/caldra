FROM node:20-alpine
WORKDIR /app
COPY worker/package*.json ./
RUN npm install --production
COPY worker/ ./
CMD ["node", "index.js"]
