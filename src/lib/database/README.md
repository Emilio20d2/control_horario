# Capa de datos desacoplada

Este proyecto ya no incluye una integración directa con ningún proveedor de base de datos. Para conectar tu propia base de datos debes implementar un adaptador que cumpla con la interfaz `DatabaseAdapterDefinition` definida en `src/lib/database/index.ts`.

## Pasos para añadir un nuevo adaptador

1. Crea un archivo (por ejemplo `src/lib/database/adapters/midb.ts`) que implemente todos los métodos requeridos por la interfaz.
2. Inicializa tu adaptador en el arranque de la aplicación (por ejemplo dentro de `AppProviders`) invocando a `configureDatabaseAdapter(miAdaptador)`. Puedes almacenar cualquier referencia interna que necesites (SDKs, clientes HTTP, etc.).
3. Todos los servicios (`src/lib/services/*.ts`) utilizan la capa de abstracción, por lo que no es necesario modificar la lógica de negocio al cambiar de proveedor.

Consulta los comentarios en `index.ts` para conocer el comportamiento por defecto cuando no hay adaptador configurado.

### Pruebas y entornos simulados

El adaptador de Postgres (`createPostgresAdapter`) acepta una propiedad opcional `poolFactory` que permite proporcionar una
implementación personalizada de `Pool`. Esto resulta útil para escenarios de pruebas o auditorías automatizadas en los que
desees utilizar proveedores en memoria como [`pg-mem`](https://github.com/oguimbal/pg-mem) sin depender de una base de datos
real.
