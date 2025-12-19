#!/bin/bash
# Script de desinstalación del servicio Control Horario
# Ejecutar con: sudo bash uninstall-service.sh

set -e

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Desinstalando servicio Control Horario...${NC}"
echo ""

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Este script debe ejecutarse como root (sudo)${NC}"
    exit 1
fi

# Detener el servicio si está corriendo
if systemctl is-active --quiet control-horario.service 2>/dev/null; then
    echo "Deteniendo servicio..."
    systemctl stop control-horario.service
    echo -e "${GREEN}✓ Servicio detenido${NC}"
fi

# Deshabilitar el servicio
if systemctl is-enabled --quiet control-horario.service 2>/dev/null; then
    echo "Deshabilitando inicio automático..."
    systemctl disable control-horario.service
    echo -e "${GREEN}✓ Inicio automático deshabilitado${NC}"
fi

# Eliminar archivo de servicio
SERVICE_FILE="/etc/systemd/system/control-horario.service"
if [ -f "$SERVICE_FILE" ]; then
    echo "Eliminando archivo de servicio..."
    rm "$SERVICE_FILE"
    echo -e "${GREEN}✓ Archivo de servicio eliminado${NC}"
fi

# Recargar systemd
systemctl daemon-reload
echo -e "${GREEN}✓ Configuración de systemd recargada${NC}"

echo ""
echo -e "${GREEN}¡Servicio desinstalado correctamente!${NC}"
echo "La aplicación y sus datos no han sido eliminados."
