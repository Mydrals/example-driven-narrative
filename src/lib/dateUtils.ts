/**
 * Formatea una fecha en formato YYYY-MM-DD sin aplicar conversión de zona horaria
 * Esto evita el problema de que las fechas se desplacen un día hacia atrás
 */
export const formatDateWithoutTimezone = (dateString: string | null): string => {
  if (!dateString) return '';
  
  // Parsear la fecha manualmente para evitar conversión UTC
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Formatea una fecha en formato corto con año (día, mes y año)
 */
export const formatDateShort = (dateString: string | null): string => {
  if (!dateString) return '';
  
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};
