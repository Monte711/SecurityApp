# Multi-stage build для UI
FROM node:18-alpine AS builder

# Установка рабочей директории
WORKDIR /app

# Копирование package files
COPY package*.json ./

# Установка зависимостей (включая dev для сборки)
RUN npm ci

# Копирование исходного кода (исключая node_modules)
COPY src/ src/
COPY public/ public/
COPY index.html .
COPY vite.config.ts .
COPY tsconfig.json .
COPY tsconfig.node.json .
COPY tailwind.config.js .
COPY postcss.config.js .

# Аргументы сборки
ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_USE_MOCK_DATA=false

# Переменные окружения для сборки
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_USE_MOCK_DATA=$VITE_USE_MOCK_DATA

# Сборка приложения
RUN npm run build

# Production stage
FROM nginx:alpine

# Копирование собранного приложения
COPY --from=builder /app/dist /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Экспорт порта
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]
