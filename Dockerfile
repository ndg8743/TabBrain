# Chrome Extension Testing Container
FROM mcr.microsoft.com/playwright:v1.49.1-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install Playwright browsers
RUN npx playwright install chromium

# Copy source code
COPY . .

# Build the extension
RUN npm run build

# Run tests
CMD ["npm", "run", "test:e2e"]
