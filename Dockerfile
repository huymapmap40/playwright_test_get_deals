FROM node:slim

WORKDIR /

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install the repo's dependencies from the lockfile.
COPY package.json package-lock.json ./
RUN npm install

RUN npx playwright install --with-deps chromium \
  && rm -rf /var/lib/apt/lists/*
