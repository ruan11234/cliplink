FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg python3 curl && rm -rf /var/lib/apt/lists/*
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
RUN mkdir -p server/uploads/videos server/uploads/thumbnails server/uploads/temp
EXPOSE 3000
CMD ["npm", "start"]
