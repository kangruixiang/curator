# === Runner stage ===
FROM alpine:3.19
WORKDIR /app

# Download Pocketbase
ARG PB_VERSION=0.35.0
RUN apk add --no-cache \
    unzip \
    ca-certificates
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d ./db
RUN chmod +x /app/db/pocketbase

# Copy migration and hooks folders
COPY pb_migrations ./db/pb_migrations
COPY pb_hooks ./db/pb_hooks

# Expose app port
EXPOSE 8090

CMD ["./db/pocketbase", "serve", "--http=0.0.0.0:8090"]

