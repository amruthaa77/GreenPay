FROM node:20-alpine AS builder

WORKDIR /monorepo

COPY package*.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN npm install
RUN npm --workspace=apps/web run build

FROM nginx:alpine
COPY --from=builder /monorepo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
