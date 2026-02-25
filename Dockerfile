FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg python3 python3-pip && rm -rf /var/lib/apt/lists/*
RUN pip3 install --break-system-packages yt-dlp
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
RUN mkdir -p server/uploads/videos server/uploads/thumbnails server/uploads/temp
EXPOSE 3000
CMD ["npm", "start"]
