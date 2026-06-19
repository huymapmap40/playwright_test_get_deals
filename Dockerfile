# Slim Node base instead of the full Playwright image (which bundles 3 browsers).
# This project only runs chromium, so we install just that one + its OS deps.
FROM node:slim

WORKDIR /app

# Install dependencies frst so this layer is cached unless the lockfile changes.
COPY package.json package-lock.json ./
RUN npm install

# Install ONLY chromium and its system libraries (firefox/webkit are unused).
# --with-deps pulls the required apt packages; clean the apt cache afterward.
RUN npx playwright install --with-deps chromium \
  && rm -rf /var/lib/apt/lists/*

# Copy the rest of the test suite.
COPY . .

# Enables Playwright's CI mode (retries, single worker, forbidOnly).
ENV CI=true

# Credentials come from the environment at run time (see .env.example), e.g.:
#   docker run --rm --env-file .env playwright-get-deals
CMD ["npm", "test"]
