#!/bin/bash
# Script de instalación del servicio Control Horario para Ubuntu
# Ejecutar con: sudo bash install-service.sh

set -e

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # Sin color

echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Instalador de Control Horario - Servicio Systemd     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Este script debe ejecutarse como root (sudo)${NC}"
    echo "Uso: sudo bash install-service.sh"
    exit 1
fi

# Obtener el directorio actual del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

# Detectar el usuario que ejecutó sudo
ACTUAL_USER="${SUDO_USER:-$USER}"
ACTUAL_GROUP="$(id -gn $ACTUAL_USER)"

echo -e "${YELLOW}Configuración detectada:${NC}"
echo "  - Usuario: $ACTUAL_USER"
echo "  - Grupo: $ACTUAL_GROUP"
echo "  - Directorio de la aplicación: $APP_DIR"
echo ""

# Verificar que existe el directorio de la aplicación
if [ ! -f "$APP_DIR/package.json" ]; then
    echo -e "${RED}Error: No se encontró package.json en $APP_DIR${NC}"
    exit 1
fi

# Verificar que existe node
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js no está instalado${NC}"
    echo "Instálalo con: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

NODE_PATH=$(which node)
NPM_PATH=$(which npm)
echo "  - Node.js: $NODE_PATH ($(node --version))"
echo "  - npm: $NPM_PATH ($(npm --version))"
echo ""

# Construir la aplicación si no existe .next
if [ ! -d "$APP_DIR/.next" ]; then
    echo -e "${YELLOW}Construyendo la aplicación (primera vez)...${NC}"
    cd "$APP_DIR"
    sudo -u "$ACTUAL_USER" npm run build
    echo -e "${GREEN}✓ Aplicación construida correctamente${NC}"
    echo ""
fi

# Crear archivo de servicio personalizado
SERVICE_FILE="/etc/systemd/system/control-horario.service"

echo -e "${YELLOW}Creando servicio systemd...${NC}"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Control Horario - Aplicación de gestión de turnos y horarios
Documentation=https://github.com/Emilio20d2/control_horario
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$ACTUAL_USER
Group=$ACTUAL_GROUP
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=$NPM_PATH run start -- -p 3000
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=control-horario

# Seguridad
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✓ Servicio creado en $SERVICE_FILE${NC}"

# Recargar systemd
echo -e "${YELLOW}Recargando configuración de systemd...${NC}"
systemctl daemon-reload
echo -e "${GREEN}✓ Configuración recargada${NC}"

# Habilitar el servicio para inicio automático
echo -e "${YELLOW}Habilitando inicio automático...${NC}"
systemctl enable control-horario.service
echo -e "${GREEN}✓ Servicio habilitado para inicio automático${NC}"

# Iniciar el servicio
echo -e "${YELLOW}Iniciando el servicio...${NC}"
systemctl start control-horario.service
sleep 3

# Verificar estado
if systemctl is-active --quiet control-horario.service; then
    echo -e "${GREEN}✓ Servicio iniciado correctamente${NC}"
else
    echo -e "${RED}✗ Error al iniciar el servicio${NC}"
    echo "Revisa los logs con: sudo journalctl -u control-horario -f"
    exit 1
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            ¡Instalación completada con éxito!            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}La aplicación está disponible en:${NC}"
echo "  → http://localhost:3000"
echo "  → http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo -e "${YELLOW}Comandos útiles:${NC}"
echo "  Ver estado:      sudo systemctl status control-horario"
echo "  Ver logs:        sudo journalctl -u control-horario -f"
echo "  Reiniciar:       sudo systemctl restart control-horario"
echo "  Detener:         sudo systemctl stop control-horario"
echo "  Deshabilitar:    sudo systemctl disable control-horario"
echo ""
