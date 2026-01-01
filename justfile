# Set shell for Windows OSs:
# set windows-shell := ['cmd', '/c']
# set windows-shell := ["C:/Program Files/Git/usr/bin/bash.exe", "-c"]
set windows-shell := ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]

default: 
  just --list --unsorted

dev: 
  concurrently "cd pocketbase && pocketbase serve" "cd curator && pnpm run dev"

start: 
  concurrently "cd pocketbase && pocketbase serve" "cd curator && pnpm run start"

prod:
  concurrently "cd pocketbase && pocketbase serve" "cd curator && node build"