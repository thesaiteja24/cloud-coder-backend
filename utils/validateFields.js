// Return the missing fileds by filterning them from received data
export function getMissingFields(requiredFields, data) {
  return requiredFields.filter(field => !data[field])
}
