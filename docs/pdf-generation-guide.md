# Guía para la Generación de PDF con jsPDF y jspdf-autotable

Este documento explica cómo está implementada la funcionalidad de generación de PDFs en este proyecto. La combinación de `jspdf` y `jspdf-autotable` ofrece una solución robusta para crear informes dinámicos en el lado del cliente.

## 1. Librerías Utilizadas

- **[jsPDF](https://github.com/parallax/jsPDF)**: La librería principal para la creación de documentos PDF. Permite añadir texto, formas, imágenes y gestionar páginas.
- **[jspdf-autotable](https://github.com/simonbengtsson/jspdf-autotable)**: Un potente plugin para `jsPDF` que se especializa en la creación de tablas a partir de datos en formato JSON o arrays.

## 2. Proceso Básico de Creación

El flujo general para crear un PDF se puede resumir en los siguientes pasos:

### a. Instalación

Asegúrate de que las dependencias están en tu `package.json`:

```json
"dependencies": {
  "jspdf": "^2.5.1",
  "jspdf-autotable": "^3.8.2"
}
```

### b. Importación

En tu componente de React, importa las librerías necesarias:

```javascript
'use client'; // Necesario si es un componente de cliente

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
```

### c. Ejemplo de Función Generadora

Aquí tienes una función completa que puedes asociar a un botón. Esta función genera un PDF con un título, una descripción y una tabla.

```javascript
const generateExamplePDF = () => {
  // 1. CREAR EL DOCUMENTO
  // 'p' = portrait (vertical), 'mm' = milímetros, 'a4' = formato
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  // 2. AÑADIR TÍTULOS Y TEXTO
  // .setFont(tipo, estilo) -> 'helvetica', 'bold', 'normal', etc.
  // .setFontSize(tamaño)
  // .text(texto, posX, posY)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Informe de Ejemplo', 15, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Este es un ejemplo de cómo generar un PDF con tablas.', 15, 28);

  // 3. PREPARAR DATOS PARA LA TABLA
  // La cabecera (head) es un array que contiene otro array con los títulos.
  const head = [['ID', 'Nombre', 'Email', 'Estado']];
  
  // El cuerpo (body) es un array de arrays, donde cada array interno es una fila.
  const body = [
    ['1', 'Juan Pérez', 'juan.perez@email.com', 'Activo'],
    ['2', 'Ana López', 'ana.lopez@email.com', 'Activo'],
    ['3', 'Pedro García', 'pedro.garcia@email.com', 'Inactivo'],
  ];

  // 4. GENERAR LA TABLA CON autoTable
  autoTable(doc, {
    startY: 35, // Posición Y donde comienza la tabla. Deja espacio para el título.
    head: head,
    body: body,
    theme: 'grid', // Temas disponibles: 'striped', 'grid', 'plain'
    headStyles: {
      fillColor: [41, 128, 185], // Color de fondo de la cabecera (RGB)
      textColor: 255, // Color del texto (blanco)
      fontStyle: 'bold',
    },
    styles: {
      cellPadding: 2,
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245], // Color para filas alternas (en tema 'striped')
    },
  });

  // 5. GUARDAR EL ARCHIVO
  // El método .save() inicia la descarga del archivo en el navegador del usuario.
  doc.save('informe_ejemplo.pdf');
};
```

## 3. Opciones Avanzadas

`jspdf-autotable` es muy personalizable. Aquí algunas opciones útiles vistas en el proyecto:

- **`columnStyles`**: Permite definir anchos de columna específicos.
  ```javascript
  columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 'auto' } }
  ```
- **Hooks (`didDrawCell`, `didDrawPage`)**: Permiten ejecutar código personalizado al dibujar una celda o una página. Son muy útiles para añadir contenido dinámico (como las casillas de verificación en `listings/page.tsx`) o para añadir cabeceras y pies de página en cada página del PDF.
  ```javascript
  didDrawPage: (data) => {
    // Añade un pie de página con el número de página
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(10);
    doc.text(`Página ${data.pageNumber} de ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
  }
  ```

¡Con esto, tienes una base sólida para crear cualquier tipo de informe en PDF que necesites!
