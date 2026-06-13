FROM node:22-alpine
WORKDIR /app
COPY worker/package*.json ./
RUN npm install --production
COPY worker/ ./
CMD ["node", "ctrader-worker.js"]
