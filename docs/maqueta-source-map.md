# Mapa de migración de la maqueta

La referencia visual vive fuera de este repositorio en `html-screen-designer`. Es un prototipo Vite con datos simulados y `localStorage`; **CartaYa** es la aplicación Next.js real y la única carpeta de destino.

| Fuente en la maqueta | Destino previsto en CartaYa | Estado |
| --- | --- | --- |
| `ClientMenu.tsx` | Menú PWA público por `restaurants.slug` | Pendiente |
| `CartDrawer.tsx` | Carrito y creación de pedidos | Pendiente |
| `DashboardLayout.tsx` | Layout desktop de `/dashboard/*` | Pendiente |
| `DashboardOverview.tsx` | Resumen del restaurante | Pendiente |
| `MenuManager.tsx` / `NewDishModal.tsx` | Categorías y platos | Pendiente |
| `QRTablesGenerator.tsx` | QR general / QR por mesa según plan | Pendiente |
| `KDSKitchen.tsx` / `KDSModal.tsx` | KDS Realtime exclusivo Pro | Pendiente |
| `OrderHistoryModal.tsx` | Pedidos e historial | Pendiente |

La tipografía Inter + Plus Jakarta Sans, las superficies redondeadas y la paleta de marca ya se incorporaron a la fundación. Al migrar cada pantalla se reemplazarán los tipos y datos de `initialData.ts` por consultas Supabase protegidas con RLS; no se copiará la persistencia simulada del prototipo.
