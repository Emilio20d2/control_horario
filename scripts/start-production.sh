#!/bin/bash
# Script de inicio para Control Horario en modo producción
# Este script construye y ejecuta la aplicación

set -e

# Directorio de la aplicación (ajustar según tu instalación)
APP_DIR="${APP_DIR:-/home/emilio/control_horario}"

# Puerto de la aplicación
PORT="${PORT:-3000}"

# Cambiar al directorio de la aplicación
cd "$APP_DIR"

# Cargar variables de entorno si existe el archivo
if [ -f ".env.local" ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Verificar si node está disponible
if ! command -v node &> /dev/null; then
    echo "Error: Node.js no está instalado"
    exit 1
fi

# Verificar si npm está disponible
if ! command -v npm &> /dev/null; then
    echo "Error: npm no está instalado"
    exit 1
fi

# Verificar si existe el directorio .next (build previo)
if [ ! -d ".next" ]; then
    echo "Construyendo la aplicación por primera vez..."
    npm run build
fi

# Iniciar la aplicación en modo producción
echo "Iniciando Control Horario en puerto $PORT..."
exec npm run start -- -p "$PORT"
