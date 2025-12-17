#!/bin/bash
echo "=== AGRIEXCHANGE BACKEND ==="
echo "Port: $PORT"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"
echo "=============================="

# Démarrer l'application
node server/server.js
