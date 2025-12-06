// 1. Exportamos las instancias desde el nuevo archivo init
export * from './init';

// 2. Exportamos el resto de herramientas (Barril)
export * from './provider';              
export * from './non-blocking-updates';  
export * from './non-blocking-login';    
export * from './config';                
export * from './errors';                
export * from './error-emitter';
// NO exportamos client-provider desde aquí para evitar el ciclo con layout.tsx