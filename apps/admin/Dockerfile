FROM node:20-alpine AS builder

WORKDIR /monorepo

COPY package*.json ./
COPY packages ./packages
COPY apps/admin ./apps/admin

RUN npm install
RUN npm --workspace=apps/admin run build

FROM nginx:alpine
COPY --from=builder /monorepo/apps/admin/dist /usr/share/nginx/html
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
