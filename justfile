# Set shell for Windows OSs:
# set windows-shell := ['cmd', '/c']
# set windows-shell := ["C:/Program Files/Git/usr/bin/bash.exe", "-c"]
set windows-shell := ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]

default: 
  just --list --unsorted

install: 
  concurrently "cd curator && pnpm install"

dev: 
  concurrently "cd pocketbase && pocketbase serve" "cd curator && pnpm run dev"

start: 
  concurrently "cd pocketbase && pocketbase serve" "cd curator && pnpm run start"

prod:
  concurrently "cd pocketbase && pocketbase serve" "cd curator && node build"

docker-curator:
  docker build -t kangruixiang/curator:0.0.9 ./curator
  docker tag kangruixiang/curator:0.0.9 kangruixiang/curator:latest
  docker push kangruixiang/curator:0.0.9
  docker push kangruixiang/curator:latest

docker-pocketbase:
  docker build -t kangruixiang/pocketbase:0.35.0 ./pocketbase
  docker tag kangruixiang/pocketbase:0.35.0 kangruixiang/pocketbase:latest
  docker push kangruixiang/pocketbase:0.35.0
  docker push kangruixiang/pocketbase:latest


 